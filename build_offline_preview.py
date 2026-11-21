"""Create an optional standalone design-review page, not a production build input.
Includes a locally supplied unlicensed reference for *private visual review only*.
"""
from pathlib import Path
import base64,json,re
root=Path(__file__).parent
html=(root/'index.html').read_text()
for regex in [r'<link rel="preconnect".*?/>',r'<link href="https://fonts.googleapis.com.*?/>']:
 html=re.sub(regex,'',html)
styles='\n'.join((root/'src/styles'/f'{n}.css').read_text() for n in ('tokens','base','layout','components'))
html=html.replace('</head>',f'<style>{styles}</style></head>')
ref='data:image/jpeg;base64,'+base64.b64encode((root/'reference/wallhaven-jel1jq.jpg').read_bytes()).decode()
html=html.replace('src="/assets/images/midnight-frequency.svg" alt="Cinematic midnight cityscape illuminated with neon light"',f'src="{ref}" alt="Private visual preview of supplied retro-futuristic room"')
html=html.replace('THE WORLD BEYOND THE WINDOW','REFERENCE IMAGE — PRIVATE REVIEW ONLY')
wallpapers=[]
items=[('The Other Side of Night','REFERENCE / LOCAL ONLY','Design reference. Rights are not cleared for public distribution.',ref,1649,928,True)]
for name,title,w,h in [
 ('midnight-frequency','Midnight Frequency',1440,1024),('the-last-orbit','The Last Orbit',1000,1340),('desert-protocol','Desert Protocol',1200,800),
 ('ghost-signal','Ghost Signal',900,1200),('after-hours','After Hours',1500,900),('quiet-moon','Quiet Moon',1000,1280),
 ('analog-heart','Analog Heart',1100,800),('neon-rain','Neon Rain',1024,1320)]:
 uri='data:image/svg+xml;base64,'+base64.b64encode((root/'public/assets/images'/f'{name}.svg').read_bytes()).decode()
 items.append((title,'SIGNAL STUDIO','Original sample wallpaper created for this site.',uri,w,h,False))
js='''
const artwork = __DATA__;
const $ = s => document.querySelector(s);
const toast = message => {let t=$('#toast'); t.textContent=message; t.classList.add('show');setTimeout(()=>t.classList.remove('show'),4000)};
$('.top-ticker').insertAdjacentHTML('beforebegin','<div style="background:#27436c;color:#d7f7ff;padding:9px 18px;text-align:center;font:10px DM Mono,monospace;letter-spacing:.07em">PRIVATE DESIGN PREVIEW ONLY — BACKEND DISABLED — REFERENCE IMAGE RIGHTS NOT VERIFIED</div>');
$('#copyright-year').textContent=new Date().getFullYear();
$('#archive-count').textContent='ARCHIVE ONLINE / 09 PREVIEW IMAGES';
$('#gallery-footnote').textContent='SAMPLE ART ONLY — MEMBER UPLOADS REQUIRE A CONNECTED BACKEND.';
$('#gallery-status').textContent='PREVIEW ONLY: reference photo downloads are disabled pending rights verification.';
document.querySelectorAll('.reveal').forEach(el=>el.classList.add('in-view'));
let index=0;
function fillLightbox(){
 const [title,creator,desc,src,w,h,restricted]=artwork[index];
 $('#lightbox-title').textContent=title;$('#lightbox-creator').textContent=creator;$('#lightbox-description').textContent=desc;
 $('#lightbox-img').src=src;$('#lightbox-img').alt=title;$('#lightbox-resolution').textContent=`${w} × ${h}`;
 const dl=$('#download-wallpaper');dl.dataset.restricted=restricted?'yes':'no';dl.href=restricted?'#':src;dl.download=restricted?'':`signal-archive-${title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.${src.startsWith('data:image/svg')?'svg':'jpg'}`;
 dl.firstChild.textContent=restricted?'RIGHTS CHECK REQUIRED ':'DOWNLOAD IMAGE ';
 $('#report-wallpaper').hidden=true;
}
function addCard(item,i){
 const a=document.createElement('article');a.className='wallpaper-card';a.style.setProperty('--card-ratio',`${item[4]}/${item[5]}`);
 const b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Preview '+item[0]);
 const image=document.createElement('img');image.src=item[3];image.alt=item[2];image.loading='lazy';
 const overlay=document.createElement('span');overlay.className='wallpaper-card-overlay';
 const info=document.createElement('span');info.className='wallpaper-card-info';
 const sm=document.createElement('small');sm.textContent='WALLPAPER / '+String(i+1).padStart(3,'0');
 const title=document.createElement('strong');title.textContent=item[0];info.append(sm,title);
 const arrow=document.createElement('span');arrow.className='card-arrow';arrow.textContent='↗';
 overlay.append(info,arrow);b.append(image,overlay);a.append(b);
 b.onclick=()=>{index=i;fillLightbox();$('#lightbox').showModal()};
 return a;
}
artwork.forEach((entry,i)=>$('#gallery').append(addCard(entry,i)));
$('#load-more').hidden=true;
$('#lightbox-prev').onclick=()=>{index=(index+artwork.length-1)%artwork.length;fillLightbox();};
$('#lightbox-next').onclick=()=>{index=(index+1)%artwork.length;fillLightbox();};
$('#download-wallpaper').onclick=e=>{if($('#download-wallpaper').dataset.restricted==='yes'){e.preventDefault();toast('Reference image is not licensed for public downloads.');}};
document.addEventListener('keydown',e=>{if(!$('#lightbox').open)return;if(e.key==='ArrowLeft')$('#lightbox-prev').click();if(e.key==='ArrowRight')$('#lightbox-next').click()});
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).close());
const mobile=$('#menu-toggle'),nav=$('#main-nav');
mobile.onclick=()=>{const v=mobile.getAttribute('aria-expanded')!=='true';mobile.setAttribute('aria-expanded',String(v));nav.classList.toggle('open',v)};
nav.querySelectorAll('a').forEach(a=>a.onclick=()=>{mobile.setAttribute('aria-expanded','false');nav.classList.remove('open')});
window.addEventListener('scroll',()=>$('#site-header').classList.toggle('scrolled',scrollY>16),{passive:true});
for (const id of ['account-btn','footer-account','join-btn','upload-btn','account-upload']){document.getElementById(id).onclick=()=>toast('Account signup and member uploads are available after Supabase + Netlify configuration.');}
$('#contact-form').onsubmit=e=>{e.preventDefault();$('#contact-feedback').textContent='This offline design preview cannot send messages. Deploy to Netlify to activate the form.'};
'''.replace('__DATA__',json.dumps(items))
html=html.replace('<script type="module" src="/src/main.js"></script>',f'<script>{js}</script>')
(root/'offline-preview.html').write_text(html)
print('Offline preview:',len(html)//1024,'KB')
