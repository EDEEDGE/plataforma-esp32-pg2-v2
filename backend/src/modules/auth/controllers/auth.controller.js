//importa dependencias para encriptar las contraseñas y jwt para proteger las rutas
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

//llamamos el modelo prisma de la db para conectarnos
import { db } from '../../../prisma/db.ts';

// Registro de usuario
export const register = async (req, res) => {
    try {
        const {
            username,
            email,
            password,
            firstName,
            lastName
        } = req.body;

        // Validar campos obligatorios
        if (!username || !email || !password || !firstName || !lastName) {
            return res.status(400).json({
                message: 'Todos los campos son obligatorios'
            });
        }

        // Validación básica de contraseña
        if (password.length < 8) {
            return res.status(400).json({
                message: 'La contraseña debe tener al menos 8 caracteres'
            });
        }

        // Normalizar datos
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedUsername = username.trim().toLowerCase();

        // Verificar correo
        const emailExists = await db.orm.public.User.first({
            email: normalizedEmail
        });

        if (emailExists) {
            return res.status(409).json({
                message: 'El correo ya está registrado'
            });
        }

        // Verificar username
        const usernameExists = await db.orm.public.User.first({
            username: normalizedUsername
        });

        if (usernameExists) {
            return res.status(409).json({
                message: 'El nombre de usuario ya está registrado'
            });
        }

        // Hash de contraseña
        const passwordHash = await bcrypt.hash(password, 12);

        // Crear usuario
        const user = await db.orm.public.User.create({
            username: normalizedUsername,
            email: normalizedEmail,
            passwordHash,
            firstName: firstName.trim(),
            lastName: lastName.trim()
        });

        return res.status(201).json({
            message: 'Usuario registrado correctamente',

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
        console.error('Error al registrar usuario:', error);

        return res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
};

// Inicio de sesión
export const login = async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: 'Correo y contraseña son obligatorios'
            });
        }

        //normalizar el Email
        const normalizedEmail = email.trim().toLowerCase();

        // Buscar usuario   
        const user = await db.orm.public.User.first({
            email: normalizedEmail
        });

        if (!user) {
            return res.status(401).json({
                message: 'Correo o contraseña incorrectos'
            });
        }

        // Validar estado
        if (!user.isActive) {
            return res.status(403).json({
                message: 'La cuenta se encuentra desactivada'
            });
        }

        // Comparar contraseña
        const validPassword = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!validPassword) {
            return res.status(401).json({
                message: 'Correo o contraseña incorrectos'
            });
        }

        // Generar JWT
        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role,
                tokenVersion: user.tokenVersion
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || '8h'
            }
        );

        return res.status(200).json({
            message: 'Inicio de sesión correcto',

            token,

            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isActive: user.isActive
            }
        });

    } catch (error) {
        console.error('Error al iniciar sesión:', error);

        return res.status(500).json({
            message: 'Error interno del servidor'
        });
    }
};

//primera ruta protegida
export const me = async (req, res) => {
  try {
    return res.status(200).json({
      user: req.user
    });

  } catch (error) {
    console.error('Error al obtener usuario autenticado:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};