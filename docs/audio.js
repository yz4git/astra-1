export class Sound {
 constructor(){this.ctx=null;this.muted=false;this.music=true;this.beat=0;this.nextBeat=0;this.mode='menu';}
 unlock(){
  if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.ctx=new C();this.master=this.ctx.createGain();this.master.gain.value=.45;this.master.connect(this.ctx.destination);this.capture=this.ctx.createMediaStreamDestination();this.master.connect(this.capture);}
  if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
 }
 mute(value){this.muted=value;if(this.master)this.master.gain.setTargetAtTime(value?0:.45,this.ctx.currentTime,.02);}
 tone(freq,duration=.1,type='sine',volume=.1,slide=0,delay=0){
  if(!this.ctx||this.ctx.state!=='running')return;const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(Math.max(20,freq),t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,freq+slide),t+duration);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.007);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
 }
 noise(duration=.15,volume=.13){
  if(!this.ctx||this.ctx.state!=='running')return;const c=this.ctx,n=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),a=n.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*(1-i/a.length)**2;const s=c.createBufferSource(),g=c.createGain();s.buffer=n;g.gain.value=volume;s.connect(g);g.connect(this.master);s.start();s.onended=()=>{s.disconnect();g.disconnect();};
 }
 play(name){
  const t=(...args)=>this.tone(...args);
  if(name==='jump')t(330,.2,'sine',.22,400);
  else if(name==='boing'){t(180,.55,'triangle',.36,950);t(550,.35,'sine',.13,-470,.15);}
  else if(name==='crash'){this.noise(.3,.25);t(90,.24,'triangle',.2,-60);}
  else if(name==='thud'){this.noise(.13,.2);t(100,.2,'sine',.4,-70);}
  else if(name==='pan'){t(940,.18,'square',.07,-550);t(1440,.14,'sine',.13);}
  else if(name==='swing'){this.noise(.09,.055);t(250,.12,'triangle',.08,-150);}
  else if(name==='pickup'||name==='score'){t(659,.1,'triangle',.15);t(988,.14,'triangle',.13,0,.07);}
  else if(name==='fanfare'||name==='splash'){[523,659,784,1047].forEach((f,i)=>t(f,.23,'triangle',.18,0,i*.075));}
  else if(name==='alarm'){t(660,.2,'square',.06);t(880,.25,'square',.06,0,.2);}
  else if(name==='count')t(660,.1,'sine',.15);
  else if(name==='cut'){this.noise(.06,.1);t(130,.12,'triangle',.12,-70);}
 }
 tick(mode){
  if(!this.ctx||this.ctx.state!=='running'||!this.music||mode==='paused'||mode==='editor')return;
  if(this.mode!==mode){this.mode=mode;this.nextBeat=this.ctx.currentTime;this.beat=0;}
  const now=this.ctx.currentTime;if(this.nextBeat<now-.5)this.nextBeat=now;
  if(now<this.nextBeat)return;
  const notes=[60,67,69,67,64,67,72,69,60,64,67,64,62,67,71,67],i=this.beat++%16,delay=Math.max(0,this.nextBeat-now),bpm=mode==='replay'?128:mode==='playing'?120:96;
  this.nextBeat+=60/bpm/2;
  this.tone(440*2**((notes[i]-69)/12),.18,'triangle',mode==='menu'?.027:.048,0,delay);
  if(i%4===0){this.tone(i<8?130.81:146.83,.23,'triangle',.10,0,delay);this.tone(100,.1,'sine',.16,-65,delay);}
  if(i%4===2)this.noise(.055,.033);
 }
}
