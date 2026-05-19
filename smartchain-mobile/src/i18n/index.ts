import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import {getItem, setItem} from '../utils/storage';
import en from './en.json';
import fr from './fr.json';
import rw from './rw.json';

const LANG_KEY = 'app_language';

export type AppLanguage = 'en' | 'fr' | 'rw';

const resources = {
  en: {translation: en},
  fr: {translation: fr},
  rw: {translation: rw},
};

export async function initI18n(): Promise<void> {
  const saved = getItem(LANG_KEY) as AppLanguage | undefined;
  const lng = saved && ['en', 'fr', 'rw'].includes(saved) ? saved : 'en';

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources,
      lng,
      fallbackLng: 'en',
      interpolation: {escapeValue: false},
    });
  } else {
    await i18n.changeLanguage(lng);
  }
}

export async function setAppLanguage(lang: AppLanguage): Promise<void> {
  setItem(LANG_KEY, lang);
  await i18n.changeLanguage(lang);
}

export function getAppLanguage(): AppLanguage {
  const lng = i18n.language?.slice(0, 2);
  if (lng === 'fr' || lng === 'rw') {
    return lng;
  }
  return 'en';
}

export default i18n;
