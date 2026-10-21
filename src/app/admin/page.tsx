'use client';
import {useEffect,useState} from 'react';
import {api} from '@/lib/api';
import type {UserSession} from '@/lib/types';
import {StaffLogin} from '@/components/StaffLogin';
import {StaffProfile} from '@/components/StaffProfile';
import {StaffAccounts} from '@/components/StaffAccounts';
const tables:Record<string,string[]>={
  Events:['Event ID','Event Name','Event Year','Start Date','End Date','Venue','Status','Registration Open','Description'],
  Excursions:['Excursion ID','Event ID','Name','Destination','Date','Reporting Time','Departure Time','Return Time','Meeting Point','Capacity','Status'],
  Activities:['Activity ID','Excursion ID','Activity Name','Activity Type','Capacity','Optional/Included','Charge','Safety Requirements','Minimum Age','Status']
};
const readOnly=['Participants','Bookings','Activity Selections','Bus Assignments','Audit Logs'];
type Summary={events:number;participants:number;bookings:number;confirmed:number;boarded:number;arrived:number};
export default function Admin(){
  const [session,setSession]=useState<UserSession|null>(null),[checked,setChecked]=useState(false),[summary,setSummary]=useState<Summary|null>(null),
  [table,setTable]=useState('Events'),[rows,setRows]=useState<Record<string,string>[]>([]),[draft,setDraft]=useState<Record<string,string>>({}),
  [editing,setEditing]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(false);
  const allowed=session&&['Super Admin','MPTB Admin','Event Coordinator'].includes(session.role);
  const load=async(t:string)=>{setTable(t);setLoading(true);setError('');try{setRows(await api<Record<string,string>[]>('adminList',{table:t}));}catch(e){setError(e instanceof Error?e.message:'Unable to load records');}finally{setLoading(false)}};
  const signedIn=(s:UserSession)=>{setSession(s);setError('');setChecked(true);if(['Super Admin','MPTB Admin','Event Coordinator'].includes(s.role)){load('Events');api<Summary>('adminSummary').then(setSummary).catch(()=>{});}};
  useEffect(()=>{api<UserSession>('me').then(s=>{if(['Super Admin','MPTB Admin','Event Coordinator'].includes(s.role))signedIn(s);else setChecked(true)}).catch(()=>setChecked(true));},[]);
  const save=async()=>{setError('');setNotice('');setLoading(true);try{await api('adminSave',{table,row:draft});setEditing(false);setDraft({});setNotice('Record saved successfully.');await load(table);api<Summary>('adminSummary').then(setSummary).catch(()=>{});}catch(e){setError(e instanceof Error?e.message:'Save failed');}finally{setLoading(false)}};
  const signOut=async()=>{await api('signOut');setSession(null);setSummary(null);setRows([]);setError('');};
  return <main className="shell section">
    <span className="eyebrow" style={{color:'#9c7947'}}>Restricted access · MPTB</span>
    <h2>Administration & operations</h2>
    <p className="muted">Manage events and registrations from your authorised staff account.</p>
    {!checked&&<p className="muted">Checking access…</p>}
    {checked&&!allowed&&<StaffLogin area="admin" onSuccess={signedIn}/>}
    {allowed&&<><div className="row" style={{justifyContent:'space-between',marginTop:20}}><p className="muted">Signed in as <strong>{session?.name||session?.email}</strong> · {session?.role}</p><button className="secondary" onClick={signOut}>Sign out</button></div>
      <div className="grid" style={{margin:'25px 0'}}>{[['Participants',summary?.participants],['Confirmed bookings',summary?.confirmed],['Boarded',summary?.boarded],['Arrived',summary?.arrived],['Total events',summary?.events],['Total bookings',summary?.bookings]].map(([label,value])=><div className="card cardBody" key={String(label)}><span className="muted">{label}</span><div className="stat">{value??'—'}</div></div>)}</div>
      <div className="row" style={{margin:'22px 0'}}>{[...Object.keys(tables),...readOnly,...(session?.role==='Super Admin'?['Staff accounts']:[])].map(t=><button key={t} className={table===t?'primary':'secondary'} onClick={()=>{setEditing(false);setTable(t);if(t!=='Staff accounts')load(t)}}>{t}</button>)}</div>
      {error&&<p className="notice error" role="alert">{error}</p>}
      {notice&&<p className="notice success">{notice}</p>}
      {table==='Staff accounts'?session?.role==='Super Admin'&&<StaffAccounts/>:<>
        <div className="sectionHead"><h3>{table}{loading?' · Loading…':''}</h3>{tables[table]&&<button className="primary" onClick={()=>{setDraft({});setEditing(true)}}>+ Add record</button>}</div>
        <div className="tablewrap"><table><thead><tr>{(tables[table]||Object.keys(rows[0]||{})).slice(0,7).map(h=><th key={h}>{h}</th>)}{tables[table]&&<th>Action</th>}</tr></thead>
        <tbody>{rows.map((r,i)=><tr key={i}>{(tables[table]||Object.keys(r)).slice(0,7).map(h=><td key={h}>{r[h]||'—'}</td>)}{tables[table]&&<td><button className="secondary" onClick={()=>{setDraft(r);setEditing(true)}}>Edit</button></td>}</tr>)}</tbody></table></div>
        {rows.length===0&&!loading&&<p className="muted">No records found in this table.</p>}
        {editing&&tables[table]&&<div className="card cardBody" style={{marginTop:25}}><h3>{draft[tables[table][0]]?'Edit':'Add'} {table} record</h3><p className="muted">Use YYYY-MM-DD for dates and TRUE/FALSE for registration status.</p><div className="grid">{tables[table].map(h=><div key={h} className="field"><label>{h}</label><input value={draft[h]||''} onChange={e=>setDraft(d=>({...d,[h]:e.target.value}))}/></div>)}</div><div className="row"><button disabled={loading} className="primary" onClick={save}>Save to Google Sheets</button><button className="secondary" onClick={()=>setEditing(false)}>Cancel</button></div></div>}
      </>}
      <StaffProfile session={session!} onSaved={setSession}/>
    </>}
  </main>;
}
