'use client';
import {useState} from 'react';
import {api} from '@/lib/api';
import type {UserSession} from '@/lib/types';
export function StaffProfile({session,onSaved}:{session:UserSession;onSaved:(session:UserSession)=>void}){
  const [name,setName]=useState(session.name||''),[mobile,setMobile]=useState(session.mobile||''),[busy,setBusy]=useState(false),[note,setNote]=useState('');
  const isBootstrap=session.role==='Super Admin';
  const save=async()=>{setBusy(true);setNote('');try{await api('staffProfileSave',{name,mobile});onSaved(await api<UserSession>('me'));setNote('Profile updated.')}catch(e){setNote(e instanceof Error?e.message:'Unable to save.')}finally{setBusy(false)}};
  return <section className="card cardBody" style={{marginTop:24}}><h3>My staff profile</h3><p className="muted">Role: <strong>{session.role}</strong> · {session.email} {session.username?' · '+session.username:''}</p>
    {isBootstrap?<p className="muted">Super Admin credentials are managed through Cloudflare secrets. Administrator email is configured in Apps Script.</p>:
    <div className="row" style={{alignItems:'end'}}><div className="field"><label>Full name</label><input value={name} onChange={e=>setName(e.target.value)}/></div><div className="field"><label>Mobile</label><input value={mobile} onChange={e=>setMobile(e.target.value)}/></div><button className="secondary" disabled={busy||!name.trim()} onClick={save}>{busy?'Saving…':'Update profile'}</button></div>}
    {note&&<p className="notice" role="status">{note}</p>}
  </section>;
}
