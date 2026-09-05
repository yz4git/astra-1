import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/core.js';
import {DEFAULT_AVATAR,cleanAvatar} from '../dist/config.js';
import {makeMovie,validateMovie,frameAt,chooseClips} from '../dist/replay.js';
import {Input,normalizedAxes} from '../dist/input.js';
import {Avatar} from '../dist/visuals.js';

test('delivery: collecting and delivering a real parcel earns points',()=>{
 const g=new Game('delivery',42),parcel=g.bodies.find(b=>b.kind==='parcel');g.player.x=parcel.x;g.player.z=parcel.z;g.step(1/60);assert.equal(g.player.carry,1);assert.equal(parcel.broken,1);
 g.player.x=0;g.player.z=-6;g.step(1/60);assert.equal(g.player.carry,0);assert.equal(g.stats.deliveries,1);assert.ok(g.score>=175);assert.ok(g.events.some(e=>e.type==='delivery'));
});
test('kitchen: a pan shot travels into the pot and scores without teleporting',()=>{
 const g=new Game('kitchen',44);g.player.x=-6;g.player.z=1;g.action();assert.ok(g.bodies[0].vx>0);assert.equal(g.stats.served,0);for(let i=0;i<240;i++)g.step(1/60);assert.ok(g.stats.served>=1);assert.ok(g.events.some(e=>e.type==='serve'));
});
test('office: printer explosion causes a chain and a recoverable flight',()=>{
 const g=new Game('office',91);g.player.x=-6;g.player.z=-1.2;g.action();assert.ok(g.stats.broken>=2);assert.ok(g.stats.flights>=1);assert.ok(g.player.vy>10);
 g.hazards=[];for(let i=0;i<200;i++)g.step(1/60);assert.equal(g.player.y,0);assert.equal(g.player.ground,true);assert.equal(g.player.spin,0);
});
for(const stage of ['delivery','kitchen','office'])test(`${stage}: a full 60-second run produces a valid 15-second portable movie`,()=>{
 const g=new Game(stage,12345),frames=[g.snapshot()];let i=0;
 for(;i<3700&&!g.finished;i++){const a={x:Math.sin(i/150),z:Math.cos(i/190)};if(i%70===0)g.jump();if(i%32===0)g.action(a.x,a.z);g.step(1/60,a);if(i%3===0)frames.push(g.snapshot());}
 frames.push(g.snapshot());assert.equal(g.time,60);assert.ok(g.score>0);assert.ok(g.stats.maxHeight>5);const before=g.score;g.step(1);g.action();assert.equal(g.score,before);
 const movie=makeMovie(g,frames,DEFAULT_AVATAR),json=JSON.stringify(movie),loaded=validateMovie(JSON.parse(json));assert.equal(loaded.duration,15);assert.equal(loaded.frames.length,301);assert.equal(loaded.frames.at(-1).t,15);assert.ok(json.length<2_000_000);assert.deepEqual(loaded.frames,movie.frames);
 const a=frameAt(loaded.frames,2.99);assert.deepEqual(a.p,loaded.frames[59].p,'A cut must never interpolate into another shot');
 assert.equal(loaded.frames[58].s,loaded.frames[59].s,'Freeze frames preserve the animation clock');
 const bad=JSON.parse(json);bad.frames[0].p[0]=null;assert.throws(()=>validateMovie(bad));const missing=JSON.parse(json);delete missing.frames[0].t;assert.throws(()=>validateMovie(missing));
});
test('editor selects different kinds of highlights when alternatives exist',()=>{
 const events=[2,10,20,30,42,52].map(time=>({time,score:100,type:'flight',title:'Flight'}));events.push({time:36,score:90,type:'delivery',title:'Delivered'});const clips=chooseClips(events,60);assert.equal(clips.length,5);assert.ok(clips.some(c=>c.type==='delivery'));for(let i=1;i<clips.length;i++)assert.ok(clips[i].time-clips[i-1].time>3.5);
});
test('all avatar styles construct and pose with finite transforms',()=>{
 for(let hair=0;hair<5;hair++){const a=new Avatar(cleanAvatar({...DEFAULT_AVATAR,hair,glasses:true,body:1.2,head:.85}));for(let face=0;face<5;face++){a.pose([1,4,2,.6,4,2,8,1,face,.2,5,0],1.2,'kitchen');a.root.updateMatrixWorld(true);a.root.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));}a.dispose();}
});
test('pointer cancellation releases movement and held actions independently',()=>{
 class Target{constructor(){this.handlers={};this.style={};}addEventListener(n,f){(this.handlers[n]??=[]).push(f);}fire(n,e){for(const f of this.handlers[n]||[])f({preventDefault(){},...e});}getBoundingClientRect(){return {left:0,top:0,width:120,height:120};}setPointerCapture(){}releasePointerCapture(){}}
 const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=new Target();globalThis.document={activeElement:null};
 try{const pad=new Target(),stick=new Target(),jump=new Target(),action=new Target(),input=new Input({pad,stick,jump,action,onJump(){},onAction(){},onPause(){},onGesture(){}});input.enabled=true;
  pad.fire('pointerdown',{pointerId:1,clientX:110,clientY:60});action.fire('pointerdown',{pointerId:2});assert.ok(input.axes().x>.9);assert.equal(input.holdingAction,true);pad.fire('pointercancel',{pointerId:1});assert.equal(input.axes().x,0);assert.equal(input.holdingAction,true);action.fire('lostpointercapture',{pointerId:2});assert.equal(input.holdingAction,false);
  pad.fire('pointerdown',{pointerId:3,clientX:60,clientY:120});input.clear();assert.deepEqual(input.axes(),{x:0,z:0});assert.equal(input.padId,null);const a=normalizedAxes(2,-2);assert.ok(Math.abs(Math.hypot(a.x,a.z)-1)<1e-9);
 }finally{globalThis.window=oldWindow;globalThis.document=oldDocument;}
});
