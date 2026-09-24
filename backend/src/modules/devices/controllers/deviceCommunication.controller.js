import { db } from '../../../prisma/db.ts';

// Confirmar comunicación del dispositivo con el backend
export const deviceHeartbeat = async (req, res) => {
  try {
    return res.status(200).json({
      message: 'Dispositivo conectado correctamente',

      device: {
        id: req.device.id,
        projectId: req.device.projectId,
        name: req.device.name,
        deviceType: req.device.deviceType,
        hardwareId: req.device.hardwareId
      },

      serverTime: Temporal.Now.instant()
    });

  } catch (error) {
    console.error(
      'Error al procesar heartbeat del dispositivo:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};
