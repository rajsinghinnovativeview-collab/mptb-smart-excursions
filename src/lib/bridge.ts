export type ApiResult<T=unknown>={ok:boolean;data?:T;error?:string};
export async function bridge<T=unknown>(action:string,payload:Record<string,unknown>={}):Promise<ApiResult<T>>{const res=await fetch('/api/bridge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...payload}),cache:'no-store'});return res.json();}
