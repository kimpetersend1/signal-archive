import { sampleWallpapers, fetchApprovedWallpapers } from '../services/wallpapers.js';
import {getUser,openAuth,showDialog as openUiDialog,toast} from './account.js';
import {submitReport} from '../services/wallpapers.js';
let items = [];
let visible = 0;
let selectedIndex = 0;
const PAGE_SIZE = 9;
const gallery = document.querySelector('#gallery');
const lightbox = document.querySelector('#lightbox');
const lightboxImg = document.querySelector('#lightbox-img');
const lbDownload = document.querySelector('#download-wallpaper');

function showDialog(dialog) { if (!dialog.open) dialog.showModal(); document.body.classList.add('dialog-open'); }
function createCard(item,index) {
  const article=document.createElement('article'); article.className='wallpaper-card reveal in-view';
  article.style.setProperty('--card-ratio', `${item.width}/${item.height}`);
  const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`Preview ${item.title}`);
  const image=document.createElement('img'); image.src=item.image; image.alt=item.description || `${item.title} wallpaper`;image.loading='lazy';image.decoding='async';
  const overlay=document.createElement('span');overlay.className='wallpaper-card-overlay';
  const info=document.createElement('span');info.className='wallpaper-card-info';
  const small=document.createElement('small');small.textContent=`WALLPAPER / ${String(index+1).padStart(3,'0')}`;
  const strong=document.createElement('strong');strong.textContent=item.title;
  const arrow=document.createElement('span');arrow.className='card-arrow';arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
  info.append(small,strong);overlay.append(info,arrow);button.append(image,overlay);article.append(button);
  button.addEventListener('click',()=>showWallpaper(index));
  return article;
}
function renderMore() {
  const next=Math.min(visible+PAGE_SIZE,items.length);
  const fragment=document.createDocumentFragment();
  for(let index=visible;index<next;index++) fragment.append(createCard(items[index],index));
  gallery.append(fragment);visible=next;
  document.querySelector('#load-more').hidden=visible>=items.length;
}
function refreshLightbox() {
  const item=items[selectedIndex]; if (!item) return;
  lightboxImg.src=item.image;lightboxImg.alt=`${item.title} by ${item.creator}`;
  document.querySelector('#lightbox-title').textContent=item.title;
  document.querySelector('#lightbox-description').textContent=item.description || 'A new world from the SIGNAL//ARCHIVE community.';
  document.querySelector('#lightbox-creator').textContent=item.creator;
  document.querySelector('#lightbox-resolution').textContent=`${item.width} × ${item.height}`;
  if (item.notDownloadable) {
    lbDownload.removeAttribute('href'); lbDownload.removeAttribute('download');lbDownload.setAttribute('aria-disabled','true');
    lbDownload.style.pointerEvents='none';lbDownload.firstChild.textContent='RIGHTS CHECK REQUIRED ';
  } else {
    lbDownload.href=item.image;
    lbDownload.download=`signal-archive-${item.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.${item.image.split('?')[0].split('.').pop() || 'jpg'}`;
    lbDownload.removeAttribute('aria-disabled');lbDownload.style.pointerEvents='';
    lbDownload.firstChild.textContent='DOWNLOAD IMAGE ';
  }
  document.querySelector('#report-wallpaper').hidden=item.id.startsWith('sample-') || item.notDownloadable;
}
export function showWallpaper(index) {selectedIndex=index;refreshLightbox();showDialog(lightbox);}
function navigate(delta){if(!items.length)return;selectedIndex=(selectedIndex+delta+items.length)%items.length;refreshLightbox();}
export async function initializeGallery() {
  document.querySelector('#load-more').addEventListener('click',renderMore);
  document.querySelector('#lightbox-prev').addEventListener('click',()=>navigate(-1));
  document.querySelector('#lightbox-next').addEventListener('click',()=>navigate(1));
  document.querySelector('#report-wallpaper').addEventListener('click',()=>{
    if(!getUser()){toast('Sign in to report a wallpaper.');lightbox.close();openAuth('login');return;}
    lightbox.close();openUiDialog('#report-dialog');
  });
  document.querySelector('#report-form').addEventListener('submit',async event=>{
    event.preventDefault();const button=event.currentTarget.querySelector('button[type=submit]');
    button.disabled=true;
    try {await submitReport(items[selectedIndex].id,getUser()?.id,new FormData(event.currentTarget).get('reason'));
      document.querySelector('#report-feedback').textContent='Thank you. Your report is queued for review.';event.currentTarget.reset();
    }catch(e){document.querySelector('#report-feedback').textContent=e.message||'Could not submit report.';}
    finally{button.disabled=false;}
  });
  lbDownload.addEventListener('click',async event=>{
    const item=items[selectedIndex];if(item.notDownloadable)return;
    event.preventDefault();
    const original=lbDownload.firstChild.textContent;
    lbDownload.firstChild.textContent='PREPARING DOWNLOAD ';
    try{
      const res=await fetch(item.image);if(!res.ok)throw new Error('Download request failed');
      const blob=await res.blob();const objectUrl=URL.createObjectURL(blob);
      const anchor=document.createElement('a');anchor.href=objectUrl;
      const ext=item.image.split('?')[0].split('.').pop()||'jpg';
      anchor.download=`signal-archive-${item.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.${ext}`;
      document.body.append(anchor);anchor.click();anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(objectUrl),1200);
    }catch(e){toast('Download failed. Please try again.');}
    finally{lbDownload.firstChild.textContent=original;}
  });
  document.addEventListener('keydown',e=>{
    if(!lightbox.open)return;
    if(e.key==='ArrowRight'){e.preventDefault();navigate(1);}
    if(e.key==='ArrowLeft'){e.preventDefault();navigate(-1);}
  });
  const status=document.querySelector('#gallery-status');
  try {
    const approved=await fetchApprovedWallpapers();
    items=approved.length?approved:sampleWallpapers;
    document.querySelector('#archive-count').textContent=approved.length?`ARCHIVE ONLINE / ${approved.length} SIGNALS`:`ARCHIVE ONLINE / ${sampleWallpapers.length} SAMPLES`;
    if(!approved.length) document.querySelector('#gallery-footnote').textContent='ORIGINAL SAMPLE ARTWORK — APPROVED COMMUNITY UPLOADS WILL APPEAR HERE.';
    if (import.meta.env.DEV && !approved.length) status.textContent='LOCAL PREVIEW: reference image is not cleared for redistribution. Downloads are disabled for that image.';
  } catch(err) {
    console.error('Gallery loading failed',err);
    items=sampleWallpapers;
    status.textContent='Live archive unavailable. Showing original sample wallpapers.';
  }
  renderMore();
}
