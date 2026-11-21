"""Original SVG placeholder wallpapers. No third-party images or licensed references."""
from pathlib import Path
from random import Random
from math import sin
from html import escape
P=Path(__file__).parent/'public/assets/images'
P.mkdir(parents=True,exist_ok=True)
scenes=[
 ('midnight-frequency',1440,1024,'#040c21','#152d61','#945edf','#00d6ed','city'),
 ('the-last-orbit',1000,1340,'#090b25','#2c1d55','#c77dd8','#62c7ff','planet'),
 ('desert-protocol',1200,800,'#0d112c','#402951','#f5a16d','#ffdcac','dunes'),
 ('ghost-signal',900,1200,'#031d29','#12435a','#6cffed','#5e92ff','portal'),
 ('after-hours',1500,900,'#090d20','#40225c','#e169b0','#8ee4ff','city'),
 ('quiet-moon',1000,1280,'#0a1324','#234356','#74aac3','#d9efff','mountain'),
 ('analog-heart',1100,800,'#161024','#51295a','#f27a96','#79ddc7','planet'),
 ('neon-rain',1024,1320,'#061225','#203865','#40ceff','#aa78e6','city'),
]
for i,(name,w,h,dark,mid,accent,highlight,kind) in enumerate(scenes):
 r=Random(711+i)
 parts=[f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">
 <defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="{dark}"/><stop offset="0.62" stop-color="{mid}"/><stop offset="1" stop-color="{dark}"/></linearGradient>
 <radialGradient id="glow"><stop stop-color="{accent}" stop-opacity=".58"/><stop offset="1" stop-color="{accent}" stop-opacity="0"/></radialGradient>
 <linearGradient id="ground" x2="0" y2="1"><stop stop-color="{mid}"/><stop offset="1" stop-color="{dark}"/></linearGradient>
 <filter id="blur"><feGaussianBlur stdDeviation="19"/></filter>
 <pattern id="lines" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 0 H4" stroke="#fff" stroke-opacity=".02"/></pattern></defs>
 <rect width="100%" height="100%" fill="url(#sky)"/>
 <ellipse cx="{int(w*.62)}" cy="{int(h*.38)}" rx="{int(w*.5)}" ry="{int(h*.58)}" fill="url(#glow)"/>
''']
 for j in range(135):
  x,y=r.randint(0,w),r.randint(0,int(h*.77))
  radius=r.choice([.45,.6,.9,1.4,1.8]); opacity=round(r.uniform(.13,.8),2)
  parts.append(f'<circle cx="{x}" cy="{y}" r="{radius}" fill="#fff" opacity="{opacity}"/>')
 if kind=='city':
  ybase=int(h*.81)
  parts.append(f'<circle cx="{int(w*.69)}" cy="{int(h*.29)}" r="{int(h*.14)}" fill="{accent}" opacity=".24" filter="url(#blur)"/>')
  parts.append(f'<circle cx="{int(w*.69)}" cy="{int(h*.29)}" r="{int(h*.11)}" fill="{highlight}" opacity=".82"/>')
  parts.append(f'<circle cx="{int(w*.69)}" cy="{int(h*.29)}" r="{int(h*.108)}" fill="{mid}"/>')
  for j in range(30):
   x=int(j*w/28)-20; bw=int(w/28)+r.randint(-7,18); bh=r.randint(int(h*.14),int(h*.47))
   col=r.choice([dark,'#10162d','#131b37','#1a2344']); y=ybase-bh
   parts.append(f'<rect x="{x}" y="{y}" width="{bw}" height="{bh}" fill="{col}"/>')
   parts.append(f'<rect x="{x}" y="{y}" width="{bw}" height="3" fill="{accent}" opacity=".45"/>')
   for yy in range(y+17,ybase-6,19):
    for xx in range(x+9,x+bw-4,14):
     if r.random()>.55: parts.append(f'<rect x="{xx}" y="{yy}" width="4" height="7" fill="{r.choice([accent,highlight])}" opacity="{r.uniform(.25,.85):.2f}"/>')
  parts.append(f'<rect y="{ybase}" width="{w}" height="{h-ybase}" fill="{dark}"/>')
  for j in range(45):
   x=r.randint(0,w); yy=r.randint(ybase+10,h-1)
   parts.append(f'<path d="M{x} {yy} h{r.randint(5,100)}" stroke="{r.choice([accent,highlight])}" stroke-opacity=".18" stroke-width="{r.randint(1,3)}"/>')
 elif kind=='planet':
  px,py=int(w*.57),int(h*.47); pr=int(min(w,h)*.27)
  parts.append(f'<ellipse cx="{px}" cy="{py}" rx="{int(pr*1.8)}" ry="{int(pr*.35)}" transform="rotate(-23 {px} {py})" fill="none" stroke="{highlight}" stroke-width="{int(pr*.085)}" opacity=".33"/>')
  parts.append(f'<circle cx="{px}" cy="{py}" r="{pr}" fill="{accent}" opacity=".4" filter="url(#blur)"/>')
  parts.append(f'<circle cx="{px}" cy="{py}" r="{pr}" fill="{mid}" stroke="{highlight}" stroke-width="2"/>')
  for j in range(16):
   y=py-pr+r.randint(5,2*pr-5); xdelta=int((max(1,pr**2-(y-py)**2))**.5)
   parts.append(f'<path d="M{px-xdelta} {y} Q{px} {y+r.randint(-30,30)} {px+xdelta} {y}" fill="none" stroke="{accent}" stroke-width="{r.randint(3,12)}" opacity=".21"/>')
  parts.append(f'<ellipse cx="{px}" cy="{py}" rx="{int(pr*1.8)}" ry="{int(pr*.35)}" transform="rotate(-23 {px} {py})" fill="none" stroke="{highlight}" stroke-width="5" opacity=".67"/>')
  parts.append(f'<path d="M0 {h*.88} Q{w*.25} {h*.77} {w*.5} {h*.93} T{w} {h*.85} V{h} H0Z" fill="{dark}"/>')
 elif kind=='dunes':
  parts.append(f'<circle cx="{int(w*.71)}" cy="{int(h*.32)}" r="{int(h*.14)}" fill="{accent}" opacity=".27" filter="url(#blur)"/>')
  parts.append(f'<circle cx="{int(w*.71)}" cy="{int(h*.32)}" r="{int(h*.115)}" fill="{highlight}" opacity=".92"/>')
  for j in range(6):
   base=int(h*(.61+j*.065)); wave=r.randint(30,130)
   parts.append(f'<path d="M0 {base} Q{w*.25} {base-wave} {w*.45} {base+wave*.5} T{w} {base-wave*.35} V{h} H0Z" fill="{[mid,"#4c355b","#41305b","#32264c","#251e3d",dark][j]}"/>')
 elif kind=='portal':
  cx,cy=w*.53,h*.52
  for j in range(10,0,-1):
   rad=int(min(w,h)*(.1+j*.033)); opacity=.07+(10-j)*.018
   parts.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rad*.62}" ry="{rad*1.16}" fill="none" stroke="{accent if j%2 else highlight}" stroke-width="{3+j*.7}" opacity="{opacity}"/>')
  parts.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{w*.13}" ry="{h*.15}" fill="{dark}" stroke="{highlight}" stroke-width="4"/>')
  parts.append(f'<path d="M0 {h*.9} L{w*.34} {h*.7} H{w*.65} L{w} {h*.9} V{h} H0Z" fill="{dark}"/>')
 elif kind=='mountain':
  parts.append(f'<circle cx="{w*.72}" cy="{h*.25}" r="{min(w,h)*.1}" fill="{highlight}" opacity=".8"/>')
  for j in range(5):
   base=int(h*(.67+j*.09)); peak=int(h*(.25+j*.09)); points=[]
   for k in range(12):
    xx=int(k*w/11); yy=base-r.randint(0,base-peak)
    points.append(f'{xx},{yy}')
   parts.append(f'<polygon points="0,{h} {" ".join(points)} {w},{h}" fill="{["#2b4c65","#1b3d53","#193144","#11283a",dark][j]}"/>')
 parts.append(f'<rect width="{w}" height="{h}" fill="url(#lines)"/>')
 parts.append(f'<rect x="18" y="18" width="{w-36}" height="{h-36}" rx="3" stroke="{highlight}" stroke-opacity=".12" fill="none"/>')
 parts.append('</svg>')
 (P/(name+'.svg')).write_text('\n'.join(parts))
print('Generated',len(scenes),'original illustration assets')
