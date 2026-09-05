import * as T from './lib/three.module.min.js';
import {STAGES,SKINS,SHIRTS,HAIR_COLORS,clamp,lerp} from './config.js';

const materials=new Map();
function mat(color,roughness=.68,metalness=0){const k=`${color}/${roughness}/${metalness}`;if(!materials.has(k))materials.set(k,new T.MeshStandardMaterial({color,roughness,metalness}));return materials.get(k);}
const G={box:new T.BoxGeometry(1,1,1),ball:new T.SphereGeometry(1,20,14),cyl:new T.CylinderGeometry(1,1,1,20),cone:new T.ConeGeometry(1,1,16),torus:new T.TorusGeometry(1,.16,8,24),disc:new T.CircleGeometry(1,32),eye:new T.SphereGeometry(1,14,10)};
const palette=['#edb36b','#ff6552','#c4f04c','#a6a2c1','#a787e5','#eff4e9'];
function mesh(parent,geo,color,x=0,y=0,z=0,sx=1,sy=1,sz=1){const m=new T.Mesh(G[geo],mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(p,c,x,y,z,w,h,d){return mesh(p,'box',c,x,y,z,w,h,d);}
function ball(p,c,x,y,z,a,b=a,d=a){return mesh(p,'ball',c,x,y,z,a,b,d);}
function cyl(p,c,x,y,z,r,h){return mesh(p,'cyl',c,x,y,z,r,h,r);}
function group(p,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);p.add(g);return g;}
function textBoard(p,text,bg,fg,x,y,z,w=2,h=.7){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;const c=canvas.getContext('2d');c.fillStyle=bg;c.fillRect(0,0,512,160);c.fillStyle=fg;c.font='900 76px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,86,474);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const material=new T.MeshBasicMaterial({map:texture});const m=new T.Mesh(new T.PlaneGeometry(w,h),material);m.position.set(x,y,z);p.add(m);m.userData.owned=true;return m;
}
function disposeOwned(root){root.traverse(o=>{if(o.userData.owned){o.geometry.dispose();o.material.map?.dispose();o.material.dispose();}});}

export class Avatar {
 constructor(config){
  this.config=config;this.root=new T.Group();this.body=group(this.root);this.head=group(this.body,0,1.95,0);this.face=group(this.head,0,0,.03);
  const skin=SKINS[config.skin],shirt=SHIRTS[config.shirt],hair=HAIR_COLORS[config.hairColor];
  const torso=ball(this.body,shirt,0,1.02,0,.4,.51,.28);torso.scale.x*=config.body;
  cyl(this.body,skin,0,1.51,0,.16,.23);
  box(this.body,'#29334c',0,.65,0,.62,.27,.43);
  for(const side of [-1,1]){
   const leg=group(this.body,side*.18,.6,0);cyl(leg,'#29334c',0,-.18,0,.12,.38);ball(leg,'#f5f0e7',0,-.44,.075,.16,.125,.23);box(leg,'#353147',0,-.53,.08,.28,.06,.37);
   const arm=group(this.body,side*.41,1.36,0);ball(arm,shirt,0,-.12,0,.17,.24,.18);cyl(arm,skin,0,-.37,0,.105,.3);ball(arm,skin,0,-.55,0,.14);
   if(side===-1){this.leftLeg=leg;this.leftArm=arm;}else{this.rightLeg=leg;this.rightArm=arm;}
  }
  ball(this.head,skin,0,0,0,.69*config.head,.75,.61);for(const s of [-1,1])ball(this.head,skin,s*.66,-.015,0,.15,.2,.15);
  for(const s of [-1,1])ball(this.face,'#e89782',s*.4,-.19,.535,.11,.06,.025);
  this.eyes=[];this.brows=[];
  for(const s of [-1,1]){
   const eye=group(this.face,s*.245,.07,.555);ball(eye,'#fffdf6',0,0,0,.11,.145,.062);const pupil=ball(eye,'#282033',0,-.005,.056,.049,.076,.023);ball(eye,'#ffffff',-.015,.026,.076,.016);this.eyes.push({root:eye,pupil});
   const brow=box(this.face,hair,s*.245,.32,.554,.21,.045,.035);brow.rotation.z=s*.04;this.brows.push(brow);
  }
  ball(this.face,skin,0,-.06,.646,.085,.092,.1);
  this.mouth=mesh(this.face,'torus','#792f39',0,-.3,.55,.11,.072,.047);this.mouth.rotation.x=.05;
  this.teeth=box(this.face,'#fff6e7',0,-.276,.597,.13,.038,.018);
  this.hair=group(this.head);
  const cap=new T.Mesh(new T.SphereGeometry(1,20,12,0,Math.PI*2,0,1.36),mat(hair));cap.scale.set(.72*config.head,.77,.64);cap.position.y=.015;cap.castShadow=true;this.hair.add(cap);cap.userData.ownGeometry=true;
  if(config.hair===0){for(let i=0;i<5;i++){const b=ball(this.hair,hair,-.45+i*.22,.51,.41,.22,.25,.22);b.rotation.z=-.3;}ball(this.hair,hair,-.55,.24,.3,.13,.29,.13);}
  else if(config.hair===1){for(const s of [-1,1]){ball(this.hair,hair,s*.56,-.2,-.12,.22,.6,.4);ball(this.hair,hair,s*.61,-.42,.16,.18,.3,.2);}for(let i=0;i<5;i++)ball(this.hair,hair,-.45+i*.23,.51,.4,.19,.18,.22);}
  else if(config.hair===2){for(let i=0;i<6;i++){const spike=mesh(this.hair,'cone',hair,-.43+i*.17,.72+Math.sin(i)*.06,0,.2,.5,.22);spike.rotation.z=(i-2.5)*-.16;}ball(this.hair,hair,.3,.46,.45,.31,.19,.2);}
  else if(config.hair===3){ball(this.hair,hair,0,.72,-.3,.35);ball(this.hair,hair,0,.89,-.33,.25);for(let i=0;i<4;i++)ball(this.hair,hair,-.36+i*.24,.52,.43,.2,.15,.22);}
  else {for(let i=0;i<10;i++){const a=i/10*Math.PI*2;ball(this.hair,hair,Math.cos(a)*.52,.54+Math.sin(a)*.12,Math.sin(a)*.47,.28);}}
  this.glasses=group(this.face);this.glasses.visible=config.glasses;
  for(const s of [-1,1])mesh(this.glasses,'torus','#252134',s*.245,.08,.66,.19,.18,.06);
  box(this.glasses,'#252134',0,.1,.667,.12,.035,.035);
  this.pack=group(this.root,0,2.95,0);for(let i=0;i<5;i++){const b=group(this.pack,0,i*.48,0);box(b,palette[i%4],0,0,0,.64,.43,.54);box(b,'#f2e1b7',0,0,.274,.13,.44,.012);b.visible=false;}
  this.pan=group(this.rightArm,0,-.56,0);cyl(this.pan,'#3d394d',0,-.2,0,.07,.5);const disc=cyl(this.pan,'#404052',0,-.66,0,.34,.09);disc.rotation.x=Math.PI/2;this.pan.visible=false;
  this.stars=group(this.root,0,2.8,0);for(let i=0;i<3;i++){const a=i/3*Math.PI*2;const s=mesh(this.stars,'cone','#f9c832',Math.cos(a)*.8,0,Math.sin(a)*.8,.1,.19,.1);s.rotation.z=Math.PI;}this.stars.visible=false;
 }
 pose(p,time,stage='delivery',scale=1){
  const [x,y,z,yaw,vx,vz,vy,spin,expression,action,carry,ground]=p;this.root.position.set(x,y,z);this.root.rotation.y=yaw;this.root.scale.setScalar(scale);const speed=Math.hypot(vx,vz),walk=Math.sin(time*14)*Math.min(1,speed/4.5);
  this.body.position.y=ground?Math.abs(walk)*.065:0;this.body.rotation.set(0,0,0);
  this.leftLeg.rotation.x=walk*.7;this.rightLeg.rotation.x=-walk*.7;
  this.leftArm.rotation.set(-walk*.55,0,.09);this.rightArm.rotation.set(walk*.55,0,-.09);
  this.head.rotation.set(0,Math.sin(time*1.8)*.055,0);
  if(!ground){this.leftArm.rotation.z=.9;this.rightArm.rotation.z=-.9;this.leftLeg.rotation.x=-.5;this.rightLeg.rotation.x=.6;}
  if(spin){this.body.rotation.x=time*11;this.body.rotation.z=Math.sin(time*9)*.32;this.body.position.y=1;this.head.rotation.z=Math.sin(time*13)*.14;}
  if(action>0){this.rightArm.rotation.x=-1.5;this.rightArm.rotation.z=-.8+Math.sin(action*16)*1.5;this.body.rotation.y=Math.sin(action*15)*.5;}
  this.pan.visible=stage==='kitchen';
  const blink=Math.sin(time*.79)>.991? .07:1;
  for(let i=0;i<2;i++){const s=i===0?-1:1,e=this.eyes[i];e.root.scale.y=blink*(expression===2?1.4:expression===3?.65:expression===1?.8:1)*(this.config.eyes===1?.68:this.config.eyes===2?1.2:1);e.pupil.scale.y=expression===2?.8:1;e.pupil.position.x=this.config.eyes===3?s*.02:0;this.brows[i].rotation.z=expression===2?s*.2:expression===3?-s*.4:expression===4?-s*.2:s*.04;this.brows[i].position.y=expression===2?.41:.31;}
  this.mouth.scale.set(expression===2?.12:expression===1?.16:.1,expression===2?.17:expression===4?.09:.055,.047);this.mouth.rotation.z=expression===4?-.25:0;this.teeth.visible=expression===1||expression===3;
  this.stars.visible=expression===4;this.stars.rotation.y=time*5;
  this.pack.visible=carry>0;for(let i=0;i<5;i++){this.pack.children[i].visible=i<carry;this.pack.children[i].rotation.z=Math.sin(time*5+i*.7)*Math.min(.25,speed*.025);}
 }
 dispose(){this.root.traverse(o=>{if(o.userData.ownGeometry)o.geometry.dispose();});}
}

function makeProp(kind,color=0){
 const p=new T.Group(),c=palette[color%palette.length];
 if(kind==='parcel'||kind==='crate'){
  box(p,c,0,.45,0,.86,.86,.8);box(p,'#efdcab',0,.45,.407,.13,.86,.02);box(p,'#efdcab',0,.89,0,.13,.015,.8);box(p,'#f9f3d7',.23,.51,.421,.2,.16,.015);
 }else if(kind==='cone'){
  box(p,'#eb633d',0,.05,0,.85,.1,.85);mesh(p,'cone','#f68b40',0,.57,0,.34,1,.34);cyl(p,'#fff0d8',0,.46,0,.225,.16);
 }else if(kind==='banana'){
  for(let i=0;i<3;i++){const b=ball(p,'#f4d145',(i-1)*.2,.12,0,.17,.13,.36);b.rotation.z=(i-1)*.45;b.rotation.y=(i-1)*.5;}cyl(p,'#67502e',0,.27,-.23,.04,.2);
 }else if(kind==='coffee'){
  mesh(p,'disc','#795747',0,.026,0,.85,.7,1).rotation.x=-Math.PI/2;const cup=cyl(p,'#f9eee1',.15,.17,.1,.19,.3);cup.rotation.z=1.25;
 }else if(kind==='tomato'||kind==='bigTomato'){
  ball(p,'#f3563f',0,.57,0,.57,.52,.57);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const leaf=ball(p,'#55984b',Math.cos(a)*.14,1.05,Math.sin(a)*.14,.24,.035,.09);leaf.rotation.y=-a;}
  cyl(p,'#43893c',0,1.12,0,.055,.22);if(kind==='bigTomato')p.scale.setScalar(2.1);
 }else if(kind==='carrot'){
  const b=mesh(p,'cone','#f79736',0,.5,0,.36,1,.36);b.rotation.z=Math.PI;for(const s of [-1,0,1]){const l=box(p,'#62a852',s*.12,1.12,0,.12,.5,.1);l.rotation.z=s*.25;}
 }else if(kind==='onion'){
  ball(p,'#eee1c8',0,.5,0,.51,.53,.51);mesh(p,'cone','#c9bf94',0,1,0,.15,.36,.15);
 }else if(kind==='plates'){
  for(let i=0;i<8;i++)cyl(p,i%2?'#fcf5ed':'#9ac4be',0,.12+i*.12,0,.54,.09);
 }else if(kind==='desk'){
  box(p,'#e4bb89',0,.92,0,1.7,.14,1);for(const s of [-1,1])box(p,'#64687d',s*.68,.45,0,.1,.9,.75);
  box(p,'#33364e',0,1.35,-.1,.7,.58,.1);box(p,'#9ce5d9',0,1.36,-.038,.58,.44,.014);box(p,'#4c5166',0,1.04,-.1,.35,.06,.24);box(p,'#f1eee7',.45,1.02,.26,.42,.02,.3);
 }else if(kind==='printer'){
  box(p,'#797e94',0,.45,0,1.2,.9,1);box(p,'#f15d56',0,1.03,0,1.26,.32,1.05);box(p,'#45485f',0,1.22,-.16,.87,.08,.59);box(p,'#e5f5f0',0,.82,.53,.8,.06,.2);box(p,'#b9ef5c',.41,1.21,.32,.15,.04,.12);for(let i=0;i<3;i++)box(p,'#f7f4e8',0,.89+i*.025,.61,.67,.012,.37);
 }else if(kind==='chair'||kind==='chairSpin'){
  cyl(p,'#666879',0,.38,0,.09,.64);box(p,'#8666bd',0,.73,0,.75,.16,.75);box(p,'#9878ca',0,1.2,-.32,.77,.77,.15);
  for(let i=0;i<5;i++){const a=i*2*Math.PI/5;const leg=box(p,'#4e5266',Math.cos(a)*.25,.1,Math.sin(a)*.25,.62,.06,.08);leg.rotation.y=-a;ball(p,'#2f3347',Math.cos(a)*.52,.08,Math.sin(a)*.52,.1);}
  if(kind==='chairSpin')p.scale.setScalar(1.6);
 }else if(kind==='plant'){
  cyl(p,'#e8a984',0,.32,0,.4,.6);cyl(p,'#7f5039',0,.64,0,.32,.04);for(let i=0;i<6;i++){const a=i*1.2;const leaf=ball(p,i%2?'#559662':'#77b27b',Math.cos(a)*.2,1+Math.sin(i)*.13,Math.sin(a)*.2,.17,.48,.12);leaf.rotation.z=Math.cos(a)*.5;}
 }else if(kind==='cart'){
  box(p,'#35a6b3',0,.43,0,1.75,.6,1);for(const x of [-.6,.6])for(const z of [-.5,.5]){const w=cyl(p,'#30374b',x,.24,z,.26,.16);w.rotation.x=Math.PI/2;}
  for(let i=0;i<3;i++){const parcel=makeProp('parcel',i);parcel.scale.setScalar(.6);parcel.position.set((i-1)*.4,.76,0);p.add(parcel);}box(p,'#f4cf55',.8,1,0,.09,1,1);
 }else if(kind==='rollingPin'){
  const roller=cyl(p,'#d0a67c',0,.48,0,.46,2.25);roller.rotation.z=Math.PI/2;const handle=cyl(p,'#966849',0,.48,0,.16,3.1);handle.rotation.z=Math.PI/2;
 }else if(kind==='paperBall'){
  ball(p,'#f6f1e6',0,.9,0,.93);for(let i=0;i<4;i++){const strip=box(p,'#d4d0d1',0,.9,0,1.78,.04,.04);strip.rotation.z=i*.8;strip.rotation.y=i*.5;}
 }
 return p;
}

export class View {
 constructor(canvas,avatar){
  this.canvas=canvas;this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,window.innerWidth<800?1.5:1.75));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(39,1,.1,160);this.scene.add(new T.HemisphereLight('#fff8ed','#8d829e',2.4));
  this.sun=new T.DirectionalLight('#fff1d8',3.4);this.sun.position.set(-7,17,9);this.sun.castShadow=true;Object.assign(this.sun.shadow.camera,{left:-17,right:17,top:16,bottom:-16,near:.5,far:55});this.sun.shadow.mapSize.set(1024,1024);this.sun.shadow.normalBias=.025;this.sun.shadow.bias=-.00008;this.scene.add(this.sun);
  this.root=new T.Group();this.scene.add(this.root);this.environment=group(this.root);this.dynamic=group(this.root);this.actorLayer=group(this.root);this.player=new Avatar(avatar);this.actorLayer.add(this.player.root);
  this.particleMeshes=[];for(let i=0;i<90;i++){const m=mesh(this.dynamic,'box',palette[i%6]);m.visible=false;m.castShadow=false;this.particleMeshes.push(m);}
  this.shadow=mesh(this.actorLayer,'disc','#272941');this.shadow.material=new T.MeshBasicMaterial({color:'#272941',transparent:true,opacity:.15,depthWrite:false});this.shadow.rotation.x=-Math.PI/2;this.shadow.position.y=.012;this.shadow.scale.set(.8,.6,1);this.shadow.castShadow=false;
  this.cameraPosition=new T.Vector3();this.cameraTarget=new T.Vector3();this.lastMode='';this.lastCut=-1;this.resize();
 }
 resize(){const w=window.innerWidth,h=window.innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 changeAvatar(config){this.player.dispose();this.actorLayer.remove(this.player.root);this.player=new Avatar(config);this.actorLayer.add(this.player.root);}
 setWorld(def){
  this.def=def;this.stage=STAGES.find(s=>s.id===def.stage);const s=this.stage;
  disposeOwned(this.environment);this.npcs?.forEach(a=>a.dispose());this.environment.clear();for(const m of this.props||[])this.dynamic.remove(m);for(const m of this.hazardMeshes||[])this.dynamic.remove(m);
  this.scene.background=new T.Color(s.sky);this.scene.fog=new T.Fog(s.sky,46,95);
  const e=this.environment;
  box(e,'#f3eee4',0,-.5,0,21,.65,16);box(e,s.floor,0,-.12,0,20,.16,15);
  for(let x=-9;x<=9;x+=2){const line=box(e,s.id==='kitchen'?'#98c8b2':s.id==='office'?'#a8aad2':'#d8b777',x,-.031,0,.023,.012,14.5);line.castShadow=false;}
  for(let z=-6;z<=6;z+=2){const line=box(e,s.id==='kitchen'?'#98c8b2':s.id==='office'?'#a8aad2':'#d8b777',0,-.031,z,19.7,.012,.023);line.castShadow=false;}
  for(const x of [-10,10]){box(e,'#f6f0df',x,.28,0,.2,.65,15);for(let z=-6;z<7;z+=3)cyl(e,'#e4e9df',x,.75,z,.06,1.5);}
  box(e,'#f6f0df',0,.27,-7.5,20,.65,.2);box(e,'#fff9e9',0,-.32,7.96,20.6,.12,.04);
  if(s.id==='delivery'){
   box(e,'#69b9c3',0,1.1,-7,3,2.2,1.1);box(e,'#263c53',0,1.44,-6.41,1.8,.36,.08);textBoard(e,'DELIVERY','#f4eecd','#243246',0,2.02,-6.42,2.7,.5);
   for(const x of [-7.5,7.5]){box(e,x<0?'#f08465':'#f2c36b',x,2.25,-8.5,4.3,4.5,2);for(let i=0;i<3;i++)box(e,'#526775',x-1+i,2.9,-7.47,.6,1.3,.06);box(e,'#fff0d8',x,4.55,-8.5,4.6,.16,2.3);}
   for(const x of [-9,9]){cyl(e,'#5a6771',x,2,5,.055,4);ball(e,'#f4edc2',x,4,5,.3);}
   textBoard(e,'HANDLE WITH CHAOS','#ff684a','#fff7e2',0,-.3,8.02,7,.42);
  }else if(s.id==='kitchen'){
   box(e,'#f4f0db',0,1,-7.7,19,2,1);for(let i=-8;i<=8;i+=4){box(e,'#76988d',i,1,-7.14,3.6,1.6,.07);box(e,'#e8edce',i,1.5,-7.07,.5,.06,.06);}
   cyl(e,'#747887',0,.65,-6,1.4,1.3);cyl(e,'#f39d4d',0,1.32,-6,1.23,.035);mesh(e,'torus','#c5c8c3',0,1.35,-6,1.4,1.4,1.4).rotation.x=Math.PI/2;
   for(const x of [-1.5,1.5])mesh(e,'torus','#777586',x,1,-6,.3,.35,.3);
   textBoard(e,'YES, CHEF!','#9c75d8','#fff6dc',0,3,-7.1,5,.8);
   for(const x of [-7,7]){cyl(e,'#6d8880',x,4,-6,.015,3);const shade=mesh(e,'cone','#f2cd6c',x,2.85,-6,.7,.6,.7);shade.rotation.z=Math.PI;}
  }else{
   box(e,'#d7dced',0,1.9,-7.8,20,3.8,.3);for(const x of [-7.5,-3.7,3.7,7.5]){box(e,'#8dafc4',x,2,-7.61,3,2.6,.03);box(e,'#eef1e8',x,2,-7.55,.045,2.6,.04);box(e,'#eef1e8',x,2,-7.55,3,.045,.04);}
   textBoard(e,'FRIDAY. 17:59.','#45435f','#dcf076',0,3,-7.56,4,.65);
   for(const x of [-9,9]){const plant=makeProp('plant');plant.position.set(x,0,-6);plant.scale.setScalar(1.5);e.add(plant);}
  }
  this.target=group(e,0,.025,-5.8);const targetRing=mesh(this.target,'torus',s.id==='office'?'#ffffff':'#d6f653');targetRing.rotation.x=-Math.PI/2;targetRing.scale.set(1.8,1.8,.35);targetRing.castShadow=false;this.target.visible=s.id!=='office';
  this.arrow=mesh(e,'cone','#dbef56',0,3.4,-6,.32,.6,.25);this.arrow.rotation.z=Math.PI;this.arrow.visible=s.id!=='office';
  this.props=def.bodies.map(b=>{const m=makeProp(b.kind,b.color);this.dynamic.add(m);return m;});this.hazardMeshes=def.hazards.map(h=>{const m=makeProp(h.kind);this.dynamic.add(m);return m;});
  this.npcs=[];for(let i=0;i<2;i++){const config={...this.player.config,skin:i+1,shirt:i?4:2,hair:i?3:2,hairColor:i?1:0,glasses:!!i};const npc=new Avatar(config);npc.root.position.set(i?9:-9,0,-5.8);npc.root.scale.setScalar(.8);e.add(npc.root);this.npcs.push(npc);}
  const pedestal=cyl(e,'#f9e7c8',0,-.55,0,5,.15);pedestal.visible=false;
 }
 render(frame,time,mode,options={}){
  if(!this.def)return;const p=frame.p,s=this.stage,motionTime=frame.s??time;this.environment.visible=mode!=='editor';this.dynamic.visible=mode!=='editor';this.shadow.visible=mode!=='editor';
  if(mode==='editor'){
   const q=[0,0,0,options.rotation||0,0,0,0,0,options.face||0,0,0,1];this.player.pose(q,time,s.id,1.25);this.scene.background=new T.Color('#d6e8df');
  }else{
   this.scene.background.set(s.sky);this.player.pose(p,motionTime,s.id,mode==='menu'?2.1:1);
   this.shadow.position.set(p[0],.022,p[2]);this.shadow.scale.setScalar(clamp(1-p[1]*.035,.3,1));this.shadow.material.opacity=clamp(.19-p[1]*.012,.02,.19);
   frame.b.forEach((b,i)=>{const m=this.props[i];if(!m)return;m.visible=!b[6];m.position.set(b[0],b[1],b[2]);m.rotation.set(b[3],b[4],b[5]);});
   frame.h.forEach((h,i)=>{const m=this.hazardMeshes[i];m.position.set(...h);m.rotation.y=s.id==='delivery'?Math.cos(motionTime*.8+i)<0?Math.PI:0:motionTime*(i?2.8:1.9);if(s.id==='kitchen')m.rotation.z=motionTime*1.4;});
   this.particleMeshes.forEach((m,i)=>{const f=frame.f[i];m.visible=!!f;if(f){m.position.set(f[1],f[2],f[3]);m.scale.setScalar(f[5]);m.rotation.set(motionTime*3+i,motionTime*2-i,i);m.material=mat(palette[Math.abs(Math.round(f[4]))%palette.length]);}});
   this.target.rotation.y=motionTime*.4;this.arrow.position.y=3.4+Math.sin(motionTime*4)*.18;
   this.npcs.forEach((n,i)=>n.pose([i?9:-9,0,-5.8,i?-.3:.3,0,0,0,0,p[8]===2?2:1,0,0,1],motionTime+i,s.id,.8));
  }
  const aspect=this.camera.aspect,portrait=aspect<.8;let cx,cy,cz,tx=0,ty=.5,tz=0;
  if(mode==='editor'){cx=portrait?0:-1.4;cy=3.25;cz=portrait?9.5:8.8;tx=portrait?0:1.1;ty=portrait?.4:1.8;tz=0;}
  else if(mode==='menu'){cx=14;cy=13;cz=23;tx=aspect>1.25?-3.5:0;ty=1.1;tz=0;if(portrait){cx=7;cy=21;cz=33;ty=1.6;}}
  else if(mode==='replay'){
   const clip=options.clip||{camera:'wide'},local=options.local||0,style=options.style||'comic';let dist=portrait?14:10;
   if(clip.camera==='wide')dist=portrait?22:16;
   if(clip.camera==='close'||clip.camera==='hero')dist=portrait?11:8;
   const angle=clip.camera==='orbit'?local*.35+.35:clip.camera==='low'?-.6:clip.camera==='hero'?.05:.5;
   if(style==='chaos')dist*=.85;else if(style==='cinema')dist*=1.12;
   tx=p[0];ty=p[1]+1.3;tz=p[2];cx=tx+Math.sin(angle)*dist;cz=tz+Math.cos(angle)*dist;cy=ty+(clip.camera==='low'?2.3:clip.camera==='wide'?10:4.1);
   if(local>2.55&&clip.camera==='hero'){cx=tx+1;cy=ty+1;cz=tz+(portrait?6.6:4.8);}
  }else{
   tx=p[0]*.18;tz=p[2]*.15;ty=Math.max(.7,p[1]*.5);cx=tx;cy=portrait?27:19;cz=portrait?33:23;
   if(aspect>2.1){cy=21;cz=26;}cy+=p[1]*.3;
  }
  const cut=options.cut??-1,instant=mode!==this.lastMode||mode==='replay'&&cut!==this.lastCut;
  if(instant){this.cameraPosition.set(cx,cy,cz);this.cameraTarget.set(tx,ty,tz);}else{const a=mode==='replay'?.13:.07;this.cameraPosition.lerp(new T.Vector3(cx,cy,cz),a);this.cameraTarget.lerp(new T.Vector3(tx,ty,tz),a);}
  this.camera.position.copy(this.cameraPosition);this.camera.lookAt(this.cameraTarget);if(mode==='replay'&&options.style==='chaos'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)this.camera.rotation.z=Math.sin(time*2)*.035;this.lastMode=mode;this.lastCut=cut;
  this.renderer.render(this.scene,this.camera);
 }
}
