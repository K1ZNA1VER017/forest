from PIL import Image
from collections import deque
from pathlib import Path
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--input',default='art-source',help='Directory containing the four original user-provided sheets');args=parser.parse_args()
root=Path(args.input); out=Path('public/assets');out.mkdir(exist_ok=True)
def cut(file,rect,name,mode='solid'):
 im=Image.open(root/file).convert('RGBA').crop(rect)
 w,h=im.size;p=im.load(); seen=set();q=deque([(x,y)for x in range(w)for y in (0,h-1)]+[(x,y)for y in range(h)for x in (0,w-1)])
 bg=p[0,0][:3]
 while q:
  x,y=q.popleft()
  if (x,y)in seen or not(0<=x<w and 0<=y<h):continue
  seen.add((x,y));r,g,b,a=p[x,y]
  match=max(abs(r-bg[0]),abs(g-bg[1]),abs(b-bg[2]))<43 if mode=='solid' else max(r,g,b)-min(r,g,b)<22 and 65<r<190
  if not match:continue
  p[x,y]=(r,g,b,0)
  q.extend([(x-1,y),(x+1,y),(x,y-1),(x,y+1)])
 bbox=im.getbbox()
 if bbox:im=im.crop(bbox)
 im.save(out/(name+'.png'))
chars=['mage','warrior','archer','rogue','knight','elf','villager','healer','blacksmith','bandit']
for i,name in enumerate(chars):
 col=i%5;bottom=i>=5
 x=[20,169,313,450,601][col];y=535 if bottom else 237
 cut('2D RPG Character Asset Pack — 10 Unique Characters.jpg',(x,y,x+43,y+50),name)
 x=[15,169,313,451,590][col];y=357 if bottom else 42
 cut('2D RPG Character Asset Pack — 10 Unique Characters.jpg',(x,y,x+127,y+166),name+'-portrait')
items=[['pickaxe','axe','hammer','sword'],['bow','arrow','wood','ring'],['key','lock','amulet','crystal'],['feather','bone','mana','potion'],['ore','mushroom','herb','apple'],['egg','cheese','meat','fish'],['pear','pinecone','stone','relic']]
for row,names in enumerate(items):
 for col,name in enumerate(names):
  x=20+col*80;y=18+row*80
  cut('1.png',(x,y,x+77,y+77),'item-'+name)
# Additional equipment from the inventory sheet, 49 px grid.
for name,col,row in [('armor',0,8),('helmet',6,7),('boots',0,10),('gold',3,1),('gem',4,0),('shield',13,0)]:
 x=26+col*49;y=26+row*49
 cut('2.png',(x,y,x+46,y+46),'item-'+name)
cut('3.png',(80,94,124,133),'heart',mode='checker')
cut('3.png',(367,54,469,157),'health-orb',mode='checker')
