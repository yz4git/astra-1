export const VERSION = '1.0.0';
export const RUN_SECONDS = 60;
export const MOVIE_SECONDS = 15;
export const RECORD_HZ = 20;
export const STAGES = [
  { id:'delivery', number:'01', name:'爆走デリバリー', english:'SPECIAL DELIVERY', verb:'ダッシュ', color:'#ff6348', sky:'#bee8e8', floor:'#f5d28a', goal:'荷物を拾って、青い配達ポストへ。', tip:'まとめて届けると高得点。バナナと暴走カートに注意！', target:[0,-6], thresholds:[900,2200,3800] },
  { id:'kitchen', number:'02', name:'キッチン・パニック', english:'KITCHEN NIGHTMARE', verb:'フライパン', color:'#ad81f6', sky:'#d8d0ed', floor:'#b4dfc6', goal:'食材をフライパンで弾いて、大鍋へ。', tip:'食材に近づいてアクション。巨大トマトはジャンプで回避！', target:[0,-6], thresholds:[800,2000,3400] },
  { id:'office', number:'03', name:'オフィス・ブレイク', english:'OUT OF OFFICE', verb:'どっかーん', color:'#5ebdcc', sky:'#c1d8ef', floor:'#b9bee9', goal:'アクションで家具を壊して、連鎖をつなげよう。', tip:'ジャンプ中のアクションは急降下。赤いコピー機は大爆発！', target:[0,-6], thresholds:[1200,3000,5000] },
];
export const SKINS=['#ffcfac','#edb68a','#c9875c','#8d563d','#593827'];
export const SHIRTS=['#ff5e47','#8664e7','#42adb6','#efb82f','#eb79a0','#3969ae','#f5eee0'];
export const HAIR_COLORS=['#37261f','#8e5132','#e6b951','#a84729','#594ab1','#e4e4e8'];
export const DEFAULT_AVATAR={name:'モモ',skin:0,shirt:0,hair:0,hairColor:0,eyes:0,glasses:false,body:1,head:1};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export function rng(seed){let n=seed>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function cleanAvatar(a={}){return {name:typeof a.name==='string'?a.name.slice(0,16):'モモ',skin:clamp(Math.round(Number(a.skin)||0),0,4),shirt:clamp(Math.round(Number(a.shirt)||0),0,6),hair:clamp(Math.round(Number(a.hair)||0),0,4),hairColor:clamp(Math.round(Number(a.hairColor)||0),0,5),eyes:clamp(Math.round(Number(a.eyes)||0),0,3),glasses:!!a.glasses,body:clamp(Number(a.body)||1,.8,1.2),head:clamp(Number(a.head)||1,.85,1.2)};}
