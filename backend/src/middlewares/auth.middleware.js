import jwt from 'jsonwebtoken';
import { db } from '../prisma/db.ts';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Verificar que venga el token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Token de autenticación requerido'
      });
    }

    // Extraer token
    const token = authHeader.split(' ')[1];

    // Verificar JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Buscar usuario
    const user = await db.orm.public.User.first({
      id: decoded.userId
    });

    if (!user) {
      return res.status(401).json({
        message: 'Usuario no válido'
      });
    }

    // Verificar estado de la cuenta
    if (!user.isActive) {
      return res.status(403).json({
        message: 'La cuenta se encuentra desactivada'
      });
    }

    //validar si el token es valido o no
    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({
        message: 'La sesión ya no es válida. Inicia sesión nuevamente.'
      });
    }

    // Guardar usuario en la petición
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive
    };

    next();

  } catch (error) {

    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    ) {
      return res.status(401).json({
        message: 'Token inválido o expirado'
      });
    }

    console.error('Error de autenticación:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};