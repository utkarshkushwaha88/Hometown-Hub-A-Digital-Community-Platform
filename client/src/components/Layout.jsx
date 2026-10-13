import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell, CalendarDays, ChevronDown, Compass, Home, LogOut, MapPin, MessageCircle,
  Menu, Plus, Search, ShieldCheck, Users, X, UserRound, ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Button } from './ui';

const linkClass = ({ isActive }) => `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`;

export function Navbar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const loadUnread = useCallback(async () => {
    if (!user) { setUnread(0); return; }
    try {
      const { data } = await api.get('/notifications', { params: { limit: 1 } });
      setUnread(Number(data.unread) || 0);
    } catch {
      // Keep navigation usable if notifications are temporarily unavailable.
    }
  }, [user]);

  useEffect(() => {
    loadUnread();
    if (!user) return undefined;
    const timer = window.setInterval(loadUnread, 30000);
    const refresh = () => loadUnread();
    window.addEventListener('hometownhub:notifications-updated', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('hometownhub:notifications-updated', refresh);
    };
  }, [loadUnread, location.pathname, user]);

  useEffect(() => { setMobileOpen(false); setSearchOpen(false); }, [location.pathname]);

  async function signOut() {
    try { await logout(); navigate('/'); }
    catch { navigate('/'); }
  }

  function submitSearch(event) {
    event.preventDefault();
    const term = search.trim();
    navigate(term ? `/explore?search=${encodeURIComponent(term)}` : '/explore');
    setSearchOpen(false);
    setMobileOpen(false);
  }

  const mainLinks = [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/explore', label: 'Communities', icon: Users },
    { to: '/events', label: 'Events', icon: CalendarDays },
  ];

  return <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm shadow-slate-900/[0.02] backdrop-blur-xl">
    <div className="container-page relative flex min-h-[72px] items-center gap-4">
      <Link to="/" className="group flex shrink-0 items-center gap-2.5" aria-label="Hometown Hub home">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-600/20 transition group-hover:rotate-[-5deg] group-hover:scale-105"><MapPin size={21} /></span>
        <span className="text-lg font-extrabold tracking-tight text-slate-950">hometown<span className="text-violet-600">hub</span><span className="ml-1 hidden text-[10px] font-bold uppercase tracking-[.18em] text-slate-400 sm:inline">connect locally</span></span>
      </Link>

      <nav className="ml-auto hidden flex-1 items-center justify-center gap-1 lg:flex xl:hidden" aria-label="Main navigation">
        {mainLinks.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={linkClass}><Icon size={16} />{label}</NavLink>)}
      </nav>
      <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 xl:flex" aria-label="Main navigation">
        {mainLinks.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={linkClass}><Icon size={16} />{label}</NavLink>)}
      </nav>

      <div className="ml-auto hidden items-center gap-2 lg:flex">
        <button type="button" onClick={() => setSearchOpen(v => !v)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50" aria-label="Search communities"><Search size={17}/></button>
      </div>

      <div className="hidden items-center gap-2 lg:flex">
        {user ? <>
          <Link to="/notifications" className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-600 transition hover:bg-violet-50 hover:text-violet-700" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
            <Bell size={19} />{unread > 0 && <span className="absolute right-1 top-1 grid min-h-[17px] min-w-[17px] place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">{unread > 99 ? '99+' : unread}</span>}
          </Link>
          <NavLink to="/dashboard" className={linkClass}><Home size={16} />Dashboard</NavLink>
          {user.role === 'admin' && <NavLink to="/admin" className={linkClass}><ShieldCheck size={16} />Admin</NavLink>}
          <div className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-3">
            <Link to="/profile" className="flex items-center gap-2" title="Edit profile">
              <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-violet-100 text-sm font-bold text-violet-700">{user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : (user.name || 'U').slice(0, 1).toUpperCase()}</span>
              <div className="max-w-[90px]"><p className="truncate text-xs font-bold text-slate-800">{user.name || 'Your account'}</p>{user.role === 'admin' && <p className="text-[10px] font-semibold text-emerald-800">Admin</p>}</div>
            </Link>
            <button onClick={signOut} title="Log out" aria-label="Log out" className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"><LogOut size={17} /></button>
          </div>
        </> : <><Button variant="ghost" onClick={() => navigate('/login')}>Log in</Button><Button onClick={() => navigate('/register')}>Get started <ArrowUpRight size={16} /></Button></>}
      </div>

      <div className="ml-auto flex items-center gap-1 lg:hidden">
        {user && <Link to="/notifications" className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label="Notifications"><Bell size={19} />{unread > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-rose-600 ring-2 ring-white" />}</Link>}
        <button onClick={() => setSearchOpen(v => !v)} className="grid h-10 w-10 place-items-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label="Search"><Search size={19} /></button>
        <button onClick={() => setMobileOpen(v => !v)} className="grid h-10 w-10 place-items-center rounded-xl text-slate-700 hover:bg-slate-100" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen}>{mobileOpen ? <X size={21} /> : <Menu size={21} />}</button>
      </div>
    </div>

    {searchOpen && <form onSubmit={submitSearch} className="hidden border-t border-slate-100 bg-white px-4 py-3 lg:block"><div className="container-page mx-auto flex max-w-3xl gap-2"><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search communities or locations…" className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"/><Button type="submit">Search</Button></div></form>}

    {searchOpen && <form onSubmit={submitSearch} className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden"><div className="container-page flex gap-2"><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search communities or locations…" className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"/><Button type="submit">Search</Button></div></form>}

    {mobileOpen && <div className="border-t border-slate-100 bg-white px-4 py-4 shadow-xl lg:hidden"><nav className="container-page grid gap-1" aria-label="Mobile navigation">
      {mainLinks.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={linkClass}><Icon size={17} />{label}</NavLink>)}
      {user ? <>
        <NavLink to="/dashboard" className={linkClass}><Home size={17} />Dashboard</NavLink>
        <NavLink to="/notifications" className={linkClass}><Bell size={17} />Notifications {unread > 0 && <span className="ml-auto rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">{unread} new</span>}</NavLink>
        {user.role === 'admin' && <NavLink to="/admin" className={linkClass}><ShieldCheck size={17} />Admin dashboard</NavLink>}
        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3"><Link to="/profile" className="flex items-center gap-2"><UserRound size={17} className="text-slate-500"/><span className="text-sm font-semibold">Profile · {user.name}</span></Link><Button variant="outline" size="sm" onClick={signOut}><LogOut size={15}/> Log out</Button></div>
      </> : <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3"><Button variant="outline" onClick={() => navigate('/login')}>Log in</Button><Button onClick={() => navigate('/register')}>Get started</Button></div>}
      <a href="/#about" className="mt-1 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">About Hometown Hub</a>
    </nav></div>}
  </header>;
}

export function Footer() {
  return <footer className="mt-20 border-t border-slate-200 bg-white">
    <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
      <div><Link to="/" className="inline-flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-600 text-white"><MapPin size={18}/></span><span className="text-lg font-extrabold">hometown<span className="text-violet-600">hub</span></span></Link><p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">Good things happen closer to home. Find your people, share local stories, and keep your hometown close.</p><div className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700"><Users size={14}/> Built for local connection</div></div>
      <div><h3 className="text-sm font-extrabold text-slate-900">Discover</h3><div className="mt-4 grid gap-3 text-sm text-slate-500"><Link className="hover:text-violet-700" to="/explore">Explore communities</Link><Link className="hover:text-violet-700" to="/events">Local events</Link><Link className="hover:text-violet-700" to="/register">Join Hometown Hub</Link></div></div>
      <div><h3 className="text-sm font-extrabold text-slate-900">Your account</h3><div className="mt-4 grid gap-3 text-sm text-slate-500"><Link className="hover:text-violet-700" to="/login">Log in</Link><Link className="hover:text-violet-700" to="/dashboard">Dashboard</Link><Link className="hover:text-violet-700" to="/create-community">Create a community</Link></div></div>
      <div><h3 className="text-sm font-extrabold text-slate-900">About</h3><div className="mt-4 grid gap-3 text-sm text-slate-500"><a className="hover:text-violet-700" href="/#about">Our purpose</a><a className="hover:text-violet-700" href="mailto:support@hometownhub.example">Contact support</a><p className="leading-5">A shared space for hometowns, villages, and neighborhoods.</p></div></div>
    </div>
    <div className="border-t border-slate-100"><div className="container-page flex flex-col gap-2 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} Hometown Hub. Made for the places we call home.</p><p>Respect your neighbors · Share responsibly · Build community</p></div></div>
  </footer>;
}

export function AppShell({ children }) {
  const { user } = useAuth();
  return <>
    <Navbar />
    <main className="min-h-[60vh]">{children}</main>
    <Footer />
    {user && <Link to="/chat" aria-label="Open community chat" title="Community chat" className="fixed bottom-5 right-5 z-[60] grid h-14 w-14 place-items-center rounded-full bg-violet-700 text-white shadow-xl shadow-violet-900/25 transition hover:scale-105 hover:bg-violet-800 focus:outline-none focus:ring-4 focus:ring-violet-200">
      <MessageCircle size={24} />
    </Link>}
  </>;
}
export const navItems = [{to:'/dashboard',label:'Overview',icon:Home},{to:'/explore',label:'Communities',icon:Users},{to:'/events',label:'Events',icon:CalendarDays},{to:'/notifications',label:'Notifications',icon:Bell}];
