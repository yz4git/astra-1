import './runtime-tune.js';

import('./main.js').catch(error=>{
 console.error('TAKE 60 boot failed',error);
 const fatal=document.getElementById('fatal');
 if(fatal){
  fatal.hidden=false;
  const message=fatal.querySelector('p');
  if(message)message.textContent='ゲームの初期化に失敗しました。タブを閉じずに、もう一度開くを押してください。';
 }
});
