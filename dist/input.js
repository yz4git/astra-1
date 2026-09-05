import {clamp} from './config.js';
export function normalizedAxes(x,z){const n=Math.hypot(x,z);return n>1?{x:x/n,z:z/n}:{x,z};}
export class Input {
 constructor({pad,stick,jump,action,onJump,onAction,onPause,onGesture}){
  this.keys=new Set();this.pointers=new Set();this.x=0;this.z=0;this.padId=null;this.actionHeld=false;this.actionIds=new Set();this.pad=pad;this.stick=stick;this.onJump=onJump;this.onAction=onAction;this.enabled=false;
  pad.addEventListener('pointerdown',e=>{if(!this.enabled||this.padId!==null)return;e.preventDefault();onGesture();this.padId=e.pointerId;try{pad.setPointerCapture(e.pointerId);}catch{}this.move(e);});
  pad.addEventListener('pointermove',e=>{if(e.pointerId===this.padId){e.preventDefault();this.move(e);}});
  const release=e=>{if(e.pointerId===this.padId){this.padId=null;this.x=this.z=0;stick.style.transform='translate(0px,0px)';}};
  for(const name of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(name,release);
  action.addEventListener('pointerdown',e=>{if(!this.enabled)return;e.preventDefault();onGesture();this.actionIds.add(e.pointerId);this.actionHeld=true;try{action.setPointerCapture(e.pointerId);}catch{}onAction();});
  const endAction=e=>{this.actionIds.delete(e.pointerId);this.actionHeld=this.actionIds.size>0;};
  for(const name of ['pointerup','pointercancel','lostpointercapture'])action.addEventListener(name,endAction);
  jump.addEventListener('pointerdown',e=>{if(!this.enabled)return;e.preventDefault();onGesture();try{jump.setPointerCapture(e.pointerId);}catch{}onJump();});
  // Keyboard clicks remain accessible without firing a second action after a pointer tap.
  jump.addEventListener('click',e=>{if(e.detail===0&&this.enabled)onJump();});action.addEventListener('click',e=>{if(e.detail===0&&this.enabled)onAction();});
  window.addEventListener('keydown',e=>{
   if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
   if(e.code==='Escape'){if(!e.repeat)onPause();return;}
   if(!this.enabled)return;
   if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','Space','KeyX','Enter'].includes(e.code)){
    e.preventDefault();onGesture();this.keys.add(e.code);if(!e.repeat){if(e.code==='Space')onJump();if(e.code==='KeyX'||e.code==='Enter')onAction();}
   }
  });
  window.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>this.clear());
 }
 move(e){const r=this.pad.getBoundingClientRect(),radius=r.width*.33,dx=(e.clientX-r.left-r.width/2)/radius,dz=(e.clientY-r.top-r.height/2)/radius,a=normalizedAxes(dx,dz);this.x=Math.abs(a.x)<.06?0:a.x;this.z=Math.abs(a.z)<.06?0:a.z;this.stick.style.transform=`translate(${a.x*radius}px,${a.z*radius}px)`;}
 axes(){const has=(...codes)=>codes.some(x=>this.keys.has(x));return normalizedAxes(this.x+(has('KeyD','ArrowRight')?1:0)-(has('KeyA','ArrowLeft')?1:0),this.z+(has('KeyS','ArrowDown')?1:0)-(has('KeyW','ArrowUp')?1:0));}
 get holdingAction(){return this.actionHeld||this.keys.has('KeyX')||this.keys.has('Enter');}
 clear(){this.keys.clear();this.actionIds.clear();if(this.padId!==null){try{this.pad.releasePointerCapture(this.padId);}catch{}}this.padId=null;this.x=this.z=0;this.actionHeld=false;this.stick.style.transform='translate(0px,0px)';}
}
