import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { api } from '../lib/api';
import { Button, Card, Input } from '../components/ui';
import { toast } from 'sonner';

export default function ResetPassword(){
  const [params]=useSearchParams();const token=params.get('token')||'';const [busy,setBusy]=useState(false);const navigate=useNavigate();
  async function submit(e){e.preventDefault();const fd=new FormData(e.currentTarget);const password=String(fd.get('password')||'');const confirm=String(fd.get('confirmPassword')||'');if(password!==confirm){toast.error('Passwords do not match');return}setBusy(true);try{const {data}=await api.post('/auth/reset-password',{token,password});toast.success(data.message||'Password reset successfully');navigate('/login',{replace:true})}catch(err){toast.error(err.message)}finally{setBusy(false)}}
  return <div className="container-page grid min-h-[65vh] place-items-center py-12"><Card className="w-full max-w-md p-7 sm:p-9"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-700"><KeyRound/></span><h1 className="mt-5 text-2xl font-extrabold">Set a new password</h1><p className="mt-2 text-sm leading-6 text-slate-500">Choose a strong password with at least eight characters.</p>{!token?<p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">This reset link is missing its token. Request a new one.</p>:<form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-semibold">New password<Input name="password" type="password" minLength={8} maxLength={128} required autoComplete="new-password" className="mt-1.5"/></label><label className="block text-sm font-semibold">Confirm password<Input name="confirmPassword" type="password" minLength={8} maxLength={128} required autoComplete="new-password" className="mt-1.5"/></label><Button className="w-full" disabled={busy}>{busy?'Updating…':'Reset password'}</Button></form>}<Link to="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-violet-700"><ArrowLeft size={16}/> Back to login</Link></Card></div>
}
