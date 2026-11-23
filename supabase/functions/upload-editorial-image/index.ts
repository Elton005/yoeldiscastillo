import { createClient } from 'npm:@supabase/supabase-js@2.119.2';
import { imageExtensions, validImageBytes } from '../_shared/image.ts';
const allowed = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(value => value.trim()).filter(Boolean);
Deno.serve(async request => {
  const origin = request.headers.get('Origin') || '';
  const headers = { 'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : 'null', 'Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type, x-supabase-api-version', 'Access-Control-Allow-Methods':'POST, OPTIONS', 'Vary':'Origin', 'Content-Type':'application/json', 'X-Content-Type-Options':'nosniff' };
  const respond = (status: number, body: unknown) => new Response(JSON.stringify(body),{status,headers});
  if (origin && !allowed.includes(origin)) return respond(403,{error:'Origin rejected'});
  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if (request.method !== 'POST') return respond(405,{error:'Method not allowed'});
  try {
    const token = request.headers.get('Authorization');
    if (!token?.startsWith('Bearer ')) return respond(401,{error:'Authentication required'});
    const url = Deno.env.get('SUPABASE_URL')!;
    const client = createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:token}},auth:{persistSession:false}});
    const { data:{user},error } = await client.auth.getUser();
    if (error || !user) return respond(401,{error:'Authentication required'});
    const role = await client.rpc('current_editor_role');
    if (role.error || !['admin','editor'].includes(role.data)) return respond(403,{error:'Not authorized'});
    const type = request.headers.get('Content-Type')?.split(';')[0] || '';
    if (!imageExtensions[type]) return respond(415,{error:'Unsupported image'});
    if (Number(request.headers.get('Content-Length'))>5242880) return respond(413,{error:'Image too large'});
    const limit = await client.rpc('reserve_editorial_upload');
    if (limit.error) return respond(429,{error:'Upload limit reached'});
    const reader = request.body?.getReader();
    if (!reader) return respond(400,{error:'Missing image'});
    const chunks: Uint8Array[] = [];let length=0;
    while (true) {
      const {done,value} = await reader.read();if(done) break;
      length += value.length;
      if (length>5242880) { await reader.cancel();return respond(413,{error:'Image too large'}); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);let offset=0;
    for (const chunk of chunks) { bytes.set(chunk,offset);offset+=chunk.length; }
    if (!validImageBytes(type,bytes)) return respond(415,{error:'Invalid image signature'});
    // This privileged key exists ONLY in Edge environment, never in VITE_* or browser code.
    const storage = createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}}).storage.from('libros-imagenes');
    const path = `${user.id}/${crypto.randomUUID()}.${imageExtensions[type]}`;
    const result = await storage.upload(path,bytes,{upsert:false,contentType:type,cacheControl:'3600'});
    if (result.error) return respond(400,{error:'Upload failed'});
    return respond(201,{path,url:storage.getPublicUrl(path).data.publicUrl});
  } catch { return respond(400,{error:'Upload failed'}); }
});
