import {View} from './visuals.js';
import {Sound} from './audio.js';

const coarse=window.matchMedia?.('(pointer: coarse)').matches??false;
const viewport=()=>{
 const vv=window.visualViewport;
 const width=Math.max(1,Math.round(vv?.width||window.innerWidth||document.documentElement.clientWidth||1));
 const height=Math.max(1,Math.round(vv?.height||window.innerHeight||document.documentElement.clientHeight||1));
 document.documentElement.style.setProperty('--app-width',`${width}px`);
 document.documentElement.style.setProperty('--app-height',`${height}px`);
 return {width,height};
};
viewport();
let viewportFrame=0;
const scheduleViewportSync=()=>{
 if(viewportFrame)return;
 viewportFrame=requestAnimationFrame(()=>{viewportFrame=0;viewport();});
};
window.visualViewport?.addEventListener('resize',scheduleViewportSync,{passive:true});
window.visualViewport?.addEventListener('scroll',scheduleViewportSync,{passive:true});
window.addEventListener('orientationchange',scheduleViewportSync,{passive:true});

const originalResize=View.prototype.resize;
View.prototype.resize=function(){
 const {width,height}=viewport();
 const dpr=window.devicePixelRatio||1;
 const cap=height<=500?1.25:coarse?1.35:1.6;
 this.renderer.setPixelRatio(Math.min(dpr,cap));
 this.renderer.setSize(width,height,false);
 this.camera.aspect=width/height;
 this.camera.updateProjectionMatrix();
};

const avatarKey=a=>a?[
 a.name,a.skin,a.shirt,a.hair,a.hairColor,a.eyes,a.glasses?1:0,
 Number(a.body).toFixed(3),Number(a.head).toFixed(3)
].join('|'):'';
const originalChangeAvatar=View.prototype.changeAvatar;
View.prototype.changeAvatar=function(config){
 if(this.player&&avatarKey(this.player.config)===avatarKey(config))return;
 return originalChangeAvatar.call(this,config);
};

const worldKey=def=>{
 if(!def)return '';
 const bodies=(def.bodies||[]).map(b=>`${b.kind}:${b.color??''}`).join(',');
 const hazards=(def.hazards||[]).map(h=>h.kind).join(',');
 return `${def.stage}|${bodies}|${hazards}`;
};
const originalSetWorld=View.prototype.setWorld;
View.prototype.setWorld=function(def){
 const key=worldKey(def);
 if(this._take60WorldKey===key&&this.def){
  this.def=def;
  return;
 }
 const {height}=viewport();
 if(this.sun?.shadow?.mapSize&&(coarse||height<=650))this.sun.shadow.mapSize.set(512,512);
 const result=originalSetWorld.call(this,def);
 this._take60WorldKey=key;
 return result;
};

const originalUnlock=Sound.prototype.unlock;
Sound.prototype.unlock=function(){
 originalUnlock.call(this);
 if(this.ctx&&!this._take60Noise){
  const seconds=.75,length=Math.ceil(this.ctx.sampleRate*seconds),buffer=this.ctx.createBuffer(1,length,this.ctx.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=Math.random()*2-1;
  this._take60Noise=buffer;
 }
};
Sound.prototype.noise=function(duration=.15,volume=.13){
 if(!this.ctx||this.ctx.state!=='running')return;
 if(!this._take60Noise)this.unlock();
 if(!this._take60Noise)return;
 const c=this.ctx,t=c.currentTime,s=c.createBufferSource(),g=c.createGain();
 s.buffer=this._take60Noise;
 g.gain.setValueAtTime(Math.max(.0001,volume),t);
 g.gain.exponentialRampToValueAtTime(.0001,t+Math.max(.02,duration));
 s.connect(g);g.connect(this.master);s.start(t);s.stop(t+Math.max(.02,duration)+.01);
 s.onended=()=>{s.disconnect();g.disconnect();};
};

// Keep the original method reachable for debugging and future tuning.
View.prototype._take60OriginalResize=originalResize;
