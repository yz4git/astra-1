import {MOVIE_SECONDS,RECORD_HZ,clamp,lerp,cleanAvatar,STAGES} from './config.js';

export function chooseClips(events,duration){
 const selected=[];
 const ranked=events.filter(e=>e.time>.8&&e.time<duration-.5).map(e=>({...e,rank:e.score+(e.type==='flight'?20:0)})).sort((a,b)=>b.rank-a.rank);
 while(selected.length<5){
  const candidates=ranked.filter(e=>selected.every(x=>Math.abs(x.time-e.time)>5)).map(e=>({...e,adjusted:e.rank-selected.filter(x=>x.type===e.type).length*42-selected.filter(x=>x.title===e.title).length*18})).sort((a,b)=>b.adjusted-a.adjusted);
  if(!candidates.length)break;selected.push(candidates[0]);
 }
 for(const f of [.09,.29,.49,.69,.9,.18,.4,.6,.8,.98]){
  if(selected.length===5)break;const time=clamp(duration*f,0,duration);
  if(selected.every(x=>Math.abs(x.time-time)>3.5))selected.push({time,score:0,type:'moment',title:['まずは、平常運転。','予想外の展開です。','まだ、やれます。','最後まで、主役。','今日も、おつかれさま。'][selected.length]});
 }
 while(selected.length<5)selected.push({time:duration*(selected.length+.5)/5,score:0,type:'moment',title:'本日のワンシーン。'});
 return selected.sort((a,b)=>a.time-b.time).map((e,i)=>({...e,start:i*3,duration:3,camera:i===0?'wide':e.type==='flight'?'low':i===4?'hero':i%2?'close':'orbit'}));
}
export function sourceTime(clip,local,duration){
 let source;
 if(local<.65)source=clip.time-1.2+local*1.6;
 else if(local<1.25)source=clip.time-.16+(local-.65)*.5;
 else if(local<2.55)source=clip.time+.14+(local-1.25)*1.4;
 else source=clip.time+1.96;
 return clamp(source,0,duration);
}
function arrayLerp(a,b,u,angles=[]){return a.map((n,i)=>{if(angles.includes(i)){let d=b[i]-n;d=Math.atan2(Math.sin(d),Math.cos(d));return n+d*u;}return lerp(n,b[i],u);});}
export function interpolate(a,b,u){
 if(!b||u<=0)return a;
 if(a.cut!==undefined&&a.cut!==b.cut)return a;
 const p=arrayLerp(a.p,b.p,u,[3]);for(const i of [7,8,10,11])p[i]=u<.5?a.p[i]:b.p[i];
 return {t:lerp(a.t,b.t,u),...(a.s!==undefined?{s:lerp(a.s,b.s??a.s,u),cut:a.cut}:{}),p,b:a.b.map((v,i)=>{const w=b.b[i]||v;if(v[6]!==w[6])return u<.5?v:w;const o=arrayLerp(v,w,u,[3,4,5]);o[6]=v[6];return o;}),h:a.h.map((v,i)=>arrayLerp(v,b.h[i]||v,u)),f:a.f.map(v=>{const w=b.f.find(q=>q[0]===v[0]);return w?arrayLerp(v,w,u):v;}),score:a.score};
}
export function frameAt(frames,time){
 if(!frames.length)throw new Error('録画データがありません。');
 let lo=0,hi=frames.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(frames[mid].t<=time)lo=mid;else hi=mid-1;}
 const a=frames[lo],b=frames[Math.min(lo+1,frames.length-1)];return interpolate(a,b,b.t>a.t?clamp((time-a.t)/(b.t-a.t),0,1):0);
}
export function makeMovie(game,recording,avatar){
 const duration=game.time,clips=chooseClips(game.events,duration),frames=[];
 for(let i=0;i<=MOVIE_SECONDS*RECORD_HZ;i++){
  const t=i/RECORD_HZ,clip=clips[Math.min(4,Math.floor(t/3))];
  const source=sourceTime(clip,Math.min(2.999,t-clip.start),duration),f=frameAt(recording,source);
  const round=n=>Math.round(n*100)/100||0;
  frames.push({...f,t,s:round(source),cut:Math.min(4,Math.floor(t/3)),p:f.p.map(round),b:f.b.map(a=>a.map(round)),h:f.h.map(a=>a.map(round)),f:f.f.map(a=>a.map(round))});
 }
 return {format:'take60',version:1,duration:MOVIE_SECONDS,hz:RECORD_HZ,createdAt:new Date().toISOString(),avatar:cleanAvatar(avatar),world:game.definition(),score:game.score,stats:{...game.stats,bestCombo:game.bestCombo},clips:clips.map(({rank,adjusted,...c})=>c),frames};
}
export function validateMovie(data){
 const fail=()=>{throw new Error('TAKE 60 の有効なリプレイファイルを選んでください。');};
 if(!data||data.format!=='take60'||data.version!==1||data.duration!==15||data.hz!==20)fail();
 if(!STAGES.some(s=>s.id===data.world?.stage)||!Array.isArray(data.world.bodies)||data.world.bodies.length>60||!Array.isArray(data.world.hazards)||data.world.hazards.length>6)fail();
 const kinds=['parcel','banana','coffee','crate','cone','tomato','carrot','onion','plates','printer','desk','chair','plant'];
 for(const b of data.world.bodies)if(!kinds.includes(b.kind)||!Number.isFinite(b.r)||b.r<=0||b.r>3||!Number.isInteger(b.color)||b.color<0||b.color>6)fail();
 for(const h of data.world.hazards)if(!['cart','bigTomato','rollingPin','chairSpin','paperBall'].includes(h.kind)||!Number.isFinite(h.r)||h.r<=0||h.r>3)fail();
 if(!Array.isArray(data.frames)||data.frames.length!==301||!Array.isArray(data.clips)||data.clips.length!==5||!Number.isFinite(data.score)||data.score<0||data.score>1e8)fail();
 const numbers=(a,n)=>Array.isArray(a)&&a.length===n&&a.every(x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<1e7);
 for(let i=0;i<data.frames.length;i++){
  const f=data.frames[i];if(!f||!Number.isFinite(f.t)||Math.abs(f.t-i/20)>.002||!Number.isFinite(f.s)||f.s<0||f.s>60||f.cut!==Math.min(4,Math.floor(i/60))||!numbers(f.p,12)||!Array.isArray(f.b)||f.b.length!==data.world.bodies.length||!f.b.every(a=>numbers(a,7))||!Array.isArray(f.h)||f.h.length!==data.world.hazards.length||!f.h.every(a=>numbers(a,3))||!Array.isArray(f.f)||f.f.length>90||!f.f.every(a=>numbers(a,6)))fail();
 }
 data.avatar=cleanAvatar(data.avatar);data.clips=data.clips.map((c,i)=>{if(!c||!['wide','low','hero','close','orbit'].includes(c.camera)||typeof c.title!=='string')fail();return {start:i*3,duration:3,title:c.title.slice(0,80),type:String(c.type||'moment').slice(0,20),camera:c.camera};});
 return data;
}
