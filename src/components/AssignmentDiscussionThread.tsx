import { useCallback, useEffect, useMemo, useState } from 'react';
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
  reply: string;
  askPlaceholder: string;
  replyPlaceholder: string;
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

function PostCard({
  post,
  replies,
  ui,
  lang,
  role,
  busy,
  replyToId,
  replyDraft,
  onReply,
  onReplyDraftChange,
  onSubmitReply,
  onCancelReply,
  onRemove,
}: {
  post: DiscussionPostRow;
  replies: DiscussionPostRow[];
  ui: DiscussionUi;
  lang: 'en' | 'el';
  role: 'teacher' | 'student';
  busy: boolean;
  replyToId: string | null;
  replyDraft: string;
  onReply: (postId: string) => void;
  onReplyDraftChange: (value: string) => void;
  onSubmitReply: (parentPostId: string) => void;
  onCancelReply: () => void;
  onRemove: (post: DiscussionPostRow) => void;
}) {
  const canRemove =
    role === 'teacher' || (role === 'student' && post.authorRole === 'student');

  return (
    <li className="space-y-2" data-testid={`discussion-thread-${post.id}`}>
      <div
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
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onReply(post.id)}
              disabled={busy}
              className="text-accent hover:underline text-[10px]"
              data-testid={`discussion-reply-${post.id}`}
            >
              {ui.reply}
            </button>
            {canRemove && ui.remove && (
              <button
                type="button"
                onClick={() => void onRemove(post)}
                disabled={busy}
                className="text-accent-rose hover:underline text-[10px]"
              >
                {ui.remove}
              </button>
            )}
          </div>
        </div>
      </div>

      {replies.length > 0 && (
        <ul className="ml-3 pl-3 border-l border-border/50 space-y-2">
          {replies.map((reply) => (
            <li
              key={reply.id}
              className="rounded-lg border border-border/30 bg-surface/50 p-2"
              data-testid={`discussion-post-${reply.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'text-[9px] px-1.5 py-0.5 rounded-full',
                        reply.authorRole === 'teacher'
                          ? 'bg-brand-600/10 text-brand-800'
                          : 'bg-surface-hover text-text-secondary',
                      )}
                    >
                      {reply.authorRole === 'teacher' ? ui.roleTeacher : ui.roleStudent}
                    </span>
                    <span className="text-[9px] text-text-muted">
                      {formatDateTime(reply.createdAt, lang)}
                    </span>
                  </div>
                  <p className="text-text-secondary whitespace-pre-wrap">{reply.body}</p>
                </div>
                {(role === 'teacher' ||
                  (role === 'student' && reply.authorRole === 'student')) &&
                  ui.remove && (
                    <button
                      type="button"
                      onClick={() => void onRemove(reply)}
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

      {replyToId === post.id && (
        <div className="ml-3 flex flex-wrap gap-2 items-end">
          <textarea
            value={replyDraft}
            onChange={(e) => onReplyDraftChange(e.target.value)}
            placeholder={ui.replyPlaceholder}
            rows={2}
            data-testid={`assignment-discussion-reply-input-${post.id}`}
            className="flex-1 min-w-[140px] px-2 py-1.5 rounded-lg border border-border bg-surface text-xs resize-y"
          />
          <button
            type="button"
            onClick={() => void onSubmitReply(post.id)}
            disabled={busy || !replyDraft.trim()}
            data-testid={`assignment-discussion-reply-post-${post.id}`}
            className="px-2 py-1.5 rounded-lg bg-brand-600 text-white text-[10px] font-medium disabled:opacity-50"
          >
            {ui.post}
          </button>
          <button
            type="button"
            onClick={onCancelReply}
            disabled={busy}
            className="px-2 py-1.5 rounded-lg border border-border text-[10px]"
          >
            ×
          </button>
        </div>
      )}
    </li>
  );
}

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
  const [rootDraft, setRootDraft] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
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

  const rootPosts = useMemo(
    () => posts.filter((post) => !post.parentPostId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [posts],
  );

  const repliesByParent = useMemo(() => {
    const map = new Map<string, DiscussionPostRow[]>();
    for (const post of posts) {
      if (!post.parentPostId) continue;
      const list = map.get(post.parentPostId) ?? [];
      list.push(post);
      map.set(post.parentPostId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    return map;
  }, [posts]);

  const submitPost = async (body: string, parentPostId?: string) => {
    if (!token || !body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      if (role === 'teacher') {
        await postAssignmentDiscussion(token, settings, classId, assignmentId, body.trim(), parentPostId);
      } else {
        await postStudentAssignmentDiscussion(
          token,
          settings,
          classId,
          assignmentId,
          body.trim(),
          parentPostId,
        );
      }
      if (parentPostId) {
        setReplyDraft('');
        setReplyToId(null);
      } else {
        setRootDraft('');
      }
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
      if (replyToId === post.id) {
        setReplyToId(null);
        setReplyDraft('');
      }
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
          ) : rootPosts.length === 0 ? (
            <p className="text-text-muted text-[10px]">{ui.empty}</p>
          ) : (
            <ul className="space-y-3 max-h-52 overflow-y-auto">
              {rootPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  replies={repliesByParent.get(post.id) ?? []}
                  ui={ui}
                  lang={lang}
                  role={role}
                  busy={busy}
                  replyToId={replyToId}
                  replyDraft={replyDraft}
                  onReply={(id) => {
                    setReplyToId(id);
                    setReplyDraft('');
                  }}
                  onReplyDraftChange={setReplyDraft}
                  onSubmitReply={(parentPostId) => void submitPost(replyDraft, parentPostId)}
                  onCancelReply={() => {
                    setReplyToId(null);
                    setReplyDraft('');
                  }}
                  onRemove={handleRemove}
                />
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2 items-end pt-1 border-t border-border/40">
            <textarea
              value={rootDraft}
              onChange={(e) => setRootDraft(e.target.value)}
              placeholder={ui.askPlaceholder || ui.placeholder}
              rows={2}
              data-testid={`assignment-discussion-input-${assignmentId}`}
              className="flex-1 min-w-[140px] px-2 py-1.5 rounded-lg border border-border bg-surface text-xs resize-y"
            />
            <button
              type="button"
              onClick={() => void submitPost(rootDraft)}
              disabled={busy || !rootDraft.trim()}
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
