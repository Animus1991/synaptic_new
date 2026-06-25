import { countConversationTurnMarkers } from './textSegmentation';
import { analyzeDocumentStructure } from './documentStructureReport';

export interface UploadStructureSummary {
  conversationTurns: number;
  sectionCount: number;
  structureKind: string;
}

export function summarizeUploadStructure(
  text: string,
  lang: 'en' | 'el' = 'en',
): UploadStructureSummary {
  const trimmed = text.trim();
  const structure = analyzeDocumentStructure(trimmed, lang);
  const conversationTurns = countConversationTurnMarkers(trimmed);
  return {
    conversationTurns,
    sectionCount: structure.sectionCount,
    structureKind: structure.kind,
  };
}

export function formatUploadSuccessToast(
  summary: UploadStructureSummary,
  lang: 'en' | 'el' = 'en',
): string {
  const conversations = summary.conversationTurns;
  const sections = summary.sectionCount;
  if (lang === 'el') {
    if (conversations >= 2) {
      return `${conversations} συνομιλίες, ${sections} ενότητες ανιχνεύθηκαν`;
    }
    return `${sections} ενότητες ανιχνεύθηκαν`;
  }
  if (conversations >= 2) {
    return `${conversations} conversations, ${sections} sections detected`;
  }
  return `${sections} sections detected`;
}
