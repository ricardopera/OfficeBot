import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ptBR from './pt-BR.json';
import en from './en.json';

i18n.use(initReactI18next).init({
  lng: 'pt-BR',
  fallbackLng: 'pt-BR',
  resources: {
    'pt-BR': { translation: ptBR },
    en: { translation: en },
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
