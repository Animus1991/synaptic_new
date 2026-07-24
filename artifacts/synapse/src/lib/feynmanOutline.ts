import { t, type Lang } from './i18n';

export function feynmanDefaultOutline(concept: string, lang: Lang): string[] {
  return [
    t('feynmanOutline1', lang).replace('{concept}', concept),
    t('feynmanOutline2', lang),
    t('feynmanOutline3', lang),
    t('feynmanOutline4', lang),
  ];
}

export function feynmanExplainPlaceholder(concept: string, lang: Lang): string {
  return t('feynmanExplainPlaceholder', lang).replace('{concept}', concept);
}
