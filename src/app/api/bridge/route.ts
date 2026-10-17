import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
export const dynamic = 'force-dynamic';
const PUBLIC = new Set(['catalogue','eventDetail','requestOtp','verifyOtp']);
const AUTH = new Set(['me','profile','book','cancelBooking','myBookings','qrPass','adminSummary','adminList','adminSave','operatorLookup','operatorUpdate','activitiesForBooking','activityUpdate']);
const MAX_BYTES = 16000;
const COOKIE = 'mptb_session';
export async function POST(req: NextRequest) {
  try {
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
    const url=process.env.GAS_WEB_APP_URL;
    const secret=process.env.GAS_API_SECRET;
    if (!url || !secret) return NextResponse.json({ok:false,error:'Server is not configured. Set GAS_WEB_APP_URL and GAS_API_SECRET.'},{status:503});
    if (!/^https:\/\/script\.google\.com\/macros\/s\//.test(url)) return NextResponse.json({ok:false,error:'Invalid server configuration.'},{status:503});
    const jar = await cookies();
    const session = jar.get(COOKIE)?.value || '';
    if (AUTH.has(action) && !session) return NextResponse.json({ok:false,error:'Please sign in.',code:'AUTH_REQUIRED'},{status:401});
    // The secret and opaque session token are attached only by this trusted server, never the browser.
    delete input.secret; delete input.session;
    const upstream = await fetch(url, { method:'POST', redirect:'follow', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({...input,secret,session}), cache:'no-store' });
    if (!upstream.ok) return NextResponse.json({ok:false,error:'Google Sheets service unavailable.'},{status:502});
    const result: {ok:boolean;data?:unknown;error?:string;code?:string;session?:string} = await upstream.json();
    if (!result || typeof result.ok!=='boolean') throw new Error('Invalid response');
    const res=NextResponse.json({ok:result.ok,...(result.ok?{data:result.data}:{error:result.error || 'Request failed',code:result.code})},{status:result.ok?200:result.code==='AUTH_REQUIRED'?401:400});
    if (action==='verifyOtp' && result.ok && result.session) res.cookies.set(COOKIE,result.session,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*7});
    res.headers.set('Cache-Control','no-store');
    return res;
  } catch { return NextResponse.json({ok:false,error:'Unable to contact the server. Check the backend and try again.'},{status:502}); }
}
