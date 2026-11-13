# Plataforma OTA para ESP32

Frontend de la plataforma construido con React y Vite. Consume la API del backend para administrar cuentas, salas, proyectos, dispositivos y actualizaciones de firmware.

## Funciones conectadas

- Registro, inicio y cierre de sesión; validación de sesión, perfil y recuperación de contraseña.
- Administración de usuarios para cuentas con rol de administrador.
- Creación y administración de salas, proyectos, miembros e invitaciones.
- Registro, edición, activación y vinculación de dispositivos ESP32 y ESP8266.
- Creación de versiones de firmware, carga de archivos `.bin` y asignación de despliegues OTA.
- Reportes por proyecto con resumen, historial OTA y estado de los dispositivos.

El frontend crea y asigna despliegues, pero no declara que una actualización terminó hasta que el dispositivo la confirma con el backend. Las llamadas de heartbeat, comprobación/descarga OTA y confirmación de instalación las realiza el dispositivo, no el navegador.

## Requisitos

- Node.js y npm.
- Backend disponible en `http://localhost:3000` (o la URL que se configure).

## Uso local

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Opcionalmente, crea `.env.local` para configurar el origen del backend:

   ```dotenv
   VITE_API_URL=http://localhost:3000
   ```

   La aplicación agrega `/api` a este valor. Si no se configura, usa `http://localhost:3000/api`.

3. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

4. Comprueba el código y genera el bundle de producción:

   ```bash
   npm run lint
   npm run build
   ```

5. Para previsualizar el bundle:

   ```bash
   npm run preview
   ```

## Notas de integración

- Las llamadas de la interfaz están centralizadas en `src/services/` y usan autenticación Bearer para las rutas protegidas.
- La sesión del navegador se conserva en `localStorage`.
- El backend debe configurar los enlaces enviados por correo para recuperación de contraseña e invitaciones con el origen público correcto del frontend; en desarrollo, su valor esperado es `http://localhost:5173`.
- El estado final de una actualización OTA depende de que el dispositivo complete la instalación y confirme el resultado con el backend.
