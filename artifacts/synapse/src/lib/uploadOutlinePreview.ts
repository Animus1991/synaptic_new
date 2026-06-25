import type { CourseSourceQuality, UserSettings } from '../types';
import { analyzeContentToOutline } from './contentAnalysis';
import {
  analyzeCourseSourceQuality,
  buildOutlinePreviewFromTitles,
} from './courseSourceQuality';
import type { GeneratedOutline } from './courseGenerator';
import {
  analyzeDocumentStructure,
  type DocumentStructureReport,
} from './documentStructureReport';
import { readTextFromFiles, type UploadPayload } from './uploadPipeline';
import { fetchYoutubeTranscript } from './youtubeTranscript';

const PREVIEW_CHAR_LIMIT = 120_000;

export interface UploadOutlinePreview {
  outline: GeneratedOutline;
  quality: CourseSourceQuality;
  structure: DocumentStructureReport;
  sourceWordCount: number;
  fileNames: string[];
  warnings: string[];
}

function previewLang(settings?: UserSettings): 'en' | 'el' {
  return settings?.language === 'el' ? 'el' : 'en';
}

/** Build a course outline preview from already-extracted material text. */
export function buildMaterialOutlinePreview(
  text: string,
  fileNames: string[],
  settings?: UserSettings,
): UploadOutlinePreview | null {
  const clean = (text ?? '').trim().slice(0, PREVIEW_CHAR_LIMIT);
  if (clean.length < 80) return null;

  const lang = previewLang(settings);
  const structure = analyzeDocumentStructure(clean, lang);

  let outline = analyzeContentToOutline(clean, fileNames, settings);
  if (!outline) {
    const sectionTitles = structure.sections
      .map((s) => s.heading)
      .filter((h): h is string => Boolean(h && h.length > 1 && !/page break/i.test(h)))
      .slice(0, 8);
    const fallbackTitle =
      fileNames[0]?.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ') || 'Course';
    outline = buildOutlinePreviewFromTitles({
      title: fallbackTitle,
      subject: 'General',
      topics: sectionTitles.length >= 2 ? sectionTitles : [fallbackTitle],
    });
  }

  const quality = analyzeCourseSourceQuality(clean, outline);
  const warnings: string[] = [];
  if (quality.needsMoreMaterial) warnings.push(...quality.warnings.slice(0, 2));
  if (structure.sectionCount < 2 && structure.kind === 'flat') {
    warnings.push(
      lang === 'el'
        ? 'Λίγη δομή ανιχνεύθηκε — τα modules μπορεί να βασίζονται σε keyphrases.'
        : 'Limited structure detected — modules may be keyphrase-based.',
    );
  }

  return {
    outline,
    quality,
    structure,
    sourceWordCount: quality.metrics.wordCount,
    fileNames,
    warnings,
  };
}

/** Extract upload sources client-side and produce an outline preview before generate. */
export async function previewUploadOutline(
  payload: Pick<UploadPayload, 'files' | 'pastedContent' | 'youtubeUrl'>,
  settings?: UserSettings,
): Promise<UploadOutlinePreview | null> {
  const parts: string[] = [];
  const fileNames = payload.files.map((f) => f.name);

  if (payload.files.length > 0) {
    const fileText = await readTextFromFiles(payload.files, settings);
    if (fileText.trim()) parts.push(fileText);
  }
  if (payload.pastedContent?.trim()) parts.push(payload.pastedContent.trim());

  if (payload.youtubeUrl?.trim()) {
    try {
      const transcript = await fetchYoutubeTranscript(payload.youtubeUrl.trim(), settings);
      if (transcript?.trim()) {
        parts.push(transcript);
        fileNames.push('YouTube transcript');
      }
    } catch {
      /* preview without transcript is acceptable */
    }
  }

  return buildMaterialOutlinePreview(parts.join('\n\n'), fileNames, settings);
}
