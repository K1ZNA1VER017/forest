"""Small original synthesized ambience loops; deliberately no sampled reference audio."""
from pathlib import Path
import wave,math,struct
out=Path(__file__).resolve().parents[1]/'public/audio';out.mkdir(exist_ok=True)
sr=16000;length=24
for name,notes,tempo in [('forest',[146.83,174.61,220,261.63],1.5),('hub',[110,164.81,220,329.63],3),('abyss',[73.42,110,138.59,146.83],3),('combat',[110,130.81,146.83,164.81],.375)]:
 data=bytearray()
 for i in range(sr*length):
  t=i/sr;step=int(t/tempo);phase=t%tempo;note=notes[step%4]
  envelope=math.sin(math.pi*min(1,phase/tempo))**2
  pad=sum(math.sin(2*math.pi*n*t) for n in notes[:2])*.09
  arp=(math.sin(2*math.pi*note*2*t)+.3*math.sin(2*math.pi*note*4*t))*.12*envelope
  beat=math.sin(2*math.pi*55*t)*math.exp(-phase*22)*.14 if name=='combat' else 0
  fade=min(1,t/2,(length-t)/2)
  data.extend(struct.pack('<h',int(max(-1,min(1,(pad+arp+beat)*fade))*25000)))
 with wave.open(str(out/(name+'.wav')),'wb')as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes(data)
