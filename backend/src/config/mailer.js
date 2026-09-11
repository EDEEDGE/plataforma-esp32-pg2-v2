import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: process.env.MAIL_SECURE === 'true',

  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

/*
transporter.verify((error, success) => {
  if (error) {
    console.error('Error SMTP:', error);
  } else {
    console.log('Servidor SMTP listo para enviar correos');
  }
});*/