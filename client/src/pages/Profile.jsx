import { useEffect, useState } from 'react';
import { Save, UserRound, MapPin, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Input, Badge } from '../components/ui';
import { toast } from 'sonner';

const fields = [
  ['name', 'Full name', 'text'], ['username', 'Username', 'text'], ['hometown', 'Hometown', 'text'],
  ['city', 'City', 'text'], ['village', 'Village', 'text'], ['state', 'State', 'text'],
  ['country', 'Country', 'text'], ['avatar', 'Profile image URL', 'url'],
];

export default function Profile() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({});
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (user) {
      setForm(Object.fromEntries(fields.map(([key]) => [key, user[key] || ''])));
      setBio(user.bio || '');
    }
  }, [user]);
  async function submit(event) {
    event.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, bio };
      for (const key of Object.keys(payload)) if (payload[key] === '') delete payload[key];
      delete payload.username; // username changes require a dedicated uniqueness workflow
      await api.patch('/users/me', payload);
      await refresh(); toast.success('Profile updated successfully.');
    } catch (error) { toast.error(error.message || 'Could not update profile.'); }
    finally { setSaving(false); }
  }
  return <div className="container-page py-10">
    <div className="mb-7 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-900"><UserRound/></span><div><p className="text-sm font-semibold text-emerald-800">Your account</p><h1 className="text-3xl font-black">Profile settings</h1></div></div>
    <div className="grid gap-6 lg:grid-cols-[.7fr_1.3fr]">
      <Card className="h-fit p-6"><div className="flex flex-col items-center text-center"><div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-emerald-100 text-3xl font-black text-emerald-900">{user?.avatar ? <img src={user.avatar} alt="Profile" className="h-full w-full object-cover"/> : (user?.name || 'U').slice(0,1).toUpperCase()}</div><h2 className="mt-4 text-xl font-extrabold">{user?.name}</h2><p className="mt-1 text-sm text-slate-500">{user?.email}</p><Badge className="mt-3"><ShieldCheck size={13} className="mr-1"/>{user?.role === 'admin' ? 'Platform administrator' : 'Community member'}</Badge><p className="mt-4 flex items-center gap-1.5 text-sm text-slate-500"><MapPin size={15}/>{user?.hometown || user?.city || 'Add your hometown'}</p></div></Card>
      <Card className="p-6"><form onSubmit={submit}><div className="grid gap-4 sm:grid-cols-2">{fields.filter(([key]) => key !== 'username').map(([key,label,type])=><label key={key} className="grid gap-1.5 text-sm font-semibold text-slate-700">{label}<Input type={type} value={form[key] || ''} onChange={e=>setForm(old=>({...old,[key]:e.target.value}))} placeholder={label} maxLength={key==='name'?80:120}/></label>)}</div><label className="mt-4 grid gap-1.5 text-sm font-semibold text-slate-700">About you<textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={300} rows={4} placeholder="Share a little about yourself…" className="rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"/></label><p className="mt-2 text-xs text-slate-400">Profile image URL accepts an ImageKit URL. Keep your profile information respectful and avoid sharing private details.</p><div className="mt-5 flex justify-end"><Button type="submit" disabled={saving}><Save size={16}/>{saving?'Saving…':'Save profile'}</Button></div></form></Card>
    </div>
  </div>;
}
