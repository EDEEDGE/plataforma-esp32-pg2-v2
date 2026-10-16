import 'temporal-polyfill/full/global';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

//temporal
//import './src/config/mailer.js';

//importar rutas a los modulos
import authRoutes from './src/modules/auth/index.js';
import usersRoutes from './src/modules/users/index.js';
import roomsRoutes from './src/modules/rooms/index.js';
import projectsRoutes from './src/modules/projects/index.js';
import devicesRoutes from './src/modules/devices/index.js';
import firmwareRoutes from './src/modules/firmware/index.js';

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

//rutas principales de la API
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api', projectsRoutes);
app.use('/api', devicesRoutes);
app.use('/api', firmwareRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'API OTA funcionando correctamente'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
});