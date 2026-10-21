'use client';
import {useState} from 'react';
import {api} from '@/lib/api';
import type {UserSession} from '@/lib/types';

export function StaffLogin({area,onSuccess}:{area:'admin'|'operator';onSuccess:(session:UserSession)=>void}){
  const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const title=area==='admin'?'Administration sign-in':'Operator sign-in';
  const submit=async(e:React.FormEvent<HTMLFormElement>)=>{
    e.preventDefault();setError('');setBusy(true);
    try {
      await api('staffLogin',{username:username.trim(),password,area});
      const session=await api<UserSession>('me');
      if(area==='admin'&&!['Super Admin','MPTB Admin','Event Coordinator'].includes(session.role))throw new Error('This account does not have administrator access.');
      if(area==='operator'&&!['Super Admin','MPTB Admin','Bus Operator','Site Operator','Activity Verifier','Tour Operator'].includes(session.role))throw new Error('This account does not have operator access.');
      setPassword('');onSuccess(session);
    } catch(err){setError(err instanceof Error?err.message:'Sign-in failed.');}
    finally{setBusy(false);}
  };
  return <section className="form" aria-label={title}>
    <span className="eyebrow" style={{color:'#9c7947'}}>Restricted staff access</span>
    <h3>{title}</h3>
    <p className="muted">Enter the staff ID and password assigned by the Super Admin. Delegate email OTP is separate.</p>
    {error&&<p className="notice error" role="alert">{error}</p>}
    <form onSubmit={submit}>
      <div className="field"><label htmlFor={area+'-username'}>Staff ID</label><input id={area+'-username'} value={username} autoComplete="username" onChange={e=>setUsername(e.target.value)} required minLength={4} placeholder="e.g. busoperator01"/></div>
      <div className="field"><label htmlFor={area+'-password'}>Password</label><input id={area+'-password'} type="password" value={password} autoComplete="current-password" onChange={e=>setPassword(e.target.value)} required placeholder="Assigned password"/></div>
      <button className="primary" disabled={busy}>{busy?'Signing in…':'Sign in to '+(area==='admin'?'Admin':'Operator')+' portal'}</button>
    </form>
    <p className="muted" style={{fontSize:12}}>Passwords cannot be reset by staff. Contact the Super Admin to rotate a credential or disable an account.</p>
  </section>;
}
