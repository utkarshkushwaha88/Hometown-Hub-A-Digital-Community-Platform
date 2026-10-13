import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Users, ShieldCheck, CalendarPlus, Plus, X, ImagePlus, UploadCloud, Settings2, Check, UserRoundCheck, UserRoundX, Pin } from 'lucide-react';
import { api } from '../lib/api';
import { Button, Card, Badge, Input, Textarea } from '../components/ui';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';

const MAX_EVENT_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EVENT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_POST_IMAGE_SIZE = 5 * 1024 * 1024;
const DEFAULT_POST_CATEGORIES = ['Discussion', 'Local news', 'Recommendation', 'Culture & traditions', 'Announcement', 'Community initiative'];
const DEFAULT_EVENT_CATEGORIES = ['Community event', 'Culture & traditions', 'Meetup', 'Volunteering', 'Sports & recreation', 'Education'];

async function uploadEventImage(file, prefix = 'event') {
  const { data: auth } = await api.post('/uploads/auth');
  const body = new FormData();
  body.append('file', file);
  body.append('fileName', `${prefix}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`);
  body.append('publicKey', auth.publicKey);
  body.append('signature', auth.signature);
  body.append('token', auth.token);
  body.append('expire', String(auth.expire));
  body.append('useUniqueFileName', 'true');
  const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', body });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.message || 'Event image upload failed. Check ImageKit configuration.');
  return result.url;
}

export default function Community() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [postCategory, setPostCategory] = useState('Discussion');
  const [postCategories, setPostCategories] = useState(DEFAULT_POST_CATEGORIES);
  const [eventCategories, setEventCategories] = useState(DEFAULT_EVENT_CATEGORIES);
  const [postTags, setPostTags] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [pinAsAnnouncement, setPinAsAnnouncement] = useState(false);
  const [postImages, setPostImages] = useState([]);
  const previewUrls = useRef(new Set());
  const [busy, setBusy] = useState(false);
  const [memberRequests, setMemberRequests] = useState([]);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [requestBusy, setRequestBusy] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [rulesText, setRulesText] = useState('');
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventBusy, setEventBusy] = useState(false);
  const [eventImage, setEventImage] = useState(null);
  const [eventImagePreview, setEventImagePreview] = useState('');

  async function load() {
    try {
      const [c, p] = await Promise.all([
        api.get(`/communities/${slug}`),
        api.get(`/communities/${slug}/posts`)
      ]);
      setCommunity(c.data.community);
      setPosts((p.data.posts || []).map(item => ({ ...item, community: c.data.community })));
      setRulesText((c.data.community.rules || []).join('\n'));
    } catch (e) { toast.error(e.response?.data?.message || e.message); }
  }
  useEffect(() => { load(); }, [slug]);
  useEffect(() => {
    Promise.all([api.get('/categories', { params: { type: 'post' } }), api.get('/categories', { params: { type: 'event' } }), api.get('/categories/tags')]).then(([postsData, eventsData, tagsData]) => {
      const postNames = [...new Set([...DEFAULT_POST_CATEGORIES, ...(postsData.data.categories || []).map(item => item.name)])];
      const eventNames = [...new Set([...DEFAULT_EVENT_CATEGORIES, ...(eventsData.data.categories || []).map(item => item.name)])];
      setPostCategories(postNames); setEventCategories(eventNames); setTagSuggestions((tagsData.data.tags || []).map(item => item.name));
    }).catch(() => {});
  }, []);
  useEffect(() => () => { previewUrls.current.forEach(url => URL.revokeObjectURL(url)); previewUrls.current.clear(); }, []);
  useEffect(() => {
    if (!eventImage) { setEventImagePreview(''); return undefined; }
    const previewUrl = URL.createObjectURL(eventImage);
    setEventImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [eventImage]);

  async function join() {
    try {
      const { data } = await api.post(`/communities/${community._id}/join`);
      toast.success(data.message || 'Membership updated');
      await load();
    } catch (e) { toast.error(e.response?.data?.message || e.message); }
  }

  async function leave() {
    if (!window.confirm(`Leave ${community.name}? You may need approval to join again if it is private.`)) return;
    try {
      await api.post(`/communities/${community._id}/leave`);
      toast.success('You left this community');
      await load();
    } catch (e) { toast.error(e.response?.data?.message || e.message || 'Could not leave community.'); }
  }
  async function post(e) {
    e.preventDefault();
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      toast.error('Write something before publishing.');
      return;
    }

    setBusy(true);
    try {
      if (postImages.length > 8) throw new Error('You can attach up to 8 images to one post.');
      const images = [];
      for (const item of postImages) {
        if (!ALLOWED_EVENT_IMAGE_TYPES.includes(item.file.type)) throw new Error('Post images must be JPG, PNG, or WebP.');
        if (item.file.size > MAX_POST_IMAGE_SIZE) throw new Error('Each post image must be 5 MB or smaller.');
      }
      if (postImages.length) toast.message('Uploading post images…');
      for (const item of postImages) images.push({ url: await uploadEventImage(item.file, 'post') });
      const tags = postTags.split(',').map(tag => tag.trim().replace(/^#/, '')).filter(Boolean).slice(0, 10);
      const { data } = await api.post(`/posts/communities/${community._id}/posts`, {
        content: trimmedContent,
        category: postCategory,
        tags,
        images,
      });
      let createdPost = data?.post;
      if (createdPost && pinAsAnnouncement && canModerate) {
        try {
          await api.post(`/posts/${createdPost._id}/pin`);
          createdPost = { ...createdPost, isPinned: true };
        } catch (pinError) { toast.error(pinError.response?.data?.message || 'Post published, but it could not be pinned.'); }
      }
      if (createdPost) setPosts(current => [createdPost, ...current]);
      setContent(''); setPostTags(''); setPostCategory('Discussion'); setPinAsAnnouncement(false);
      postImages.forEach(item => { URL.revokeObjectURL(item.preview); previewUrls.current.delete(item.preview); });
      setPostImages([]);
      toast.success('Post published');
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message || err.message || 'Could not publish post';
      toast.error(status === 404
        ? 'The post API route was not found. Restart the updated backend server and try again.'
        : message);
    } finally {
      setBusy(false);
    }
  }

  function selectPostImages(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    if (postImages.length + selected.length > 8) { toast.error('You can attach up to 8 images to one post.'); return; }
    for (const file of selected) {
      if (!ALLOWED_EVENT_IMAGE_TYPES.includes(file.type)) { toast.error('Choose JPG, PNG, or WebP images.'); return; }
      if (file.size > MAX_POST_IMAGE_SIZE) { toast.error('Each post image must be 5 MB or smaller.'); return; }
    }
    const withPreviews = selected.map(file => {
      const preview = URL.createObjectURL(file); previewUrls.current.add(preview); return { file, preview };
    });
    setPostImages(current => [...current, ...withPreviews]);
  }

  function removePostImage(preview) {
    URL.revokeObjectURL(preview); previewUrls.current.delete(preview);
    setPostImages(current => current.filter(item => item.preview !== preview));
  }

  async function loadMemberRequests() {
    try {
      const { data } = await api.get(`/communities/${community._id}/requests`);
      setMemberRequests(data.requests || []); setRequestsOpen(true);
    } catch (error) { toast.error(error.response?.data?.message || error.message || 'Could not load member requests.'); }
  }

  async function decideMemberRequest(requestId, status) {
    setRequestBusy(requestId);
    try {
      await api.patch(`/communities/${community._id}/requests/${requestId}`, { status });
      setMemberRequests(current => current.filter(item => item._id !== requestId));
      toast.success(`Member request ${status}`);
      await load();
    } catch (error) { toast.error(error.response?.data?.message || error.message || 'Could not update member request.'); }
    finally { setRequestBusy(''); }
  }

  async function saveCommunitySettings(event) {
    event.preventDefault(); setSettingsBusy(true);
    try {
      const rules = rulesText.split('\n').map(rule => rule.trim()).filter(Boolean).slice(0, 20);
      await api.patch(`/communities/${community._id}/settings`, { rules });
      toast.success('Community rules updated'); setSettingsOpen(false); await load();
    } catch (error) { toast.error(error.response?.data?.message || error.message || 'Could not update settings.'); }
    finally { setSettingsBusy(false); }
  }
  async function createEvent(e) {
    e.preventDefault();
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    if (eventImage && !ALLOWED_EVENT_IMAGE_TYPES.includes(eventImage.type)) {
      toast.error('Choose a JPG, PNG, or WebP event image.');
      return;
    }
    if (eventImage && eventImage.size > MAX_EVENT_IMAGE_SIZE) {
      toast.error('Event image must be 5 MB or smaller.');
      return;
    }
    setEventBusy(true);
    try {
      let coverImage;
      if (eventImage) {
        toast.message('Uploading event cover image…');
        coverImage = await uploadEventImage(eventImage);
      }
      const payload = {
        title: form.get('title'), description: form.get('description'),
        category: form.get('category') || 'Community event',
        coverImage,
        startDate: new Date(form.get('startDate')).toISOString(),
        endDate: form.get('endDate') ? new Date(form.get('endDate')).toISOString() : undefined,
        venue: form.get('venue') || undefined,
        format: form.get('format') || 'offline',
        capacity: form.get('capacity') ? Number(form.get('capacity')) : undefined,
        location: {
          city: community.location?.city || '',
          state: community.location?.state || '',
          country: community.location?.country || 'India'
        }
      };
      await api.post(`/events/communities/${community._id}/events`, payload);
      toast.success('Event created successfully');
      setShowEventForm(false);
      setEventImage(null);
      formElement.reset();
    } catch (err) { toast.error(err.response?.data?.message || err.message || 'Could not create event'); }
    finally { setEventBusy(false); }
  }

  if (!community) return <div className="container-page py-20 text-center text-slate-500">Loading community…</div>;
  const idOf = value => String(value?._id || value || '');
  const isOwner = idOf(community.owner) === idOf(user?._id || user?.id);
  const isModerator = (community.moderators || []).some(m => idOf(m) === idOf(user?._id || user?.id));
  const canModerate = Boolean(user && (isOwner || isModerator || user.role === 'admin'));
  const canCreateEvent = canModerate;
  const viewerMembership = community.viewerMembership;
  const canPost = Boolean(user && (isOwner || isModerator || user.role === 'admin' || viewerMembership?.status === 'approved'));
  const canManageCommunity = canModerate;

  return <div className="container-page py-10">
    <div className="overflow-hidden rounded-3xl bg-white shadow-soft">
      <img className="h-56 w-full object-cover" src={community.coverImage || 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1400&q=80'} alt={community.name}/>
      <div className="flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-end sm:p-8">
        <div><Badge>{community.category || 'Community'}</Badge><h1 className="mt-3 text-3xl font-black">{community.name}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><MapPin size={15}/>{community.location?.city || community.location?.village || 'Local community'}, {community.location?.state}<span>·</span><Users size={15}/>{community.memberCount || 0} members</p>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">{community.description}</p>
          {canCreateEvent && <p className="mt-3 text-sm font-medium text-emerald-700">You can organize events for this community.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {!isOwner && (!viewerMembership || viewerMembership.status === 'rejected') && <Button variant="outline" onClick={join}>Join community</Button>}
          {!isOwner && viewerMembership?.status === 'pending' && <Button variant="outline" disabled>Request pending</Button>}
          {!isOwner && viewerMembership?.status === 'approved' && <Button variant="outline" onClick={leave}>Leave community</Button>}
          {canManageCommunity && <Button variant="outline" onClick={() => setSettingsOpen(v => !v)}><Settings2 size={16}/>{settingsOpen ? 'Close settings' : 'Manage rules'}</Button>}
          {canManageCommunity && <Button variant="outline" onClick={loadMemberRequests}><Users size={16}/> Member requests</Button>}
          {canCreateEvent && <Button onClick={() => setShowEventForm(v => !v)}><CalendarPlus size={17}/>{showEventForm ? 'Close event form' : 'Create Event'}</Button>}
        </div>
      </div>
    </div>


    {settingsOpen && canManageCommunity && <Card className="mt-6 p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">Community rules</h2><p className="mt-1 text-sm text-slate-500">Enter one rule per line. Up to 20 rules.</p></div><Button type="button" variant="ghost" size="sm" onClick={() => setSettingsOpen(false)}><X size={16}/></Button></div><form onSubmit={saveCommunitySettings} className="mt-4"><Textarea value={rulesText} onChange={e => setRulesText(e.target.value)} rows={5} maxLength={6000} placeholder={'Be respectful\nNo spam or harassment\nKeep posts relevant to the hometown'} /><div className="mt-3 flex justify-end"><Button type="submit" disabled={settingsBusy}>{settingsBusy ? 'Saving…' : 'Save rules'}</Button></div></form></Card>}

    {requestsOpen && canManageCommunity && <Card className="mt-6 p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">Membership requests</h2><p className="mt-1 text-sm text-slate-500">Approve or reject people waiting to join this community.</p></div><Button type="button" variant="ghost" size="sm" onClick={() => setRequestsOpen(false)}><X size={16}/></Button></div>{memberRequests.length ? <div className="mt-4 divide-y divide-slate-100">{memberRequests.map(request => <div key={request._id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{request.user?.name || request.user?.email || 'New member'}</p><p className="text-xs text-slate-500">Requested {new Date(request.requestedAt || request.createdAt).toLocaleString()}</p></div><div className="flex gap-2"><Button type="button" size="sm" disabled={requestBusy === request._id} onClick={() => decideMemberRequest(request._id, 'approved')}><Check size={14}/> Approve</Button><Button type="button" size="sm" variant="danger" disabled={requestBusy === request._id} onClick={() => decideMemberRequest(request._id, 'rejected')}><UserRoundX size={14}/> Reject</Button></div></div>)}</div> : <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No pending membership requests.</p>}</Card>}

    {showEventForm && canCreateEvent && <Card className="mt-6 p-6 sm:p-8">
      <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-sm font-bold uppercase tracking-wider text-violet-700">Community events</p><h2 className="mt-1 text-2xl font-black">Create an event</h2><p className="mt-1 text-sm text-slate-500">This event will be listed on the Events page.</p></div><button type="button" onClick={() => setShowEventForm(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={19}/></button></div>
      <form onSubmit={createEvent} className="space-y-4">
        <label className="block text-sm font-semibold">Event title<Input name="title" required minLength={3} maxLength={120} className="mt-1.5" placeholder="e.g. Hometown cultural meetup"/></label>
        <label className="block text-sm font-semibold">Description<Textarea name="description" required minLength={10} maxLength={3000} className="mt-1.5 min-h-24" placeholder="What will happen at this event?"/></label>
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 font-semibold"><ImagePlus size={18} className="text-emerald-700"/> Event cover image <span className="text-xs font-normal text-slate-400">(optional)</span></div>
          {eventImagePreview ? <div className="relative mt-3 max-w-xl"><img src={eventImagePreview} alt="Event cover preview" className="h-48 w-full rounded-xl object-cover"/><button type="button" onClick={() => setEventImage(null)} aria-label="Remove event image" className="absolute right-2 top-2 rounded-full bg-white p-2 shadow"><X size={16}/></button></div> : <label className="mt-3 flex h-40 max-w-xl cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 hover:border-emerald-300 hover:bg-emerald-50"><UploadCloud size={24} className="mb-2 text-emerald-700"/>Choose event cover image<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => setEventImage(e.target.files?.[0] || null)}/><span className="mt-1 text-xs">JPG, PNG, WebP · up to 5 MB</span></label>}
          <p className="mt-2 text-xs text-slate-400">The image will appear on the Events page. Keep it under 5 MB for faster loading.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Start date and time<Input type="datetime-local" name="startDate" required min={new Date(Date.now() + 60000).toISOString().slice(0,16)} className="mt-1.5"/></label>
          <label className="block text-sm font-semibold">End date and time (optional)<Input type="datetime-local" name="endDate" className="mt-1.5"/></label>
          <label className="block text-sm font-semibold">Venue (optional)<Input name="venue" maxLength={200} className="mt-1.5" placeholder="Venue or meeting place"/></label>
          <label className="block text-sm font-semibold">Category<select name="category" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3">{eventCategories.map(category => <option key={category}>{category}</option>)}</select></label>
          <label className="block text-sm font-semibold">Format<select name="format" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3"><option value="offline">In person</option><option value="online">Online</option></select></label>
          <label className="block text-sm font-semibold">Attendee limit (optional)<Input name="capacity" type="number" min="1" className="mt-1.5" placeholder="No limit"/></label>
        </div>
        <div className="flex justify-end"><Button type="submit" disabled={eventBusy}>{eventBusy ? 'Creating event…' : <><Plus size={16}/> Create event</>}</Button></div>
      </form>
    </Card>}

    <div className="mx-auto mt-7 grid max-w-4xl gap-6 lg:grid-cols-[1fr_280px]">
      <section>
        {canPost && <Card className="mb-5 p-5"><form onSubmit={post}><textarea value={content} onChange={e=>setContent(e.target.value)} required minLength={1} maxLength={5000} placeholder="Share a local update, story, question, or announcement…" className="min-h-24 w-full resize-y border-0 outline-none"/><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Post type<select value={postCategory} onChange={e=>setPostCategory(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">{postCategories.map(category => <option key={category}>{category}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Tags (comma-separated)<Input value={postTags} onChange={e=>setPostTags(e.target.value)} maxLength={300} className="mt-1" placeholder="e.g. cleanup, festival, food"/>{tagSuggestions.length>0&&<div className="mt-2 flex flex-wrap gap-1">{tagSuggestions.slice(0,8).map(tag=><button type="button" key={tag} onClick={()=>setPostTags(current=>[...new Set([...current.split(',').map(item=>item.trim()).filter(Boolean),tag])].join(', '))} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-800">+ {tag}</button>)}</div>}</label></div>{postImages.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{postImages.map(item=><div key={item.preview} className="relative"><img src={item.preview} alt="Selected attachment" className="h-24 w-full rounded-xl object-cover"/><button type="button" onClick={()=>removePostImage(item.preview)} aria-label="Remove image" className="absolute right-1 top-1 rounded-full bg-white p-1.5 shadow"><X size={14}/></button></div>)}</div>}<div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3"><div className="flex flex-wrap items-center gap-3"><label className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:text-emerald-950"><ImagePlus size={16}/> Add images<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={selectPostImages}/></label>{canModerate && <label className="inline-flex items-center gap-1.5 text-sm text-slate-600"><input type="checkbox" checked={pinAsAnnouncement} onChange={e=>setPinAsAnnouncement(e.target.checked)} className="rounded border-slate-300"/><Pin size={14}/> Pin as announcement</label>}</div><Button disabled={busy||!content.trim()}>{busy?'Publishing…':'Publish post'}</Button></div><p className="mt-2 text-xs text-slate-400">Up to 8 JPG, PNG, or WebP images, 5 MB each. Posts are visible to this community.</p></form></Card>}
        {user && !canPost && <Card className="mb-5 p-5"><p className="font-bold">Join this community to post</p><p className="mt-1 text-sm text-slate-500">Only approved community members can publish updates and comments.</p></Card>}
        {posts.length ? posts.map(p=><PostCard key={p._id} post={p} currentUser={user} canModerate={canModerate} canInteract={canPost} onDeleted={id=>setPosts(current=>current.filter(item=>item._id!==id))}/>) : <Card className="p-10 text-center"><p className="font-bold">No posts yet</p><p className="mt-1 text-sm text-slate-500">Start a conversation with your community.</p></Card>}
      </section>
      <aside className="space-y-4"><Card className="p-5"><h2 className="font-extrabold">About this community</h2><p className="mt-3 text-sm leading-6 text-slate-500">{community.description}</p><div className="mt-4 flex items-center gap-2 text-sm text-slate-600"><ShieldCheck size={16} className="text-emerald-700"/> {community.visibility==='private'?'Private community':'Public community'}</div></Card><Card className="p-5"><h2 className="font-extrabold">Community rules</h2>{community.rules?.length ? <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-600">{community.rules.map((rule,index)=><li key={`${index}-${rule}`}>{rule}</li>)}</ol> : <p className="mt-3 text-sm text-slate-500">No rules have been published yet.</p>}</Card></aside>
    </div>
  </div>;
}
