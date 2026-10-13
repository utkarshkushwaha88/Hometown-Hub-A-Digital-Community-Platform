import { useEffect, useMemo, useState } from 'react';
import { Heart, MessageCircle, Share2, Flag, Pin, Trash2, Send, LoaderCircle, Pencil, Save, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Button, Badge } from './ui';
import { toast } from 'sonner';

function getId(value) { return String(value?._id || value || ''); }

export default function PostCard({ post, currentUser, canModerate = false, canInteract = true, onDeleted }) {
  const userId = getId(currentUser?._id || currentUser?.id);
  const [liked, setLiked] = useState(Boolean(userId && (post.likes || []).some((id) => getId(id) === userId)));
  const [likesCount, setLikesCount] = useState(post.likesCount ?? post.likes?.length ?? 0);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [postContent, setPostContent] = useState(post.content || '');
  const [editingPost, setEditingPost] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState('');
  const [editingCommentText, setEditingCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [isPinned, setIsPinned] = useState(Boolean(post.isPinned));
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [busyLike, setBusyLike] = useState(false);
  const [busyComment, setBusyComment] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const isAuthor = Boolean(userId && getId(post.author) === userId);

  useEffect(() => {
    setLiked(Boolean(userId && (post.likes || []).some((id) => getId(id) === userId)));
    setLikesCount(post.likesCount ?? post.likes?.length ?? 0);
    setCommentsCount(post.commentsCount || 0);
    setPostContent(post.content || '');
    setIsPinned(Boolean(post.isPinned));
  }, [post._id, post.likes, post.likesCount, post.commentsCount, post.isPinned, userId]);

  async function toggleLike() {
    if (!currentUser) { toast.error('Log in to like posts.'); return; }
    if (!canInteract) { toast.error('Join this community to like and comment.'); return; }
    setBusyLike(true);
    const previousLiked = liked;
    setLiked(!previousLiked);
    setLikesCount((count) => Math.max(0, count + (previousLiked ? -1 : 1)));
    try {
      const { data } = await api.post(`/posts/${post._id}/like`);
      setLiked(Boolean(data.liked));
      setLikesCount(Number(data.likesCount) || 0);
    } catch (error) {
      setLiked(previousLiked);
      setLikesCount((count) => Math.max(0, count + (previousLiked ? 1 : -1)));
      toast.error(error.response?.data?.message || error.message || 'Could not update like.');
    } finally { setBusyLike(false); }
  }

  async function loadComments() {
    setLoadingComments(true);
    try {
      const { data } = await api.get(`/posts/${post._id}/comments`);
      setComments(data.comments || []);
      setCommentsLoaded(true);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Could not load comments.');
    } finally { setLoadingComments(false); }
  }

  async function toggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && !commentsLoaded) await loadComments();
  }

  async function submitComment(event) {
    event.preventDefault();
    if (!currentUser) { toast.error('Log in to comment.'); return; }
    if (!canInteract) { toast.error('Join this community to comment.'); return; }
    const content = commentText.trim();
    if (!content) return;
    setBusyComment(true);
    try {
      const { data } = await api.post(`/posts/${post._id}/comments`, { content });
      setComments((items) => [...items, data.comment]);
      setCommentsLoaded(true);
      setCommentsCount((count) => count + 1);
      setCommentText('');
      setShowComments(true);
      toast.success('Comment added');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Could not add comment.');
    } finally { setBusyComment(false); }
  }

  async function deleteComment(comment) {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.delete(`/posts/comments/${comment._id}`);
      setComments((items) => items.filter((item) => item._id !== comment._id));
      setCommentsCount((count) => Math.max(0, count - 1));
      toast.success('Comment removed');
    } catch (error) { toast.error(error.response?.data?.message || error.message || 'Could not delete comment.'); }
  }

  async function reportComment(comment) {
    if (!currentUser) { toast.error('Log in to report content.'); return; }
    const reason = window.prompt('Why are you reporting this comment?');
    if (!reason?.trim()) return;
    try {
      await api.post('/reports', { targetType: 'comment', targetId: comment._id, reason: reason.trim().slice(0, 100) });
      toast.success('Comment report submitted for review');
    } catch (error) { toast.error(error.response?.data?.message || error.message || 'Could not report comment.'); }
  }

  async function sharePost() {
    const targetPath = post.community?.slug ? `/communities/${post.community.slug}` : window.location.pathname;
    const url = `${window.location.origin}${targetPath}#post-${post._id}`;
    const shareData = { title: 'Hometown Hub community post', text: post.content?.slice(0, 160) || 'See this community post on Hometown Hub', url };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); toast.success('Post link copied'); }
      else { window.prompt('Copy this post link', url); }
    } catch (error) {
      if (error?.name !== 'AbortError') toast.error('Could not share this post.');
    }
  }

  async function savePostEdit(event) {
    event.preventDefault();
    const content = postContent.trim();
    if (!content) { toast.error('Post cannot be empty.'); return; }
    setSavingPost(true);
    try {
      const { data } = await api.patch(`/posts/${post._id}`, { content });
      setPostContent(data.post?.content || content); setEditingPost(false); toast.success('Post updated');
    } catch (error) { toast.error(error.response?.data?.message || error.message || 'Could not update post.'); }
    finally { setSavingPost(false); }
  }

  async function saveCommentEdit(commentId) {
    const content = editingCommentText.trim();
    if (!content) { toast.error('Comment cannot be empty.'); return; }
    setSavingComment(true);
    try {
      const { data } = await api.patch(`/posts/comments/${commentId}`, { content });
      setComments(items => items.map(item => item._id === commentId ? data.comment : item));
      setEditingCommentId(''); setEditingCommentText(''); toast.success('Comment updated');
    } catch (error) { toast.error(error.response?.data?.message || error.message || 'Could not update comment.'); }
    finally { setSavingComment(false); }
  }

  async function reportPost() {
    if (!currentUser) { toast.error('Log in to report content.'); return; }
    const reason = window.prompt('Why are you reporting this post? (e.g. spam, harassment, misleading content)');
    if (!reason?.trim()) return;
    try {
      await api.post('/reports', { targetType: 'post', targetId: post._id, reason: reason.trim().slice(0, 100) });
      toast.success('Report submitted for review');
    } catch (error) { toast.error(error.response?.data?.message || error.message || 'Could not submit report.'); }
  }

  async function togglePin() {
    setBusyAction(true);
    try {
      const { data } = await api.post(`/posts/${post._id}/pin`);
      setIsPinned(Boolean(data.isPinned));
      toast.success(data.isPinned ? 'Post pinned as an announcement' : 'Post unpinned');
    } catch (error) { toast.error(error.response?.data?.message || error.message || 'Could not update pinned post.'); }
    finally { setBusyAction(false); }
  }

  async function deletePost() {
    if (!window.confirm('Remove this post?')) return;
    setBusyAction(true);
    try {
      await api.delete(`/posts/${post._id}`);
      toast.success('Post removed');
      onDeleted?.(post._id);
    } catch (error) { toast.error(error.response?.data?.message || error.message || 'Could not remove post.'); }
    finally { setBusyAction(false); }
  }

  const authorInitial = useMemo(() => (post.author?.name || 'U').trim().slice(0, 1).toUpperCase(), [post.author?.name]);

  return <article id={`post-${post._id}`} className="mb-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {post.author?.avatar ? <img src={post.author.avatar} alt="" className="h-10 w-10 rounded-full object-cover"/> : <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 font-bold text-emerald-900">{authorInitial}</div>}
        <div className="min-w-0"><p className="truncate font-bold text-slate-900">{post.author?.name || 'Community member'}</p><p className="text-xs text-slate-500">{post.community?.slug ? <Link className="hover:underline" to={`/communities/${post.community.slug}`}>{post.community.name}</Link> : post.community?.name || 'Community'} · {new Date(post.createdAt).toLocaleString()}</p></div>
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-1">{isPinned && <Badge className="bg-amber-50 text-amber-800"><Pin size={12} className="mr-1"/>Pinned announcement</Badge>}{post.category && <Badge>{post.category}</Badge>}</div>
    </div>
    {editingPost ? <form onSubmit={savePostEdit} className="mt-4 space-y-2"><textarea value={postContent} onChange={event => setPostContent(event.target.value)} minLength={1} maxLength={5000} rows={4} required className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500"/><div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => { setEditingPost(false); setPostContent(post.content || ''); }}><X size={14}/>Cancel</Button><Button type="submit" size="sm" disabled={savingPost}><Save size={14}/>{savingPost ? 'Saving…' : 'Save post'}</Button></div></form> : <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{postContent}</p>}
    {post.images?.length > 0 && <div className={`mt-4 grid gap-2 ${post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>{post.images.map((image, index) => <img key={image.fileId || image.url || index} src={image.url} alt={`Post attachment ${index + 1}`} loading="lazy" className="max-h-[28rem] w-full rounded-xl object-cover"/>)}</div>}
    {post.tags?.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{post.tags.map((tag) => <Badge key={tag} className="bg-slate-100 text-slate-600">#{tag}</Badge>)}</div>}
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
      <Button type="button" variant="ghost" size="sm" onClick={toggleLike} disabled={busyLike || !canInteract} aria-pressed={liked} className={liked ? 'text-rose-600' : ''}><Heart size={16} fill={liked ? 'currentColor' : 'none'}/>{likesCount} {likesCount === 1 ? 'like' : 'likes'}</Button>
      <Button type="button" variant="ghost" size="sm" onClick={toggleComments}><MessageCircle size={16}/>{commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}</Button>
      <Button type="button" variant="ghost" size="sm" onClick={sharePost}><Share2 size={16}/>Share</Button>
      {isAuthor && <Button type="button" variant="ghost" size="sm" onClick={() => { setPostContent(postContent || post.content || ''); setEditingPost(value => !value); }}><Pencil size={15}/>{editingPost ? 'Close edit' : 'Edit'}</Button>}
      {currentUser && !isAuthor && <Button type="button" variant="ghost" size="sm" onClick={reportPost} title="Report post"><Flag size={15}/>Report</Button>}
      {canModerate && <Button type="button" variant="ghost" size="sm" onClick={togglePin} disabled={busyAction}><Pin size={15}/>{isPinned ? 'Unpin' : 'Pin'}</Button>}
      {(isAuthor || canModerate || currentUser?.role === 'admin') && <Button type="button" variant="ghost" size="sm" onClick={deletePost} disabled={busyAction} className="text-rose-600"><Trash2 size={15}/>Remove</Button>}
    </div>
    {showComments && <div className="mt-3 border-t border-slate-100 pt-4">
      <h3 className="mb-3 text-sm font-bold">Comments</h3>
      {loadingComments ? <p className="flex items-center gap-2 py-3 text-sm text-slate-500"><LoaderCircle size={15} className="animate-spin"/>Loading comments…</p> : comments.length ? <div className="space-y-3">{comments.map((comment) => {
        const isCommentAuthor = userId && getId(comment.author) === userId;
        return <div key={comment._id} className="flex gap-2.5 rounded-xl bg-slate-50 p-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-slate-700">{(comment.author?.name || 'U').slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold">{comment.author?.name || 'Community member'} <span className="ml-1 font-normal text-slate-400">· {new Date(comment.createdAt).toLocaleDateString()}</span></p><div className="flex items-center gap-2">{currentUser && !isCommentAuthor && <button type="button" onClick={() => reportComment(comment)} className="text-xs text-slate-500 hover:underline">Report</button>}{isCommentAuthor && <button type="button" onClick={() => { setEditingCommentId(comment._id); setEditingCommentText(comment.content); }} className="text-xs text-slate-600 hover:underline">Edit</button>}{(isCommentAuthor || canModerate || currentUser?.role === 'admin') && <button type="button" onClick={() => deleteComment(comment)} className="text-xs text-rose-600 hover:underline">Delete</button>}</div></div>{editingCommentId === comment._id ? <div className="mt-2 space-y-2"><textarea value={editingCommentText} onChange={event => setEditingCommentText(event.target.value)} maxLength={1500} rows={2} className="w-full rounded-lg border border-slate-200 p-2 text-sm"/><div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setEditingCommentId('')}>Cancel</Button><Button type="button" size="sm" disabled={savingComment} onClick={() => saveCommentEdit(comment._id)}><Save size={13}/>{savingComment ? 'Saving…' : 'Save'}</Button></div></div> : <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{comment.content}</p>}</div></div>;
      })}</div> : <p className="py-2 text-sm text-slate-500">No comments yet. Start the conversation.</p>}
      {currentUser && canInteract && <form onSubmit={submitComment} className="mt-4 flex items-end gap-2"><textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} maxLength={1500} rows={2} placeholder="Write a comment…" className="min-h-11 flex-1 resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"/><Button type="submit" disabled={busyComment || !commentText.trim()}><Send size={15}/>{busyComment ? 'Sending…' : 'Comment'}</Button></form>}
      {!currentUser && <p className="mt-3 text-xs text-slate-500">Log in to join the conversation.</p>}
      {currentUser && !canInteract && <p className="mt-3 text-xs text-slate-500">Join this community to add comments and reactions.</p>}
    </div>}
  </article>;
}
