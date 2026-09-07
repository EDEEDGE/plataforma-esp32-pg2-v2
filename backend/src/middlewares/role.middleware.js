export const allowRoles = (...roles) => {
  return (req, res, next) => {
    console.log('USUARIO RECIBIDO:', req.user);
    console.log('ROL ACTUAL:', req.user?.role);
    console.log('ROLES PERMITIDOS:', roles);

    if (!req.user) {
      return res.status(401).json({
        message: 'Usuario no autenticado'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'No tienes permisos para realizar esta acción'
      });
    }

    next();
  };
};