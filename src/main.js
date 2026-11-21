import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import {initializeGallery} from './components/gallery.js';
import {initializeAccount,openAuth,openAccount,openUpload,showDialog,toast} from './components/account.js';
const $=selector=>document.querySelector(selector);
$('#copyright-year').textContent=new Date().getFullYear();

// Local-only preview of the user-supplied image. Production NEVER serves this asset.
if(import.meta.env.DEV){
  $('#hero-image').src='/__local_reference/wallhaven-jel1jq.jpg';
  $('#hero-image').alt='Retro-futuristic computer lab overlooking a neon city — local rights-unverified visual reference';
  $('.hero-image-bottom span:first-child').textContent='REFERENCE IMAGE / DEVELOPMENT PREVIEW ONLY';
}

const header=$('#site-header');
window.addEventListener('scroll',()=>header.classList.toggle('scrolled',window.scrollY>16),{passive:true});
const menuToggle=$('#menu-toggle'),nav=$('#main-nav');
menuToggle.addEventListener('click',()=>{
  const open=menuToggle.getAttribute('aria-expanded')!=='true';
  menuToggle.setAttribute('aria-expanded',String(open));menuToggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');nav.classList.toggle('open',open);
});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menuToggle.setAttribute('aria-expanded','false');}));

const intersection=new IntersectionObserver(entries=>entries.forEach(entry=>{
 if(entry.isIntersecting){entry.target.classList.add('in-view');intersection.unobserve(entry.target);}
}),{threshold:.13,rootMargin:'0px 0px -25px 0px'});
document.querySelectorAll('.reveal').forEach(el=>intersection.observe(el));

$('#account-btn').addEventListener('click',openAccount);
$('#footer-account').addEventListener('click',openAccount);
$('#join-btn').addEventListener('click',()=>openAuth('signup'));
$('#upload-btn').addEventListener('click',openUpload);
$('#account-upload').addEventListener('click',()=>{$('#account-dialog').close();showDialog('#upload-dialog');});

document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>{
 const dialog=document.getElementById(btn.dataset.close);dialog.close();
}));
document.querySelectorAll('dialog').forEach(dialog=>{
 dialog.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))document.body.classList.remove('dialog-open');});
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
});

$('#contact-form').addEventListener('submit',async event=>{
 event.preventDefault();
 const feedback=$('#contact-feedback'),btn=$('.contact-submit');
 if(import.meta.env.DEV || location.hostname==='localhost'){
  feedback.textContent='Contact submissions will be available after deploying to Netlify with Forms enabled.';
  return;
 }
 btn.disabled=true;feedback.textContent='Transmitting...';
 try{
  const form=new FormData(event.currentTarget);const body=new URLSearchParams();
  for(const [key,value] of form.entries())if(typeof value==='string')body.append(key,value);
  const response=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()});
  if(!response.ok)throw new Error('Transmission failed. Please try again.');
  feedback.textContent='Transmission received. Thank you for reaching out!';event.currentTarget.reset();
 }catch(err){feedback.textContent=err.message||'Unable to send message.';}finally{btn.disabled=false;}
});
initializeAccount();
initializeGallery().catch(err=>{console.error(err);toast('Unable to load wallpapers.');});
