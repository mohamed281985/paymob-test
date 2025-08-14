import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import enTranslations from './translations/en'
import arTranslations from './translations/ar'
import frTranslations from './translations/fr'
import hiTranslations from './translations/hi'
import { HashRouter as Router } from 'react-router-dom';
import { AdModalProvider } from './contexts/AdModalContext';

// Initialize i18next
i18next
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      ar: { translation: arTranslations },
      fr: { translation: frTranslations },
      hi: { translation: hiTranslations }
    },
    lng: localStorage.getItem('language') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

// Initialize PWA elements
defineCustomElements(window);

// Fallback for web (if needed)
if (window.location.protocol === 'myapp:' && (window.location.host === 'verify' || window.location.host === 'index')) {
  window.location.hash = '#/dashboard';
} 

createRoot(document.getElementById("root")!).render(
  <Router>
    <AdModalProvider>
      <App />
    </AdModalProvider>
  </Router>
);
