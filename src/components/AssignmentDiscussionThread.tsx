import { useCallback, useEffect, useState } from 'react';
import { MessageSquare } from '@/lib/lucide-shim';
import type { UserSettings } from '../types';
import type { DiscussionPostRow } from '../lib/teacherClassTypes';
import {
  deleteAssignmentDiscussionPost,
  fetchAssignmentDiscussion,
  postAssignmentDiscussion,
} from '../lib/authClient';
import {
  fetchStudentAssignmentDiscussion,
  postStudentAssignmentDiscussion,
} from '../lib/orgClient';
import { formatDateTime } from '../lib/localeFormat';
import { cn } from '../utils/cn';

export type DiscussionUi = {
  toggle: string;
  hint: string;
  placeholder: string;
  post: string;
  empty: string;
  roleTeacher: string;
  roleStudent: string;
  remove: string;
};

type Props = {
  classId: string;
  assignmentId: string;
  assignmentTitle: string;
  settings: UserSettings;
  lang: 'en' | 'el';
  role: 'teacher' | 'student';
  ui: DiscussionUi;
  open: boolean;
  onToggle: () => void;
  hideToggle?: boolean;
};

export function AssignmentDiscussionThread({
  classId,
  assignmentId,
  assignmentTitle,
  settings,
  lang,
  role,
  ui,
  open,
  onToggle,
  hideToggle = false,
}: Props) {
  const [posts, setPosts] = useState<DiscussionPostRow[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = settings.authToken?.trim() ?? '';

  const load = useCallback(async () => {
    if (!token || !open) return;
    setLoading(true);
    setError(null);
    try {
      const json =
        role === 'teacher'
          ? await fetchAssignmentDiscussion(token, settings, classId, assignmentId)
          : await fetchStudentAssignmentDiscussion(token, settings, classId, assignmentId);
      setPosts(json.posts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [token, open, role, settings, classId, assignmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePost = async () => {
    if (!token || !draft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      if (role === 'teacher') {
        await postAssignmentDiscussion(token, settings, classId, assignmentId, draft.trim());
      } else {
        await postStudentAssignmentDiscussion(token, settings, classId, assignmentId, draft.trim());
      }
      setDraft('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (post: DiscussionPostRow) => {
    if (!token || role !== 'teacher') return;
    setBusy(true);
    setError(null);
    try {
      await deleteAssignmentDiscussionPost(token, settings, classId, assignmentId, post.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid={`assignment-discussion-${assignmentId}`}>
      {!hideToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1 text-[10px] text-accent hover:underline"
          data-testid={`assignment-discussion-toggle-${assignmentId}`}
        >
          <MessageSquare className="w-3 h-3" />
          {ui.toggle}
          {posts.length > 0 && <span className="text-text-muted">({posts.length})</span>}
        </button>
      )}

      {open && (
        <div className="mt-2 rounded-xl border border-border/60 bg-surface/40 p-3 space-y-2 text-xs">
          <p className="text-[10px] text-text-muted">
            {ui.hint} — {assignmentTitle}
          </p>
          {error && <p className="text-accent-rose text-[10px]">{error}</p>}
          {loading ? (
            <p className="text-text-muted text-[10px]">…</p>
          ) : posts.length === 0 ? (
            <p className="text-text-muted text-[10px]">{ui.empty}</p>
          ) : (
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {posts.map((post) => (
                <li
                  key={post.id}
                  className="rounded-lg border border-border/40 bg-surface/60 p-2"
                  data-testid={`discussion-post-${post.id}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'text-[9px] px-1.5 py-0.5 rounded-full',
                            post.authorRole === 'teacher'
                              ? 'bg-brand-600/10 text-brand-800'
                              : 'bg-surface-hover text-text-secondary',
                          )}
                        >
                          {post.authorRole === 'teacher' ? ui.roleTeacher : ui.roleStudent}
                        </span>
                        <span className="text-[9px] text-text-muted">
                          {formatDateTime(post.createdAt, lang)}
                        </span>
                      </div>
                      <p className="text-text-secondary whitespace-pre-wrap">{post.body}</p>
                    </div>
                    {(role === 'teacher') && (
                      <button
                        type="button"
                        onClick={() => void handleRemove(post)}
                        disabled={busy}
                        className="text-accent-rose hover:underline shrink-0 text-[10px]"
                      >
                        {ui.remove}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2 items-end pt-1">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={ui.placeholder}
              rows={2}
              data-testid={`assignment-discussion-input-${assignmentId}`}
              className="flex-1 min-w-[140px] px-2 py-1.5 rounded-lg border border-border bg-surface text-xs resize-y"
            />
            <button
              type="button"
              onClick={() => void handlePost()}
              disabled={busy || !draft.trim()}
              data-testid={`assignment-discussion-post-${assignmentId}`}
              className="px-2 py-1.5 rounded-lg bg-brand-600 text-white text-[10px] font-medium disabled:opacity-50"
            >
              {ui.post}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
