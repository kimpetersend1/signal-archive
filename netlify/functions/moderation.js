import { createClient } from '@supabase/supabase-js';
import { hasImageSignature } from '../../src/utils/image-signatures.js';

const response = (obj,status=200)=>new Response(JSON.stringify(obj),{
 status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff'}
});
const MIME_TYPES = new Map([['image/jpeg','jpg'],['image/png','png'],['image/webp','webp'],['image/avif','avif']]);


export default async function handler(request){
 if(!['GET','POST','PATCH'].includes(request.method))return response({error:'Method not allowed'},405);
 const url=process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!secret)return response({error:'Moderation backend not configured'},503);
 const header=request.headers.get('Authorization')||'';
 if(!/^Bearer\s+\S+$/.test(header))return response({error:'Login required'},401);
 const token=header.replace(/^Bearer\s+/,'');
 const server=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await server.auth.getUser(token);
 if(authError||!user)return response({error:'Invalid or expired session'},401);
 const {data:admin,error:adminError}=await server.from('archive_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 if(adminError)return response({error:'Unable to validate privileges'},500);
 if(!admin)return response({error:'Administrator privileges required'},403);
 if(request.method==='GET'){
   const {data,error}=await server.from('wallpapers')
     .select('id,owner_id,title,description,source_path,width,height,byte_size,mime_type,created_at')
     .eq('status','pending').order('created_at',{ascending:true}).limit(50);
   if(error)return response({error:'Unable to retrieve review queue'},500);
   const items=await Promise.all((data||[]).map(async entry=>{
      const {data:signed,error:signErr}=await server.storage.from('wallpaper-submissions').createSignedUrl(entry.source_path,90);
      return {...entry,signed_url:signErr?'':signed.signedUrl};
   }));
   const {data:reports,error:reportError}=await server.from('wallpaper_reports')
      .select('id,wallpaper_id,reason,created_at').eq('status','pending').order('created_at',{ascending:true}).limit(30);
   if(reportError)return response({error:'Unable to retrieve reports'},500);
   return response({items,reports});
 }
 let payload;
 try{payload=await request.json();}catch{return response({error:'Invalid JSON'},400);}
 if(request.method==='PATCH'){
   if(!payload||!['resolve','dismiss'].includes(payload.decision)||typeof payload.id!=='string'||! /^[a-f\d-]{36}$/i.test(payload.id))return response({error:'Invalid report action'},400);
   const {data:updated,error}=await server.from('wallpaper_reports').update({status:payload.decision==='resolve'?'resolved':'dismissed'})
     .eq('id',payload.id).eq('status','pending').select('id').maybeSingle();
   if(error)return response({error:'Unable to update report'},500);
   if(!updated)return response({error:'Report no longer pending'},409);
   return response({ok:true});
 }
 if(payload?.decision==='unpublish'){
   if(typeof payload.id!=='string'||! /^[a-f\d-]{36}$/i.test(payload.id))return response({error:'Invalid wallpaper id'},400);
   const {data:approved,error:lookupError}=await server.from('wallpapers').select('id,published_path')
     .eq('id',payload.id).eq('status','approved').maybeSingle();
   if(lookupError)return response({error:'Could not find wallpaper'},500);
   if(!approved)return response({error:'Wallpaper is not currently published'},409);
   // First remove the DB listing. Once unpublished, a cleanup failure cannot re-expose the listing.
   const {data:removed,error:dbError}=await server.from('wallpapers')
     .update({status:'rejected',published_path:null,published_at:null})
     .eq('id',payload.id).eq('status','approved').select('id').maybeSingle();
   if(dbError)return response({error:'Unable to unpublish wallpaper'},500);
   if(!removed)return response({error:'Wallpaper was already changed'},409);
   const {error:deleteError}=await server.storage.from('wallpaper-public').remove([approved.published_path]);
   if(deleteError)return response({error:'Unpublished from gallery; public storage cleanup needs manual attention'},500);
   await server.from('wallpaper_reports').update({status:'resolved'}).eq('wallpaper_id',payload.id).eq('status','pending');
   await server.from('moderation_audit').insert({wallpaper_id:payload.id,actor_id:user.id,action:'unpublish'});
   return response({ok:true});
 }
 if(!payload||!['approve','reject'].includes(payload.decision)||
    typeof payload.id!=='string'||! /^[a-f\d-]{36}$/i.test(payload.id))return response({error:'Invalid review request'},400);
 const {id,decision}=payload;
 // Transition pending -> processing atomically to stop duplicate decisions.
 const {data:item,error:transitionError}=await server.from('wallpapers').update({status:'processing'})
   .eq('id',id).eq('status','pending').select('*').maybeSingle();
 if(transitionError)return response({error:'Unable to lock submission'},500);
 if(!item)return response({error:'Submission is not pending or does not exist'},409);
 const revert=async()=>server.from('wallpapers').update({status:'pending'}).eq('id',id).eq('status','processing');
 try{
   if(decision==='approve'){
      // Inspect original bytes before promoting user content to a public bucket.
      const {data:blob,error:downloadError}=await server.storage.from('wallpaper-submissions').download(item.source_path);
      if(downloadError||!blob)throw new Error('Submitted image was not found in private storage.');
      if(blob.size !== item.byte_size || blob.size>12*1024*1024)throw new Error('Stored image size does not match its metadata.');
      const signature=new Uint8Array(await blob.slice(0,16).arrayBuffer());
      if(!hasImageSignature(signature,item.mime_type))throw new Error('Image signature did not match its declared format.');
      const ext=MIME_TYPES.get(item.mime_type);
      if(!ext||!item.source_path.endsWith('.'+ext))throw new Error('Unsupported image extension.');
      const publishedPath=`approved/${item.id}.${ext}`;
      const {error:copyError}=await server.storage.from('wallpaper-submissions')
        .copy(item.source_path,publishedPath,{destinationBucket:'wallpaper-public'});
      if(copyError)throw copyError;
      const {error:publishedError}=await server.from('wallpapers').update({
        status:'approved',published_path:publishedPath,published_at:new Date().toISOString()
      }).eq('id',id).eq('status','processing');
      if(publishedError){await server.storage.from('wallpaper-public').remove([publishedPath]);throw publishedError;}
   }else{
      const {error:rejectedError}=await server.from('wallpapers').update({status:'rejected'})
        .eq('id',id).eq('status','processing');
      if(rejectedError)throw rejectedError;
      // Remove rejected private assets. Metadata remains visible to the creator.
      await server.storage.from('wallpaper-submissions').remove([item.source_path]);
   }
   await server.from('moderation_audit').insert({wallpaper_id:id,actor_id:user.id,action:decision});
   return response({ok:true});
 }catch(error){
   await revert();
   return response({error:error?.message||'Moderation action failed'},500);
 }
}
