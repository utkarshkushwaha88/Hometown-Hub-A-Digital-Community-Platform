import { useEffect, useState } from 'react';
import { CalendarDays, MapPin, Users, Pencil, XCircle, Save, X } from 'lucide-react';
import { api } from '../lib/api';
import { Button, Card, Badge, Input, Textarea } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const DEFAULT_EVENT_IMAGE = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80';
const DEFAULT_EVENT_CATEGORIES = ['Community event', 'Culture & traditions', 'Meetup', 'Volunteering', 'Sports & recreation', 'Education'];
const idOf = value => String(value?._id || value || '');
const toLocalInput = value => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [editingEvent, setEditingEvent] = useState('');
  const [eventCategories, setEventCategories] = useState(DEFAULT_EVENT_CATEGORIES);
  const { user } = useAuth();

  async function loadEvents() {
    try {
      const { data } = await api.get('/events', { params: { upcoming: true, limit: 30 } });
      setEvents(data.events || []);
    } catch (error) {
      setEvents([]);
      toast.error(error.response?.data?.message || 'Could not load events');
    } finally { setLoading(false); }
  }

  useEffect(() => { loadEvents(); }, []);
  useEffect(() => {
    api.get('/categories', { params: { type: 'event' } }).then(({ data }) => {
      setEventCategories([...new Set([...DEFAULT_EVENT_CATEGORIES, ...(data.categories || []).map(item => item.name)])]);
    }).catch(() => {});
  }, []);

  function canManage(event) {
    const userId = idOf(user?._id || user?.id);
    return Boolean(userId && (user?.role === 'admin' || idOf(event.organizer) === userId || idOf(event.community?.owner) === userId || (event.community?.moderators || []).some(item => idOf(item) === userId)));
  }

  async function register(event) {
    if (!user) { toast.error('Please log in to join an event'); return; }
    setBusy(event._id);
    try {
      if (event.isRegistered) {
        await api.delete(`/events/${event._id}/register`);
        toast.success('Your event registration was cancelled');
      } else {
        await api.post(`/events/${event._id}/register`);
        toast.success('You are registered for this event');
      }
      await loadEvents();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Could not update event registration');
    } finally { setBusy(''); }
  }

  async function saveEvent(event, formEvent) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    const startDateRaw = form.get('startDate');
    const endDateRaw = form.get('endDate');
    if (!startDateRaw || new Date(startDateRaw) <= new Date()) {
      toast.error('Choose a future start date and time.'); return;
    }
    if (endDateRaw && new Date(endDateRaw) < new Date(startDateRaw)) {
      toast.error('End date must be after the start date.'); return;
    }
    setBusy(event._id);
    try {
      const payload = {
        title: form.get('title'), description: form.get('description'),
        category: form.get('category'), startDate: new Date(startDateRaw).toISOString(),
        endDate: endDateRaw ? new Date(endDateRaw).toISOString() : undefined,
        venue: form.get('venue') || '', format: form.get('format'),
        capacity: form.get('capacity') ? Number(form.get('capacity')) : undefined,
      };
      await api.patch(`/events/${event._id}`, payload);
      toast.success('Event updated'); setEditingEvent(''); await loadEvents();
    } catch (error) { toast.error(error.response?.data?.message || error.message || 'Could not update event.'); }
    finally { setBusy(''); }
  }

  async function cancelEvent(event) {
    if (!window.confirm(`Cancel “${event.title}”? Attendees will be notified.`)) return;
    setBusy(event._id);
    try {
      await api.delete(`/events/${event._id}`);
      toast.success('Event cancelled'); setEvents(current => current.filter(item => item._id !== event._id));
    } catch (error) { toast.error(error.response?.data?.message || error.message || 'Could not cancel event.'); }
    finally { setBusy(''); }
  }

  return (
    <div className="container-page py-12">
      <p className="text-sm font-bold uppercase tracking-[.18em] text-emerald-700">Get together</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">Local events, real connections.</h1>
      <p className="mt-3 max-w-2xl text-slate-500">Find cultural celebrations, meetups, volunteering drives, and community gatherings near your hometown.</p>

      {loading ? (
        <div className="mt-8 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map(n => <Card key={n} className="h-96 animate-pulse bg-slate-100" />)}</div>
      ) : events.length ? (
        <div className="mt-8 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
          {events.map(event => (
            <Card key={event._id} className="flex h-full flex-col overflow-hidden">
              <img className="h-44 w-full shrink-0 object-cover" src={event.coverImage || DEFAULT_EVENT_IMAGE} alt={event.title} loading="lazy"/>
              <div className="flex flex-1 flex-col p-5">
                <div><Badge>{event.category || 'Community event'}</Badge></div>
                <h2 className="mt-3 line-clamp-2 min-h-[3.5rem] text-lg font-bold">{event.title}</h2>
                <p className="mt-2 line-clamp-2 min-h-[3rem] text-sm leading-6 text-slate-500">{event.description}</p>
                <div className="mt-4 min-h-[6.5rem] space-y-2 text-sm text-slate-500">
                  <p className="flex min-h-5 items-start gap-2"><CalendarDays size={15} className="mt-0.5 shrink-0"/><span>{new Date(event.startDate).toLocaleString()}</span></p>
                  <p className="flex min-h-5 items-start gap-2"><MapPin size={15} className="mt-0.5 shrink-0"/><span>{event.location?.city || event.venue || 'Location to be announced'}</span></p>
                  <p className="flex min-h-5 items-start gap-2"><Users size={15} className="mt-0.5 shrink-0"/><span>{event.attendeeCount ?? 0}{event.capacity ? ` / ${event.capacity}` : ''} attending</span></p>
                </div>

                {canManage(event) && <div className="mt-4 border-t border-slate-100 pt-3">
                  {editingEvent === event._id ? (
                    <form onSubmit={e => saveEvent(event, e)} className="space-y-3">
                      <label className="block text-xs font-semibold">Title<Input name="title" defaultValue={event.title} required minLength={3} maxLength={120} className="mt-1"/></label>
                      <label className="block text-xs font-semibold">Description<Textarea name="description" defaultValue={event.description} required minLength={10} maxLength={3000} rows={3} className="mt-1 min-h-20"/></label>
                      <label className="block text-xs font-semibold">Start date and time<Input type="datetime-local" name="startDate" defaultValue={toLocalInput(event.startDate)} required className="mt-1"/></label>
                      <label className="block text-xs font-semibold">End date and time (optional)<Input type="datetime-local" name="endDate" defaultValue={toLocalInput(event.endDate)} className="mt-1"/></label>
                      <label className="block text-xs font-semibold">Venue<Input name="venue" defaultValue={event.venue || ''} maxLength={200} className="mt-1"/></label>
                      <div className="grid grid-cols-2 gap-2"><label className="block text-xs font-semibold">Category<select name="category" defaultValue={event.category || DEFAULT_EVENT_CATEGORIES[0]} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm">{eventCategories.map(c => <option key={c}>{c}</option>)}</select></label><label className="block text-xs font-semibold">Format<select name="format" defaultValue={event.format || 'offline'} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm"><option value="offline">In person</option><option value="online">Online</option></select></label></div>
                      <label className="block text-xs font-semibold">Attendee limit<Input name="capacity" type="number" min="1" defaultValue={event.capacity || ''} className="mt-1"/></label>
                      <div className="flex gap-2"><Button type="submit" className="flex-1" disabled={busy === event._id}><Save size={14}/> Save changes</Button><Button type="button" variant="outline" onClick={() => setEditingEvent('')}><X size={14}/></Button></div>
                    </form>
                  ) : <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setEditingEvent(event._id)} className="flex-1"><Pencil size={14}/> Edit event</Button><Button type="button" variant="danger" size="sm" disabled={busy === event._id} onClick={() => cancelEvent(event)}><XCircle size={14}/> Cancel</Button></div>}
                </div>}

                <Button className="mt-auto w-full" onClick={() => register(event)} disabled={busy === event._id}>
                  {busy === event._id ? 'Updating…' : event.isRegistered ? 'Cancel registration' : 'Join event'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mt-8 p-12 text-center"><CalendarDays size={30} className="mx-auto text-emerald-700"/><h2 className="mt-4 text-xl font-bold">Nothing on the calendar yet</h2><p className="mt-2 text-sm text-slate-500">When communities organize events, you'll find them here.</p></Card>
      )}
    </div>
  );
}
