/** Defend against MIME-only checks by examining file magic bytes. */
export function hasImageSignature(bytes,mime){
 if (mime==='image/jpeg')return bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
 if (mime==='image/png')return bytes.length>=8 && bytes.slice(0,8).every((b,i)=>b===[137,80,78,71,13,10,26,10][i]);
 if (mime==='image/webp')return String.fromCharCode(...bytes.slice(0,4))==='RIFF' && String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 if (mime==='image/avif')return String.fromCharCode(...bytes.slice(4,8))==='ftyp' && ['avif','avis'].includes(String.fromCharCode(...bytes.slice(8,12)));
 return false;
}
