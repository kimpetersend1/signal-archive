import {supabase,configured} from '../services/supabase.js';
import {fetchOwnSubmissions,submitWallpaper} from '../services/wallpapers.js';
const $=s=>document.querySelector(s);
let currentUser=null;
let authMode='login';
let verifiedAdmin=false;

export function showDialog(selector) {const d=$(selector);if(!d.open)d.showModal();document.body.classList.add('dialog-open');}
export function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),4500);}
function feedback(id,message,negative=false){const el=$(id);el.textContent=message;el.style.color=negative?'#f7a4ad':'var(--cyan)';}
export function getUser(){return currentUser;}
function setMode(mode){
 authMode=mode;
 const form=$('#auth-form'), name=$('#display-name-wrap'), password=$('#password-wrap');
 const emailLabel=form.querySelector('input[name=email]').closest('label');
 emailLabel.hidden=mode==='update';emailLabel.querySelector('input').required=mode!=='update';
 $('#auth-feedback').textContent='';name.hidden=mode!=='signup';name.querySelector('input').required=mode==='signup';
 password.hidden=mode==='reset';password.querySelector('input').required=mode!=='reset';
 const title=mode==='signup'?'JOIN THE<br>FREQUENCY<span class="period">.</span>':mode==='reset'?'RESET YOUR<br>PASSWORD<span class="period">.</span>':mode==='update'?'CHOOSE A NEW<br>PASSWORD<span class="period">.</span>':'ENTER THE<br>ARCHIVE<span class="period">.</span>';
 $('#auth-title').innerHTML=title;
 $('#auth-submit').firstChild.textContent=mode==='signup'?'CREATE ACCOUNT ':mode==='reset'?'SEND RESET EMAIL ':mode==='update'?'UPDATE PASSWORD ':'SIGN IN ';
 $('#forgot-password').hidden=mode==='signup'||mode==='update'||mode==='reset';
 $('.tab-switch').hidden=mode==='reset'||mode==='update';
 password.querySelector('input').autocomplete=mode==='signup'||mode==='update'?'new-password':'current-password';
 document.querySelectorAll('[data-auth-mode]').forEach(b=>b.classList.toggle('active',b.dataset.authMode===mode));
 form.reset();
}
export function openAuth(mode='login') {setMode(mode);showDialog('#auth-dialog');if(!configured)feedback('#auth-feedback','Account services need Supabase project configuration. The public preview still works.',true);}
export async function openAccount(){
 if(!currentUser){openAuth();return;}
 $('#account-identity').textContent=currentUser.email || 'Signed in';
 showDialog('#account-dialog');
 const submissions=$('#member-submissions');submissions.replaceChildren();submissions.textContent='Loading submissions...';
 try{
  const entries=await fetchOwnSubmissions(currentUser.id);
  submissions.replaceChildren();
  if (!entries.length) submissions.textContent='No uploads yet. Your first world is waiting.';
  entries.forEach(e=>{
   const div=document.createElement('div');div.className='submission-item';
   const details=document.createElement('div');const title=document.createElement('h4');title.textContent=e.title;
   const date=document.createElement('p');date.textContent=new Date(e.created_at).toLocaleDateString();
   const status=document.createElement('span');status.className=`status-tag ${e.status}`;status.textContent=e.status;
   details.append(title,date);div.append(details,status);submissions.append(div);
  });
 }catch(e){submissions.textContent='Unable to load submissions. '+e.message;}
 $('#admin-panel').hidden=true;
 await loadAdminQueue();
}
export function openUpload(){if(!currentUser){openAuth('signup');toast('Create an account or sign in to upload.');return;}showDialog('#upload-dialog');}
function updateSession(user){currentUser=user;$('#account-btn-text').textContent=user?'ACCOUNT':'SIGN IN';}
async function bearer(){const{data:{session}}=await supabase.auth.getSession();return session?.access_token;}
async function loadAdminQueue(){
 if (!currentUser || !configured)return;
 let response;
 try{response=await fetch('/api/moderation',{headers:{Authorization:`Bearer ${await bearer()}`}});}catch{return;}
 if(response.status===403)return;
 if(!response.ok || !response.headers.get('content-type')?.includes('application/json'))return;
 verifiedAdmin=true;$('#admin-panel').hidden=false;
 const {items=[],reports=[]}=await response.json();
 const list=$('#admin-submissions');list.replaceChildren();
 if(!items.length)list.textContent='No pending transmissions.';
 items.forEach(item=>{
  const entry=document.createElement('div');entry.className='submission-item admin-item';
  const img=document.createElement('img');img.src=item.signed_url;img.alt=`Submitted wallpaper: ${item.title}`;img.loading='lazy';
  const content=document.createElement('div'),title=document.createElement('h4');title.textContent=item.title;
  const detail=document.createElement('p');detail.textContent=`${item.owner_id.slice(0,8)} · ${item.width} × ${item.height} · ${Math.round(item.byte_size/1024)} KB`;
  const buttons=document.createElement('div');buttons.className='admin-controls';
  for(const decision of ['approve','reject']){
    const button=document.createElement('button');button.type='button';button.className=decision;button.textContent=decision.toUpperCase();
    button.addEventListener('click',async()=>{
      if(decision==='approve' && !window.confirm('Have you verified this wallpaper can legally be shared and publicly downloaded?'))return;
      if(decision==='reject' && !window.confirm('Reject this submission?'))return;
      buttons.querySelectorAll('button').forEach(b=>b.disabled=true);
      try{
       const r=await fetch('/api/moderation',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await bearer()}`},body:JSON.stringify({id:item.id,decision})});
       const data=await r.json();if(!r.ok)throw new Error(data.error||'Review failed');
       toast(decision==='approve'?'Wallpaper published.':'Submission rejected.');await loadAdminQueue();
      }catch(e){toast(e.message);buttons.querySelectorAll('button').forEach(b=>b.disabled=false);}
    });buttons.append(button);
  }
  content.append(title,detail,buttons);entry.append(img,content);list.append(entry);
 });
 const reportsList=$('#admin-reports');reportsList.replaceChildren();
 if(!reports.length)reportsList.textContent='No reports awaiting review.';
 reports.forEach(item=>{
   const entry=document.createElement('div');entry.className='submission-item';
   const content=document.createElement('div');
   const title=document.createElement('h4');title.textContent=`Wallpaper ID: ${item.wallpaper_id.slice(0,8)}`;
   const reason=document.createElement('p');reason.textContent=item.reason;
   const buttons=document.createElement('div');buttons.className='admin-controls';
   for(const decision of ['resolve','dismiss']){
     const b=document.createElement('button');b.type='button';b.textContent=decision.toUpperCase();
     b.addEventListener('click',async()=>{
       b.disabled=true;
       try{
         const r=await fetch('/api/moderation',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await bearer()}`},body:JSON.stringify({id:item.id,decision})});
         const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to review report');
         toast('Report updated.');await loadAdminQueue();
       }catch(e){toast(e.message);b.disabled=false;}
     });buttons.append(b);
   }
   const remove=document.createElement('button');remove.type='button';remove.textContent='TAKE DOWN WALLPAPER';remove.className='reject';
   remove.addEventListener('click',async()=>{
     if(!window.confirm('Unpublish this wallpaper and remove its public file? This action cannot be undone from the UI.'))return;
     remove.disabled=true;
     try{
       const r=await fetch('/api/moderation',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await bearer()}`},body:JSON.stringify({id:item.wallpaper_id,decision:'unpublish'})});
       const d=await r.json();if(!r.ok)throw new Error(d.error||'Unpublish failed');
       toast('Wallpaper unpublished.');await loadAdminQueue();
     }catch(e){toast(e.message);remove.disabled=false;}
   });
   buttons.append(remove);
   content.append(title,reason,buttons);entry.append(content);reportsList.append(entry);
 });
}

export function initializeAccount(){
 document.querySelectorAll('[data-auth-mode]').forEach(btn=>btn.addEventListener('click',()=>setMode(btn.dataset.authMode)));
 $('#forgot-password').addEventListener('click',()=>setMode('reset'));
 $('#auth-form').addEventListener('submit',async e=>{
  e.preventDefault();if(!configured){feedback('#auth-feedback','Connect Supabase before creating accounts.',true);return;}
  const btn=$('#auth-submit');btn.disabled=true;
  const form=new FormData(e.currentTarget);const email=(form.get('email')||'').trim();const password=form.get('password');
  try{
   let result;
   if(authMode==='signup'){
     const name=(form.get('displayName')||'').trim();if(name.length<2)throw new Error('Display name is too short.');
     result=await supabase.auth.signUp({email,password,options:{data:{display_name:name},emailRedirectTo:window.location.origin}});
   } else if(authMode==='login') result=await supabase.auth.signInWithPassword({email,password});
   else if(authMode==='reset') result=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});
   else if(authMode==='update')result=await supabase.auth.updateUser({password});
   if(result.error)throw result.error;
   feedback('#auth-feedback',authMode==='signup'?'Check your inbox to confirm your email before signing in.':authMode==='reset'?'If this address has an account, a reset link has been sent.':authMode==='update'?'Password updated. You can sign in.':'Welcome back to the archive.');
   if(authMode==='login') {setTimeout(()=>{$('#auth-dialog').close();document.body.classList.remove('dialog-open');openAccount();},500);}
  }catch(err){feedback('#auth-feedback',err.message||'Authentication failed.',true);}finally{btn.disabled=false;}
 });
 $('#image-file').addEventListener('change',e=>{
  const preview=$('#upload-preview');if(preview.dataset.url)URL.revokeObjectURL(preview.dataset.url);
  const file=e.target.files[0];if(!file){preview.hidden=true;return;}
  preview.dataset.url=URL.createObjectURL(file);preview.src=preview.dataset.url;preview.hidden=false;
 });
 $('#upload-form').addEventListener('submit',async e=>{
  e.preventDefault();if(!currentUser)return openAuth();
  const form=new FormData(e.currentTarget);const btn=$('#upload-submit');btn.disabled=true;
  feedback('#upload-feedback','Validating and uploading...');
  try{
    await submitWallpaper({user:currentUser,file:form.get('wallpaper'),title:form.get('title'),description:form.get('description')||'',rights:form.get('rights')==='on'});
    e.currentTarget.reset();$('#upload-preview').hidden=true;
    feedback('#upload-feedback','Submitted successfully. Your wallpaper is private until approved.');toast('Your wallpaper was submitted for review.');
  }catch(err){feedback('#upload-feedback',err.message||'Upload failed. Please try again.',true);}finally{btn.disabled=false;}
 });
 $('#signout-btn').addEventListener('click',async()=>{if(supabase)await supabase.auth.signOut();$('#account-dialog').close();document.body.classList.remove('dialog-open');toast('Signed out.');});
 if(configured){
  supabase.auth.getUser().then(({data:{user}})=>updateSession(user)).catch(()=>updateSession(null));
  supabase.auth.onAuthStateChange((event,session)=>{
    updateSession(session?.user||null);
    if(event==='PASSWORD_RECOVERY')setTimeout(()=>openAuth('update'),200);
  });
 }
}
