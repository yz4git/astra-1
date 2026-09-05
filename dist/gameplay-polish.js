import * as T from './lib/three.module.min.js';
import {Game} from './core.js';
import {View} from './visuals.js';

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

// Keep the 15-second movie varied: identical punchline events are recorded once,
// while repeated event types gradually lose highlight weight.
const baseEvent=Game.prototype.event;
Game.prototype.event=function(type,score,title){
 const sameTitle=this.events.filter(e=>e.title===title).length;
 if(sameTitle>0)return;
 const sameType=this.events.filter(e=>e.type===type).length;
 const diversityWeight=Math.max(.48,1-sameType*.16);
 return baseEvent.call(this,type,Math.round(score*diversityWeight),title);
};

// Give the kitchen player a short fair-start window so the opening hazard cannot
// score a hit before the player has had time to take control.
const baseStep=Game.prototype.step;
Game.prototype.step=function(dt,input){
 if(this.stage?.id==='kitchen'&&this.time<1.9)this.player.invincible=Math.max(this.player.invincible,.22);
 return baseStep.call(this,dt,input);
};

const style=document.createElement('style');
style.textContent=`
#delivery-guide{position:fixed;z-index:27;transform:translate(-50%,-115%);pointer-events:none;padding:7px 11px;border:2px solid var(--ink);border-radius:999px;background:var(--lime);color:var(--ink);font-size:11px;font-weight:1000;letter-spacing:.08em;box-shadow:3px 3px 0 #29273c55;white-space:nowrap;transition:opacity .12s,transform .12s}
#delivery-guide[hidden]{display:none!important}
#delivery-guide::after{content:'';position:absolute;left:50%;bottom:-8px;width:10px;height:10px;background:var(--lime);border-right:2px solid var(--ink);border-bottom:2px solid var(--ink);transform:translateX(-50%) rotate(45deg)}
@media(max-height:520px) and (min-aspect-ratio:1/1){
 .notice{top:22%;padding:9px 16px;font-size:17px;max-width:76vw}
 .notice.chaos{font-size:20px;padding:9px 15px}
 #delivery-guide{font-size:10px;padding:6px 9px}
}
`;
document.head.append(style);

const guide=document.createElement('div');
guide.id='delivery-guide';guide.hidden=true;guide.setAttribute('aria-hidden','true');document.body.append(guide);
const targetWorld=new T.Vector3();

const baseRender=View.prototype.render;
View.prototype.render=function(frame,time,mode,options={}){
 const gameplay=mode==='playing';
 const wantedFov=gameplay?34:39;
 if(this.camera.fov!==wantedFov){this.camera.fov=wantedFov;this.camera.updateProjectionMatrix();}

 const carrying=this.stage?.id==='delivery'&&gameplay&&(frame?.p?.[10]||0)>0;
 if(this.arrow&&this.target){
  if(!this.arrow.userData.take60BaseScale)this.arrow.userData.take60BaseScale=this.arrow.scale.clone();
  const pulse=carrying?1.45+Math.sin(time*5)*.12:1;
  this.arrow.scale.copy(this.arrow.userData.take60BaseScale).multiplyScalar(pulse);
  this.target.scale.setScalar(carrying?1.22+Math.sin(time*4)*.08:1);
 }

 const out=baseRender.call(this,frame,time,mode,options);
 if(!carrying||!this.arrow){guide.hidden=true;return out;}

 this.arrow.getWorldPosition(targetWorld);targetWorld.project(this.camera);
 const w=this.canvas.clientWidth||window.innerWidth||1,h=this.canvas.clientHeight||window.innerHeight||1;
 const rawX=(targetWorld.x*.5+.5)*w,rawY=(-targetWorld.y*.5+.5)*h;
 guide.style.left=`${Math.round(clamp(rawX,72,w-72))}px`;
 guide.style.top=`${Math.round(clamp(rawY,165,h-92))}px`;
 const dx=-frame.p[0],dz=-6-frame.p[2],distance=Math.max(0,Math.round(Math.hypot(dx,dz)));
 guide.textContent=`▼ 青いポスト ${distance}m`;
 guide.hidden=false;
 return out;
};
