import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'node:crypto';
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
        tokenVersion: user.tokenVersion + 1,
        updatedAt: Temporal.Now.instant()
      });

    return res.status(200).json({
      message: 'Contraseña actualizada correctamente. Iniciar sesión nuevamente'
    });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

//método para recuperar la contraseña
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'El correo electrónico es obligatorio'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await db.orm.public.User.first({
      email: normalizedEmail
    });

    // Siempre devolvemos el mismo mensaje aunque el correo no exista
    if (!user) {
      return res.status(200).json({
        message:
          'Si existe una cuenta asociada a ese correo, recibirás instrucciones para recuperar el acceso.'
      });
    }

    // Token real que posteriormente enviaremos por correo
    const resetToken = randomBytes(32).toString('hex');

    // Hash que sí guardaremos en la base de datos
    const tokenHash = createHash('sha256').update(resetToken).digest('hex');

    // El token tendrá una duración de 15 minutos
    const expiresAt = Temporal.Now.instant().add({
      minutes: 15
    });

    await db.orm.public.PasswordResetToken.create({
      userId: user.id,
      tokenHash,
      expiresAt
    });

    // SOLO PARA DESARROLLO
    console.log('Token de recuperación:', resetToken);

    return res.status(200).json({
      message:
        'Si existe una cuenta asociada a ese correo, recibirás instrucciones para recuperar el acceso.'
    });

  } catch (error) {
    console.error('Error al solicitar recuperación de contraseña:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

//reseterar contraseña si la olvidaste
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        message: 'El token y la nueva contraseña son obligatorios'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: 'La nueva contraseña debe tener al menos 8 caracteres'
      });
    }

    // Convertimos el token recibido al mismo SHA-256
    // que guardamos cuando se solicitó la recuperación.
    const tokenHash = createHash('sha256')
      .update(token)
      .digest('hex');

    // Buscar el token en la base de datos
    const resetToken = await db.orm.public.PasswordResetToken.first({
      tokenHash
    });

    if (!resetToken) {
      return res.status(400).json({
        message: 'El enlace de recuperación no es válido'
      });
    }

    // Verificar que todavía no haya sido utilizado
    if (resetToken.usedAt) {
      return res.status(400).json({
        message: 'Este enlace de recuperación ya fue utilizado'
      });
    }

    // Verificar que no haya expirado
    const now = Temporal.Now.instant();

    if (Temporal.Instant.compare(resetToken.expiresAt, now) <= 0) {
      return res.status(400).json({
        message: 'El enlace de recuperación ha expirado'
      });
    }

    // Buscar al usuario asociado
    const user = await db.orm.public.User.first({
      id: resetToken.userId
    });

    if (!user || !user.isActive) {
      return res.status(400).json({
        message: 'No fue posible restablecer la contraseña'
      });
    }

    //evitar utilizar la contraseña actual
    const samePassword = await bcrypt.compare(
      newPassword,
      user.passwordHash
    );

    if (samePassword) {
      return res.status(400).json({
        message: 'La nueva contraseña debe ser diferente a la contraseña actual'
      });
    }
    // Cifrar la nueva contraseña
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Actualizar contraseña e invalidar los JWT anteriores
    await db.orm.public.User
      .where({
        id: user.id
      })
      .update({
        passwordHash: newPasswordHash,
        tokenVersion: user.tokenVersion + 1,
        updatedAt: now
      });

    // Marcar el token como utilizado
    await db.orm.public.PasswordResetToken
      .where({
        id: resetToken.id
      })
      .update({
        usedAt: now
      });

    return res.status(200).json({
      message: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.'
    });

  } catch (error) {
    console.error('Error al restablecer contraseña:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};