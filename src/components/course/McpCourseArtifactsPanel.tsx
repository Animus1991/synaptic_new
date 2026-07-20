/**
 * Client reader for MCP-written course artifacts (MCP-02).
 */
import type { Course } from '../../types';
import { BlueprintSurface } from '../ui/BlueprintSurface';
import { AllCapsLabel } from '../ui/AllCapsLabel';

export type McpFlashcard = {
  id: string;
  front: string;
  back: string;
  createdAt: string;
  source?: string;
};

export type McpAnnotation = {
  id: string;
  text: string;
  note?: string;
  createdAt: string;
  source?: string;
};

type CourseWithMcp = Course & {
  mcpFlashcards?: McpFlashcard[];
  mcpAnnotations?: McpAnnotation[];
};

type Props = {
  course: CourseWithMcp;
  lang?: 'en' | 'el';
};

export function McpCourseArtifactsPanel({ course, lang = 'en' }: Props) {
  const cards = course.mcpFlashcards ?? [];
  const notes = course.mcpAnnotations ?? [];
  const empty = cards.length === 0 && notes.length === 0;

  const title = lang === 'el' ? 'MCP αντικείμενα' : 'MCP artifacts';
  const subtitle =
    lang === 'el'
      ? 'Flashcards και σημειώσεις που δημιούργησαν εξωτερικοί MCP clients.'
      : 'Flashcards and notes created by external MCP clients.';

  return (
    <BlueprintSurface className="p-4 space-y-4" data-testid="mcp-course-artifacts">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>
      </div>

      {empty ? (
        <p className="text-xs text-text-muted" data-testid="mcp-artifacts-empty">
          {lang === 'el'
            ? 'Δεν υπάρχουν ακόμα MCP flashcards ή annotations για αυτό το μάθημα.'
            : 'No MCP flashcards or annotations on this course yet.'}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <section aria-label="MCP flashcards">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-2">
              <AllCapsLabel>Flashcards ({cards.length})</AllCapsLabel>
            </h4>
            <ul className="space-y-2" data-testid="mcp-flashcards-list">
              {cards.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg border border-border-subtle/70 bg-surface-secondary/40 px-3 py-2"
                  data-testid="mcp-flashcard-row"
                >
                  <p className="text-xs font-medium text-text-primary">{c.front}</p>
                  <p className="text-[11px] text-text-secondary mt-1">{c.back}</p>
                </li>
              ))}
            </ul>
          </section>
          <section aria-label="MCP annotations">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-2">
              <AllCapsLabel>Annotations ({notes.length})</AllCapsLabel>
            </h4>
            <ul className="space-y-2" data-testid="mcp-annotations-list">
              {notes.map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg border border-border-subtle/70 bg-surface-secondary/40 px-3 py-2"
                  data-testid="mcp-annotation-row"
                >
                  <p className="text-xs text-text-primary">{a.text}</p>
                  {a.note ? <p className="text-[11px] text-text-secondary mt-1">{a.note}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </BlueprintSurface>
  );
}
