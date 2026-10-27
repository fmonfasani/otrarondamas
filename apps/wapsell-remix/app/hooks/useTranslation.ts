import { useTranslation as useI18nTranslation } from 'react-i18next';

export function useTranslation(namespace?: string) {
  return useI18nTranslation(namespace);
}

export function useLocale() {
  const { i18n } = useI18nTranslation();
  return i18n.language;
}
