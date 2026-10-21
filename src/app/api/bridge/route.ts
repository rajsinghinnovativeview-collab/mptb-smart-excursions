import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
export const dynamic = 'force-dynamic';
const PUBLIC = new Set(['catalogue','eventDetail','requestOtp','verifyOtp','staffLogin']);
const AUTH = new Set(['me','profile','book','cancelBooking','myBookings','qrPass','adminSummary','adminList','adminSave','operatorLookup','operatorUpdate','activitiesForBooking','activityUpdate','badgeLookup','staffManage','staffProfileSave']);
const MAX_BYTES = 16000;
const COOKIE = 'mptb_session';
async function equalCredentials(a:string,b:string) {
  const digest=async(v:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)));
  const [x,y]=await Promise.all([digest(a),digest(b)]);
  let mismatch=0;for(let i=0;i<x.length;i++)mismatch|=x[i]^y[i];
  return mismatch===0;
}
export async function POST(req: NextRequest) {
  try {
    const origin=req.headers.get('origin');
    if(origin && origin!==new URL(req.url).origin) return NextResponse.json({ok:false,error:'Cross-site requests are not allowed.'},{status:403});
    const raw = await req.text();
    if (raw.length > MAX_BYTES) return NextResponse.json({ok:false,error:'Request too large.'},{status:413});
    const input: Record<string,unknown> = JSON.parse(raw);
    const action = String(input.action ?? '');
    if (!PUBLIC.has(action) && !AUTH.has(action) && action !== 'signOut') return NextResponse.json({ok:false,error:'Unknown request.'},{status:400});
    if (action === 'signOut') {
      const out = NextResponse.json({ok:true,data:{signedOut:true}});
      out.cookies.set(COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});
      return out;
    }
    // OpenNext on Cloudflare exposes runtime bindings through the request context.
    // process.env remains a fallback for local Next.js development.
    let cfEnv: Record<string,string|undefined> = {};
    try { cfEnv = (await getCloudflareContext({ async: true })).env as unknown as Record<string,string|undefined>; } catch { /* local development */ }
    const url = cfEnv.GAS_WEB_APP_URL || process.env.GAS_WEB_APP_URL;
    const secret = cfEnv.GAS_API_SECRET || process.env.GAS_API_SECRET;
    if (!url || !secret) return NextResponse.json({ok:false,error:'Server is not configured. Set GAS_WEB_APP_URL and GAS_API_SECRET.'},{status:503});
    if (!/^https:\/\/script\.google\.com\/macros\/s\//.test(url)) return NextResponse.json({ok:false,error:'Invalid server configuration.'},{status:503});
    const jar = await cookies();
    const session = jar.get(COOKIE)?.value || '';
    if (AUTH.has(action) && !session) return NextResponse.json({ok:false,error:'Please sign in.',code:'AUTH_REQUIRED'},{status:401});
    // Cloudflare validates bootstrap Super Admin credentials without sharing the password with Apps Script.
    let upstreamAction=action;
    let outgoing: Record<string,unknown> = {...input};
    if(action==='staffLogin'){
      const area=String(input.area||'');
      if(area!=='admin' && area!=='operator')return NextResponse.json({ok:false,error:'Unknown staff login area.'},{status:400});
      const username=String(input.username||'').trim().toLowerCase();
      const configuredAdmin=String(cfEnv.SUPER_ADMIN_USERNAME||process.env.SUPER_ADMIN_USERNAME||'').trim().toLowerCase();
      if(area==='admin' && configuredAdmin && username===configuredAdmin){
        const pass=cfEnv.SUPER_ADMIN_PASSWORD || process.env.SUPER_ADMIN_PASSWORD || '';
        const bootstrapKey=cfEnv.GAS_BOOTSTRAP_KEY || process.env.GAS_BOOTSTRAP_KEY || '';
        if(pass.length<14 || bootstrapKey.length<32)
          return NextResponse.json({ok:false,error:'Super Admin credentials or bootstrap connection are not configured.'},{status:503});
        if(!await equalCredentials(String(input.password||''),pass))
          return NextResponse.json({ok:false,error:'Invalid username or password.',code:'AUTH_REQUIRED'},{status:401});
        upstreamAction='bootstrapStaffSession';
        outgoing={bootstrapKey};
      }
    }
    // The secret and opaque session token are attached only by this trusted server, never the browser.
    delete outgoing.secret; delete outgoing.session;
    const upstream = await fetch(url, { method:'POST', redirect:'follow', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({...outgoing,action:upstreamAction,secret,session}), cache:'no-store' });
    if (!upstream.ok) return NextResponse.json({ok:false,error:'Google Sheets service unavailable.'},{status:502});
    const result: {ok:boolean;data?:unknown;error?:string;code?:string;session?:string} = await upstream.json();
    if (!result || typeof result.ok!=='boolean') throw new Error('Invalid response');
    const res=NextResponse.json({ok:result.ok,...(result.ok?{data:result.data}:{error:result.error || 'Request failed',code:result.code})},{status:result.ok?200:result.code==='AUTH_REQUIRED'?401:400});
    if ((action==='verifyOtp'||action==='staffLogin') && result.ok && result.session) res.cookies.set(COOKIE,result.session,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*7});
    res.headers.set('Cache-Control','no-store');
    return res;
  } catch { return NextResponse.json({ok:false,error:'Unable to contact the server. Check the backend and try again.'},{status:502}); }
}
