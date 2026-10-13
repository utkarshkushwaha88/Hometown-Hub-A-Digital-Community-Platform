import { useCallback, useEffect, useState } from 'react';
import { Users, MapPin, Flag, CalendarDays, Check, X, ShieldCheck, Search, RefreshCw, Activity, TrendingUp, Percent } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../lib/api';
import { Card, Button, Badge, Input } from '../components/ui';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function Admin() {
  const [overview, setOverview] = useState(null);
  const [pending, setPending] = useState([]);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState({ users: [], communities: [], posts: [], dailyActiveUsers: [], kpis: {} });
  const [moderators, setModerators] = useState([]);
  const [communityOptions, setCommunityOptions] = useState([]);
  const [candidateMembers, setCandidateMembers] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [addingModerator, setAddingModerator] = useState(false);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagName, setTagName] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState('post');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, c, r, u, a, m, communityData, categoryData, tagData] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/communities/pending'),
        api.get('/admin/reports'),
        api.get('/admin/users', { params: { limit: 50, ...(query ? { search: query } : {}) } }),
        api.get('/admin/analytics'),
        api.get('/admin/moderators'),
        api.get('/communities', { params: { limit: 30 } }),
        api.get('/admin/categories'),
        api.get('/admin/tags'),
      ]);
      setOverview(o.data);
      setPending(c.data.communities || []);
      setReports((r.data.reports || []).filter(report => ['pending', 'under_review'].includes(report.status)));
      setUsers(u.data.users || []);
      setAnalytics(a.data || { users: [], communities: [], posts: [], dailyActiveUsers: [], kpis: {} });
      setModerators(m.data.moderators || []);
      setCommunityOptions(communityData.data.communities || []);
      setCategories(categoryData.data.categories || []);
      setTags(tagData.data.tags || []);
    } catch (error) {
      toast.error(error.message || 'Could not load admin data. Check that you are signed in as a platform administrator.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedCommunity) { setCandidateMembers([]); setSelectedUser(''); return undefined; }
    api.get(`/admin/moderator-candidates/${selectedCommunity}`).then(({ data }) => {
      if (!cancelled) {
        const members = (data.memberships || []).map(item => item.user).filter(Boolean);
        setCandidateMembers(members); setSelectedUser(members[0]?._id || '');
      }
    }).catch(error => { if (!cancelled) { setCandidateMembers([]); toast.error(error.message || 'Could not load community members.'); } });
    return () => { cancelled = true; };
  }, [selectedCommunity]);

  async function decideCommunity(id, status) {
    setBusyId(id);
    try {
      await api.patch(`/admin/communities/${id}/approval`, { status });
      toast.success(`Community ${status}`);
      await load();
    } catch (error) { toast.error(error.message); }
    finally { setBusyId(''); }
  }

  async function changeUserStatus(user, accountStatus) {
    setBusyId(user._id);
    try {
      await api.patch(`/admin/users/${user._id}/status`, { accountStatus });
      toast.success(`Account ${accountStatus === 'active' ? 'reactivated' : 'suspended'}`);
      await load();
    } catch (error) { toast.error(error.message); }
    finally { setBusyId(''); }
  }

  async function reviewReport(report, status) {
    setBusyId(report._id);
    try {
      await api.patch(`/reports/${report._id}`, { status, resolutionNotes: status === 'resolved' ? 'Reviewed by platform administrator.' : undefined });
      toast.success(`Report marked ${status.replace('_', ' ')}`);
      await load();
    } catch (error) { toast.error(error.message || 'Could not update report.'); }
    finally { setBusyId(''); }
  }

  async function addModerator(event) {
    event.preventDefault();
    if (!selectedCommunity || !selectedUser) { toast.error('Choose a community member first.'); return; }
    setAddingModerator(true);
    try {
      await api.post('/admin/moderators', { userId: selectedUser, communityId: selectedCommunity });
      toast.success('Moderator assigned');
      setSelectedUser('');
      await load();
      const { data } = await api.get(`/admin/moderator-candidates/${selectedCommunity}`);
      setCandidateMembers((data.memberships || []).map(item => item.user).filter(Boolean));
    } catch (error) { toast.error(error.response?.data?.message || error.message || 'Could not assign moderator.'); }
    finally { setAddingModerator(false); }
  }

  async function revokeModerator(moderator) {
    if (!window.confirm(`Remove moderator access from ${moderator.user?.name || 'this member'}?`)) return;
    setBusyId(moderator._id);
    try { await api.delete(`/admin/moderators/${moderator._id}`); toast.success('Moderator role revoked'); await load(); }
    catch (error) { toast.error(error.message || 'Could not revoke moderator role.'); }
    finally { setBusyId(''); }
  }

  async function createCategory(event) {
    event.preventDefault();
    if (!categoryName.trim()) return;
    try {
      await api.post('/admin/categories', { name: categoryName.trim(), type: categoryType });
      setCategoryName(''); toast.success('Category added'); await load();
    } catch (error) { toast.error(error.response?.data?.message || error.message || 'Could not add category.'); }
  }

  async function toggleCategory(category) {
    try { await api.patch(`/admin/categories/${category._id}`, { active: !category.active }); toast.success(category.active ? 'Category disabled' : 'Category enabled'); await load(); }
    catch (error) { toast.error(error.message || 'Could not update category.'); }
  }

  async function createTag(event) {
    event.preventDefault(); if (!tagName.trim()) return;
    try { await api.post('/admin/tags', { name: tagName.trim() }); setTagName(''); toast.success('Tag added'); await load(); }
    catch (error) { toast.error(error.response?.data?.message || error.message || 'Could not add tag.'); }
  }

  async function toggleTag(tag) {
    try { await api.patch(`/admin/tags/${tag._id}`, { active: !tag.active }); toast.success(tag.active ? 'Tag disabled' : 'Tag enabled'); await load(); }
    catch (error) { toast.error(error.message || 'Could not update tag.'); }
  }

  const metrics = [
    ['Users', overview?.totalUsers ?? '—', Users],
    ['Communities', overview?.totalCommunities ?? '—', MapPin],
    ['Posts', overview?.totalPosts ?? '—', Flag],
    ['Events', overview?.totalEvents ?? '—', CalendarDays],
  ];
  const userTrend = (analytics.users || []).map((item) => ({ date: item._id?.slice(5) || '', count: item.count }));
  const activeUserTrend = (analytics.dailyActiveUsers || []).map((item) => ({ date: item._id?.slice(5) || '', count: item.count }));
  const kpis = analytics.kpis || {};
  const postEngagement = kpis.postEngagementRate || {};
  const eventParticipation = kpis.eventParticipationRate || {};
  const communityGrowth = kpis.communityGrowthRate || {};
  const formatRate = (value) => `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
  const growthValue = communityGrowth.rate == null
    ? 'Baseline unavailable'
    : `${communityGrowth.rate > 0 ? '+' : ''}${formatRate(communityGrowth.rate)}`;
  const kpiCards = [
    { label: 'Daily active users', value: kpis.dailyActiveUsers ?? '—', detail: 'Unique authenticated users active today (UTC).', Icon: Activity },
    { label: 'Post engagement rate · 30d', value: formatRate(postEngagement.rate), detail: `${postEngagement.engagedPosts || 0} of ${postEngagement.totalPosts || 0} active posts created in the last 30 days received at least one like or comment.`, Icon: Percent },
    { label: 'Event participation rate · 30d', value: formatRate(eventParticipation.rate), detail: `${eventParticipation.registrations || 0} registrations across ${eventParticipation.events || 0} events created in the last 30 days, compared with approved membership opportunities.`, Icon: CalendarDays },
    { label: 'Community growth · 30d', value: growthValue, detail: `${communityGrowth.currentPeriod || 0} approved communities this period vs ${communityGrowth.previousPeriod || 0} in the previous 30 days.`, Icon: TrendingUp },
  ];

  return <div className="container-page py-10">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-600 text-white"><ShieldCheck /></span><div><p className="text-sm font-semibold text-violet-700">Platform management</p><h1 className="text-3xl font-black">Admin dashboard</h1></div></div>
      <Button variant="outline" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/> Refresh</Button>
    </div>
    {loading ? <Card className="mt-8 h-48 animate-pulse bg-slate-100" /> : <>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, Icon]) => <Card key={label} className="p-5"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">Total {label.toLowerCase()}</span><Icon size={19} className="text-violet-600" /></div><p className="mt-3 text-3xl font-extrabold">{value}</p></Card>)}</div>
      <section className="mt-4" aria-labelledby="engagement-kpis-heading"><h2 id="engagement-kpis-heading" className="sr-only">Community engagement KPIs</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{kpiCards.map(({ label, value, detail, Icon }) => <Card key={label} className="p-5"><div className="flex items-start justify-between gap-3"><span className="text-sm font-semibold text-slate-500">{label}</span><Icon size={19} className="shrink-0 text-violet-600" /></div><p className="mt-3 text-3xl font-extrabold">{value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p></Card>)}</div></section>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Community approvals</h2><Badge>{pending.length} pending</Badge></div>{pending.length ? pending.map((community) => <div key={community._id} className="flex flex-wrap items-center justify-between gap-3 border-b py-4 last:border-0"><div><p className="font-bold">{community.name}</p><p className="mt-1 text-sm text-slate-500">{community.location?.city || 'Location not set'} · {community.owner?.name || 'Owner'}</p><p className="mt-1 max-w-sm text-xs text-slate-400">{community.description}</p></div><div className="flex gap-2"><Button size="sm" disabled={busyId === community._id} onClick={() => decideCommunity(community._id, 'approved')}><Check size={15}/> Approve</Button><Button size="sm" variant="danger" disabled={busyId === community._id} onClick={() => decideCommunity(community._id, 'rejected')}><X size={15}/> Reject</Button></div></div>) : <p className="py-8 text-center text-sm text-slate-500">No pending community requests.</p>}</Card>
        <Card className="p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Open reports</h2><Badge>{reports.length} pending</Badge></div>{reports.length ? reports.map((report) => <div key={report._id} className="border-b py-4 last:border-0"><div className="flex justify-between gap-3"><p className="font-bold">{report.reason}</p><Badge>{report.targetType}</Badge></div><p className="mt-1 text-sm text-slate-500">{report.description || 'No additional details'}</p><p className="mt-1 text-xs text-slate-400">Reported by {report.reporter?.name || 'User'} · {new Date(report.createdAt).toLocaleDateString()}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busyId === report._id} onClick={() => reviewReport(report, 'under_review')}>Review</Button><Button size="sm" disabled={busyId === report._id} onClick={() => reviewReport(report, 'resolved')}>Resolve</Button><Button size="sm" variant="danger" disabled={busyId === report._id} onClick={() => reviewReport(report, 'dismissed')}>Dismiss</Button></div></div>) : <p className="py-8 text-center text-sm text-slate-500">No pending reports.</p>}</Card>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-extrabold">Moderator management</h2><p className="mt-1 text-sm text-slate-500">Assign or revoke moderator privileges for approved community members.</p></div><Badge>{moderators.length}</Badge></div>
          <form onSubmit={addModerator} className="mt-4 grid gap-3"><label className="text-sm font-semibold">Community<select value={selectedCommunity} onChange={e=>setSelectedCommunity(e.target.value)} required className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Select a community</option>{communityOptions.map(c=><option value={c._id} key={c._id}>{c.name}</option>)}</select></label><label className="text-sm font-semibold">Approved member<select value={selectedUser} onChange={e=>setSelectedUser(e.target.value)} required disabled={!selectedCommunity||candidateMembers.length===0} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">{selectedCommunity?(candidateMembers.length?'Select a member':'No eligible members found'):'Select a community first'}</option>{candidateMembers.map(member=><option value={member._id} key={member._id}>{member.name} · {member.email}</option>)}</select></label><Button type="submit" disabled={addingModerator||!selectedCommunity||!selectedUser}>{addingModerator?'Assigning…':'Assign moderator'}</Button></form>
          <div className="mt-5 divide-y divide-slate-100">{moderators.slice(0,8).map(m=><div key={m._id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-bold">{m.user?.name||m.user?.email||'Member'}</p><p className="text-xs text-slate-500">{m.community?.name||'Community'}</p></div><Button size="sm" variant="danger" disabled={busyId===m._id} onClick={()=>revokeModerator(m)}>Revoke</Button></div>)}{!moderators.length&&<p className="py-5 text-sm text-slate-500">No moderators assigned yet.</p>}</div>
        </Card>
        <Card className="p-5"><div><h2 className="text-lg font-extrabold">Content categories</h2><p className="mt-1 text-sm text-slate-500">Manage categories available for posts, events, and communities.</p></div><form onSubmit={createCategory} className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px_auto]"><Input value={categoryName} onChange={e=>setCategoryName(e.target.value)} required minLength={2} maxLength={60} placeholder="New category name"/><select value={categoryType} onChange={e=>setCategoryType(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="post">Post</option><option value="event">Event</option><option value="community">Community</option></select><Button type="submit">Add</Button></form><div className="mt-4 max-h-72 divide-y divide-slate-100 overflow-y-auto">{categories.map(category=><div key={category._id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-bold">{category.name}</p><p className="text-xs capitalize text-slate-500">{category.type} · {category.active?'active':'disabled'}</p></div><Button size="sm" variant="outline" onClick={()=>toggleCategory(category)}>{category.active?'Disable':'Enable'}</Button></div>)}{!categories.length&&<p className="py-5 text-sm text-slate-500">No custom categories yet. Existing built-in categories remain available.</p>}</div><div className="mt-5 border-t border-slate-100 pt-5"><h3 className="font-bold">Suggested tags</h3><p className="mt-1 text-xs text-slate-500">Maintain suggested tags users can apply to posts.</p><form onSubmit={createTag} className="mt-3 flex gap-2"><Input value={tagName} onChange={e=>setTagName(e.target.value)} minLength={2} maxLength={40} required placeholder="e.g. local-food"/><Button type="submit">Add tag</Button></form><div className="mt-3 max-h-36 space-y-2 overflow-y-auto">{tags.map(tag=><div key={tag._id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"><span className="text-sm">#{tag.name} {tag.active?'':'(disabled)'}</span><Button type="button" size="sm" variant="outline" onClick={()=>toggleTag(tag)}>{tag.active?'Disable':'Enable'}</Button></div>)}{!tags.length&&<p className="py-3 text-xs text-slate-500">No suggested tags yet.</p>}</div></div></Card>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-extrabold">User registrations</h2><p className="mt-1 text-sm text-slate-500">Daily registrations over the last 30 days.</p></div><Badge>Last 30 days</Badge></div><div className="mt-5 h-64">{userTrend.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={userTrend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis allowDecimals={false}/><Tooltip/><Line type="monotone" dataKey="count" stroke="#7C3AED" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-sm text-slate-500">No registration data for this period yet.</div>}</div></Card>
        <Card className="p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-extrabold">Daily active users</h2><p className="mt-1 text-sm text-slate-500">Unique authenticated users with activity recorded each UTC day.</p></div><Badge>Last 30 days</Badge></div><div className="mt-5 h-64">{activeUserTrend.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={activeUserTrend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis allowDecimals={false}/><Tooltip/><Line type="monotone" dataKey="count" stroke="#0F766E" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-sm text-slate-500">Activity data will appear after authenticated users use the platform.</div>}</div><p className="mt-2 text-xs text-slate-400">{analytics.trackingNote}</p></Card>
      </div>
      <Card className="mt-6 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-extrabold">User management</h2><p className="mt-1 text-sm text-slate-500">Suspend or reactivate accounts. The backend prevents suspending your own account.</p></div><div className="relative w-full sm:max-w-xs"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email…" className="pl-9"/></div></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="px-3 py-3 font-semibold">User</th><th className="px-3 py-3 font-semibold">Role</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3 text-right font-semibold">Action</th></tr></thead><tbody>{users.map((user) => <tr key={user._id} className="border-b last:border-0"><td className="px-3 py-3"><p className="font-semibold">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></td><td className="px-3 py-3 capitalize">{user.role}</td><td className="px-3 py-3"><Badge>{user.accountStatus}</Badge></td><td className="px-3 py-3 text-right">{user.role === 'admin' ? <span className="text-xs text-slate-400">Administrator</span> : <Button size="sm" variant="outline" disabled={busyId === user._id} onClick={() => changeUserStatus(user, user.accountStatus === 'active' ? 'suspended' : 'active')}>{user.accountStatus === 'active' ? 'Suspend' : 'Reactivate'}</Button>}</td></tr>)}</tbody></table>{users.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No users match this search.</p>}</div></Card>
      <div className="mt-6"><Button variant="outline" asChild><Link to="/explore">View public platform</Link></Button></div>
    </>}
  </div>;
}
