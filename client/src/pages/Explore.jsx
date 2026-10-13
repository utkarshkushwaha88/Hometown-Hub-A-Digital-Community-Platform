import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Users, Plus, SlidersHorizontal, ArrowUpRight } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Input, Badge } from '../components/ui';
import { toast } from 'sonner';

const demo = [
  { _id: 'demo-1', name: 'Varanasi Connect', slug: 'varanasi-connect', description: 'A space for local stories, cultural events, and neighbors in Varanasi.', location: { city: 'Varanasi', state: 'Uttar Pradesh', country: 'India' }, memberCount: 2400, category: 'Culture', coverImage: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80' },
  { _id: 'demo-2', name: 'Lucknow Neighbours', slug: 'lucknow-neighbours', description: 'Discover what is happening across Lucknow and meet your local community.', location: { city: 'Lucknow', state: 'Uttar Pradesh', country: 'India' }, memberCount: 1800, category: 'Local living', coverImage: 'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=800&q=80' },
  { _id: 'demo-3', name: 'Campus to Hometown', slug: 'campus-to-hometown', description: 'A friendly place for alumni, students, and friends to stay connected.', location: { city: 'Kanpur', state: 'Uttar Pradesh', country: 'India' }, memberCount: 960, category: 'Education', coverImage: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80' },
];

export default function Explore() {
  const [items, setItems] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('search') || '');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const param = searchParams.get('search') || '';
    if (param !== q) setQ(param);
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (q.trim()) next.set('search', q.trim());
      else next.delete('search');
      if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
    }, 250);
    return () => clearTimeout(timer);
  }, [q, searchParams, setSearchParams]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get('/communities', { params: { search: q, limit: 12 } })
      .then(({ data }) => { if (active) setItems(data.communities || []); })
      .catch(() => { if (active) setItems(demo.filter(x => `${x.name} ${x.location.city}`.toLowerCase().includes(q.toLowerCase()))); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [q]);

  async function join(id) {
    if (id.startsWith('demo-')) {
      toast.info('Connect to the backend and create a community to try membership.');
      return;
    }
    if (!user) {
      toast.error('Please log in to join a community');
      return;
    }
    setJoining(id);
    try {
      await api.post(`/communities/${id}/join`);
      toast.success('Membership request submitted');
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    } finally {
      setJoining('');
    }
  }

  function sameId(a, b) {
    return String(a?._id || a || '') === String(b?._id || b || '');
  }

  return <div className="container-page py-12">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="text-sm font-bold uppercase tracking-[.18em] text-violet-600">Explore locally</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Find your community.</h1>
        <p className="mt-3 text-slate-500">Discover the places and people that make home feel like home.</p>
      </div>
      {user && <Button asChild><Link to="/create-community"><Plus size={17}/> Create community</Link></Button>}
    </div>

    <div className="mt-8 flex max-w-xl items-center gap-3">
      <div className="relative flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><Input value={q} onChange={e => setQ(e.target.value)} className="pl-10" placeholder="Search by community or location…"/></div>
      <Button variant="outline" size="icon" aria-label="Filters"><SlidersHorizontal size={18}/></Button>
    </div>

    {loading ? <div className="mt-8 grid gap-5 md:grid-cols-3">{[1,2,3].map(n => <Card key={n} className="h-80 animate-pulse bg-slate-100"/>)}</div> : <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {items.map(c => {
        const isOwner = user && sameId(c.owner, user._id || user.id);
        return <Card key={c._id} className="overflow-hidden">
          <Link to={c.slug ? `/communities/${c.slug}` : '/explore'} aria-label={`Open ${c.name}`} className="block focus:outline-none focus:ring-4 focus:ring-violet-200">
            <img className="h-44 w-full object-cover transition duration-300 hover:scale-[1.02]" src={c.coverImage || 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80'} alt={c.name} loading="lazy"/>
          </Link>
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div><Badge>{c.category || 'Community'}</Badge><Link to={`/communities/${c.slug}`} className="mt-3 block text-lg font-bold hover:text-violet-700">{c.name}</Link></div>
              <span className="rounded-xl bg-violet-50 p-2 text-violet-700"><Users size={18}/></span>
            </div>
            <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{c.description}</p>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500"><MapPin size={14}/>{[c.location?.city || c.location?.village, c.location?.state].filter(Boolean).join(', ') || 'Location not set'}</p>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <span className="text-sm text-slate-500">{(c.memberCount ?? c.members?.length ?? 0).toLocaleString()} members</span>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline"><Link to={`/communities/${c.slug}`}>Open community <ArrowUpRight size={14}/></Link></Button>
                {!isOwner && <Button size="sm" variant="soft" onClick={() => join(c._id)} disabled={joining === c._id}>{joining === c._id ? 'Joining…' : 'Join'}</Button>}
              </div>
            </div>
          </div>
        </Card>;
      })}
    </div>}
    {!loading && items.length === 0 && <div className="py-20 text-center text-slate-500">No communities found. Try a different search.</div>}
  </div>;
}
