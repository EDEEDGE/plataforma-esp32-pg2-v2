import bcrypt from 'bcryptjs';
import { db } from '../../../prisma/db.ts';

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    //comprobar si los campos están vacios
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'La contraseña actual y la nueva son obligatorias'
      });
    }

    //Controlar los requisitos de la contraseña segura
    if (newPassword.length < 8) {
      return res.status(400).json({
        message: 'La nueva contraseña debe tener al menos 8 caracteres'
      });
    }

    //buscar el usuario en la db
    const user = await db.orm.public.User.first({
      id: req.user.id
    });

    //comprobar si el usuario existe en la db
    if (!user) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    //desencriptar la contraseña
    const validPassword = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    //validar la contraseña
    if (!validPassword) {
      return res.status(401).json({
        message: 'La contraseña actual es incorrecta'
      });
    }

    
    const samePassword = await bcrypt.compare(
      newPassword,
      user.passwordHash
    );

    if (samePassword) {
      return res.status(400).json({
        message: 'La nueva contraseña debe ser diferente a la actual'
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await db.orm.public.User
      .where({
        id: req.user.id
      })
      .update({
        passwordHash: newPasswordHash,
        updatedAt: Temporal.Now.instant()
      });

    return res.status(200).json({
      message: 'Contraseña actualizada correctamente'
    });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};