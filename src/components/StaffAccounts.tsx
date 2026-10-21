'use client';
import {useEffect,useState} from 'react';
import {api} from '@/lib/api';
const roles=['MPTB Admin','Event Coordinator','Bus Operator','Site Operator','Activity Verifier','Tour Operator'];
type StaffRow=Record<string,string>;
const empty={username:'',password:'',name:'',mobile:'',email:'',role:'Bus Operator',assignedEvent:'',assignedExcursion:'',assignedBus:''};
export function StaffAccounts(){
  const [rows,setRows]=useState<StaffRow[]>([]),[draft,setDraft]=useState({...empty}),[selected,setSelected]=useState<StaffRow|null>(null),[password,setPassword]=useState(''),[edit,setEdit]=useState({name:'',mobile:'',role:'Bus Operator',assignedEvent:'',assignedExcursion:'',assignedBus:''}),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
  const load=async()=>{const data=await api<StaffRow[]>('adminList',{table:'Operators'});setRows(data);};
  useEffect(()=>{load().catch(e=>setError(e.message))},[]);
  const execute=async(operation:string,staffId?:string,staff?:Record<string,unknown>)=>{
    setBusy(true);setNotice('');setError('');
    try{await api('staffManage',{operation,staffId,staff});await load();setNotice(operation==='create'?'Account created. Give the staff member their ID and password through a private channel.':'Account updated.');if(operation==='create'){setDraft({...empty});}if(operation==='rotatePassword')setPassword('');}
    catch(e){setError(e instanceof Error?e.message:'Operation failed.');}
    finally{setBusy(false);}
  };
  return <section className="card cardBody" style={{marginTop:24}}><h3>Staff accounts · Super Admin only</h3>
    <p className="muted">Create dedicated ID/password accounts for MPTB admins and field operators. No public registration or self-service password reset is available. Disabling accounts revokes their sessions.</p>
    {error&&<p className="notice error" role="alert">{error}</p>}{notice&&<p className="notice success" role="status">{notice}</p>}
    <h3>Create staff ID</h3><div className="grid">
      {([['name','Full name'],['username','Login ID'],['email','Email'],['mobile','Mobile'],['assignedEvent','Assigned Event ID'],['assignedExcursion','Assigned Excursion ID'],['assignedBus','Assigned Bus/Site']] as const).map(([key,label])=><div className="field" key={key}><label>{label}</label><input value={draft[key]} onChange={e=>setDraft(d=>({...d,[key]:e.target.value}))}/></div>)}
      <div className="field"><label>Role</label><select value={draft.role} onChange={e=>setDraft(d=>({...d,role:e.target.value}))}>{roles.map(r=><option key={r}>{r}</option>)}</select></div>
      <div className="field"><label>Initial strong password</label><input type="password" autoComplete="new-password" value={draft.password} onChange={e=>setDraft(d=>({...d,password:e.target.value}))}/></div>
    </div><p className="muted" style={{fontSize:12}}>Password: at least 14 characters, with uppercase, lowercase, a digit and a symbol. It is stored only as a salted hash in Google Sheets.</p>
    <button className="primary" disabled={busy||!draft.username||!draft.email||!draft.name||!draft.password} onClick={()=>execute('create',undefined,draft)}>Create staff account</button>
    <h3 style={{marginTop:30}}>Existing staff</h3>
    <div className="tablewrap"><table><thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Email</th><th>Status</th><th>Action</th></tr></thead><tbody>{rows.map(r=><tr key={r['Operator ID']}><td>{r.Username||'—'}</td><td>{r.Name}</td><td>{r.Role}</td><td>{r.Email}</td><td>{r['Account Status']}</td><td><button className="secondary" onClick={()=>{setSelected(r);setPassword('');setEdit({name:r.Name||'',mobile:r.Mobile||'',role:r.Role||'Bus Operator',assignedEvent:r['Assigned Event']||'',assignedExcursion:r['Assigned Excursion']||'',assignedBus:r['Assigned Bus/Site']||''})}}>Manage</button></td></tr>)}</tbody></table></div>
    {rows.length===0&&<p className="muted">No staff accounts created yet.</p>}
    {selected&&<section className="details"><h3>Manage {selected.Username||selected.Name}</h3>
      <p className="muted">{selected.Role} · {selected.Email} · {selected['Account Status']}</p>
      <div className="grid" style={{marginBottom:15}}>
        {([['name','Full name'],['mobile','Mobile'],['assignedEvent','Assigned Event ID'],['assignedExcursion','Assigned Excursion ID'],['assignedBus','Assigned Bus/Site']] as const).map(([key,label])=><div className="field" key={key}><label>{label}</label><input value={edit[key]} onChange={e=>setEdit(d=>({...d,[key]:e.target.value}))}/></div>)}
        <div className="field"><label>Role</label><select value={edit.role} onChange={e=>setEdit(d=>({...d,role:e.target.value}))}>{roles.map(r=><option key={r}>{r}</option>)}</select></div>
      </div><div className="row" style={{marginBottom:14}}><button className="primary" disabled={busy||!edit.name.trim()} onClick={()=>execute('update',selected['Operator ID'],edit)}>Save staff details & assignment</button></div>
      <div className="row">
        <button className="secondary" disabled={busy} onClick={()=>execute(selected['Account Status']==='Active'?'disable':'enable',selected['Operator ID'])}>{selected['Account Status']==='Active'?'Disable account':'Enable account'}</button>
        <button className="secondary" onClick={()=>setSelected(null)}>Close</button>
      </div>
      <div className="field" style={{maxWidth:420,marginTop:18}}><label>Set replacement password (Super Admin only)</label><input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="New strong password"/></div>
      <button className="primary" disabled={busy||!password} onClick={()=>execute('rotatePassword',selected['Operator ID'],{password})}>Rotate password & revoke sessions</button>
    </section>}
  </section>;
}
