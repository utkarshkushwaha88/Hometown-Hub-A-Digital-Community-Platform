import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Users, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { Button, Card } from '../components/ui';
import { toast } from 'sonner';

export default function Chat(){
 const [communities,setCommunities]=useState([]);
 const [selected,setSelected]=useState('');
 const [messages,setMessages]=useState([]);
 const [content,setContent]=useState('');
 const [loading,setLoading]=useState(true);
 const [sending,setSending]=useState(false);
 const bottom=useRef(null);
 async function loadCommunities(){
  try { const {data}=await api.get('/chat/communities'); setCommunities(data.communities||[]); if(!selected && data.communities?.length) setSelected(data.communities[0]._id); }
  catch(e){toast.error(e.message)} finally{setLoading(false)}
 }
 async function loadMessages(id=selected, quiet=false){
  if(!id)return;
  try { const {data}=await api.get(`/chat/${id}/messages`,{params:{limit:100}}); setMessages(data.messages||[]); }
  catch(e){if(!quiet)toast.error(e.message)}
 }
 useEffect(()=>{loadCommunities()},[]);
 useEffect(()=>{loadMessages(selected); if(!selected)return; const timer=setInterval(()=>loadMessages(selected,true),4000); return()=>clearInterval(timer)},[selected]);
 useEffect(()=>{bottom.current?.scrollIntoView({behavior:'smooth'})},[messages.length]);
 async function send(e){
  e.preventDefault(); const text=content.trim(); if(!text||!selected||sending)return;
  setSending(true);
  try{const {data}=await api.post(`/chat/${selected}/messages`,{content:text});setMessages(prev=>[...prev,data.message]);setContent('')}
  catch(e){toast.error(e.message)}
  finally{setSending(false)}
 }
 const active=communities.find(c=>c._id===selected);
 return <div className="container-page py-8">
  <div className="mb-6"><p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Community conversations</p><h1 className="mt-1 text-3xl font-black text-slate-900">Community chat</h1><p className="mt-2 text-slate-600">Talk with approved members of communities you belong to.</p></div>
  <div className="grid min-h-[560px] gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
   <Card className="overflow-hidden p-3"><div className="flex items-center gap-2 px-2 py-3 font-bold"><Users size={18}/> Your communities</div>
    {loading?<p className="p-3 text-sm text-slate-500">Loading communities…</p>:communities.length?communities.map(c=><button key={c._id} onClick={()=>setSelected(c._id)} className={`mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${selected===c._id?'bg-emerald-50 text-emerald-900':'hover:bg-slate-50'}`}><span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-emerald-100 text-emerald-800">{c.avatar?<img src={c.avatar} alt="" className="h-full w-full object-cover"/>:<MessageCircle size={18}/>}</span><span className="min-w-0"><span className="block truncate text-sm font-bold">{c.name}</span><span className="block text-xs text-slate-500">Community chat</span></span></button>):<p className="p-3 text-sm text-slate-500">Join an approved community to start chatting.</p>}
   </Card>
   <Card className="flex min-h-[560px] flex-col overflow-hidden">
    <div className="flex items-center justify-between border-b border-slate-100 p-4"><div><h2 className="font-extrabold">{active?.name||'Choose a community'}</h2><p className="text-xs text-slate-500">Creator messages on the left · member messages on the right</p></div><button onClick={()=>loadMessages()} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Refresh messages"><RefreshCw size={17}/></button></div>
    <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4">
     {messages.length?messages.map(m=>{const isCreator=String(m.sender?._id||m.sender)===String(active?.owner?._id||active?.owner);return <div key={m._id} className={`flex w-full ${isCreator?'justify-start':'justify-end'}`}><div className={`max-w-[85%] rounded-2xl border p-3 shadow-sm ${isCreator?'rounded-tl-md border-slate-100 bg-white':'rounded-tr-md border-emerald-100 bg-emerald-50'}`}><div className="mb-1 flex flex-wrap items-center gap-2"><span className={`text-sm font-bold ${isCreator?'text-slate-800':'text-emerald-800'}`}>{m.sender?.name||'Member'}{isCreator?' · Creator':''}</span><time className="text-[11px] text-slate-400">{new Date(m.createdAt).toLocaleString()}</time></div><p className="whitespace-pre-wrap break-words text-sm text-slate-700">{m.content}</p></div></div>}):<div className="grid h-full min-h-56 place-items-center text-center text-slate-500"><div><MessageCircle className="mx-auto mb-2" size={30}/><p className="font-semibold">No messages yet</p><p className="text-sm">Start the conversation with your community.</p></div></div>}
     <div ref={bottom}/>
    </div>
    <form onSubmit={send} className="flex gap-2 border-t border-slate-100 p-3"><input value={content} onChange={e=>setContent(e.target.value)} maxLength={2000} placeholder={selected?'Write a message…':'Choose a community first'} disabled={!selected||sending} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"/><Button type="submit" disabled={!selected||!content.trim()||sending}><Send size={16}/><span className="hidden sm:inline">Send</span></Button></form>
   </Card>
  </div>
 </div>
}
