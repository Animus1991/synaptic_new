import type { MessageCitation } from '../types';
import type { RagSynthesisSource } from './orgClient';

export function ragSourcesToCitations(sources: RagSynthesisSource[]): MessageCitation[] {
  return sources.map((source, index) => {
    const snippet =
      source.text.length > 160 ? `${source.text.slice(0, 157)}…` : source.text;
    const locator = source.page
      ? `p.${source.page}`
      : `¶${source.id.split('#')[1] ?? String(index + 1)}`;
    return {
      chunkId: source.id,
      fileId: source.fileId,
      fileName: source.fileName || source.fileId,
      locator,
      charStart: source.charStart ?? 0,
      charEnd: source.charEnd ?? source.text.length,
      page: source.page,
      heading: source.heading,
      snippet,
    };
  });
}
