import type { I18nKey } from './i18n';

export type VisualLabModeId =
  | 'source'
  | 'concept'
  | 'mastery'
  | 'retention'
  | 'exam'
  | 'formula';

export type VisualLabMode = {
  id: VisualLabModeId;
  titleKey: I18nKey;
  subtitleKey: I18nKey;
  hintKey: I18nKey;
};

export const VISUAL_LAB_MODES: VisualLabMode[] = [
  {
    id: 'source',
    titleKey: 'visualLabModeSourceTitle',
    subtitleKey: 'visualLabModeSourceSubtitle',
    hintKey: 'visualLabModeSourceHint',
  },
  {
    id: 'concept',
    titleKey: 'visualLabModeConceptTitle',
    subtitleKey: 'visualLabModeConceptSubtitle',
    hintKey: 'visualLabModeConceptHint',
  },
  {
    id: 'mastery',
    titleKey: 'visualLabModeMasteryTitle',
    subtitleKey: 'visualLabModeMasterySubtitle',
    hintKey: 'visualLabModeMasteryHint',
  },
  {
    id: 'retention',
    titleKey: 'visualLabModeRetentionTitle',
    subtitleKey: 'visualLabModeRetentionSubtitle',
    hintKey: 'visualLabModeRetentionHint',
  },
  {
    id: 'exam',
    titleKey: 'visualLabModeExamTitle',
    subtitleKey: 'visualLabModeExamSubtitle',
    hintKey: 'visualLabModeExamHint',
  },
  {
    id: 'formula',
    titleKey: 'visualLabModeFormulaTitle',
    subtitleKey: 'visualLabModeFormulaSubtitle',
    hintKey: 'visualLabModeFormulaHint',
  },
];

export type SourceVisualTile = {
  id: string;
  labelKey: I18nKey;
  visualKey: I18nKey;
  symbol: string;
};

export const SOURCE_VISUAL_TILES: SourceVisualTile[] = [
  { id: 'pdf', labelKey: 'visualLabTilePdfLabel', visualKey: 'visualLabTilePdfVisual', symbol: 'PDF' },
  { id: 'slides', labelKey: 'visualLabTileSlidesLabel', visualKey: 'visualLabTileSlidesVisual', symbol: 'SL' },
  { id: 'code', labelKey: 'visualLabTileCodeLabel', visualKey: 'visualLabTileCodeVisual', symbol: '{}' },
  { id: 'audio', labelKey: 'visualLabTileAudioLabel', visualKey: 'visualLabTileAudioVisual', symbol: '♪' },
];
