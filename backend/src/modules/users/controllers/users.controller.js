import { db } from '../../../prisma/db.ts';

//editar el perfil del usuario
export const updateMyProfile = async (req, res) => {
  try {
    const { username, firstName, lastName } = req.body;

    if (!username || !firstName || !lastName) {
      return res.status(400).json({
        message: 'Todos los campos son obligatorios'
      });
    }

    const normalizedUsername = username.trim().toLowerCase();

    const existingUser = await db.orm.public.User.first({
      username: normalizedUsername
    });

    if (existingUser && existingUser.id !== req.user.id) {
      return res.status(409).json({
        message: 'El nombre de usuario ya está en uso'
      });
    }

    const updatedUser = await db.orm.public.User
      .where({
        id: req.user.id
      })
      .update({
        username: normalizedUsername,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        updatedAt: Temporal.Now.instant()
      });

    return res.status(200).json({
      message: 'Perfil actualizado correctamente',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        isActive: updatedUser.isActive
      }
    });

  } catch (error) {
    console.error('Error al actualizar perfil:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};


//el administrador liste a todos los usuarios
export const getUsers = async (req, res) => {
  try {
    const users = await db.orm.public.User.all();

    const safeUsers = users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    }));

    return res.status(200).json({
      users: safeUsers
    });

  } catch (error) {
    console.error('Error al obtener usuarios:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

//el administrador busque por id
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await db.orm.public.User.first({
      id
    });

    if (!user) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Error al obtener usuario:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

//el administrador puede activar o desactivar a los usuarios
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        message: 'El estado isActive debe ser true o false'
      });
    }

    const user = await db.orm.public.User.first({
      id
    });

    if (!user) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    // Evitar que el administrador se desactive a sí mismo
    if (user.id === req.user.id && isActive === false) {
      return res.status(400).json({
        message: 'No puedes desactivar tu propia cuenta'
      });
    }

    const updatedUser = await db.orm.public.User
      .where({
        id
      })
      .update({
        isActive,
        updatedAt: Temporal.Now.instant()
      });

    return res.status(200).json({
      message: isActive
        ? 'Usuario activado correctamente'
        : 'Usuario desactivado correctamente',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive
      }
    });

  } catch (error) {
    console.error('Error al actualizar estado del usuario:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

//el administrador puede cambiar los roles de los usuarios
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const allowedRoles = ['ADMIN', 'USER'];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: 'Rol no válido'
      });
    }

    const user = await db.orm.public.User.first({
      id
    });

    if (!user) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    // Evitar que el administrador cambie su propio rol
    if (user.id === req.user.id) {
      return res.status(400).json({
        message: 'No puedes modificar tu propio rol'
      });
    }

    const updatedUser = await db.orm.public.User
      .where({
        id
      })
      .update({
        role,
        tokenVersion: user.tokenVersion + 1,
        updatedAt: Temporal.Now.instant()
      });

    return res.status(200).json({
      message: 'Rol actualizado correctamente',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive
      }
    });

  } catch (error) {
    console.error('Error al actualizar rol:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};