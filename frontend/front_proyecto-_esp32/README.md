<<<<<<< HEAD
# Front-end Arduino / ESP32

Proyecto frontend construido con Vite + React para una plataforma de actualización y control de dispositivos ESP32.

## Estructura

- `index.html` — entrada principal.
- `src/main.jsx` — arranque de la app y estilos globales.
- `src/App.jsx` — control de autenticación, persistencia de sesión y rutas.
- `src/components/` — componentes UI principales (`LoginForm`, `Dashboard`, `Sidebar`).
- `src/styles/` — estilos separados por componente y comunes.
- `src/services/auth.js` — servicio de autenticación preparado para un backend REST.

## Uso local

1. Instala dependencias:

```bash
npm install
```

2. Ejecuta en modo desarrollo:

```bash
npm run dev
```

3. Construye el bundle:

```bash
npm run build
```

4. Previsualiza el build:

```bash
npm run preview
```

## Calidad de proyecto

- `npm run lint` — ejecuta ESLint sobre archivos `.js` y `.jsx`.
- `npm run format` — formatea código con Prettier.

## Notas de implementación

- La app usa un servicio de auth en `src/services/auth.js` con login simulado.
- El backend real no está integrado todavía; el compañero debe reemplazar esta lógica por su API cuando esté listo.
- El token y el usuario se guardan en `localStorage` para mantener la sesión tras recargas.
- El dashboard es responsivo y mantiene un sidebar móvil desplegable.
- La app ya tiene una página 404 para rutas no encontradas.
- Los estilos se organizan por componente: `login.css`, `dashboard.css` y `common.css`.

## Siguientes pasos recomendados

1. Integrar backend real con autenticación segura.
2. Agregar rutas React Router para separar `/login` y `/dashboard`.
3. Conectar un servicio real de actualización OTA sobre ESP32.
4. Mantener calidad con `npm run lint` y `npm run format`.
=======
# front_proyecto-_esp32
front-end para proyecto de esp32, se ira actualizado cada sierto tiempo
>>>>>>> d656f7b155af77f5088615e64296f5dcace35874
