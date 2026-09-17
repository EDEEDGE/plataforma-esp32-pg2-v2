import 'dotenv/config';
import { transporter } from './src/config/mailer.js';

try {
  await transporter.verify();

  console.log('✅ Conexión SMTP correcta');
  console.log('✅ Brevo aceptó la configuración de Nodemailer');
} catch (error) {
  console.error('❌ Error SMTP:');
  console.error(error);
}