import type { SynapsePlugin } from './pluginApi';

/** Reference plugins shipped with the L11 marketplace catalog. */
export const REFERENCE_PLUGINS: SynapsePlugin[] = [
  {
    id: 'synapse.fsrs-tags',
    name: 'FSRS export tags',
    version: '1.0.0',
    description: 'Ensures synapse:fsrs tag on every Leitner Anki export card',
    hooks: {
      'leitner:beforeExport': (payload) => {
        const cards = (payload as { front: string; back: string; tags?: string[] }[]) ?? [];
        return cards.map((card) => ({
          ...card,
          tags: [...new Set([...(card.tags ?? []), 'synapse:fsrs'])],
        }));
      },
    },
  },
  {
    id: 'synapse.export-watermark',
    name: 'Export watermark',
    version: '1.0.0',
    description: 'Adds synapse:exported date tag on Anki deck export',
    hooks: {
      'leitner:beforeExport': (payload) => {
        const stamp = new Date().toISOString().slice(0, 10);
        const cards = (payload as { front: string; back: string; tags?: string[] }[]) ?? [];
        return cards.map((card) => ({
          ...card,
          tags: [...new Set([...(card.tags ?? []), `synapse:exported:${stamp}`])],
        }));
      },
    },
  },
  {
    id: 'synapse.agent-preface',
    name: 'Agent study preface',
    version: '1.0.0',
    description: 'Prepends a brief study-mode hint to agent replies when enabled',
    hooks: {
      'agent:beforeReply': (payload) => {
        const body = payload as { text?: string; studyMode?: boolean };
        if (!body.studyMode || !body.text?.trim()) return payload;
        return { ...body, text: `[Study focus] ${body.text}` };
      },
    },
  },
];
