import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, ImagePlus, X, UploadCloud } from 'lucide-react';
import { api } from '../lib/api';
import { Button, Card, Input, Textarea } from '../components/ui';
import { toast } from 'sonner';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DEFAULT_COMMUNITY_CATEGORIES = ['Local living', 'Culture & traditions', 'Education & alumni', 'Sports & recreation', 'Volunteering', 'Business & networking'];

async function uploadCommunityImage(file) {
  const { data: auth } = await api.post('/uploads/auth');
  const body = new FormData();
  body.append('file', file);
  body.append('fileName', `community-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`);
  body.append('publicKey', auth.publicKey);
  body.append('signature', auth.signature);
  body.append('token', auth.token);
  body.append('expire', String(auth.expire));
  body.append('useUniqueFileName', 'true');
  const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', body });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.message || 'Image upload failed. Check ImageKit configuration.');
  return { url: result.url, fileId: result.fileId };
}

export default function CreateCommunity() {
  const [busy, setBusy] = useState(false);
  const [cover, setCover] = useState(null);
  const [avatar, setAvatar] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [communityCategories, setCommunityCategories] = useState(DEFAULT_COMMUNITY_CATEGORIES);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/categories', { params: { type: 'community' } }).then(({ data }) => {
      setCommunityCategories([...new Set([...DEFAULT_COMMUNITY_CATEGORIES, ...(data.categories || []).map(item => item.name)])]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const coverUrl = cover ? URL.createObjectURL(cover) : '';
    const avatarUrl = avatar ? URL.createObjectURL(avatar) : '';
    setCoverPreview(coverUrl);
    setAvatarPreview(avatarUrl);
    return () => { if (coverUrl) URL.revokeObjectURL(coverUrl); if (avatarUrl) URL.revokeObjectURL(avatarUrl); };
  }, [cover, avatar]);

  function validateImage(file) {
    if (!file) return true;
    if (!ALLOWED_TYPES.includes(file.type)) { toast.error('Choose a JPG, PNG, or WebP image.'); return false; }
    if (file.size > MAX_IMAGE_SIZE) { toast.error('Image must be 5 MB or smaller.'); return false; }
    return true;
  }

  async function submit(event) {
    event.preventDefault();
    if (!validateImage(cover) || !validateImage(avatar)) return;
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      let coverImage = '';
      let avatarImage = '';
      if (cover) { toast.message('Uploading cover image…'); coverImage = (await uploadCommunityImage(cover)).url; }
      if (avatar) { toast.message('Uploading community icon…'); avatarImage = (await uploadCommunityImage(avatar)).url; }
      const location = { city: form.get('city')?.trim(), village: form.get('village')?.trim(), state: form.get('state')?.trim(), country: form.get('country')?.trim() || 'India' };
      await api.post('/communities', {
        name: form.get('name'), description: form.get('description'), category: form.get('category'),
        visibility: form.get('visibility'), location, rules: [], coverImage, avatar: avatarImage,
      });
      toast.success('Community submitted for admin approval');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Could not submit community');
    } finally { setBusy(false); }
  }

  return <div className="container-page max-w-4xl py-12">
    <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft size={16}/> Back to dashboard</Link>
    <h1 className="mt-5 text-3xl font-black">Create a community</h1>
    <p className="mt-2 text-slate-500">Give your hometown a shared space. New communities are reviewed before publication.</p>
    <Card className="mt-7 p-6 sm:p-8">
      <form onSubmit={submit} className="space-y-5">
        <div><label className="block text-sm font-semibold">Community name<Input name="name" required minLength={3} maxLength={80} placeholder="e.g. Varanasi Connect" className="mt-1.5"/></label></div>
        <label className="block text-sm font-semibold">Description<Textarea name="description" required minLength={20} maxLength={1000} placeholder="What brings your community together?" className="mt-1.5"/></label>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 font-semibold"><ImagePlus size={18} className="text-violet-600"/> Cover image <span className="text-xs font-normal text-slate-400">(optional)</span></div>
            {coverPreview ? <div className="relative mt-3"><img src={coverPreview} alt="Cover preview" className="h-40 w-full rounded-xl object-cover"/><button type="button" onClick={() => setCover(null)} aria-label="Remove cover image" className="absolute right-2 top-2 rounded-full bg-white p-2 shadow"><X size={16}/></button></div> : <label className="mt-3 flex h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 hover:border-violet-300 hover:bg-violet-50"><UploadCloud size={24} className="mb-2 text-violet-600"/>Choose cover image<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => setCover(e.target.files?.[0] || null)}/><span className="mt-1 text-xs">JPG, PNG, WebP · up to 5 MB</span></label>}
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 font-semibold"><ImagePlus size={18} className="text-violet-600"/> Community icon <span className="text-xs font-normal text-slate-400">(optional)</span></div>
            <div className="flex min-h-40 flex-col items-center justify-center">
              {avatarPreview ? <div className="relative"><img src={avatarPreview} alt="Community icon preview" className="h-28 w-28 rounded-2xl object-cover"/><button type="button" onClick={() => setAvatar(null)} aria-label="Remove community icon" className="absolute -right-2 -top-2 rounded-full bg-white p-2 shadow"><X size={16}/></button></div> : <label className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500 hover:border-violet-300 hover:bg-violet-50"><UploadCloud size={22} className="mb-2 text-violet-600"/>Choose icon<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => setAvatar(e.target.files?.[0] || null)}/></label>}
              <p className="mt-3 text-xs text-slate-400">JPG, PNG, WebP · up to 5 MB</p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">City<Input name="city" placeholder="City" className="mt-1.5"/></label>
          <label className="block text-sm font-semibold">Village <span className="font-normal text-slate-400">(optional)</span><Input name="village" placeholder="Village" className="mt-1.5"/></label>
          <label className="block text-sm font-semibold">State<Input name="state" required placeholder="State" className="mt-1.5"/></label>
          <label className="block text-sm font-semibold">Country<Input name="country" defaultValue="India" required className="mt-1.5"/></label>
          <label className="block text-sm font-semibold">Category<select name="category" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3">{communityCategories.map(category => <option key={category}>{category}</option>)}</select></label>
          <label className="block text-sm font-semibold">Visibility<select name="visibility" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3"><option value="public">Public</option><option value="private">Private (approval required)</option></select></label>
        </div>
        <div className="rounded-xl bg-violet-50 p-4 text-sm leading-6 text-violet-800"><MapPin size={16} className="mr-2 inline"/>Your community will remain pending until a platform administrator approves it.</div>
        <Button type="submit" disabled={busy} size="lg" className="w-full">{busy ? 'Uploading and submitting…' : 'Submit for approval'}</Button>
      </form>
    </Card>
  </div>;
}
