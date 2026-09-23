import { db } from '../prisma/db.ts';
import { createHash } from 'node:crypto';

export const deviceAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Verificar header Authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Credencial del dispositivo no proporcionada'
      });
    }

    // Obtener credencial real enviada por el ESP
    const credential = authHeader.split(' ')[1];

    if (!credential) {
      return res.status(401).json({
        message: 'Credencial del dispositivo no válida'
      });
    }

    // Generar hash para buscarlo en la BD
    const credentialHash = createHash('sha256')
      .update(credential)
      .digest('hex');

    // Buscar credencial
    const storedCredential =
      await db.orm.public.DeviceCredential.first({
        credentialHash
      });

    if (!storedCredential) {
      return res.status(401).json({
        message: 'Credencial del dispositivo no válida'
      });
    }

    // Verificar que no haya sido revocada
    if (storedCredential.revokedAt) {
      return res.status(401).json({
        message: 'La credencial del dispositivo fue revocada'
      });
    }

    // Buscar dispositivo
    const device = await db.orm.public.Device.first({
      id: storedCredential.deviceId
    });

    if (!device) {
      return res.status(401).json({
        message: 'Dispositivo no encontrado'
      });
    }

    // Debe estar vinculado
    if (!device.isPaired) {
      return res.status(403).json({
        message: 'El dispositivo no está vinculado'
      });
    }

    // Debe estar activo
    if (!device.isActive) {
      return res.status(403).json({
        message: 'El dispositivo está desactivado'
      });
    }

    const now = Temporal.Now.instant();

    // Registrar último uso de la credencial
    await db.orm.public.DeviceCredential
      .where({
        id: storedCredential.id
      })
      .update({
        lastUsedAt: now
      });

    // Registrar última comunicación del dispositivo
    await db.orm.public.Device
      .where({
        id: device.id
      })
      .update({
        lastSeenAt: now
      });

    // Dejar disponible el dispositivo para la siguiente función
    req.device = {
      id: device.id,
      projectId: device.projectId,
      name: device.name,
      deviceType: device.deviceType,
      hardwareId: device.hardwareId,
      isActive: device.isActive,
      isPaired: device.isPaired
    };

    next();

  } catch (error) {
    console.error(
      'Error al autenticar dispositivo:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};