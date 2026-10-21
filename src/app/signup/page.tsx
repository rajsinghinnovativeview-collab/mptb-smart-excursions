'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {api} from '@/lib/api';
import type {Participant,UserSession} from '@/lib/types';
const fields=(['Name','Mobile','Organisation','Designation','City','State','Country','Current Hotel'] as const);
export default function SignUp(){
  const router=useRouter();
  const [method,setMethod]=useState<'badge'|'manual'|null>(null),[stage,setStage]=useState<'choose'|'email'|'verify'|'profile'>('choose'),
    [badge,setBadge]=useState(''),[badgeVerified,setBadgeVerified]=useState(false),[email,setEmail]=useState(''),[code,setCode]=useState(''),
    [profile,setProfile]=useState<Partial<Participant>>({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const begin=(m:'badge'|'manual')=>{setMethod(m);setStage('email');setError('');setNotice('');setBadgeVerified(false)};
  const request=async()=>{setBusy(true);setError('');try{await api('requestOtp',{email,intent:'signup'});setStage('verify')}catch(e){setError(e instanceof Error?e.message:'Unable to send code.')}finally{setBusy(false)}};
  const verify=async()=>{setBusy(true);setError('');setNotice('');try{
    await api('verifyOtp',{email,code,intent:'signup'});
    const session=await api<UserSession>('me');
    setProfile(session.participant||{});
    if(method==='badge'){
      try{
        const match=await api<Partial<Participant>>('badgeLookup',{badgeId:badge});
        setProfile(p=>({...p,...match}));setBadgeVerified(true);
        setNotice('Badge matched to your verified email. Your details have been prefilled.');
      }catch{setBadgeVerified(false);setNotice('No matching badge record was found for this verified email. Please complete registration manually.');}
    }
    setStage('profile');
  }catch(e){setError(e instanceof Error?e.message:'Code verification failed.')}finally{setBusy(false)}};
  const finish=async()=>{setBusy(true);setError('');try{await api('profile',{profile,badgeId:badgeVerified?badge:''});router.push('/dashboard');router.refresh()}catch(e){setError(e instanceof Error?e.message:'Unable to save your profile.')}finally{setBusy(false)}};
  return <main className="shell section"><span className="eyebrow" style={{color:'#9c7947'}}>Participant registration</span><h2>Create your excursion account</h2>
    <p className="muted">One-time registration, verified by email. Your permanent QR pass and future bookings will stay linked to this account.</p>
    {error&&<p className="notice error" role="alert">{error}</p>}{notice&&<p className="notice success" role="status">{notice}</p>}
    {stage==='choose'&&<div className="grid" style={{maxWidth:780,marginTop:28}}>
      <button className="card cardBody choice" onClick={()=>begin('badge')}><strong>I have a delegate Badge ID</strong><span className="muted">Find my existing record after verifying my email.</span></button>
      <button className="card cardBody choice" onClick={()=>begin('manual')}><strong>Register manually</strong><span className="muted">I'm new here or don't have a badge.</span></button>
    </div>}
    {stage==='email'&&<div className="form" style={{marginTop:25}}><h3>{method==='badge'?'Find your badge record':'Manual registration'}</h3>
      <form onSubmit={e=>{e.preventDefault();request()}}>
        {method==='badge'&&<div className="field"><label htmlFor="badge">Delegate Badge ID</label><input id="badge" value={badge} onChange={e=>setBadge(e.target.value.trim())} required placeholder="Enter ID from your delegate badge"/></div>}
        <div className="field"><label htmlFor="email">Email registered for your badge / account</label><input id="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="delegate@example.com"/></div>
        <p className="muted" style={{fontSize:12}}>For privacy, imported badge details are shown only after the associated email is verified.</p>
        <div className="row"><button className="primary" disabled={busy}>{busy?'Sending…':'Send OTP →'}</button><button type="button" className="secondary" onClick={()=>setStage('choose')}>Back</button></div>
      </form></div>}
    {stage==='verify'&&<div className="form" style={{marginTop:25}}><h3>Verify your email</h3><form onSubmit={e=>{e.preventDefault();verify()}}><p className="muted">We've sent a six-digit code to <strong>{email}</strong>.</p>
      <div className="field"><label htmlFor="code">Email OTP</label><input id="code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value)}/></div>
      <div className="row"><button className="primary" disabled={busy}>{busy?'Verifying…':'Verify email →'}</button><button className="secondary" type="button" onClick={()=>setStage('email')}>Change details</button></div>
    </form></div>}
    {stage==='profile'&&<section className="card cardBody" style={{maxWidth:850,marginTop:25}}><h3>{badgeVerified?'Confirm your badge details':'Complete your participant profile'}</h3><p className="muted">Email verified: <strong>{email}</strong>. Edit your details before finishing registration.</p>
      <form onSubmit={e=>{e.preventDefault();finish()}}><div className="grid" style={{gap:12}}>{fields.map(k=><div className="field" key={k}><label htmlFor={'field-'+k}>{k}{k==='Name'?' *':''}</label><input id={'field-'+k} required={k==='Name'} value={profile[k]||''} onChange={e=>setProfile(p=>({...p,[k]:e.target.value}))}/></div>)}</div>
        <button className="primary" disabled={busy||!profile.Name?.trim()}>{busy?'Saving…':'Complete registration & view QR pass →'}</button></form>
    </section>}
    <p className="muted" style={{marginTop:24}}>Already registered? <Link href="/login" style={{textDecoration:'underline'}}>Sign in with email OTP</Link>.</p>
  </main>;
}
