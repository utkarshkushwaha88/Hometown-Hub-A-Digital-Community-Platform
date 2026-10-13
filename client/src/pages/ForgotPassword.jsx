import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { api } from '../lib/api';
import { Button, Card, Input } from '../components/ui';
import { toast } from 'sonner';

export default function ForgotPassword(){
  const [busy,setBusy]=useState(false);const [submitted,setSubmitted]=useState(false);
  async function submit(e){e.preventDefault();setBusy(true);try{await api.post('/auth/forgot-password',{email:new FormData(e.currentTarget).get('email')});setSubmitted(true);toast.success('Check your email if an account exists for that address.')}catch(err){toast.error(err.message)}finally{setBusy(false)}}
  return <div className="container-page grid min-h-[65vh] place-items-center py-12"><Card className="w-full max-w-md p-7 sm:p-9"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-700"><Mail/></span><h1 className="mt-5 text-2xl font-extrabold">Forgot your password?</h1><p className="mt-2 text-sm leading-6 text-slate-500">Enter the email address associated with your account. If it exists, we'll send a reset link.</p>{submitted?<div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">If an active account exists for that email, a password-reset link will be sent. Check your inbox and spam folder.</div>:<form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-semibold">Email address<Input name="email" type="email" required autoComplete="email" className="mt-1.5" placeholder="you@example.com"/></label><Button className="w-full" disabled={busy}>{busy?'Sending…':'Send reset link'}</Button></form>}<Link to="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-violet-700"><ArrowLeft size={16}/> Back to login</Link></Card></div>
}
