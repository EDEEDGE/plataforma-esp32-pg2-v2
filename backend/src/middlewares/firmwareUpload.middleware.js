import multer from 'multer';


// Guardar temporalmente el archivo en memoria RAM
const storage = multer.memoryStorage();


// Validar que solamente se acepten archivos .bin
const fileFilter = (req, file, callback) => {
  const fileName = file.originalname.toLowerCase();

  if (!fileName.endsWith('.bin')) {
    return callback(
      new Error('Solo se permiten archivos con extensión .bin')
    );
  }

  callback(null, true);
};


// Configuración de Multer
export const firmwareUpload = multer({
  storage,

  fileFilter,

  limits: {
    // Máximo 8 MB
    fileSize: 8 * 1024 * 1024
  }
});