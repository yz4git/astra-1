import {STAGES,RUN_SECONDS,clamp,rng} from './config.js';

const round=n=>Math.round(n*100)/100||0;
export class Game {
 constructor(stageId='delivery',seed=Date.now()){
  this.stage=STAGES.find(s=>s.id===stageId)||STAGES[0];this.random=rng(seed);this.seed=seed;
  this.time=0;this.score=0;this.combo=0;this.bestCombo=0;this.lastPoint=-10;this.cooldown=0;this.finished=false;
  this.player={x:0,y:0,z:3,vx:0,vy:0,vz:0,yaw:0,spin:0,face:0,faceTime:0,invincible:0,dash:0,action:0,carry:0,ground:true,slam:false};
  this.events=[];this.notices=[];this.sounds=[];this.particles=[];this.nextParticle=0;this.bodies=[];this.hazards=[];this.stats={deliveries:0,served:0,broken:0,flights:0,maxHeight:0};
  this.buildWorld();
 }
 add(kind,x,z,extra={}){const b={id:this.bodies.length,kind,x,y:0,z,vx:0,vy:0,vz:0,rx:0,ry:0,rz:0,r:.6,broken:0,respawn:0,ox:x,oz:z,hit:0,...extra};this.bodies.push(b);return b;}
 buildWorld(){
  if(this.stage.id==='delivery'){
   [[-7,-4],[-5,0],[-7,4],[5,-3],[7,1],[4,4],[1,0]].forEach(([x,z],i)=>this.add('parcel',x,z,{r:.48,color:i%4}));
   [[-4,-4],[3,-3],[-3,3],[6,5],[3,1],[-7,1]].forEach(([x,z],i)=>this.add(i%2?'cone':'crate',x,z,{color:i%4}));
   [[-1,-1],[4,2],[-5,4]].forEach(([x,z])=>this.add('banana',x,z,{r:.65}));
   this.hazards=[{kind:'cart',x:-9,z:-2,y:0,r:1.05,phase:0},{kind:'cart',x:9,z:3,y:0,r:1.05,phase:2.5}];
  }else if(this.stage.id==='kitchen'){
   [[-6,0],[-3,2],[2,3],[6,1],[-6,4],[5,4],[-4,-3],[4,-3]].forEach(([x,z],i)=>this.add(i%3===0?'carrot':i%3===1?'onion':'tomato',x,z,{r:.56,color:i%3}));
   [[-7,-4],[7,-4],[-7,2],[7,3],[-3,-4],[3,-4]].forEach(([x,z],i)=>this.add(i%2?'plates':'crate',x,z,{r:.65}));
   this.hazards=[{kind:'bigTomato',x:0,z:0,y:0,r:1.15,phase:0},{kind:'rollingPin',x:0,z:4,y:0,r:1,phase:3}];
  }else{
   [[-6,-3],[-3,-3],[3,-3],[6,-3],[-6,1],[-3,1],[3,1],[6,1],[-6,5],[3,5]].forEach(([x,z],i)=>this.add(i%3===0?'printer':'desk',x,z,{r:.85,color:i%4}));
   [[-7,-1],[-4,3],[4,-1],[7,3],[0,-2],[0,5]].forEach(([x,z],i)=>this.add(i%2?'chair':'plant',x,z,{r:.6}));
   [[-1,1],[5,4],[-5,-4]].forEach(([x,z])=>this.add('coffee',x,z,{r:.75}));
   this.hazards=[{kind:'chairSpin',x:0,z:0,y:0,r:1.1,phase:0},{kind:'paperBall',x:8,z:4,y:0,r:1,phase:4}];
  }
 }
 notice(text,kind='normal'){this.notices.push({text,kind,time:this.time});if(this.notices.length>8)this.notices.shift();}
 sound(type){this.sounds.push(type);}
 event(type,score,title){this.events.push({time:this.time,type,score,title,x:this.player.x,z:this.player.z});}
 points(n,label,type='score'){
  this.combo=this.time-this.lastPoint<3.2?this.combo+1:1;this.bestCombo=Math.max(this.bestCombo,this.combo);this.lastPoint=this.time;
  const earned=Math.round(n*(1+Math.min(this.combo-1,8)*.15));this.score+=earned;
  this.notice(`${label} +${earned}`,type);this.sound('score');
 }
 burst(x,y,z,count=14,color=0,power=6){
  for(let i=0;i<count;i++){
   const a=this.random()*Math.PI*2,v=power*(.3+this.random());
   this.particles.push({id:this.nextParticle++,x,y,z,vx:Math.cos(a)*v,vy:3+this.random()*power,vz:Math.sin(a)*v,life:1.2+this.random(),color,size:.12+this.random()*.2});
  }
  if(this.particles.length>90)this.particles.splice(0,this.particles.length-90);
 }
 launch(dx,dz,power=1,title='その飛び方、あり！？'){
  const p=this.player;if(p.invincible>0)return;
  const len=Math.hypot(dx,dz)||1;p.vx=dx/len*9*power;p.vz=dz/len*9*power;p.vy=16+power*3;p.ground=false;p.invincible=1.4;p.spin=1;p.face=2;p.faceTime=2;
  if(p.carry){this.burst(p.x,p.y+2,p.z,p.carry*6,0,5);p.carry=Math.max(0,p.carry-1);}
  this.stats.flights++;this.event('flight',80+power*20,title);this.notice(title,'chaos');this.sound('boing');
 }
 breakBody(b,power=1,chain=false){
  if(b.broken||['parcel','banana','coffee','tomato','carrot','onion'].includes(b.kind))return;
  b.broken=1;b.respawn=this.time+9+this.random()*3;this.stats.broken++;this.points(b.kind==='printer'?180:70,chain?'連鎖！':'バラバラ！');
  this.burst(b.x,.8,b.z,b.kind==='printer'?22:10,b.kind==='printer'?1:3,6*power);this.sound('crash');
  this.event('smash',45+(chain?25:0)+(b.kind==='printer'?40:0),b.kind==='printer'?'コピー、取りすぎました。':'会社に言い訳できない。');
  if(b.kind==='printer'){
   for(const o of this.bodies)if(!o.broken&&o!==b&&Math.hypot(o.x-b.x,o.z-b.z)<3.6)this.breakBody(o,1,true);
   if(Math.hypot(this.player.x-b.x,this.player.z-b.z)<2.8)this.launch(this.player.x-b.x,this.player.z-b.z,1.25,'定時なので、飛んで帰ります。');
  }
 }
 jump(){const p=this.player;if(this.finished||!p.ground)return;p.vy=10;p.ground=false;p.face=1;p.faceTime=.5;this.sound('jump');}
 action(ix=0,iz=0){
  if(this.finished||this.cooldown>0)return;const p=this.player;
  this.cooldown=this.stage.id==='delivery'?.7:.48;p.action=.38;this.sound('swing');
  if(this.stage.id==='delivery'){
   const len=Math.hypot(ix,iz);const x=len>.1?ix/len:Math.sin(p.yaw),z=len>.1?iz/len:Math.cos(p.yaw);
   p.vx=x*15;p.vz=z*15;p.dash=.3;p.face=3;p.faceTime=.3;
  }else if(this.stage.id==='kitchen'){
   let hits=0;for(const b of this.bodies){if(b.broken||Math.hypot(b.x-p.x,b.z-p.z)>2.7)continue;
    if(['tomato','carrot','onion'].includes(b.kind)){
     const dx=-b.x,dz=-6-b.z,len=Math.hypot(dx,dz)||1;b.vx=dx/len*13;b.vz=dz/len*13;b.vy=5;b.hit=1;hits++;
     this.burst(b.x,.8,b.z,5,2,3);
    }else this.breakBody(b);
   }
   if(hits){this.sound('pan');this.event('pan',40+hits*15,'料理は、勢い。');}
  }else{
   if(!p.ground&&p.y>.6){p.vy=-23;p.slam=true;p.face=3;p.faceTime=.5;}
   else this.slam(2.65);
  }
 }
 slam(radius){const p=this.player;let hits=0;
  this.burst(p.x,.15,p.z,16,2,5);this.sound('thud');
  for(const b of this.bodies)if(!b.broken&&Math.hypot(b.x-p.x,b.z-p.z)<radius){this.breakBody(b,1.2,hits>0);hits++;}
  if(hits>1){this.event('chain',100+hits*18,`${hits}連鎖。上司には内緒。`);this.notice(`${hits}連鎖！`,'chaos');}
 }
 step(dt,input={x:0,z:0}){
  if(this.finished)return;dt=clamp(dt,0,.05);this.time=Math.min(RUN_SECONDS,this.time+dt);
  const p=this.player;this.cooldown=Math.max(0,this.cooldown-dt);p.invincible=Math.max(0,p.invincible-dt);p.dash=Math.max(0,p.dash-dt);p.action=Math.max(0,p.action-dt);p.faceTime-=dt;if(p.faceTime<=0)p.face=0;
  if(this.time-this.lastPoint>3.2)this.combo=0;
  let ix=Number(input.x)||0,iz=Number(input.z)||0;const mag=Math.hypot(ix,iz);if(mag>1){ix/=mag;iz/=mag;}
  if(p.ground&&p.dash<=0){const a=1-Math.exp(-14*dt);p.vx+=(ix*5.7-p.vx)*a;p.vz+=(iz*5.7-p.vz)*a;}
  else if(!p.ground){p.vx+=ix*5*dt;p.vz+=iz*5*dt;p.vx*=1-dt*.3;p.vz*=1-dt*.3;}
  if(mag>.08&&p.invincible<=0){let da=Math.atan2(ix,iz)-p.yaw;da=Math.atan2(Math.sin(da),Math.cos(da));p.yaw+=da*Math.min(1,dt*14);}
  p.x+=p.vx*dt;p.z+=p.vz*dt;p.vy-=23*dt;p.y+=p.vy*dt;
  this.stats.maxHeight=Math.max(this.stats.maxHeight,p.y);
  if(p.y<=0){
   if(!p.ground){
    if(p.vy<-13||p.slam){this.burst(p.x,.2,p.z,12,2);this.sound('thud');p.face=4;p.faceTime=.65;if(p.slam)this.slam(4);}
    p.slam=false;p.spin=0;
   }
   p.y=0;p.vy=0;p.ground=true;
  }
  if(Math.abs(p.x)>9){p.x=clamp(p.x,-9,9);p.vx*=-.7;if(p.y>2)p.face=2;}
  if(Math.abs(p.z)>6.5){p.z=clamp(p.z,-6.5,6.5);p.vz*=-.7;}
  const pressure=this.time>40?1.45:this.time>20?1.2:1;
  for(let i=0;i<this.hazards.length;i++){
   const h=this.hazards[i],tt=this.time*pressure;
   h.x=Math.sin(tt*(i?.57:.8)+h.phase)*8;h.z=(i?3:-1.8)+Math.sin(tt*.49+h.phase)*1.6;h.y=Math.abs(Math.sin(tt*1.8+i))*.2;
   if(p.y<1.6&&Math.hypot(p.x-h.x,p.z-h.z)<h.r+.48)this.launch(p.x-h.x,p.z-h.z,1.1,this.stage.id==='kitchen'?'トマトに料理された。':this.stage.id==='office'?'通勤時間、0.3秒。':'お届け先：成層圏。');
  }
  for(const b of this.bodies){
   if(b.broken){if(this.time>=b.respawn){b.broken=0;b.x=b.ox;b.z=b.oz;b.y=0;b.vx=b.vy=b.vz=0;b.rx=b.ry=b.rz=0;b.hit=0;}continue;}
   const moving=Math.abs(b.vx)+Math.abs(b.vz)+Math.abs(b.vy)>.05||b.y>0;
   if(moving){
    b.x+=b.vx*dt;b.z+=b.vz*dt;b.vy-=18*dt;b.y+=b.vy*dt;b.ry+=Math.hypot(b.vx,b.vz)*dt;b.rx+=b.vz*dt*.2;
    if(b.y<0){b.y=0;b.vy=Math.abs(b.vy)>.7?-b.vy*.4:0;}
    const friction=b.y>.05?.2:1.4;b.vx*=Math.exp(-friction*dt);b.vz*=Math.exp(-friction*dt);
    if(Math.abs(b.x)>8.7){b.x=clamp(b.x,-8.7,8.7);b.vx*=-.7;}
    if(Math.abs(b.z)>6.2){b.z=clamp(b.z,-6.2,6.2);b.vz*=-.7;}
   }
   const dist=Math.hypot(b.x-p.x,b.z-p.z);
   if(this.stage.id==='delivery'&&b.kind==='parcel'&&dist<1.05&&p.y<.8&&p.carry<5){
    b.broken=1;b.respawn=this.time+6;p.carry++;this.sound('pickup');this.notice(`荷物 ${p.carry}/5`);p.face=1;p.faceTime=.35;
   }
   else if(['banana','coffee'].includes(b.kind)&&dist<b.r+.35&&p.y<.15&&Math.hypot(p.vx,p.vz)>2){
    this.launch(p.vx||1,p.vz,.65,b.kind==='banana'?'バナナ、仕事しすぎ。':'コーヒーブレイク（物理）。');
   }
   else if(!['banana','coffee','parcel'].includes(b.kind)&&dist<b.r+.48&&p.y<1){
    if(p.dash>0)this.breakBody(b);
    if(!b.broken){const nx=(p.x-b.x)/(dist||1),nz=(p.z-b.z)/(dist||1),overlap=b.r+.48-dist;p.x+=nx*overlap*.7;p.z+=nz*overlap*.7;
     if(['tomato','carrot','onion'].includes(b.kind)){b.vx-=nx*3;b.vz-=nz*3;}
    }
   }
   if(this.stage.id==='kitchen'&&['tomato','carrot','onion'].includes(b.kind)&&!b.broken&&b.hit&&Math.hypot(b.x,b.z+6)<1.9){
    b.broken=1;b.respawn=this.time+3;this.stats.served++;this.points(180,'いただきます！','chaos');this.burst(0,1.5,-6,18,2,6);p.face=1;p.faceTime=.9;this.event('serve',90,'着皿まで、ノーバウンド。');this.sound('splash');
   }
  }
  if(this.stage.id==='delivery'&&p.carry>0&&p.y<1&&Math.hypot(p.x,p.z+6)<2){
   const n=p.carry;p.carry=0;this.stats.deliveries+=n;this.points(n*150+n*n*25,`${n}個、お届け！`,'chaos');this.burst(0,2,-6,22,2,7);p.face=1;p.faceTime=1;this.event('delivery',70+n*15,'無事です。たぶん。');this.sound('fanfare');
  }
  for(const particle of this.particles){particle.life-=dt;particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;particle.z+=particle.vz*dt;particle.vy-=18*dt;if(particle.y<.05){particle.y=.05;particle.vy*=-.35;particle.vx*=.8;particle.vz*=.8;}}
  this.particles=this.particles.filter(x=>x.life>0);
  const chapter=Math.floor(this.time/20);if(chapter>0&&chapter!==this.chapter&&this.time<59){this.chapter=chapter;this.notice(chapter===1?'ここから本番！':'ラスト20秒、大波乱！','chaos');this.sound('alarm');this.event('escalation',20,'平和な時間、終了。');}
  if(this.time>=RUN_SECONDS){this.finished=true;this.event('end',25,'本日の仕事、終了。');}
 }
 snapshot(){const p=this.player;return {t:round(this.time),p:[p.x,p.y,p.z,p.yaw,p.vx,p.vz,p.vy,p.spin,p.face,p.action,p.carry,p.ground?1:0].map(round),b:this.bodies.map(b=>[b.x,b.y,b.z,b.rx,b.ry,b.rz,b.broken].map(round)),h:this.hazards.map(h=>[h.x,h.y,h.z].map(round)),f:this.particles.slice(-45).map(f=>[f.id,round(f.x),round(f.y),round(f.z),f.color,round(f.size)]),score:this.score};}
 definition(){return {stage:this.stage.id,seed:this.seed,bodies:this.bodies.map(b=>({kind:b.kind,color:b.color||0,r:b.r})),hazards:this.hazards.map(h=>({kind:h.kind,r:h.r}))};}
}
