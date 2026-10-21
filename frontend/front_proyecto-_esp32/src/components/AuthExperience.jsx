import { useLayoutEffect, useRef } from 'react';
import '../styles/auth-experience.css';

let previousExperienceHeight = 560;

const panelContent = {
  login: {
    title: 'Bienvenido de nuevo',
    description: 'Accede a tu espacio y continúa gestionando tus dispositivos ESP32.',
    action: 'Crear una cuenta'
  },
  register: {
    title: 'Empieza hoy',
    description: 'Crea tu perfil para gestionar y actualizar tus dispositivos.',
    action: 'Iniciar sesión'
  },
  recovery: {
    title: 'Tu espacio te espera',
    description: 'Cuando estés listo, vuelve al portal para continuar gestionando tus dispositivos.',
    action: 'Volver al inicio de sesión'
  }
};

export default function AuthExperience({ mode, onPanelAction, children }) {
  const experienceRef = useRef(null);
  const content = panelContent[mode] || panelContent.login;
  const isRegister = mode === 'register';
  const experienceClass = [
    'auth-experience',
    isRegister ? 'is-register' : '',
    mode === 'recovery' ? 'is-recovery' : ''
  ].filter(Boolean).join(' ');

  useLayoutEffect(() => {
    const experience = experienceRef.current;
    if (!experience) {
      return undefined;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const initialHeight = previousExperienceHeight;

    experience.style.height = 'auto';
    const targetHeight = experience.scrollHeight;

    if (reducedMotion) {
      experience.style.height = 'auto';
      return undefined;
    }

    const sizeAnimation = experience.animate(
      [
        { height: `${initialHeight}px` },
        { height: `${targetHeight}px` }
      ],
      {
        duration: 760,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards'
      }
    );
    sizeAnimation.onfinish = () => {
      experience.style.height = 'auto';
      sizeAnimation.cancel();
    };

    return () => {
      previousExperienceHeight = experience.getBoundingClientRect().height;
      sizeAnimation.cancel();
    };
  }, []);

  return (
    <section
      ref={experienceRef}
      className={experienceClass}
      aria-label="Acceso a la plataforma"
    >
      <div className="auth-experience-form">{children}</div>
      <aside className="auth-experience-panel">
        <div key={mode} className="auth-experience-panel-content">
          <p className="auth-experience-eyebrow">Plataforma ESP32</p>
          <h2>{content.title}</h2>
          <p>{content.description}</p>
          <button
            type="button"
            className="auth-experience-action"
            onClick={onPanelAction}
          >
            {content.action}
          </button>
        </div>
      </aside>
    </section>
  );
}
