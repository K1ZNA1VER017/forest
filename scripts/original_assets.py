"""Original procedural pixel art. No pixels are sampled from user reference sheets."""
from PIL import Image, ImageDraw
from pathlib import Path
from collections import deque
import json, math, random
root=Path(__file__).resolve().parents[1]; out=root/'public/assets';out.mkdir(exist_ok=True)
for f in out.glob('*.png'):f.unlink()
P={'outline':'#15202d','skin':'#d5ab80','shade':'#9e735e','metal':'#99b8bd','gold':'#d2ac64','wood':'#74543c','light':'#e9d9a9'}
heroes={'warrior':'#468c83','mage':'#6a6fa5','archer':'#73945b','rogue':'#956078','knight':'#6a879c','elf':'#73945b','villager':'#9c7b50','healer':'#b87965','blacksmith':'#8b674e','bandit':'#a54f54'}
def actor(name,col,frame=0,armor=False,back=False):
 im=Image.new('RGBA',(32,48));d=ImageDraw.Draw(im);o=P['outline'];step=[0,2,0,-2][frame];bob=1 if frame%2 else 0
 def r(b,c):d.rectangle((b[0],b[1]+bob,b[2],b[3]+bob),fill=c)
 # Deliberately drawn cloak, asymmetrical scarf, silver hair and equipment.
 d.polygon([(9,18),(23,18),(27,39),(6,39)],fill=o);d.polygon([(10,19),(22,19),(24,37),(8,36)],fill=col)
 r((10,33+step,14,44+step),o);r((18,33-step,22,44-step),o);r((10,41+step,15,45+step),'#554734');r((18,41-step,24,45-step),'#554734')
 r((9,21,23,33),o);r((10,22,22,31),'#678693' if armor else '#5c4c43');r((11,23,12,30),'#a3b6b3' if armor else '#7c6850');r((10,31,22,33),P['wood']);r((16,31,18,33),P['gold'])
 r((6,23,9,32),o);r((7,24,9,31),col);r((7,32,9,35),P['skin']);r((23,22,26,31),o);r((23,24,25,30),col);r((23,31,25,34),P['skin'])
 r((10,5,23,20),o);r((11,6,22,14),'#9aacae');r((12,10,21,19),P['skin'] if not back else '#8f9e9e');r((11,7,18,10),'#c0cbca');r((11,9,13,15),'#a9b8b9');r((21,8,22,16),'#788d91')
 if not back:r((15,13,15,14),o);r((20,13,20,14),o);r((18,18,20,18),P['shade'])
 r((9,19,23,22),col);r((19,21,21,29),col);r((14,24,16,26),P['gold'])
 if name in ('mage','healer'):r((3,17,4,40),P['wood']);d.ellipse((0,13+bob,7,20+bob),fill=o);d.ellipse((1,14+bob,6,18+bob),fill='#8ed3d0')
 elif name=='archer':d.arc((22,16+bob,32,39+bob),270,90,fill=P['gold'],width=2);d.line((27,18+bob,27,37+bob),fill='#d1c79d')
 else:d.line((27,19+bob,27,37+bob),fill=o,width=3);d.line((27,19+bob,27,33+bob),fill=P['metal']);d.line((24,33+bob,30,33+bob),fill=P['gold'])
 return im
for name,col in heroes.items():
 actor(name,col).save(out/f'{name}.png')
 for back in (False,True):
  for f in range(4):actor(name,col,f,back=back).save(out/f'{name}-{"back" if back else "walk"}-{f}.png')
 for f in range(4):actor(name,col,f,armor=True).save(out/f'{name}-armor-{f}.png')
# Original creatures: different silhouettes, not just palette swaps.
for name in ['wolf','wisp','crawler','golem','shade','warden']:
 im=Image.new('RGBA',(40,48));d=ImageDraw.Draw(im);o=P['outline']
 if name=='wolf':
  d.polygon([(3,28),(8,20),(25,20),(31,12),(34,19),(39,22),(35,30),(28,31),(27,40),(22,40),(21,32),(12,32),(10,39),(5,39),(6,30)],fill=o);d.polygon([(7,27),(11,23),(27,24),(32,18),(34,24),(36,25),(30,29),(24,29),(24,36),(23,36),(22,29),(10,29)],fill='#899b98');d.point((33,23),fill='#efdba3')
 elif name in ('wisp','shade'):
  d.polygon([(20,5),(31,20),(27,32),(32,40),(20,35),(10,43),(12,30),(7,21)],fill=o);d.polygon([(20,9),(27,22),(23,31),(26,36),(19,31),(14,36),(16,27),(12,22)],fill='#7276a2' if name=='shade' else '#529b9e');d.rectangle((17,20,21,23),fill='#d1e2c4')
 elif name=='crawler':
  for i in range(3):d.line((8,22+i*4,2,18+i*8),fill='#bd996d',width=2);d.line((30,22+i*4,38,17+i*8),fill='#bd996d',width=2)
  d.ellipse((8,16,31,37),fill=o);d.ellipse((11,18,29,33),fill='#7d667c');d.rectangle((15,20,18,22),fill='#e9b575');d.rectangle((23,20,25,22),fill='#e9b575')
 else:
  d.rectangle((8,17,32,34),fill=o);d.rectangle((10,19,30,32),fill='#667b7b');d.rectangle((10,35,17,44),fill=o);d.rectangle((24,35,30,44),fill=o);d.rectangle((12,6,28,19),fill=o);d.rectangle((14,8,26,17),fill='#829192');d.rectangle((18,10,21,15),fill='#dfad58');d.rectangle((3,18,9,33),fill='#718581');d.rectangle((31,18,37,33),fill='#718581');d.polygon([(18,22),(23,25),(19,29),(15,25)],fill='#ddb765')
 im.save(out/f'{name}.png')
# Own 24px icon vocabulary.
names=['pickaxe','axe','hammer','sword','bow','arrow','wood','ring','key','lock','amulet','crystal','feather','bone','mana','potion','ore','mushroom','herb','apple','egg','cheese','meat','fish','pear','pinecone','stone','relic','armor','helmet','boots','gold','gem','shield','seal','scroll','leather','torch','bench','chest','talent','portal','ice','ash','rune']
for i,name in enumerate(names):
 im=Image.new('RGBA',(24,24));d=ImageDraw.Draw(im);o=P['outline'];c=['#8db6a7','#b699c8','#d2aa68','#bd7773'][i%4]
 if name in ['sword','arrow','axe','pickaxe','hammer','key','bone','feather','torch']:
  d.line((5,20,18,5),fill=o,width=5);d.line((6,19,17,6),fill=P['wood'],width=3)
  if name in ['sword','arrow','feather']:d.polygon([(10,13),(17,3),(21,2),(21,6),(14,16)],fill=o);d.polygon([(12,12),(18,4),(20,4),(13,14)],fill='#a9c3c4')
  elif name=='torch':d.polygon([(14,8),(15,2),(18,5),(20,1),(22,8),(18,13)],fill='#df9b4e')
  else:d.polygon([(9,4),(14,2),(22,8),(19,13),(15,9),(10,8)],fill=o);d.polygon([(11,4),(14,4),(20,8),(18,10),(15,7),(11,6)],fill=P['metal'])
 elif name in ['mana','potion']:
  d.polygon([(9,3),(15,3),(15,9),(20,15),(19,21),(5,21),(4,15),(9,9)],fill=o);d.polygon([(10,6),(14,6),(14,11),(18,16),(17,19),(7,19),(6,16),(10,11)],fill='#699eab' if name=='mana' else '#b95762');d.rectangle((9,2,15,5),fill=P['gold']);d.line((8,14,10,11),fill='#eee1b7',width=2)
 elif name in ['gem','crystal','relic','seal','ice','rune']:
  d.polygon([(12,1),(21,9),(17,21),(8,23),(2,12)],fill=o);d.polygon([(12,3),(19,10),(16,19),(9,21),(4,12)],fill=c);d.polygon([(12,4),(13,11),(6,12)],fill='#dde2bc');d.line((13,11,16,18),fill='#506b83',width=2)
 elif name in ['armor','helmet','boots','shield']:
  d.polygon([(7,3),(11,5),(14,5),(18,3),(23,8),(20,13),(18,12),(18,22),(6,22),(6,12),(3,13),(1,8)],fill=o);d.polygon([(7,5),(11,7),(14,7),(18,5),(21,8),(18,11),(16,10),(16,20),(8,20),(8,10),(5,11),(3,8)],fill=c);d.line((12,8,12,19),fill=P['gold'])
 elif name in ['herb','mushroom','apple','pear','pinecone']:
  d.line((10,22,15,4),fill=o,width=3);d.line((11,21,15,5),fill='#679867');d.polygon([(12,12),(2,10),(3,5),(10,7)],fill='#81ad69');d.polygon([(14,15),(19,6),(23,8),(20,15)],fill='#b2bc71');d.ellipse((8,12,17,20),fill='#aa666c' if name=='herb' else c)
 elif name in ['gold','ring','amulet']:
  d.ellipse((4,4,20,20),fill=o);d.ellipse((6,5,18,18),fill=P['gold']);d.ellipse((9,8,15,14),fill='#716b4b');d.arc((6,5,18,18),180,280,fill='#f4db8d',width=2)
 elif name=='wood':
  d.polygon([(2,14),(14,3),(21,8),(9,21)],fill=o);d.polygon([(4,14),(14,5),(19,8),(9,19)],fill='#99734c');d.line((6,15,16,6),fill='#c8a16a',width=2);d.ellipse((4,13,11,20),fill='#d2ae78');d.ellipse((6,15,9,18),fill='#806242')
 elif name in ['ore','stone','ash']:
  d.polygon([(3,18),(5,8),(12,3),(21,10),(20,20),(9,23)],fill=o);d.polygon([(5,17),(7,9),(12,5),(19,11),(18,18),(10,20)],fill='#7e91a4');d.polygon([(7,9),(12,5),(13,12)],fill='#a9bac0');d.line((14,13,17,16),fill=P['gold'],width=2)
 elif name=='bow':
  d.arc((3,2,20,23),220,115,fill=o,width=5);d.arc((3,3,19,22),220,115,fill=P['gold'],width=2);d.line((5,6,16,21),fill='#b4c6bb')
 else:
  d.rectangle((4,5,20,21),fill=o);d.rectangle((6,7,18,19),fill=c);d.rectangle((6,10,18,12),fill=P['gold']);d.rectangle((11,11,13,15),fill='#e9d9a9')
 im.save(out/f'item-{name}.png')
# Original heart.
im=Image.new('RGBA',(20,18));d=ImageDraw.Draw(im);d.polygon([(1,3),(5,1),(9,3),(10,5),(13,1),(17,1),(19,4),(19,9),(10,17),(1,9)],fill=P['outline']);d.polygon([(3,4),(6,3),(10,7),(14,3),(17,3),(17,8),(10,14),(3,8)],fill='#ba5463');d.line((4,4,6,4),fill='#f0b6a0',width=2);im.save(out/'heart.png');im.save(out/'health-orb.png')
# Cut generated original portrait backgrounds, then resample on a pixel grid.
for source,names2 in [('portrait-survivor',['warrior','mage','archer','rogue','knight','elf','villager','bandit','blacksmith']),('portrait-oracle',['healer']),('portrait-warden',['warden'])]:
 im=Image.open(root/f'public/original/{source}.png').convert('RGBA');p=im.load();w,h=im.size;bg=p[0,0][:3];q=deque([(x,0)for x in range(w)]+[(x,h-1)for x in range(w)]+[(0,y)for y in range(h)]+[(w-1,y)for y in range(h)]);seen=set()
 while q:
  x,y=q.popleft()
  if not(0<=x<w and 0<=y<h)or(x,y)in seen:continue
  seen.add((x,y));rgb=p[x,y][:3]
  if max(abs(rgb[i]-bg[i])for i in range(3))>35:continue
  p[x,y]=(*rgb,0);q.extend([(x-1,y),(x+1,y),(x,y-1),(x,y+1)])
 im=im.crop(im.getbbox());im.thumbnail((150,240),Image.Resampling.NEAREST)
 for name in names2:im.save(out/f'{name}-portrait.png')
manifest={'version':'0.3','source':'Original procedural art + three newly AI-generated portraits. No reference-sheet pixel crops.','files':sorted(p.name for p in out.glob('*.png'))}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2));print(len(manifest['files']),'original runtime PNGs')
# Higher-detail playable sprites derived exclusively from the newly generated originals.
def masked(source):
 im=Image.open(root/f'public/original/{source}.png').convert('RGBA');p=im.load();w,h=im.size;bg=p[0,0][:3];q=deque([(x,0)for x in range(w)]+[(x,h-1)for x in range(w)]+[(0,y)for y in range(h)]+[(w-1,y)for y in range(h)]);seen=set()
 while q:
  x,y=q.popleft()
  if not(0<=x<w and 0<=y<h)or(x,y)in seen:continue
  seen.add((x,y));rgb=p[x,y][:3]
  if max(abs(rgb[i]-bg[i])for i in range(3))>35:continue
  p[x,y]=(*rgb,0);q.extend([(x-1,y),(x+1,y),(x,y-1),(x,y+1)])
 return im.crop(im.getbbox())
front=masked('portrait-survivor');rear=masked('survivor-back')
for name in ['warrior','mage','archer','rogue','knight']:
 for direction,source in [('walk',front),('back',rear)]:
  im=source.copy();im.thumbnail((46,74),Image.Resampling.NEAREST);base=Image.new('RGBA',(48,80));base.alpha_composite(im,((48-im.width)//2,3))
  # Color variants affect green cloth, retaining tonal values and anatomy.
  if name!='warrior':
   px=base.load();target={'mage':(105,101,160),'archer':(100,138,74),'rogue':(133,82,112),'knight':(80,116,143)}[name]
   for y in range(80):
    for x in range(48):
     r,g,b,a=px[x,y]
     if a and g>r*1.06 and g>b*1.03:
      factor=(r+g+b)/230;px[x,y]=tuple(min(255,int(c*factor))for c in target)+(a,)
  for f,step in enumerate([0,1,0,-1]):
   frame=base.copy();d=ImageDraw.Draw(frame);d.rectangle((0,57,47,79),fill=(0,0,0,0));left=base.crop((0,57,24,78));right=base.crop((24,57,48,78));frame.alpha_composite(left,(0,57+step));frame.alpha_composite(right,(24,57-step));frame.save(out/f'{name}-{direction}-{f}.png')
   if direction=='walk':
    if f==0:frame.save(out/f'{name}.png')
    armor=frame.copy();px=armor.load()
    for y in range(27,50):
     for x in range(9,38):
      r,g,b,a=px[x,y]
      if a and r>g and g>b*.9:shade=(r+g+b)//3;px[x,y]=(min(255,int(shade*.9)),min(255,int(shade*1.1)),min(255,int(shade*1.16)),a)
    armor.save(out/f'{name}-armor-{f}.png')
for name,source in [('healer','portrait-oracle'),('warden','portrait-warden')]:
 im=masked(source);im.thumbnail((46,74),Image.Resampling.NEAREST);frame=Image.new('RGBA',(48,80));frame.alpha_composite(im,((48-im.width)//2,3));frame.save(out/f'{name}.png')
manifest['files']=sorted(p.name for p in out.glob('*.png'));(out/'manifest.json').write_text(json.dumps(manifest,indent=2))
