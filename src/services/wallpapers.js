import { supabase, configured, publicImageUrl, PRIVATE_BUCKET } from './supabase.js';
export const sampleWallpapers = [
  { id:'sample-midnight', title:'Midnight Frequency', creator:'SIGNAL STUDIO', description:'A city that never sleeps, tuned to a different frequency.', image:'/assets/images/midnight-frequency.svg', width:1440, height:1024 },
  { id:'sample-orbit', title:'The Last Orbit', creator:'SIGNAL STUDIO', description:'One more journey around an unfamiliar sun.', image:'/assets/images/the-last-orbit.svg', width:1000, height:1340 },
  { id:'sample-desert', title:'Desert Protocol', creator:'SIGNAL STUDIO', description:'The last light before the world goes quiet.', image:'/assets/images/desert-protocol.svg', width:1200, height:800 },
  { id:'sample-ghost', title:'Ghost Signal', creator:'SIGNAL STUDIO', description:'Something beautiful is coming through.', image:'/assets/images/ghost-signal.svg', width:900, height:1200 },
  { id:'sample-after', title:'After Hours', creator:'SIGNAL STUDIO', description:'Neon nights and the city beyond.', image:'/assets/images/after-hours.svg', width:1500, height:900 },
  { id:'sample-moon', title:'Quiet Moon', creator:'SIGNAL STUDIO', description:'A peaceful place at the edge of everything.', image:'/assets/images/quiet-moon.svg', width:1000, height:1280 },
  { id:'sample-analog', title:'Analog Heart', creator:'SIGNAL STUDIO', description:'A love letter to impossible planets.', image:'/assets/images/analog-heart.svg', width:1100, height:800 },
  { id:'sample-rain', title:'Neon Rain', creator:'SIGNAL STUDIO', description:'Some skies are meant to be remembered.', image:'/assets/images/neon-rain.svg', width:1024, height:1320 },
];

// The user-provided reference image is only exposed via Vite's local-only middleware.
// Production builds use original licensed-for-this-project SVG illustrations instead.
if (import.meta.env.DEV) {
  sampleWallpapers.unshift({ id:'local-reference', title:'The Other Side of Night', creator:'UNVERIFIED REFERENCE — LOCAL PREVIEW ONLY', description:'Supplied design image. Not cleared for public redistribution; download disabled.', image:'/__local_reference/wallhaven-jel1jq.jpg', width:1649, height:928, notDownloadable:true });
}

export async function fetchApprovedWallpapers() {
  if (!configured) return [];
  const { data, error } = await supabase.from('wallpapers')
    .select('id,title,description,width,height,published_path,profiles!wallpapers_owner_id_fkey(display_name)')
    .eq('status','approved').order('published_at',{ascending:false}).limit(80);
  if (error) throw error;
  return (data || []).filter(w=>w.published_path).map(w=>({
    id:w.id,title:w.title,description:w.description || '',width:w.width,height:w.height,
    creator:w.profiles?.display_name || 'ARCHIVE CREATOR',image:publicImageUrl(w.published_path),
    path:w.published_path,
  }));
}

export async function fetchOwnSubmissions(userId) {
  if (!configured || !userId) return [];
  const { data, error } = await supabase.from('wallpapers').select('id,title,status,created_at')
    .eq('owner_id',userId).order('created_at',{ascending:false}).limit(50);
  if (error) throw error;
  return data;
}

const extensions = { 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif' };
export async function inspectImage(file) {
  if (!file || !extensions[file.type]) throw new Error('Choose a JPG, PNG, WEBP or AVIF image.');
  if (file.size > 12*1024*1024 || file.size === 0) throw new Error('Image must be between 1 byte and 12 MB.');
  const bitmap = await createImageBitmap(file).catch(()=>null);
  if (!bitmap) throw new Error('This image could not be read. Try a different image.');
  const {width,height} = bitmap; bitmap.close();
  if (width < 800 || height < 600 || width > 16000 || height > 16000) throw new Error('Images must be at least 800 × 600 and no larger than 16000 × 16000.');
  return { width,height,extension:extensions[file.type] };
}

export async function submitWallpaper({user,file,title,description,rights}) {
  if (!configured || !user) throw new Error('Sign in and configure Supabase before uploading.');
  if (!rights) throw new Error('You must confirm that you have permission to share this image.');
  const dimensions = await inspectImage(file);
  const path = `${user.id}/${crypto.randomUUID()}.${dimensions.extension}`;
  const {error:storageError} = await supabase.storage.from(PRIVATE_BUCKET)
    .upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
  if (storageError) throw storageError;
  const {error:dbError} = await supabase.from('wallpapers').insert({
    owner_id:user.id,title:title.trim(),description:description.trim() || null,
    source_path:path,width:dimensions.width,height:dimensions.height,
    mime_type:file.type,byte_size:file.size,rights_attested:true,
  });
  if (dbError) {
    await supabase.storage.from(PRIVATE_BUCKET).remove([path]).catch(()=>{});
    throw dbError;
  }
}

export async function submitReport(wallpaperId, reporterId, reason) {
 if(!configured || !reporterId)throw new Error('Sign in to submit a report.');
 const {error}=await supabase.from('wallpaper_reports').insert({wallpaper_id:wallpaperId,reporter_id:reporterId,reason:reason.trim()});
 if(error)throw error;
}
