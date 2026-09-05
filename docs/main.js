import {STAGES,SKINS,SHIRTS,HAIR_COLORS,DEFAULT_AVATAR,RUN_SECONDS,MOVIE_SECONDS,cleanAvatar,clamp} from './config.js';
import {Game} from './core.js';
import {View} from './visuals.js';
import {Sound} from './audio.js';
import {Input} from './input.js';
import {makeMovie,frameAt,validateMovie} from './replay.js';

const $=id=>document.getElementById(id),AVATAR_KEY='take60.avatar.v1',MOVIE_KEY='take60.last-movie.v1';
const safeRead=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const safeWrite=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
let avatar=cleanAvatar(safeRead(AVATAR_KEY,DEFAULT_AVATAR)),selected=0,mode='menu',pausedFrom='playing',game=new Game(),view;
let movie=null,recording=[],recordAccumulator=0,simAccumulator=0,lastStamp=performance.now(),countdown=3,lastCount=-1,cuttingTime=0;
let replayTime=0,replayPlaying=true,replayStyle='comic',lastCut=-1,lastNotice=-1,noticeUntil=0,editorRotation=0,editorFace=0,editorDrag=null,activeCapture=null;
const audio=new Sound();audio.muted=!!safeRead('take60.muted',false);
try{view=new View($('stage'),avatar);view.setWorld(game.definition());}catch(e){console.error('3D initialization failed',e);$('fatal').hidden=false;throw e;}
const input=new Input({pad:$('joystick'),stick:$('stick'),jump:$('jump'),action:$('action'),onJump:()=>{if(mode==='playing')game.jump();},onAction:()=>{if(mode==='playing'){const a=input.axes();game.action(a.x,a.z);}},onPause:()=>{if(mode==='paused')resume();else if(mode==='playing'||mode==='countdown')pause();else if(mode==='replay'){replayPlaying=!replayPlaying;updateReplayButton();}},onGesture:()=>unlockAudio()});

function unlockAudio(){audio.unlock();audio.mute(audio.muted);}
function setMode(next){mode=next;document.body.dataset.mode=mode;input.enabled=mode==='playing';if(!input.enabled)input.clear();$('menu').hidden=mode!=='menu';$('editor').hidden=mode!=='editor';$('game-ui').hidden=!['playing','countdown','paused'].includes(mode);$('replay-ui').hidden=mode!=='replay';$('cutting').hidden=mode!=='cutting';$('modal').hidden=mode!=='paused';$('notice').classList.remove('visible');}
function toast(text,kind='normal',duration=1500){$('notice').textContent=text;$('notice').className=`notice visible ${kind==='chaos'?'chaos':''}`;noticeUntil=performance.now()+duration;}
function updateSoundButton(){$('sound').textContent=audio.muted?'♪̸':'♪';$('sound').setAttribute('aria-label',audio.muted?'音を出す':'音を消す');$('sound').setAttribute('aria-pressed',String(!audio.muted));}
$('sound').addEventListener('click',()=>{audio.unlock();audio.mute(!audio.muted);safeWrite('take60.muted',audio.muted);updateSoundButton();});
updateSoundButton();

function buildStagePicker(){
 $('stage-picker').replaceChildren();STAGES.forEach((s,i)=>{const button=document.createElement('button');button.className=`stage-card ${i===selected?'active':''}`;button.setAttribute('aria-pressed',String(i===selected));const number=document.createElement('span');number.className='scene-number';number.textContent=s.number;const info=document.createElement('span');const title=document.createElement('strong');title.textContent=s.name;const subtitle=document.createElement('small');subtitle.textContent=s.english;info.append(title,subtitle);const tick=document.createElement('span');tick.className='selected-mark';tick.textContent='✓';button.append(number,info,tick);button.addEventListener('click',()=>selectStage(i));$('stage-picker').append(button);});
}
function selectStage(i){selected=i;const s=STAGES[i];document.body.dataset.stage=s.id;document.documentElement.style.setProperty('--accent',s.color);$('scene-goal').textContent=s.goal;$('scene-tip').textContent=s.tip;game=new Game(s.id);view.changeAvatar(avatar);view.setWorld(game.definition());buildStagePicker();}
function returnMenu(){if(activeCapture)cancelVideo();setMode('menu');selectStage(selected);$('cast-name').textContent=avatar.name||'ゲスト';$('open-last').hidden=!movie&&!safeRead(MOVIE_KEY,null);audio.mode='';simAccumulator=0;}
$('home').addEventListener('click',()=>{if(mode==='playing'||mode==='countdown')pause();else if(mode!=='paused')returnMenu();});
$('start').addEventListener('click',startGame);
function startGame(){
 unlockAudio();game=new Game(STAGES[selected].id);view.changeAvatar(avatar);view.setWorld(game.definition());recording=[game.snapshot()];recordAccumulator=0;simAccumulator=0;lastNotice=-1;countdown=3;lastCount=-1;
 $('mission').textContent=game.stage.goal;$('game-tip').textContent=game.stage.tip;$('take-label').textContent=`TAKE ${game.stage.number}`;$('action-label').textContent=game.stage.verb;setMode('countdown');updateHUD();
}
function updateHUD(){
 const left=Math.max(0,Math.ceil(RUN_SECONDS-game.time));$('score').textContent=game.score.toLocaleString();$('time-left').textContent=left;$('time-bar').style.width=`${left/60*100}%`;$('time-left').parentElement.classList.toggle('urgent',left<=10);
 $('combo').textContent=game.combo>1?`${game.combo} COMBO!`:'いい画を、撮ろう。';$('score').parentElement.classList.toggle('combo',game.combo>2);
 if(game.stage.id==='delivery')$('mission').textContent=`荷物 ${game.player.carry}/5  → 青いポストへ　｜　お届け ${game.stats.deliveries}個`;
 else if(game.stage.id==='kitchen')$('mission').textContent=`食材のそばでフライパン！　｜　大鍋に ${game.stats.served}個`;
 else $('mission').textContent=`家具を壊して連鎖！　｜　破壊 ${game.stats.broken}個`;
 $('action').classList.toggle('cooling',game.cooldown>.12);
}
function pause(){if(!['playing','countdown'].includes(mode))return;pausedFrom=mode;setMode('paused');$('resume').focus();audio.mode='paused';}
function resume(){if(mode!=='paused')return;unlockAudio();setMode(pausedFrom);simAccumulator=0;lastStamp=performance.now();$('pause').focus();}
$('pause').addEventListener('click',pause);$('resume').addEventListener('click',resume);$('quit').addEventListener('click',returnMenu);
$('modal').addEventListener('keydown',e=>{if(e.key!=='Tab')return;const first=$('resume'),last=$('quit');if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});

function endGame(){
 if(recording[recording.length-1].t<game.time)recording.push(game.snapshot());movie=makeMovie(game,recording,avatar);recording=[];
 const saved=safeWrite(MOVIE_KEY,movie);$('replay-note').textContent=saved?'リプレイはファイルに保存して、このゲームでいつでも再生できます。':'端末への自動保存ができませんでした。「リプレイ保存」で残せます。';setMode('cutting');cuttingTime=0;audio.play('cut');
}
function loadMovie(data){
 movie=validateMovie(data);selected=Math.max(0,STAGES.findIndex(s=>s.id===movie.world.stage));view.changeAvatar(movie.avatar);view.setWorld(movie.world);replayTime=0;replayPlaying=true;lastCut=-1;setMode('replay');unlockAudio();
 $('movie-title').textContent=`${movie.avatar.name||'ゲスト'}の、忘れたい15秒。`;$('movie-score').textContent=`${movie.score.toLocaleString()} PT`;const n=STAGES[selected].thresholds.filter(x=>movie.score>=x).length;$('movie-stars').textContent='★'.repeat(n)+'☆'.repeat(3-n);
 $('clip-timeline').replaceChildren();movie.clips.forEach((c,i)=>{const button=document.createElement('button');button.className='clip-chip';const number=document.createElement('span');number.textContent=`0${i+1}`;button.append(number,document.createTextNode(c.title));button.addEventListener('click',()=>{if(activeCapture)return;replayTime=i*3;replayPlaying=true;lastCut=-1;updateReplayButton();});$('clip-timeline').append(button);});
 $('save-video').disabled=false;$('save-video').hidden=!('MediaRecorder' in window)||!HTMLCanvasElement.prototype.captureStream;updateReplayButton();
}
function updateReplayButton(){$('replay-toggle').textContent=replayPlaying?'Ⅱ':'▶';$('replay-toggle').setAttribute('aria-label',replayPlaying?'一時停止':'再生');}
$('replay-toggle').addEventListener('click',()=>{if(activeCapture)return;unlockAudio();if(replayTime>=15)replayTime=0;replayPlaying=!replayPlaying;updateReplayButton();});
$('replay-progress').addEventListener('input',e=>{if(activeCapture)return;replayTime=Number(e.target.value);lastCut=-1;});
document.querySelectorAll('[data-style]').forEach(b=>b.addEventListener('click',()=>{if(activeCapture)return;replayStyle=b.dataset.style;document.body.dataset.editStyle=replayStyle;document.querySelectorAll('[data-style]').forEach(x=>x.classList.toggle('active',x===b));lastCut=-1;}));
$('shoot-again').addEventListener('click',returnMenu);
$('open-last').addEventListener('click',()=>{try{loadMovie(movie||safeRead(MOVIE_KEY,null));}catch(e){toast(e.message);}});

function setAvatar(key,value){avatar=cleanAvatar({...avatar,[key]:value});view.changeAvatar(avatar);renderEditorControls();}
function swatches(id,colors,key,names){const target=$(id);target.replaceChildren();colors.forEach((color,i)=>{const b=document.createElement('button');b.className=`swatch ${avatar[key]===i?'active':''}`;b.style.backgroundColor=color;b.setAttribute('aria-label',names?.[i]||`${i+1}`);b.setAttribute('aria-pressed',String(avatar[key]===i));b.addEventListener('click',()=>setAvatar(key,i));target.append(b);});}
function choices(id,labels,key){const target=$(id);target.replaceChildren();labels.forEach((label,i)=>{const b=document.createElement('button');b.className=`option-button ${avatar[key]===i?'active':''}`;b.textContent=label;b.setAttribute('aria-pressed',String(avatar[key]===i));b.addEventListener('click',()=>setAvatar(key,i));target.append(b);});}
function renderEditorControls(){
 swatches('skin-options',SKINS,'skin',['ライト','ピーチ','タン','ブラウン','ディープ']);swatches('shirt-options',SHIRTS,'shirt',['コーラル','パープル','ターコイズ','イエロー','ピンク','ブルー','ホワイト']);swatches('hair-color-options',HAIR_COLORS,'hairColor',['黒','茶','金','赤茶','紫','白']);choices('hair-options',['ショート','ボブ','ツンツン','おだんご','ふわふわ'],'hair');choices('eye-options',['まんまる','すっきり','ぱっちり','より目'],'eyes');
 if(document.activeElement!==$('avatar-name'))$('avatar-name').value=avatar.name;$('glasses').checked=avatar.glasses;$('body-size').value=avatar.body;$('head-size').value=avatar.head;
}
$('edit-avatar').addEventListener('click',()=>{unlockAudio();setMode('editor');editorRotation=0;editorFace=0;renderEditorControls();});
$('avatar-name').addEventListener('input',e=>{avatar=cleanAvatar({...avatar,name:e.target.value});});
$('glasses').addEventListener('change',e=>setAvatar('glasses',e.target.checked));$('body-size').addEventListener('input',e=>setAvatar('body',Number(e.target.value)));$('head-size').addEventListener('input',e=>setAvatar('head',Number(e.target.value)));
$('random-avatar').addEventListener('click',()=>{avatar=cleanAvatar({...avatar,skin:Math.floor(Math.random()*5),shirt:Math.floor(Math.random()*7),hair:Math.floor(Math.random()*5),hairColor:Math.floor(Math.random()*6),eyes:Math.floor(Math.random()*4),glasses:Math.random()<.3,head:.9+Math.random()*.25,body:.85+Math.random()*.3});view.changeAvatar(avatar);renderEditorControls();audio.play('pickup');});
$('expression').addEventListener('click',()=>{editorFace=(editorFace+1)%5;});
$('save-avatar').addEventListener('click',()=>{avatar.name=avatar.name.trim()||'ゲスト';safeWrite(AVATAR_KEY,avatar);returnMenu();audio.play('pickup');});
$('stage').addEventListener('pointerdown',e=>{if(mode!=='editor')return;editorDrag={id:e.pointerId,x:e.clientX};try{$('stage').setPointerCapture(e.pointerId);}catch{}});
$('stage').addEventListener('pointermove',e=>{if(!editorDrag||editorDrag.id!==e.pointerId)return;editorRotation+=(e.clientX-editorDrag.x)*.012;editorDrag.x=e.clientX;});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('stage').addEventListener(event,()=>editorDrag=null);

function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),120000);}
function fileName(){return `take60-${movie?.world.stage||'movie'}-${new Date().toISOString().slice(0,10)}`;}
$('save-replay').addEventListener('click',()=>{if(!movie)return;download(new Blob([JSON.stringify(movie)],{type:'application/json'}),`${fileName()}.take60.json`);toast('リプレイを保存しました。', 'normal',1800);});
$('import-menu').addEventListener('click',()=>$('replay-file').click());
$('replay-file').addEventListener('change',async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 if(file.size>5*1024*1024){toast('5MB以下のリプレイファイルを選んでください。');return;}
 try{const data=validateMovie(JSON.parse(await file.text()));safeWrite(MOVIE_KEY,data);loadMovie(data);}catch(error){toast(error instanceof SyntaxError?'リプレイファイルを読み込めませんでした。':error.message);}
});

function captureFrame(c,time){
 const ctx=c.context,w=c.canvas.width,h=c.canvas.height;ctx.fillStyle='#29273c';ctx.fillRect(0,0,w,h);const top=h*.105,bottom=h*.16,space=h-top-bottom,scale=Math.min(w/view.canvas.width,space/view.canvas.height),dw=view.canvas.width*scale,dh=view.canvas.height*scale;ctx.drawImage(view.canvas,(w-dw)/2,top+(space-dh)/2,dw,dh);
 ctx.fillStyle='#dcf568';ctx.textAlign='left';ctx.font=`900 ${Math.round(w*.038)}px sans-serif`;ctx.fillText('TAKE 60',w*.035,h*.068);ctx.fillStyle='#fffaf0';ctx.textAlign='right';ctx.font=`700 ${Math.round(w*.019)}px sans-serif`;ctx.fillText(`${movie.avatar.name} / ${movie.score} PT`,w*.965,h*.064);
 const clip=movie.clips[Math.min(4,Math.floor(time/3))];ctx.textAlign='center';ctx.fillStyle='#fffaf0';ctx.font=`900 ${Math.round(w*.032)}px sans-serif`;ctx.fillText(clip.title,w*.5,h*.908,w*.92);ctx.fillStyle='#dcf568';ctx.font=`700 ${Math.round(w*.015)}px sans-serif`;ctx.fillText('60 SECONDS OF PLAY. 15 SECONDS OF CHAOS.',w*.5,h*.957);
 ctx.fillStyle='#dcf568';ctx.fillRect(0,h-5,w*time/15,5);
}
async function startVideo(){
 if(activeCapture||!movie)return;unlockAudio();
 try{
  const candidates=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];const mime=candidates.find(t=>MediaRecorder.isTypeSupported(t));if(!mime)throw new Error('このブラウザーでは動画保存を利用できません。リプレイ保存をお使いください。');
  const canvas=document.createElement('canvas'),portrait=window.innerWidth<window.innerHeight;canvas.width=portrait?720:1280;canvas.height=portrait?1280:720;const stream=canvas.captureStream(30);if(audio.capture)for(const track of audio.capture.stream.getAudioTracks())stream.addTrack(track.clone());
  const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5000000}),chunks=[];
  activeCapture={canvas,context:canvas.getContext('2d'),stream,recorder,chunks,start:performance.now(),cancelled:false};const c=activeCapture;
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  recorder.onstop=()=>{for(const t of stream.getTracks())t.stop();document.body.classList.remove('recording');$('recording-status').hidden=true;$('save-video').disabled=false;activeCapture=null;if(!c.cancelled&&chunks.length){download(new Blob(chunks,{type:recorder.mimeType}),`${fileName()}.${recorder.mimeType.includes('mp4')?'mp4':'webm'}`);toast('15秒のムービーを書き出しました。','normal',2200);}};
  recorder.onerror=()=>{c.cancelled=true;cancelVideo();toast('動画保存が中断されました。リプレイ保存も利用できます。', 'normal',2500);};
  replayTime=0;lastCut=-1;replayPlaying=true;updateReplayButton();audio.mode='';document.body.classList.add('recording');$('recording-status').hidden=false;$('save-video').disabled=true;recorder.start(250);
 }catch(error){if(activeCapture){activeCapture.cancelled=true;for(const t of activeCapture.stream.getTracks())t.stop();activeCapture=null;}document.body.classList.remove('recording');$('recording-status').hidden=true;$('save-video').disabled=false;toast(error.message,'normal',3500);}
}
function cancelVideo(){if(!activeCapture)return;activeCapture.cancelled=true;if(activeCapture.recorder.state!=='inactive')activeCapture.recorder.stop();else{for(const t of activeCapture.stream.getTracks())t.stop();activeCapture=null;document.body.classList.remove('recording');$('recording-status').hidden=true;}replayPlaying=false;updateReplayButton();}
$('save-video').addEventListener('click',startVideo);$('cancel-video').addEventListener('click',()=>{cancelVideo();toast('動画作成をキャンセルしました。');});

document.addEventListener('visibilitychange',()=>{if(document.hidden){if(mode==='playing'||mode==='countdown')pause();if(mode==='replay'){replayPlaying=false;updateReplayButton();}if(activeCapture)cancelVideo();input.clear();audio.ctx?.suspend().catch(()=>{});}else{lastStamp=performance.now();simAccumulator=0;}});
window.addEventListener('resize',()=>{view.resize();input.clear();editorDrag=null;});
window.addEventListener('pagehide',()=>{if(activeCapture)cancelVideo();input.clear();});
for(const event of ['gesturestart','gesturechange','gestureend'])document.addEventListener(event,e=>{if(['playing','countdown'].includes(mode))e.preventDefault();},{passive:false});
$('stage').addEventListener('webglcontextlost',e=>{e.preventDefault();if(mode==='playing'||mode==='countdown')pause();$('fatal').hidden=false;});

function loop(now){
 requestAnimationFrame(loop);const elapsed=Math.max(0,(now-lastStamp)/1000),dt=Math.min(.1,elapsed);lastStamp=now;if(document.hidden)return;
 if(noticeUntil&&now>noticeUntil){$('notice').classList.remove('visible');noticeUntil=0;}
 const realTime=now/1000;
 if(mode==='menu'||mode==='editor'){
  const f=game.snapshot();if(mode==='menu'){f.p=[1.2,0,2.1,-.2+Math.sin(realTime*.65)*.13,0,0,0,0,Math.floor(realTime/3)%5,0,game.stage.id==='delivery'?2:0,1];f.h.forEach((h,i)=>{h[0]=Math.sin(realTime*.45+i*3)*7;});}
  view.render(f,realTime,mode,{rotation:editorRotation,face:editorFace});
 }else if(mode==='countdown'){
  countdown-=dt;const n=Math.ceil(countdown);if(n!==lastCount){lastCount=n;$('countdown').replaceChildren(document.createTextNode(n>0?String(n):'GO!'));const label=document.createElement('small');label.textContent=game.stage.name;$('countdown').append(label);audio.play(n>0?'count':'fanfare');}
  view.render(game.snapshot(),realTime,'playing');if(countdown<-.45){$('countdown').textContent='';setMode('playing');}
 }else if(mode==='playing'){
  simAccumulator+=Math.min(elapsed,.2);let steps=0;
  while(simAccumulator>=1/60&&steps<12&&!game.finished){const axes=input.axes();if(input.holdingAction)game.action(axes.x,axes.z);game.step(1/60,axes);simAccumulator-=1/60;recordAccumulator+=1/60;if(recordAccumulator>=1/20-.00001){recording.push(game.snapshot());recordAccumulator-=1/20;}steps++;}
  for(const sound of game.sounds.splice(0))audio.play(sound);
  const latest=game.notices.at(-1);if(latest&&latest.time!==lastNotice){lastNotice=latest.time;toast(latest.text,latest.kind,latest.kind==='chaos'?1300:900);}
  updateHUD();view.render(game.snapshot(),game.time,'playing');if(game.finished)endGame();
 }else if(mode==='paused'){
  view.render(game.snapshot(),game.time,'playing');
 }else if(mode==='cutting'){
  cuttingTime+=dt;if(cuttingTime>1.1)loadMovie(movie);
 }else if(mode==='replay'&&movie){
  if(activeCapture)replayTime=clamp((now-activeCapture.start)/1000,0,15);else if(replayPlaying)replayTime=Math.min(15,replayTime+dt);
  const cut=Math.min(4,Math.floor(replayTime/3)),clip=movie.clips[cut],local=replayTime-cut*3;
  if(cut!==lastCut){lastCut=cut;$('movie-caption').textContent=clip.title;$('cut-tag').textContent=`SCENE 0${cut+1} / 05`;$('clip-timeline').querySelectorAll('button').forEach((b,i)=>b.classList.toggle('active',i===cut));if(replayPlaying)audio.play('cut');}
  const frame=frameAt(movie.frames,replayTime);view.render(frame,replayTime,'replay',{clip,local,style:replayStyle,cut});$('freeze-tag').hidden=local<2.55;$('replay-progress').value=replayTime;$('replay-time').textContent=`0:${String(Math.floor(replayTime)).padStart(2,'0')} / 0:15`;
  if(activeCapture){captureFrame(activeCapture,replayTime);$('recording-status').querySelector('span').textContent=`動画を作成中 ${Math.floor(replayTime)} / 15秒`;if(replayTime>=15&&activeCapture.recorder.state==='recording')activeCapture.recorder.stop();}
  if(replayTime>=15&&replayPlaying){replayPlaying=false;updateReplayButton();}
 }
 audio.tick(mode==='replay'&&!replayPlaying?'paused':mode);
}
returnMenu();requestAnimationFrame(loop);
