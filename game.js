/*
  잔월의 서약 (THE LAST BELL)
  Original miniature pixel-fantasy action RPG. Zero dependencies, readable source.
  Touch: tap or hold anywhere to move; tap creatures / landmarks to approach.
  Combat: automatic sword attacks. One optional skill button.
*/
(()=>{'use strict';
const $ = id=>document.getElementById(id);
const canvas=$('game'), ctx=canvas.getContext('2d',{alpha:false});
ctx.imageSmoothingEnabled=false;
let W=480,H=270;const WW=5380,WH=880,TWO=Math.PI*2;
function resizeCanvas(){const ratio=innerWidth/Math.max(1,innerHeight);if(ratio<1){W=440;H=Math.min(768,Math.max(330,Math.round(W/ratio)))}else{W=480;H=Math.max(270,Math.min(490,Math.round(W/ratio)))}canvas.width=W;canvas.height=H;ctx.imageSmoothingEnabled=false;}
resizeCanvas();window.addEventListener('resize',()=>{resizeCanvas();if(active)drawGame()});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const rnd=(x,y,s=0)=>{let h=(Math.imul(x+Math.imul(y,17)+s,1597334677)^0x9e3779b9)|0; h^=h>>>15;h=Math.imul(h,2246822519);h^=h>>>13;return (h>>>0)/4294967295};
const rand=(min,max)=>min+Math.random()*(max-min);
let frameDelta=.016;let paused=true, active=false, scene='menu', gameTime=0, last=0, cam={x:0,y:0},timeToSave=0;
let entities=[],decor=[],colliders=[],particles=[],flecks=[],floatText=[],shines=[],shots=[];
let autoGoal=null, followTarget=null, destination=null, waypointPath=[], pointerDown=false,pointer={x:0,y:0};
let toastT=0,phaseBanner='',phaseT=0,questStage=0,fragmentFlags=[false,false,false], loreGift=false, bossGone=false, audioOn=true;
let railIndex=0,railPhase='idle',railGoal=null,railClearTimer=0,railTravelTimer=0,railLastDistance=Infinity,railStuck=0,pendingLevels=0;
let prologueTime=0,prologueActive=false;
// The Silver Interval: choose your footing, read the enemy's warning, evade and counter.
let combatCenter={x:0,y:0}, dodgeCooldown=0,dodgeTime=0,dodgeDirection={x:1,y:0};
let resonance=0,combatTipShown=false;
const thumb={active:false,pointer:null,x:0,y:0};
const DODGE_COOLDOWN=2.8;
function setCombatUI(){document.body.classList.toggle('combat-active',scene==='play'&&railPhase==='battle');}
function getMoveVector(){return {x:thumb.x,y:thumb.y};}
function clearThumb(){thumb.active=false;thumb.pointer=null;thumb.x=thumb.y=0;const nub=$('stickNub');if(nub)nub.style.transform='translate(-50%,-50%)';}
function giveResonance(label){if(railPhase!=='battle')return;resonance=Math.min(3,resonance+1);makeParticles(hero.x,hero.y-20,14,['#b9edff','#e8e6af','#b7bfff'],1.1);floating(hero.x,hero.y-41,label||'✧ 달빛 공명 +1','#d3efff',1);}
function dodge(){if(scene!=='play'||railPhase!=='battle'||dodgeCooldown>0||dodgeTime>0)return false;
 let dx=thumb.x,dy=thumb.y;
 if(Math.hypot(dx,dy)<.15){dx=(keys.right?1:0)-(keys.left?1:0);dy=(keys.down?1:0)-(keys.up?1:0)}
 if(Math.hypot(dx,dy)<.15){const near=entities.filter(e=>!e.dead).sort((a,b)=>dist(a,hero)-dist(b,hero))[0];if(near){dx=hero.x-near.x;dy=hero.y-near.y}else dx=hero.face;}
 const d=Math.hypot(dx,dy)||1;dodgeDirection={x:dx/d,y:dy/d};dodgeTime=.32;dodgeCooldown=DODGE_COOLDOWN;hero.inv=Math.max(hero.inv,.40);
 const danger=entities.some(e=>!e.dead&&e.windup>0&&dist(e,hero)<e.range+70)||shots.some(b=>dist(b,hero)<65);
 if(danger){giveResonance('✧ 완벽한 달걸음');hero.mp=clamp(hero.mp+12,0,hero.maxMp)}
 pulse(hero.x,hero.y-8,42,'#a9e5f6');makeParticles(hero.x,hero.y-8,18,['#d9f0fc','#e2d8ae','#b4c6eb'],1.3);
 sfx('dodge');return true;
}

const OPENING_LINES=['한때 이 땅에는 모든 저녁을 밝히는 종이 있었습니다.', '달이 부서진 날, 종소리가 멎고 숲에는 밤이 머물렀습니다.', '먼 곳에서는 아직 이름을 잃은 종이 당신을 기다립니다.'];
function openingUpdate(dt){if(!prologueActive)return;prologueTime+=dt;const index=Math.min(OPENING_LINES.length-1,Math.floor(prologueTime/3.6));const node=$('openingNarration');if(node){node.textContent='서막 · '+OPENING_LINES[index];node.classList.remove('hidden')}if(prologueTime>11){prologueActive=false;node?.classList.add('hidden')}}
const RAIL_LABELS=['종지기의 부름','안개숲의 첫 시련','속삭임의 제단','숲을 지키는 그림자','오래된 병사의 비석','폐허의 망령들','푸른 달의 유적','마을로 돌아온 빛','성당 앞의 맹세','달의 기사','새벽을 부르는 종'];
const RAIL_STOPS=[{x:394,y:466},{x:833,y:487},{x:1055,y:335},{x:1360,y:469},{x:1582,y:585},{x:1748,y:467},{x:1842,y:341},{x:400,y:466},{x:2094,y:469},{x:2235,y:460},{x:400,y:466}];
const CHRONICLE=Array.isArray(window.LAST_BELL_CHRONICLE)?window.LAST_BELL_CHRONICLE:[];
const INTRO_STOPS=RAIL_STOPS.length;
for(const beat of CHRONICLE){RAIL_LABELS.push(beat.title);RAIL_STOPS.push({x:beat.x,y:beat.y});}
const SKEY='last-bell-save-v3';
const hero={x:250,y:460,face:1,hp:120,maxHp:120,mp:100,maxMp:100,gold:12,level:1,xp:0,damage:15,swordLevel:0,armorLevel:0,blessings:{blade:0,heart:0,moon:0},atkT:0,atkSwing:0,atkCombo:0,skillT:0,inv:0,lastHurt:0,walk:0,shadow:0,speed:131,vx:0,vy:0,moving:0,step:0,attuned:0,selectedSpell:0,oaths:[]};
const npcPositions=[{id:'edda',x:422,y:465,name:'에다',title:'마지막 종지기',color:'#ccb198'}, {id:'bram',x:361,y:640,name:'브람',title:'방랑 대장장이',color:'#d1a175'},{id:'lune',x:585,y:320,name:'루네',title:'길 잃은 여행자',color:'#aabbe2'}];
const chests=[{id:0,x:1090,y:328,label:'속삭임 숲의 제단'},{id:1,x:1580,y:628,label:'잊힌 병사의 비석'},{id:2,x:1880,y:334,label:'푸른 달의 유적'}];
const regionName=x=>x<730?'잿빛 마을, 엘든':x<1460?'속삭임 숲':x<1970?'잊힌 왕국의 폐허':x<2520?'달이 잠든 성당':x<3400?'물비늘 해안':x<4120?'하얀 회랑':x<4910?'가면의 왕국':'달의 안쪽';
const questData=[
 ['그믐의 속삭임','마을 동쪽, 종지기 에다를 만나세요.'],
 ['조각난 달의 노래','월광의 조각 3개를 되찾으세요.'],
 ['세 개의 희미한 빛','종지기 에다에게 조각을 가져가세요.'],
 ['마지막 종을 위하여','동쪽 성당의 타락한 기사를 쓰러뜨리세요.'],
 ['새벽을 품은 사람','엘든으로 돌아가 에다에게 소식을 전하세요.'],
 ['새벽을 부르는 종','엘든은 다시 새벽을 맞이했습니다.']
];
const UI={hpFill:$('hpFill'),hpValue:$('hpValue'),mpFill:$('mpFill'),mpValue:$('mpValue'),questTitle:$('questTitle'),questDetail:$('questDetail'),money:$('money'),place:$('placeName'),tip:$('tip'),cooldown:$('skillCooldown'),skill:$('skillButton'),menu:$('menu'),dialog:$('dialog'),panel:$('panelModal')};
const terrain=document.createElement('canvas'); terrain.width=WW;terrain.height=WH; const g=terrain.getContext('2d');g.imageSmoothingEnabled=false;
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.floor(x),Math.floor(y),Math.ceil(w),Math.ceil(h));}
function disk(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(Math.round(x),Math.round(y),Math.round(r),0,TWO);c.fill()}
function line(c,x1,y1,x2,y2,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}
function polygon(c,pts,color){c.fillStyle=color;c.beginPath();c.moveTo(...pts[0]);pts.slice(1).forEach(p=>c.lineTo(...p));c.closePath();c.fill()}
function addCollider(x,y,r){colliders.push({x,y,r})}
function roadY(x){return x<1950?465+48*Math.sin((x-100)/370):465}
function paintTree(c,x,y,scale=1,variant=0){
 const d=(a,b,cw,ch,col)=>rect(c,x+a*scale,y+b*scale,cw*scale,ch*scale,col);
 disk(c,x+3*scale,y+17*scale,14*scale,'#071c22');
 d(-3,3,7,18,variant?'#382d36':'#302d33');d(0,7,3,12,'#56433d');
 const layers=[{yy:-10,ww:18,h:15},{yy:-21,ww:14,h:16},{yy:-31,ww:10,h:15}];
 const color=variant?['#263a48','#345462','#466576']:['#203b42','#2b5355','#3b6262'];
 layers.forEach((v,i)=>{polygon(c,[[x-v.ww*scale,y+(v.yy+v.h)*scale],[x,y+(v.yy-6)*scale],[x+v.ww*scale,y+(v.yy+v.h)*scale]],'#132b36');polygon(c,[[x-(v.ww-2)*scale,y+(v.yy+v.h-3)*scale],[x,y+(v.yy-9)*scale],[x+(v.ww-2)*scale,y+(v.yy+v.h-3)*scale]],color[i]);d(-2,v.yy+3,4,2,'#648486')});
 d(-5,-12,3,2,'#71938f');
}
function house(c,x,y,w=120,h=94,kind=0){
 rect(c,x+4,y+34,w-8,h-30,'#18252b');rect(c,x+7,y+34,w-14,h-36,kind?'#667078':'#857362');
 for(let j=0;j<7;j++) rect(c,x+12,y+42+j*7,w-26,1,'#655c57');
 rect(c,x+9,y+h-15,w-17,11,'#41464b');
 polygon(c,[[x-12,y+39],[x+w/2,y-21],[x+w+12,y+39]],'#1d303d');
 polygon(c,[[x-11,y+32],[x+w/2,y-26],[x+w+11,y+32]],kind?'#51616d':'#4d4651');
 polygon(c,[[x-1,y+27],[x+w/2,y-19],[x+w+1,y+27]],kind?'#65727e':'#645465');
 for(let j=0;j<8;j++) line(c,x+6+j*(w-12)/7,y+20-j*2,x+11+j*(w-12)/7,y+20-j*2,'#8b7880',1);
 rect(c,x+w/2-11,y+h-34,22,34,'#292831');rect(c,x+w/2-8,y+h-31,16,31,'#55453c');rect(c,x+w/2+5,y+h-14,2,2,'#e7c58d');
 for(const k of [-1,1]){const xx=x+w/2+k*(w/2-23)-8; rect(c,xx,y+48,20,23,'#3d3336');rect(c,xx+3,y+51,14,16,'#d6a56d');rect(c,xx+6,y+51,2,16,'#72513e');rect(c,xx+3,y+58,14,2,'#72513e')}
 rect(c,x-3,y+37,5,h-34,'#403a41');rect(c,x+w-2,y+37,5,h-34,'#403a41');
}
function brokenColumn(c,x,y,cap=true){rect(c,x-9,y+9,20,5,'#25313b');rect(c,x-7,y-25,16,34,'#52565d');rect(c,x-5,y-24,3,30,'#78767b');rect(c,x+7,y-22,3,25,'#343b48');if(cap){rect(c,x-11,y-29,24,5,'#71757c');rect(c,x-10,y-31,22,2,'#9b958e')}rect(c,x-10,y+10,24,4,'#7e7776')}
function shrine(c,x,y,n){disk(c,x,y+11,32,'#1d313c');rect(c,x-30,y-1,60,15,'#545968');rect(c,x-26,y-5,52,5,'#8a8a85');rect(c,x-18,y-17,36,12,'#4f5f6d');rect(c,x-13,y-22,26,6,'#77818d');rect(c,x-5,y-29,10,8,'#a4b7bb');disk(c,x,y-32,4,n===1?'#9faec2':'#b5d4dc');line(c,x-31,y+12,x+31,y+12,'#aaa191',1)}
function pixelFlower(c,x,y,kind=0){rect(c,x,y,2,5,'#465e4d');rect(c,x-2,y-2,3,3,kind?'#b99ac8':'#e6d5a0');rect(c,x+1,y-3,2,3,'#c5e2d4')}
function generateTerrain(){
 // 16px pixel tiles, subtly shifting palettes between chapters.
 for(let y=0;y<WH;y+=16)for(let x=0;x<WW;x+=16){const zone=x<730?0:x<1460?1:x<1970?2:x<2520?3:x<3400?4:x<4120?5:x<4910?6:7;const palettes=[['#334e4d','#365552','#3b5753','#3e5551'],['#234348','#24494b','#2a4d50','#304b4b'],['#35424c','#3b464f','#3e4d57','#394954'],['#303b49','#343c4d','#3a4051','#3d4552'],['#344a54','#3d5360','#394f5d','#465969'],['#66717d','#737b86','#87909a','#7b8692'],['#4c414d','#5a4553','#584957','#665262'],['#303e56','#354962','#45516a','#354b5d']][zone];rect(g,x,y,16,16,palettes[Math.floor(rnd(x,y,39)*4)]);if(rnd(x,y,12)>.34){rect(g,x+Math.floor(rnd(x,y,13)*12),y+Math.floor(rnd(x,y,15)*12),2,2,'#5e6b6270')}}
 // old dirt paths
 for(let x=0;x<WW;x+=7){const cy=roadY(x);for(let dy=-34;dy<=34;dy+=7){const ww=Math.abs(dy)>24?12:17;rect(g,x,cy+dy,7,7,((Math.abs(dy)>24)?'#5f646070':(rnd(x,dy,2)>.55?'#887b67':'#736b61')));if(rnd(x,dy,8)>.91)rect(g,x,cy+dy+2,3,2,'#a4957b')}}
 for(let x=0;x<730;x+=56){const yy=roadY(x);rect(g,x,yy-40,25,2,'#99917c55');rect(g,x+15,yy+35,15,1,'#93816b55')}
 // river and a physical bridge
 rect(g,694,0,100,WH,'#173d53');for(let y=0;y<WH;y+=12){rect(g,698+Math.sin(y/35)*5,y,94,5,y%24?'#20506a':'#265670');rect(g,701+Math.sin(y/39)*4,y+2,85,1,'#6a9aab55');rect(g,715,y+5,2,1,'#8fc1bf')}
 rect(g,684,430,123,126,'#34373d');rect(g,691,435,110,118,'#806e60');for(let y=435;y<555;y+=8){rect(g,689,y+5,114,2,'#4a4847');rect(g,689,y,114,1,'#b5a18a')}for(let x of [690,800]){rect(g,x,420,6,143,'#a58a6c');for(let y=430;y<=556;y+=29)rect(g,x-2,y,10,8,'#534d48')}
 // stitched village buildings and fences
 house(g,88,303,128,99);house(g,386,300,143,106,1);house(g,126,617,115,98);house(g,443,646,123,92);
 [[88,303,128,99],[386,300,143,106],[126,617,115,98],[443,646,123,92]].forEach(([x,y,w,h])=>colliders.push({x:x+w/2,y:y+h-17,r:Math.min(w,h)*.46}));
 for(let x=56;x<670;x+=12){if(x>275&&x<415)continue;rect(g,x,140,2,19,'#a28b6e');rect(g,x,150,13,3,'#8a7762')}
 // village well, market sign, lanterns and flower beds
 disk(g,292,355,30,'#283c43');disk(g,292,350,24,'#84837a');disk(g,292,350,18,'#344751');disk(g,292,350,14,'#132e3b');rect(g,272,322,40,5,'#7e6c61');rect(g,276,308,4,17,'#897568');rect(g,306,308,4,17,'#897568');polygon(g,[[269,310],[292,292],[315,310]],'#6e5d5b');addCollider(292,352,24);
 rect(g,599,484,5,35,'#795b49');rect(g,584,485,30,6,'#a18b68');rect(g,587,475,24,11,'#706b5e');rect(g,599,520,19,4,'#594b47');
 for(let i=0;i<80;i++){const x=25+rnd(i,80,1)*650,y=45+rnd(i,80,2)*755;if(Math.abs(y-roadY(x))<45)continue;if(rnd(i,44)>.5)pixelFlower(g,x,y,rnd(i,45)>.6)}
 // ancient wood, open quest lanes and placeable trees
 for(let x=814;x<1450;x+=39)for(let y=48;y<840;y+=43){const dx=(rnd(x,y,22)-.5)*32,dy=(rnd(x,y,45)-.5)*26,tx=x+dx,ty=y+dy; if(Math.abs(ty-roadY(tx))<85||Math.hypot(tx-1090,ty-328)<80||rnd(x,y,8)<.18)continue; const sc=.85+rnd(x,y,6)*.42; paintTree(g,tx,ty,sc,rnd(x,y,10)>.77?1:0);addCollider(tx,ty+11,11*sc)}
 for(let x=760;x<1445;x+=19)for(let y=32;y<850;y+=27){if(rnd(x,y,30)>.88 &&Math.abs(y-roadY(x))>40)pixelFlower(g,x+rnd(x,y,2)*9,y+rnd(x,y,3)*9,1)}
 // abandoned kingdom: cracked blue paving and solemn monuments
 for(let x=1470;x<1980;x+=43)for(let y=45;y<850;y+=40){if(rnd(x,y,21)>.28){rect(g,x,y,38,29,'#555a6380');rect(g,x+1,y+1,32,2,'#868a8866');rect(g,x+rand(0,18),y+13,14,1,'#3a4247')}}
 for(const [x,y] of [[1532,258],[1772,205],[1800,671],[1680,750],[1932,688]]){brokenColumn(g,x,y);addCollider(x,y,12)}
 for(const [x,y] of [[1495,174],[1660,217],[1723,706],[1896,710],[1943,181]]){rect(g,x-13,y-18,26,33,'#343d44');rect(g,x-9,y-22,18,24,'#71747a');rect(g,x-3,y-17,2,10,'#9b9c9d');addCollider(x,y,10)}
 // cathedral: broken archways, black marble floors, altar and open central avenue
 rect(g,2010,215,486,500,'#27313d');for(let x=2020;x<2490;x+=30)for(let y=227;y<707;y+=28){rect(g,x,y,28,26,rnd(x,y,6)>.55?'#414953':'#3a4650');rect(g,x+1,y+1,26,1,'#5c637073');if(rnd(x,y,17)>.83)rect(g,x+10,y+8,12,1,'#1e2936')}
 for(let x=2010;x<=2490;x+=46){if(x>2070&&x<2130)continue;rect(g,x,217,28,25,'#69707a');rect(g,x,692,28,25,'#69707a')}
 for(let y=242;y<690;y+=40){if(y>402&&y<534)continue;rect(g,2006,y,23,22,'#757a81')}
 for(const [x,y] of [[2138,286],[2297,276],[2431,286],[2138,646],[2297,657],[2431,646]]){brokenColumn(g,x,y);addCollider(x,y,14)}
 disk(g,2291,473,90,'#3c4551');disk(g,2291,473,78,'#313f4c');disk(g,2291,473,61,'#3d4858');for(let a=0;a<12;a++){const t=a*TWO/12;disk(g,2291+Math.cos(t)*68,473+Math.sin(t)*68,4,'#8298a28a')}
 disk(g,2291,473,34,'#344d5c');rect(g,2275,462,33,17,'#698398');rect(g,2280,467,24,8,'#374956');
 // New chapters: salt-silver shore, white cloister, masked capital, inner moon.
 for(let x=2540;x<3400;x+=55){
   const y=175+rnd(x,55)*510;if(Math.abs(y-roadY(x))<85)continue;
   const hue=rnd(x,27)>.5?'#8da3ab':'#748b9a';
   for(let a=-18;a<=18;a+=5)rect(g,x+a,y+15-Math.cos(a/21)*5,7,2,'#a6b9ba55');
   disk(g,x,y,9+rnd(x,6)*8,'#496c7855');rect(g,x-12,y+13,25,3,hue);
   if(x%3===0)pixelFlower(g,x+23,y-10,1);
 }
 for(let x=3440;x<4130;x+=83)for(let y=115;y<790;y+=112){
  if(Math.abs(y-roadY(x))<78)continue;
  rect(g,x-14,y-37,27,42,'#8b94a1');rect(g,x-10,y-41,19,5,'#d0d5d9');rect(g,x-20,y-45,39,6,'#c5cbd2');
  rect(g,x-5,y-31,9,18,'#4a596d');rect(g,x-2,y-29,3,14,'#c9dbef');
  for(let q=0;q<3;q++)rect(g,x+12+q*5,y+13+q*4,5,2,'#ebf0f3');
 }
 for(let x=4170;x<4900;x+=190){
   const y=130+rnd(x,9)*170;if(Math.abs(y-roadY(x))<75){continue}
   house(g,x,y,118,95,1);rect(g,x+9,y+47,8,12,'#d2b786');rect(g,x+87,y+47,8,12,'#d2b786');
 }
 for(let x=4930;x<5350;x+=52)for(let y=85;y<770;y+=65){
  if(Math.abs(y-roadY(x))<85)continue;
  disk(g,x+4,y+9,16,'#b4c7ed22');rect(g,x-11,y-18,24,29,'#5c6e8e88');rect(g,x-9,y-19,19,3,'#b5bfda');
  rect(g,x-2,y-29,4,9,'#d6e6fa');
 }
 // Hand-painted small details: firefly islands, silver puddles, moss, runic stones.
 for(let i=0;i<460;i++){
   const x=19+rnd(i,127,31)*(WW-40),y=18+rnd(i,71,29)*(WH-40);
   if(Math.abs(y-roadY(x))<38)continue;
   const z=x<730?0:x<1450?1:x<1980?2:3;
   if(z===0){rect(g,x,y,3,1,'#bca67a');rect(g,x+4,y-2,1,2,'#87a79b');if(i%7===0)pixelFlower(g,x+7,y+2,1)}
   else if(z===1){const shade=['#496963','#80a6a0','#536c6b'][i%3];rect(g,x,y,5,1,shade);rect(g,x+3,y-3,2,1,'#a1b4a1');if(i%11===0){disk(g,x,y,6,'#567e7850');rect(g,x-2,y-2,2,2,'#b8dfce')}}
   else if(z===2){rect(g,x,y,7,2,'#82919a66');rect(g,x-2,y+2,5,1,'#233b4e');if(i%9===0){disk(g,x,y,3,'#9fb5c06a');rect(g,x,y,1,1,'#d6e2dd')}}
   else {rect(g,x,y,8,1,'#7a859577');if(i%13===0){rect(g,x-3,y-3,9,7,'#8497ac35');rect(g,x,y,2,2,'#c6c7c1')}}
 }
 // Carved gold inlay and ruined arc motifs near sanctuaries.
 for(const [cx,cy] of [[1090,328],[1580,628],[1880,334]]){
   for(let a=0;a<12;a++){const theta=a*TWO/12;const px=cx+Math.cos(theta)*43,py=cy+Math.sin(theta)*29;rect(g,px,py,3,2,'#c6ae8a');if(a%3===0)rect(g,px+4,py-3,2,2,'#99c7d7')}
   for(let j=-2;j<=2;j++){rect(g,cx+j*11-3,cy+22+Math.abs(j)*2,8,2,'#9a94a0')}
 }
 // Shrines and golden runic light gather at sacred places.
 chests.forEach((p,i)=>shrine(g,p.x,p.y,i));
 for(let i=0;i<145;i++){let x=rnd(i,7)*WW,y=rnd(i,8)*WH;if(x<750||Math.abs(y-roadY(x))<60)continue;const col=x>1950?'#637a8a':x>1460?'#99a4a2':'#42696b';if(rnd(i,11)>.63){rect(g,x,y,4,1,col);rect(g,x+7,y-3,2,2,col)}}
}
function isBlocked(x,y){if(x<14||x>WW-15||y<18||y>WH-21)return true; if(x>690&&x<799&&(y<428||y>554))return true;for(const c of colliders)if(Math.hypot(x-c.x,y-c.y)<c.r+7)return true;return false}
const STEP=24,GNX=Math.ceil(WW/STEP),GNY=Math.ceil(WH/STEP);
const gridWalk=new Uint8Array(GNX*GNY);
function makeGrid(){for(let y=0;y<GNY;y++)for(let x=0;x<GNX;x++){gridWalk[y*GNX+x]=isBlocked(x*STEP+STEP/2,y*STEP+STEP/2)?0:1}}
function nearWalk(cx,cy){cx=clamp(cx,0,GNX-1);cy=clamp(cy,0,GNY-1);if(gridWalk[cy*GNX+cx])return {x:cx,y:cy};for(let r=1;r<12;r++)for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++){let x=cx+dx,y=cy+dy;if(x>=0&&y>=0&&x<GNX&&y<GNY&&gridWalk[y*GNX+x])return{x,y}}return {x:cx,y:cy}}
function pathTo(goal){const src=nearWalk(Math.floor(hero.x/STEP),Math.floor(hero.y/STEP)),dst=nearWalk(Math.floor(goal.x/STEP),Math.floor(goal.y/STEP));const start=src.y*GNX+src.x,end=dst.y*GNX+dst.x;if(start===end)return[goal];
 const prev=new Int32Array(GNX*GNY).fill(-1), costs=new Float32Array(GNX*GNY).fill(Infinity), open=[start],seen=new Uint8Array(GNX*GNY),dxs=[1,0,-1,0,1,-1,1,-1],dys=[0,1,0,-1,1,1,-1,-1];costs[start]=0;
 let it=0;while(open.length&&it++<14000){let best=0,bestScore=Infinity;for(let i=0;i<open.length;i++){const id=open[i],x=id%GNX,y=Math.floor(id/GNX),score=costs[id]+Math.hypot(x-dst.x,y-dst.y);if(score<bestScore){best=i;bestScore=score}}const cur=open.splice(best,1)[0];if(cur===end)break;seen[cur]=1;const x=cur%GNX,y=Math.floor(cur/GNX);for(let k=0;k<8;k++){let xx=x+dxs[k],yy=y+dys[k];if(xx<0||yy<0||xx>=GNX||yy>=GNY)continue;const ni=yy*GNX+xx;if(!gridWalk[ni]||seen[ni])continue;if(k>=4&&(!gridWalk[y*GNX+xx]||!gridWalk[yy*GNX+x]))continue;const newCost=costs[cur]+(k>=4?1.414:1);if(newCost<costs[ni]){prev[ni]=cur;costs[ni]=newCost;if(!open.includes(ni))open.push(ni)}}}
 if(prev[end]===-1)return[goal];let nodes=[],cur=end,count=0;while(cur!==start&&count++<800){nodes.push({x:(cur%GNX)*STEP+STEP/2,y:Math.floor(cur/GNX)*STEP+STEP/2});cur=prev[cur];if(cur<0)break}nodes.reverse();nodes.push(goal);
 // thin path: retaining only visible corners reduces the twitching of movement
 const simplified=[];for(let i=0;i<nodes.length;i++){const a=nodes[i-1],b=nodes[i],c=nodes[i+1];if(!a||!c){simplified.push(b);continue}const ax=Math.sign(b.x-a.x),ay=Math.sign(b.y-a.y),bx=Math.sign(c.x-b.x),by=Math.sign(c.y-b.y);if(ax!==bx||ay!==by||i%5===0)simplified.push(b)}
 // Line-of-sight string pulling: fewer artificial zigzags while staying clear of obstacles.
 const smoothed=[];let anchor={x:hero.x,y:hero.y},at=0;
 while(at<simplified.length){
  let pick=at;const end=Math.min(simplified.length-1,at+32);
  for(let j=end;j>=at;j--){
   const t=simplified[j],dd=Math.hypot(t.x-anchor.x,t.y-anchor.y);
   let clear=true;const steps=Math.ceil(dd/9);
   for(let k=1;k<steps;k++){
    const ratio=k/steps;
    if(isBlocked(anchor.x+(t.x-anchor.x)*ratio,anchor.y+(t.y-anchor.y)*ratio)){clear=false;break}
   }
   if(clear){pick=j;break}
  }
  const next=simplified[pick];smoothed.push(next);anchor=next;at=pick+1;
 }
 return smoothed;
}
function setGoal(x,y,thing=null){x=clamp(x,20,WW-20);y=clamp(y,20,WH-20);followTarget=thing;const target=thing||{x,y};destination={x:target.x,y:target.y};autoGoal=destination;waypointPath=pathTo(destination);}
function moveTry(dx,dy){const nx=hero.x+dx,ny=hero.y+dy;if(!isBlocked(nx,ny)) {hero.x=nx;hero.y=ny;return true}let moved=false;if(!isBlocked(nx,hero.y)){hero.x=nx;moved=true}if(!isBlocked(hero.x,ny)){hero.y=ny;moved=true}return moved}
function spawnMonster(type,x,y,id){const stats=type==='wolf'?{hp:43,speed:30,damage:9,r:12,range:23,exp:15}:type==='wraith'?{hp:62,speed:25,damage:11,r:12,range:24,exp:24}:type==='guardian'?{hp:92,speed:19,damage:15,r:15,range:27,exp:39}:{hp:370,speed:27,damage:18,r:23,range:37,exp:140};let e={id:id||'e'+Math.random(),type,x,y,homeX:x,homeY:y,hp:stats.hp,maxHp:stats.hp,speed:stats.speed,damage:stats.damage,r:stats.r,range:stats.range,exp:stats.exp,dead:false,deadT:0,attack:0,windup:0,aggro:0,wobble:Math.random()*TWO,hitT:0,stun:0,summoned:false,phase:0};entities.push(e);return e}
function initMonsters(){entities=[];shots=[];} // 몬스터는 지정된 전투 장면에서만 출현한다.
function makeParticles(x,y,n,colors,vel=1){for(let i=0;i<n;i++){const a=rand(0,TWO),speed=rand(15,63)*vel;particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-12,life:rand(.36,.95),max:.95,size:rand(1,3.5),color:colors[Math.floor(rand(0,colors.length))]})}}
function floating(x,y,label,col='#f1e5b5',life=1.2){floatText.push({x,y,txt:label,color:col,life,max:life})}
function pulse(x,y,r,col='#a0cffb'){shines.push({x,y,r,life:.4,max:.4,color:col})}
function toast(top,msg,sec=3){$('toastTop').textContent=top;$('toastMsg').textContent=msg;toastT=sec;$('screenToast').style.opacity='1'}
function bumpQuest(){if(railIndex>=INTRO_STOPS&&CHRONICLE[railIndex-INTRO_STOPS]){const beat=CHRONICLE[railIndex-INTRO_STOPS];UI.questTitle.textContent=beat.title;UI.questDetail.textContent=beat.chapter;updateUI();save();return}let [q,detail]=questData[questStage];if(questStage===1)detail=`월광의 조각 ${fragmentFlags.filter(Boolean).length} / 3 · 이야기를 따라 자동으로 이동합니다.`;UI.questTitle.textContent=q;UI.questDetail.textContent=detail;updateUI();save()}
function updateUI(){UI.hpFill.style.width=(100*hero.hp/hero.maxHp)+'%';UI.hpValue.textContent=Math.ceil(hero.hp)+' / '+hero.maxHp;UI.mpFill.style.width=(100*hero.mp/hero.maxMp)+'%';UI.mpValue.textContent=Math.floor(hero.mp)+' / '+hero.maxMp;UI.money.textContent='✦ '+hero.gold;const remain=hero.skillT;UI.cooldown.classList.toggle('hidden',remain<=0);if(remain>0)UI.cooldown.textContent=Math.ceil(remain)+'s';UI.skill.classList.toggle('skillReady',remain<=0);$('levelBadge').textContent=`LV ${hero.level}  ·  ⚔ ${hero.damage}  ·  ♥ ${hero.maxHp}`;$('xpFill').style.width=(hero.xp/(35+hero.level*25)*100)+'%';$('xpText').textContent=`EXP ${Math.floor(hero.xp)} / ${35+hero.level*25}`;$('routeIndex').textContent=`${String(Math.min(railIndex+1,RAIL_STOPS.length)).padStart(2,'0')} / ${RAIL_STOPS.length}`;$('routeTitle').textContent=RAIL_LABELS[railIndex]||'새벽의 서약';document.querySelector('.subhead').textContent=railIndex<INTRO_STOPS?'CHAPTER I · THE LAST BELL':(CHRONICLE[railIndex-INTRO_STOPS]?.chapter||'CHRONICLE');setCombatUI();$('resonanceCount').textContent='✧ '+resonance+' / 3';$('dodgeButton').querySelector('small').textContent=dodgeCooldown>0?dodgeCooldown.toFixed(1)+'s':'달걸음';$('routeMode').textContent=railPhase==='travel'?'✧ 다음 장면으로 자동 이동 중':railPhase==='battle'?'⚔ 왼쪽 이동 · 적의 붉은 예고를 피하고 반격하세요':railPhase==='scene'?'✦ 이야기 진행 중':railPhase==='done'?'✧ 제1장 완료':'✧ 여정 준비 중';$('spellName').textContent=currentSpell().name;$('spellSwitch').textContent='✦ '+unlockedSpells().length+'개 마법';$('skillCooldown').title=currentSpell().desc;$('routeAction').textContent=railPhase==='travel'?'✦ 길 안내 / 이동 계속':railPhase==='battle'?'⚔ 검격 / 연속 공격':railPhase==='done'?'✦ 이야기 기록 보기':'✧ 다음 장면 보기';}
function save(){try{localStorage.setItem(SKEY,JSON.stringify({hero:{x:hero.x,y:hero.y,hp:hero.hp,maxHp:hero.maxHp,mp:hero.mp,maxMp:hero.maxMp,gold:hero.gold,level:hero.level,xp:hero.xp,damage:hero.damage,swordLevel:hero.swordLevel,armorLevel:hero.armorLevel,blessings:hero.blessings,oaths:hero.oaths,selectedSpell:hero.selectedSpell},questStage,fragmentFlags,loreGift,bossGone,railIndex,pendingLevels,railV:1}))}catch(e){}}
function hasSave(){try{return!!localStorage.getItem(SKEY)}catch(e){return false}}
function load(){try{clearThumb();dodgeCooldown=0;dodgeTime=0;resonance=0;const state=JSON.parse(localStorage.getItem(SKEY));if(!state)return false;Object.assign(hero,state.hero||{});hero.blessings={blade:0,heart:0,moon:0,...(hero.blessings||{})};questStage=state.questStage||0;fragmentFlags=state.fragmentFlags||[false,false,false];loreGift=!!state.loreGift;bossGone=!!state.bossGone;railIndex=state.railV?clamp(state.railIndex||0,RAIL_STOPS.length-1):0;pendingLevels=state.pendingLevels||0;hero.oaths=Array.isArray(hero.oaths)?hero.oaths:[];hero.selectedSpell=Number(hero.selectedSpell)||0;hero.vx=hero.vy=hero.moving=0;hero.step=0;if(!state.railV){questStage=0;fragmentFlags=[false,false,false];bossGone=false;hero.x=250;hero.y=465;hero.hp=hero.maxHp;}return true}catch(e){return false}}
function reset(){clearThumb();dodgeCooldown=0;dodgeTime=0;resonance=0;prologueActive=false;prologueTime=0;$('openingNarration')?.classList.add('hidden');Object.assign(hero,{x:250,y:460,hp:120,maxHp:120,mp:100,maxMp:100,gold:12,level:1,xp:0,damage:15,swordLevel:0,armorLevel:0,blessings:{blade:0,heart:0,moon:0},atkT:0,skillT:0,inv:0,vx:0,vy:0,moving:0,step:0,selectedSpell:0,oaths:[]});questStage=0;fragmentFlags=[false,false,false];loreGift=false;bossGone=false;railIndex=0;railPhase='idle';pendingLevels=0;autoGoal=null;followTarget=null;waypointPath=[];initMonsters();}
function dialog(name,lines,done){if(typeof lines==='string')lines=[lines];scene='dialog';paused=true;autoGoal=null;waypointPath=[];const box=UI.dialog;box.classList.remove('hidden');let idx=0;function show(){box.querySelector('#dialogName').textContent=name;box.querySelector('#dialogText').textContent=lines[idx];$('dialogNext').textContent=idx<lines.length-1?'다음 이야기  ›':'계속 여행하기  ✦'}show();const advance=()=>{pageTurnSfx();if(++idx<lines.length){show()}else{box.classList.add('hidden');scene='play';paused=false;if(done)done();}};$('dialogNext').onclick=advance;box.onclick=e=>{if(e.target.closest('button'))return;advance()};}
// Guided story mode: authored routes, authored encounters, no aimless roaming.
function setRail(index){
 railIndex=clamp(index,0,RAIL_STOPS.length-1);railPhase='travel';railClearTimer=0;railTravelTimer=0;railStuck=0;railLastDistance=Infinity;shots=[];
 const goal=RAIL_STOPS[railIndex];
 if(railIndex===7||railIndex===10){
   hero.x=253;hero.y=465;cam.x=0;cam.y=325;makeParticles(hero.x,hero.y-20,35,['#ecdbba','#b4d7e5','#cad9fa'],1.2);
   toast('기억의 길','달빛이 당신을 엘든으로 인도합니다',3.2);
 }
 if(railIndex===8){hero.x=1979;hero.y=465;makeParticles(hero.x,hero.y-15,28,['#c7e6f6','#e1d0b4'],1.2);toast('성당으로 향하는 길','마지막 맹세가 기다립니다',3.5)}
 railGoal={x:goal.x,y:goal.y};setGoal(goal.x,goal.y);followTarget=null;
 toast('CHAPTER I · '+String(railIndex+1).padStart(2,'0'),RAIL_LABELS[railIndex],2.7);save();
}
function nextRail(){if(railIndex>=RAIL_STOPS.length-1){railPhase='done';showEnding();save();return}setRail(railIndex+1);}
function beginEncounter(roster,heading){
 railPhase='battle';entities=[];shots=[];autoGoal=null;waypointPath=[];hero.vx=hero.vy=0;hero.hp=clamp(hero.hp+Math.round(hero.maxHp*.30),0,hero.maxHp);hero.mp=hero.maxMp;hero.inv=1.3;combatCenter={x:hero.x,y:hero.y};dodgeCooldown=0;dodgeTime=0;resonance=0;clearThumb();combatTipShown=false;
 roster.forEach((entry,i)=>{const [type,dx,dy]=entry;const x=clamp(hero.x+dx,20,WW-20),y=clamp(hero.y+dy,30,WH-30);const e=spawnMonster(type,x,y,'scene'+railIndex+'-'+i);e.aggro=8;e.attack=.9+i*.35});
 railClearTimer=0;toast('⚔ ENCOUNTER',heading,4);chime(320);save();
}
function addMoonShard(id){
 if(!fragmentFlags[id]){fragmentFlags[id]=true;hero.gold+=16;awardExperience(35);hero.mp=hero.maxMp;makeParticles(chests[id].x,chests[id].y-27,60,['#f9edc4','#a2cfe9','#d5e6ff','#c8a8d9'],2.1);pulse(chests[id].x,chests[id].y-30,120,'#badbf8');chime(850)}
 if(fragmentFlags.every(Boolean))questStage=2;bumpQuest();
}
function railArrival(){
 prologueActive=false;$('openingNarration')?.classList.add('hidden');
 railPhase='scene';autoGoal=null;followTarget=null;waypointPath=[];
 if(railIndex>=INTRO_STOPS){chronicleArrival(CHRONICLE[railIndex-INTRO_STOPS]);updateUI();return;}
 switch(railIndex){
 case 0: dialog('에다 · 마지막 종지기',['오셨군요, 길을 잃은 나그네여. 우리 마을의 종은 달이 부서진 날부터 울리지 않았답니다.','달빛은 세 조각으로 흩어졌어요. 길은 제가 기억하니, 그저 앞으로 펼쳐질 이야기를 따라가 주세요.','두려워하지 마세요. 이제 발걸음은 달빛이 이끌어 줄 거예요.'],()=>{questStage=1;bumpQuest();nextRail()});break;
 case 1: beginEncounter([['wolf',68,10],['wolf',80,-45],['wolf',108,32],['wolf',135,-22]],'안개숲의 늑대 떼');break;
 case 2: addMoonShard(0);dialog('속삭이는 월광의 제단',['첫 번째 달의 조각이 손에 닿자, 숲의 잎사귀들이 작은 종처럼 흔들립니다.','한때 이 길을 지켰던 이들의 노래가 아주 멀리서 들려옵니다.'],()=>{bumpQuest();if(!maybeLevelUp())nextRail()});break;
 case 3: beginEncounter([['wolf',55,-18],['wolf',68,41],['wraith',105,-27]],'숲의 끝에서 나타난 망령');break;
 case 4: addMoonShard(1);dialog('잊힌 병사의 비석',['비석에는 이름 대신 하나의 문장이 남아 있습니다. “새벽은 돌아오는 이가 아니라, 끝까지 길을 걷는 이의 것.”','두 번째 달빛이 당신의 검에 스며듭니다.'],()=>{bumpQuest();if(!maybeLevelUp())nextRail()});break;
 case 5: beginEncounter([['wraith',68,-23],['guardian',105,20],['wraith',125,49]],'왕국의 마지막 문지기');break;
 case 6: addMoonShard(2);dialog('푸른 달의 유적',['세 번째 조각이 떠오르자 달빛이 하나로 이어지고, 오래전 잠든 종소리의 흔적이 되살아납니다.','이제 마을로 돌아가 에다에게 세 조각을 보여줄 때입니다.'],()=>{bumpQuest();if(!maybeLevelUp())nextRail()});break;
 case 7: dialog('에다 · 마지막 종지기',['정말로 모든 조각을 찾으셨군요. 종을 깨울 수 있는 사람은 이제 당신뿐입니다.','동쪽 성당에서 마지막 기사가 오래된 맹세를 지키고 있어요. 제 등불을 가져가 주세요.','이제 길은 성당까지 이어집니다. 다시 돌아오실 때까지 기다리고 있겠습니다.'],()=>{questStage=3;hero.hp=hero.maxHp;hero.mp=hero.maxMp;hero.gold+=24;bumpQuest();nextRail()});break;
 case 8: beginEncounter([['wraith',67,-22],['guardian',93,27]],'성당의 어둠을 가르는 마지막 시련');break;
 case 9: beginEncounter([['boss',92,0]],'달의 기사 · 마지막 맹세');break;
 case 10: dialog('에다 · 마지막 종지기',['들리시나요? 마침내, 달이 잠들었던 밤을 깨우는 종소리가 울려요.','당신의 검보다 오래 남을 것은, 이 길을 끝까지 걸었다는 이야기일 거예요.','돌아오셔서 감사합니다. 새벽은 언제나 당신의 것입니다.'],()=>{questStage=5;bumpQuest();if(CHRONICLE.length){dialog('에다의 마지막 편지',['이 새벽은 끝이 아니라 오래된 세계가 깨어나는 시작입니다.','서쪽 바다에 오래도록 당신을 기다린 이름이 있습니다. 당신이 떠나야 할 이유는 이제 하나가 아닙니다.'],()=>nextRail())}else{railPhase='done';showEnding()}});break;
 }
 updateUI();
}
function chronicleArrival(beat){
 hero.vx=0;hero.vy=0;
 if(!beat){railPhase='done';showEnding();return;}
 UI.place.textContent=regionName(hero.x);UI.questTitle.textContent=beat.title;UI.questDetail.textContent=beat.chapter+' · '+(beat.type==='battle'?'시련을 넘어 다음 장면으로':'이야기를 따라 여행하는 중');
 if(beat.type==='battle'){
   beginEncounter(beat.roster,beat.title);
 }else if(beat.type==='oath'){
   dialog(beat.speaker,beat.lines,()=>{
     openPanel('그대의 서약',`<p>앞으로의 이야기에서 지킬 가치를 선택하세요. 서약은 여행 일지에 기록됩니다.</p><button class="levelPick" data-oath="memory"><span class="pickIcon">✧</span><span><strong>진실을 기억하겠다</strong><small>마력 +10 · 기록을 우선합니다</small></span></button><button class="levelPick" data-oath="people"><span class="pickIcon">♥</span><span><strong>사람들을 지키겠다</strong><small>체력 +12 · 생존을 우선합니다</small></span></button>`,'THE OATH · YOUR LEGEND',node=>{
      $('panelClose').classList.add('hidden');
      node.querySelectorAll('[data-oath]').forEach(b=>b.onclick=()=>{
       const choice=b.dataset.oath;hero.oaths.push({chapter:beat.chapter,choice});
       if(choice==='memory'){hero.maxMp+=10;hero.mp+=10}else{hero.maxHp+=12;hero.hp+=12}
       $('panelClose').classList.remove('hidden');closePanel();toast('서약이 기록되었습니다',choice==='memory'?'잊힌 진실을 기억하는 길':'남겨진 이들을 지키는 길',3);save();nextRail();
      });
     });
   });
 }else dialog(beat.speaker,beat.lines,()=>{if(!maybeLevelUp())nextRail()});
}
function maybeLevelUp(){
 if(pendingLevels<=0||scene!=='play')return false;
 railPhase=railPhase==='travel'?'travel':railPhase;
 const was=hero.level;
 const html=`<p class="levelIntro">달빛이 당신의 여정에 새로운 힘을 새깁니다. <strong>원하는 능력 하나</strong>를 직접 선택하세요.</p><div class="statsBefore">현재 능력 · ⚔ ${hero.damage}　♥ ${hero.maxHp}　✧ ${hero.maxMp}</div>
 <button class="levelPick" data-choice="blade"><span class="pickIcon">⚔</span><span><strong>별빛의 검</strong><small>공격력 <b>${hero.damage} → ${hero.damage+6}</b><br>검의 빛이 더 선명해집니다.</small></span></button>
 <button class="levelPick" data-choice="heart"><span class="pickIcon">♥</span><span><strong>붉은 망토의 맹세</strong><small>최대 체력 <b>${hero.maxHp} → ${hero.maxHp+30}</b><br>붉은 수호의 빛이 감돕니다.</small></span></button>
 <button class="levelPick" data-choice="moon"><span class="pickIcon">✧</span><span><strong>푸른 달의 숨결</strong><small>최대 마력 <b>${hero.maxMp} → ${hero.maxMp+25}</b><br>달빛 파동 재사용 시간이 짧아집니다.</small></span></button>`;
 openPanel(`레벨 ${was} · 새겨진 선택`,html,'✦ LEVEL UP · CHOOSE YOUR LEGACY',node=>{
  $('panelClose').classList.add('hidden');
  node.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{
   const choice=b.dataset.choice;hero.blessings[choice]=(hero.blessings[choice]||0)+1;
   if(choice==='blade')hero.damage+=6;
   if(choice==='heart'){hero.maxHp+=30;hero.hp+=30}
   if(choice==='moon'){hero.maxMp+=25;hero.mp=hero.maxMp}
   pendingLevels--;makeParticles(hero.x,hero.y-22,45,['#f9d7a0','#c0e0f8','#f5efe1'],2.4);chime(900);$('panelClose').classList.remove('hidden');closePanel();toast('LEVEL '+hero.level,`성장 완료 · ⚔ ${hero.damage}  ♥ ${hero.maxHp}  ✧ ${hero.maxMp}`,4);save();if(pendingLevels>0)maybeLevelUp();else if(railPhase==='scene')nextRail();
  });
 });return true;
}
function railTick(dt){
 if(railPhase==='travel'){
  railTravelTimer+=dt;
  let d=dist(hero,railGoal);if(d>railLastDistance-.07)railStuck+=dt;else railStuck=Math.max(0,railStuck-dt*2);railLastDistance=d;
  // Should pathfinding reach an awkward tile, gently fix it instead of trapping the player.
  if(railStuck>2.6){setGoal(railGoal.x,railGoal.y);railStuck=0;toast('달빛의 길', '길을 다시 찾아 이동합니다', 2.2)}
  if(railTravelTimer>65){hero.x=railGoal.x;hero.y=railGoal.y;hero.vx=hero.vy=0;autoGoal=null}
  if(d<22||(!autoGoal&&railTravelTimer>.3))railArrival();
 }else if(railPhase==='battle'){
  if(entities.length>0&&entities.every(e=>e.dead)){
   railClearTimer+=dt;if(railClearTimer>.85){railPhase='scene';clearThumb();resonance=0;hero.hp=clamp(hero.hp+Math.round(hero.maxHp*.5),0,hero.maxHp);hero.mp=hero.maxMp;entities=[];shots=[];dialog('전투의 끝 · 남은 여운',['흩어진 그림자가 안개 속으로 스며듭니다. 잠시 숨을 고르면, 달빛이 다시 다음 길을 보여줍니다.'],()=>{if(!maybeLevelUp())nextRail();else railPhase='scene'})}
  }
 }
}
function openPanel(title,contents,kicker='TRAVELER\'S JOURNAL',onOpen){scene='panel';paused=true;UI.panel.classList.remove('hidden');$('panelKicker').textContent=kicker;$('panelTitle').textContent=title;const node=$('panelContent');node.innerHTML=contents;$('panelClose').onclick=closePanel;if(onOpen)onOpen(node)}
function closePanel(){UI.panel.classList.add('hidden');$('panelClose').classList.remove('hidden');scene='play';paused=false;save()}
function talkNpc(npc){chime(510);if(npc.id==='edda'){
 if(questStage===0)dialog('에다 · 마지막 종지기',["...어쩌면 달이 우리를 버린 게 아닐지도 모르지요. 밤이 온 뒤로 마을의 종은 한 번도 울리지 않았어요.","달빛은 세 조각으로 흩어졌답니다. 속삭임 숲, 잊힌 폐허, 푸른 유적의 작은 제단을 찾아주세요.","길이 어둡더라도 겁내지 마세요. 길을 잃은 사람에게는 작은 빛조차 별이 되는 법이니까요."],()=>{questStage=1;toast('QUEST START','조각난 달의 노래');bumpQuest()});
 else if(questStage===1)dialog('에다 · 마지막 종지기',[`돌아오셨군요. 지금까지 ${fragmentFlags.filter(Boolean).length}개의 달빛 조각을 찾으셨네요.`,"제단은 희미하게 빛나고 있어요. 지도에 ◇ 표시가 남아 있을 거예요."]);
 else if(questStage===2)dialog('에다 · 마지막 종지기',["세 조각이 다시 하나의 빛이 되었군요... 하지만 마지막 종은 여전히 침묵하고 있어요.","성당을 지키는 기사는 옛 맹세에 사로잡혀 있답니다. 그를 이긴 뒤, 달의 종을 깨워 주세요.","당신이 돌아올 때까지, 저는 이곳에 등불을 켜 둘게요."],()=>{questStage=3;if(!entities.some(e=>e.type==='boss'&&!e.dead))spawnMonster('boss',2290,460,'bellknight');hero.gold+=28;hero.hp=hero.maxHp;hero.mp=hero.maxMp;toast('QUEST UPDATED','마지막 종을 위하여');bumpQuest()});
 else if(questStage===3)dialog('에다 · 마지막 종지기',["동쪽 성당의 종이 다시 울리기를 기다리고 있어요.","잠깐 쉬었다 가세요. 잿빛 마을의 벽은 아직 따뜻하니까요."],()=>{hero.hp=hero.maxHp;hero.mp=hero.maxMp});
 else if(questStage===4)dialog('에다 · 마지막 종지기',["들리시나요? ...서쪽 언덕까지, 오래된 종의 울림이 퍼지고 있어요.","사람들은 밤이 끝나기를 기다렸지만, 어쩌면 새벽은 한 사람의 발걸음에서 시작되는지도 모르겠네요.","엘든의 모든 창에 다시 불이 켜질 거예요. 고맙습니다, 이름 없는 여행자여."],()=>{questStage=5;hero.gold+=100;toast('THE END · CHAPTER I','새벽을 부르는 종',6);bumpQuest();showEnding()});
 else dialog('에다 · 마지막 종지기',["이제 이 마을의 종은 매일 울린답니다.","하지만 멀리 북쪽 왕국에는 아직도 밤이 남아 있다는군요. 언젠가 그 길도 열리겠지요."]);}
 else if(npc.id==='bram')showShop();
 else if(npc.id==='lune'){if(!loreGift)dialog('루네 · 길 잃은 여행자',["길이 끝나는 곳에 성이 있고, 성이 끝나는 곳에는 이야기가 있다고 들었어요.","저는 길 위에서 오래된 은화를 주웠어요. 밤을 건너는 데 쓰세요.","숲의 늑대들은 느리지만 끈질기답니다. 스킬 하나로 전부 밀쳐낼 수 있죠."],()=>{loreGift=true;hero.gold+=20;toast('보상을 얻었습니다','고대 은화 +20');save()});else dialog('루네 · 길 잃은 여행자',["세상이 이렇게 조용한 걸 보면, 누군가는 아주 오래된 노래를 잊고 있는 모양이에요.","성당에 가실 거라면 길 중앙의 돌바닥을 따라가세요."]);}}
function showShop(){const html=`<p>“검은 어둠을 베는 것이 아니라, 어둠 속에서도 길을 잃지 않을 검을 만드는 거야.”</p><div class="panelRow"><span>현재 검의 위력</span><strong>${hero.damage}</strong></div><div class="panelRow"><span>최대 체력</span><strong>${hero.maxHp}</strong></div><button class="upgrade" id="buyBlade">⚔ 검 담금질 · ✦ ${20+hero.swordLevel*26} <small>(공격력 +7)</small></button><button class="upgrade" id="buyArmor">🛡 은사슬 갑옷 · ✦ ${24+hero.armorLevel*30} <small>(최대 체력 +25)</small></button><button class="upgrade" id="buyHeal">♥ 모닥불에서 쉬기 · ✦ 7 <small>(체력 완전 회복)</small></button><p class="tiny">동전을 얻으려면 숲의 몬스터를 처치하거나, 유적을 탐험해 보세요.</p>`;
 openPanel('브람의 작은 대장간',html,'THE WANDERING SMITH',node=>{node.querySelector('#buyBlade').onclick=()=>{const cost=20+hero.swordLevel*26;if(hero.gold<cost){toast('상인이 말합니다','은화가 부족합니다');return}hero.gold-=cost;hero.damage+=7;hero.swordLevel++;chime(630);showShop()};node.querySelector('#buyArmor').onclick=()=>{const cost=24+hero.armorLevel*30;if(hero.gold<cost){toast('상인이 말합니다','은화가 부족합니다');return}hero.gold-=cost;hero.maxHp+=25;hero.hp+=25;hero.armorLevel++;chime(630);showShop()};node.querySelector('#buyHeal').onclick=()=>{if(hero.gold<7){toast('상인이 말합니다','은화가 부족합니다');return}hero.gold-=7;hero.hp=hero.maxHp;chime(550);showShop()}})}
function pickChest(chest){if(fragmentFlags[chest.id])return; if(questStage===0){dialog('희미한 제단','제단이 차갑게 빛납니다. 종지기 에다에게 이 빛에 대해 물어보세요.');return} fragmentFlags[chest.id]=true;hero.gold+=12;hero.mp=hero.maxMp;makeParticles(chest.x,chest.y-25,35,['#ddf3fd','#b3c6f7','#fae2aa','#80b3e9'],2);pulse(chest.x,chest.y-22,86);chime(840);toast('MOON SHARD DISCOVERED',`월광의 조각 ${fragmentFlags.filter(Boolean).length} / 3`,4);if(questStage===1&&fragmentFlags.every(Boolean))questStage=2;bumpQuest()}
function bossVictory(){bossGone=true;questStage=4;makeParticles(2290,452,85,['#b6d6ff','#e6d1a7','#a2c0df','#f8ecb2'],3.1);pulse(2290,460,140);toast('THE LAST BELL', '잠들었던 종이 울립니다',6);playBell();bumpQuest();}
function showEnding(){openPanel('새벽의 약속',`<p>그날 새벽, 사람들은 오래 잊힌 종소리를 들었습니다.</p><p>숲의 그림자가 짧아지고, 폐허의 창마다 작은 빛이 머물렀습니다. 이곳의 이야기는 끝나지만, 세계의 모든 밤이 끝난 것은 아닙니다.</p><div class="panelRow"><span>여정의 기록</span><strong>제1장 완료</strong></div><div class="panelRow"><span>영웅의 성장</span><strong>Lv. ${hero.level}</strong></div><div class="panelRow"><span>남은 은화</span><strong>✦ ${hero.gold}</strong></div><p class="tiny">게임은 계속 탐험할 수 있으며 진행 상황은 자동 저장됩니다.</p>`,'CHAPTER I · COMPLETE')}
function hurt(amount,enemy){if(hero.inv>0||scene!=='play')return;hero.hp=Math.max(0,hero.hp-amount);hero.inv=.58;hero.lastHurt=gameTime;makeParticles(hero.x,hero.y-8,7,['#b94d5a','#c89078','#d1c1aa']);floating(hero.x,hero.y-24,'−'+amount,'#ffaaa3');sfx('hurt');if(enemy){const a=Math.atan2(hero.y-enemy.y,hero.x-enemy.x);moveTry(Math.cos(a)*11,Math.sin(a)*11)} if(hero.hp<=0){autoGoal=null;followTarget=null;waypointPath=[];scene='dialog';paused=true;dialog('기억의 불씨',["잠깐, 눈을 감았을 뿐입니다. 이야기가 끝난 것은 아니에요.","낯선 바람이 당신을 엘든의 모닥불 곁으로 데려옵니다. 잃은 것은 약간의 은화뿐, 달빛의 조각은 그대로입니다."],()=>{hero.hp=hero.maxHp;hero.mp=hero.maxMp;hero.gold=Math.max(0,hero.gold-12);hero.inv=2;entities=[];setRail(railIndex);toast('기억의 불씨','현재 장면에서 다시 시작합니다',4);save()})}}
function awardExperience(amount){hero.xp+=amount;let limit=35+hero.level*25;while(hero.xp>=limit){hero.xp-=limit;hero.level++;hero.maxHp+=8;hero.hp=hero.maxHp;hero.mp=hero.maxMp;pendingLevels++;const newSkill=SPELLS.find(sk=>sk.level===hero.level);if(newSkill)toast('새 마법 해금',`${newSkill.name} · 마법 전환으로 사용 가능`,4);limit=35+hero.level*25;toast('LEVEL UP',`레벨 ${hero.level} · 새 능력을 선택하세요`,3);makeParticles(hero.x,hero.y-18,35,['#d9e7c1','#f1d7a1','#c5d5ee'],2)}}
function hitEnemy(e,amount,skill=false){if(e.dead)return;e.hp=Math.max(0,e.hp-amount);e.hitT=.17;e.aggro=5;e.stun=skill?.45:.08;makeParticles(e.x,e.y-12,skill?15:7,skill?['#c5dcff','#a1c9ef','#e6d4b3']:['#e6b68f','#e7d8bc','#9a9da2'],skill?1.5:1);floating(e.x,e.y-23,'−'+amount,skill?'#addbff':'#f1daae');if(e.hp<=0){e.dead=true;e.deadT=1;const amountGold=e.type==='boss'?68:e.type==='guardian'?14:e.type==='wraith'?8:5;hero.gold+=amountGold;awardExperience(e.exp);floating(e.x,e.y-39,'✦ '+amountGold,'#ffdc9a',1.5);if(e.type==='boss')bossVictory();else if(Math.random()<.25){hero.hp=clamp(hero.hp+12,0,hero.maxHp);floating(hero.x,hero.y-28,'♥ +12','#9ce9b9')}sfx('death');save()}else{sfx(skill?'spell':'slash')}}
const SPELLS=[
 {name:'달빛 파동',level:1,mp:38,cd:5.2,desc:'근거리 광역 파동'},
 {name:'서리별',level:3,mp:32,cd:4.5,desc:'멀리 있는 적까지 닿는 냉기 별'},
 {name:'은빛 수호',level:5,mp:35,cd:9,desc:'치유와 짧은 보호막'},
 {name:'유성 성가',level:8,mp:55,cd:8,desc:'연속적인 별빛 공격'},
 {name:'새벽의 서약',level:12,mp:68,cd:13,desc:'강력한 별빛과 회복'},
 {name:'달의 시계',level:16,mp:72,cd:13,desc:'적을 잠시 멈추고 범위 공격'},
];
let lastAttackTime=-100;
function unlockedSpells(){return SPELLS.filter(q=>hero.level>=q.level)}
function currentSpell(){const found=unlockedSpells();return found[(hero.selectedSpell||0)%found.length]}
function cycleSpell(){const skills=unlockedSpells();hero.selectedSpell=((hero.selectedSpell||0)+1)%skills.length;const sk=currentSpell();toast('마법 변경',`${sk.name} · ${sk.desc}`,2.2);updateUI();save();}
function attackSword(){
 if(scene!=='play'||railPhase!=='battle'||hero.atkT>0)return;
 const now=gameTime;
 hero.atkCombo=(now-lastAttackTime>.92)?0:(hero.atkCombo+1)%3;lastAttackTime=now;
 hero.atkT=hero.atkCombo===2?.38:.32;hero.atkSwing=.24;
 const target=entities.filter(e=>!e.dead).sort((a,b)=>dist(hero,a)-dist(hero,b))[0];
 if(!target)return;
 const distance=dist(hero,target);
 if(distance>95){floating(hero.x,hero.y-38,'가까이 이동해 공격','#e1d2b8',.8);return;}
 hero.face=target.x>=hero.x?1:-1;
 const finish=hero.atkCombo===2;const consumed=finish&&resonance===3;const damage=Math.round(hero.damage*(finish?(consumed?2.95:1.75):hero.atkCombo===1?1.22:1));if(consumed){resonance=0;hero.mp=clamp(hero.mp+16,0,hero.maxMp);toast('✦ 월광 반격','완벽한 달걸음이 세 번째 검격을 강화합니다',2.5);}
 for(const e of entities){
  if(!e.dead&&dist(hero,e)<(finish?93:78)){
   hitEnemy(e,e===target?damage:Math.round(damage*.5));
  }
 }
 if(finish){pulse(hero.x,hero.y-14,consumed?118:85,consumed?'#b7e9ff':'#ead8a5');floating(hero.x,hero.y-44,'✧ 공명 3연격','#ffebbf',1.1);}
 sfx('slash');
}
function useSkill(){
 if(scene!=='play'||railPhase!=='battle'||hero.skillT>0)return;
 const sk=currentSpell();
 if(hero.mp<sk.mp){toast('마력이 부족합니다',`${sk.name}에 마력 ${sk.mp} 필요`,1.8);return;}
 const reducedMp=resonance>0?Math.min(6*resonance,sk.mp-5):0;hero.mp-=sk.mp-reducedMp;resonance=0;hero.skillT=Math.max(2.4,sk.cd-(hero.blessings.moon||0)*.22);hero.inv=Math.max(hero.inv,.30);
 const lv=hero.level;
 if(sk.level===1){
  pulse(hero.x,hero.y,112,'#9fd8f8');makeParticles(hero.x,hero.y-8,45,['#c9e7fd','#b4c9f5','#f0e1b6','#709eca'],2.1);
  entities.forEach(e=>{if(!e.dead&&dist(hero,e)<118){hitEnemy(e,35+lv*4+hero.swordLevel*3,true);const a=Math.atan2(e.y-hero.y,e.x-hero.x);e.x+=Math.cos(a)*11;e.y+=Math.sin(a)*11}});
 }else if(sk.level===3){
  const target=entities.filter(e=>!e.dead).sort((a,b)=>dist(hero,a)-dist(hero,b))[0];
  if(target){pulse(target.x,target.y,90,'#b9ecff');makeParticles(target.x,target.y-12,36,['#c1eeff','#9acde9','#fff8d5'],1.8);entities.forEach(e=>{if(!e.dead&&dist(e,target)<90){hitEnemy(e,48+lv*5,true);e.stun=1.1}})}
 }else if(sk.level===5){
  hero.hp=Math.min(hero.maxHp,hero.hp+Math.floor(hero.maxHp*.30));hero.inv=1.5;pulse(hero.x,hero.y,80,'#c8eac8');makeParticles(hero.x,hero.y-22,32,['#e6e8ba','#a8d8d1','#a6f2b2'],1.4);floating(hero.x,hero.y-50,'♥ 보호의 서약','#c0f0c3');
 }else if(sk.level===8){
  const near=entities.filter(e=>!e.dead).sort((a,b)=>dist(hero,a)-dist(hero,b));
  near.slice(0,4).forEach((e,i)=>{hitEnemy(e,53+lv*5,true);pulse(e.x,e.y-17,58+i*12,'#d4c7ff');makeParticles(e.x,e.y-11,20,['#e8d9ff','#c8d3ff','#fff4da'],2.4)});
 }else if(sk.level===12){
  hero.hp=Math.min(hero.maxHp,hero.hp+Math.floor(hero.maxHp*.19));entities.filter(e=>!e.dead).forEach(e=>{if(dist(hero,e)<230)hitEnemy(e,78+lv*5,true)});pulse(hero.x,hero.y,230,'#fff1bf');
 }else{
  entities.filter(e=>!e.dead).forEach(e=>{if(dist(hero,e)<290){hitEnemy(e,88+lv*6,true);e.stun=2.4}});pulse(hero.x,hero.y,290,'#b4d8ff');
 }
 chime(750);sfx('spell');updateUI();
}
function checkInteractions(){if(scene!=='play'||railPhase!=='free')return;for(const chest of chests)if(!fragmentFlags[chest.id]&&dist(hero,chest)<32){pickChest(chest);return}if(followTarget){const targ=followTarget,near=dist(hero,targ);if(targ.id&&npcPositions.includes(targ)&&near<43){followTarget=null;waypointPath=[];autoGoal=null;talkNpc(targ)}else if(targ.id==='bellknight'&&near<45){followTarget=null;waypointPath=[];autoGoal=null;}else if(targ.type&&near<43){followTarget=null;waypointPath=[];autoGoal=null}}}
function update(dt){if(paused)return;gameTime+=dt;openingUpdate(dt);timeToSave+=dt;hero.atkT=Math.max(0,hero.atkT-dt);hero.atkSwing=Math.max(0,hero.atkSwing-dt);hero.skillT=Math.max(0,hero.skillT-dt);hero.inv=Math.max(0,hero.inv-dt);dodgeCooldown=Math.max(0,dodgeCooldown-dt);dodgeTime=Math.max(0,dodgeTime-dt);hero.mp=clamp(hero.mp+dt*3.2,0,hero.maxMp);if(gameTime-hero.lastHurt>6)hero.hp=clamp(hero.hp+dt*2.1,0,hero.maxHp);
 if(railPhase==='free'&&pointerDown&&pointer.x>0){const dest={x:cam.x+pointer.x,y:cam.y+pointer.y};if(!autoGoal||Math.hypot(dest.x-autoGoal.x,dest.y-autoGoal.y)>24){setGoal(dest.x,dest.y)}}
 // Blended velocity locomotion. The route is automatic, but footsteps, direction and camera are eased.
 let aimX=0,aimY=0,goalDistance=Infinity;
 if(autoGoal&&waypointPath.length){
  let goal=waypointPath[0];let dd=Math.hypot(goal.x-hero.x,goal.y-hero.y);
  if(dd<Math.max(9,Math.hypot(hero.vx,hero.vy)*.052)){
   waypointPath.shift();if(!waypointPath.length){autoGoal=null;destination=null;goal=null;}
   else goal=waypointPath[0];
  }
  if(goal){const vx=goal.x-hero.x,vy=goal.y-hero.y;goalDistance=Math.hypot(vx,vy);
   if(goalDistance>1){aimX=vx/goalDistance;aimY=vy/goalDistance;}
  }
 }else if(autoGoal){autoGoal=null;}
 if((railPhase==='free'||railPhase==='battle')&&(keys.up||keys.down||keys.left||keys.right)){
  aimX=(keys.right?1:0)-(keys.left?1:0);aimY=(keys.down?1:0)-(keys.up?1:0);
  const len=Math.hypot(aimX,aimY)||1;aimX/=len;aimY/=len;
  autoGoal=null;followTarget=null;waypointPath=[];
 }
 if(railPhase==='battle'){
   autoGoal=null;waypointPath=[];const joystick=getMoveVector();
   if(Math.hypot(joystick.x,joystick.y)>.08){aimX=joystick.x;aimY=joystick.y;}
   if(dodgeTime>0){aimX=dodgeDirection.x;aimY=dodgeDirection.y;}
 }
 const wantsMove=aimX!==0||aimY!==0;
 let pace=hero.speed*(railPhase==='battle'?1.1:1);if(railPhase==='battle'&&dodgeTime>0)pace*=2.85;
 if(autoGoal&&waypointPath.length===1&&goalDistance<68)pace*=Math.max(.20,Math.min(1,goalDistance/68));
 const influence=1-Math.exp(-dt*(dodgeTime>0?32:wantsMove?13:16));
 hero.vx+=(aimX*pace-hero.vx)*influence;hero.vy+=(aimY*pace-hero.vy)*influence;
 const speedNow=Math.hypot(hero.vx,hero.vy);
 const wasX=hero.x,wasY=hero.y;
 if(speedNow>.16){
  if(railPhase==='battle'){
   const nx=clamp(hero.x+hero.vx*dt,combatCenter.x-169,combatCenter.x+169),ny=clamp(hero.y+hero.vy*dt,combatCenter.y-115,combatCenter.y+115);
   if(!isBlocked(nx,ny)){hero.x=nx;hero.y=ny;}else if(!moveTry(hero.vx*dt,hero.vy*dt)){hero.vx*=.2;hero.vy*=.2;}
  }else if(!moveTry(hero.vx*dt,hero.vy*dt)){hero.vx*=.22;hero.vy*=.22;}
 }
 const moved=Math.hypot(hero.x-wasX,hero.y-wasY);
 const movement=moved/Math.max(.003,dt);
 hero.moving+=(Math.min(1,movement/hero.speed)-hero.moving)*(1-Math.exp(-dt*10));
 if(moved>.04){hero.walk+=moved*.115;if(Math.abs(hero.vx)>8)hero.face=hero.vx>0?1:-1}
 hero.step=Math.sin(hero.walk);
 // Combat: 1-tap sword, 1-tap spell; no automatic attacking.
 // Monster AI: tells (glow) before hits; simple movement can avoid the attack.
 for(const e of entities){if(e.dead){e.deadT-=dt;continue}e.hitT=Math.max(0,e.hitT-dt);e.stun=Math.max(0,e.stun-dt);e.attack=Math.max(0,e.attack-dt);const d=dist(e,hero),activeNear=d<(e.type==='boss'?230:168);if(activeNear)e.aggro=6;else e.aggro=Math.max(0,e.aggro-dt);
 if(railPhase==='battle'&&e.aggro>0&&e.stun<=0){if(e.windup>0){e.windup-=dt;if(e.windup<=0){if(e.type==='wraith'&&e.rangedWindup){const a=Math.atan2((e.windupY??hero.y)-e.y,(e.windupX??hero.x)-e.x);shots.push({x:e.x,y:e.y-12,vx:Math.cos(a)*83,vy:Math.sin(a)*83,life:3.5,damage:e.damage});e.rangedWindup=false;makeParticles(e.x,e.y-12,7,['#8baecd','#a2d3e9'])}else{if(e.type==='wolf'&&dist(e,hero)<60){const a=Math.atan2(hero.y-e.y,hero.x-e.x);e.x+=Math.cos(a)*15;e.y+=Math.sin(a)*15}if(dist(e,hero)<e.range+18&&Math.hypot(hero.x-(e.windupX??hero.x),hero.y-(e.windupY??hero.y))<e.range+20)hurt(e.damage+(e.type==='boss'&&e.hp<e.maxHp*.5?5:0),e)}e.attack=e.type==='boss'?1.38:e.type==='guardian'?1.9:1.45;e.windup=0}}else if(e.type==='wraith'&&d>50&&d<130&&e.attack<=0){e.windup=.9;e.windupMax=.9;e.windupX=hero.x;e.windupY=hero.y;e.rangedWindup=true;}else if(d<e.range+9&&e.attack<=0){e.windup=e.type==='boss'?1.02:e.type==='guardian'?.94:.78;e.windupMax=e.windup;e.windupX=hero.x;e.windupY=hero.y;e.rangedWindup=false;}else if(d>e.range+6&&d<255){const a=Math.atan2(hero.y-e.y,hero.x-e.x);const speed=e.speed*(e.type==='boss'&&e.hp<e.maxHp*.5?1.3:1);let nx=e.x+Math.cos(a)*speed*dt,ny=e.y+Math.sin(a)*speed*dt;if(!isBlocked(nx,ny)){e.x=nx;e.y=ny}else if(!isBlocked(nx,e.y))e.x=nx;else if(!isBlocked(e.x,ny))e.y=ny}}
 else if(e.windup>0)e.windup=Math.max(0,e.windup-dt);
 if(e.type==='boss'&&e.hp<e.maxHp*.5&&!e.summoned){e.summoned=true;spawnMonster('wraith',e.x-82,e.y-76,'called1');spawnMonster('wraith',e.x+82,e.y+76,'called2');toast('THE OATH REMAINS','달의 기사가 그림자를 불렀습니다',4)}
 }
 for(let i=shots.length-1;i>=0;i--){const b=shots[i];b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(dist(b,hero)<12){hurt(b.damage,null);makeParticles(b.x,b.y,9,['#a3def2','#b8c4f0','#dae5fa']);b.life=0}if(b.life<=0||isBlocked(b.x,b.y))shots.splice(i,1)}
 for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=25*dt;if(p.life<=0)particles.splice(i,1)}
 for(let i=floatText.length-1;i>=0;i--){let p=floatText[i];p.y-=dt*21;p.life-=dt;if(p.life<=0)floatText.splice(i,1)}
 for(let i=shines.length-1;i>=0;i--){shines[i].life-=dt;if(shines[i].life<=0)shines.splice(i,1)}
 for(const f of flecks){f.x+=f.vx*dt;f.y+=f.vy*dt;if(f.y>WH+15){f.y=-5;f.x=rand(0,WW)}if(f.x>WW)f.x=0}
 if(toastT>0){toastT-=dt;if(toastT<=0)$('screenToast').style.opacity='0'}
 if(timeToSave>12){timeToSave=0;save()}checkInteractions();railTick(dt);updateUI();
 const zone=regionName(hero.x);if(UI.place.textContent!==zone){UI.place.textContent=zone;if(railPhase==='travel')toast('NOW ENTERING',zone,2.5);if(zone==='달이 잠든 성당'&&!bossGone)UI.tip.textContent='✦ 잊힌 기사가 마지막 맹세를 지키고 있습니다.';else UI.tip.textContent='✦ 달빛이 길을 기억하고 있습니다.'}
}
function drawCharacter(c,x,y,kind,dir=1,t=0,flash=false){
 const activeWalk=kind==='hero'?Math.min(1,hero.moving||0):.12;const bounce=kind==='hero'?Math.abs(Math.sin(t))*.7*activeWalk+Math.sin(gameTime*1.9)*.24:Math.sin(t)*.45;
 c.save();c.translate(Math.floor(x),Math.floor(y+bounce));c.scale(dir,1);
 disk(c,0,2,10,'#101e29a8');
 if(kind==='hero'){
 rect(c,-6,-23,12,13,flash?'#ffffff':'#515c74');rect(c,-7,-21,14,9,flash?'#ffffff':'#8296a6');rect(c,-4,-25,8,5,'#bfad9a');rect(c,-5,-28,10,5,'#536679');rect(c,1,-19,3,2,'#e4cbab');
 rect(c,-7,-11,14,14,'#36495a');rect(c,-6,-13,13,6,'#acb2b2');rect(c,-4,-8,8,7,'#7f8795');rect(c,-2,-7,4,4,'#d0b78b');
 const stride=Math.sin(t)*2.5*activeWalk;rect(c,-6,-1+stride,5,6,'#222d39');rect(c,2,-1-stride,5,6,'#222d39');rect(c,-9,-12,4,9,'#9b9da1');rect(c,6,-12,4,9,'#959aa8');
 // Layered cloak, jeweled clasp and earned visual upgrades.
 rect(c,-8,-17,4,13,'#a85f65');rect(c,-11,-10,4,9,'#783f52');if(activeWalk>.1)rect(c,-11,-10+Math.sin(t)*2,2,8,'#a76976');rect(c,-10,-4,5,6,'#c27c75');rect(c,-12,-8,2,7,'#e39784');rect(c,-7,-13,2,2,'#e6ba84');
 if((hero.blessings.heart||0)>0){disk(c,-8,-10,8,'#ec9a8a44');rect(c,-12,-7,3,3,'#ffd0ad');rect(c,-9,-17,2,2,'#f3ccaf')}
 rect(c,11,-19,3,18,(hero.blessings.blade||0)>0?'#e6d59e':'#d0d8cf');rect(c,10,-16,2,13,'#f5f0dd');rect(c,8,-4,8,3,'#ad8c65');rect(c,12,-1,2,5,'#766150');
 if((hero.blessings.blade||0)>0){disk(c,11,-18,5,'#e9d6a64c');rect(c,11,-23,2,4,'#fff1c1')}
 // Crafted gear gains details gradually instead of suddenly changing palette.
 for(let i=0;i<Math.min(5,hero.swordLevel);i++){
  rect(c,11,-18-i*3,1+(i%2),2,i<2?'#f6dfa4':i<4?'#b5dff5':'#fff3ce');
 }
 if(hero.swordLevel>=2){rect(c,7,-6,3,2,'#e9c994');rect(c,17,-6,2,2,'#a5ddeb')}
 if(hero.swordLevel>=4){disk(c,12,-30,2,'#cee9f680')}
 for(let i=0;i<Math.min(5,hero.armorLevel);i++){
  rect(c,-5+i*2,-11,1,3,i%2?'#edd7af':'#bfd3db');
  rect(c,-8,-10+i*2,2,1,'#ccb18c');
 }
 if(hero.armorLevel>=2){rect(c,-8,-14,3,2,'#e3d5a9');rect(c,6,-14,3,2,'#e3d5a9')}
 if(hero.armorLevel>=4){rect(c,-6,-20,12,2,'#d6bd86')}
 if((hero.blessings.moon||0)>0){rect(c,-7,-28,3,2,'#a9d9ed');rect(c,2,-29,3,2,'#a9d9ed');disk(c,0,-36,3,'#95cce866')}
 rect(c,-3,-27,2,1,'#f0dec8');rect(c,4,-27,1,1,'#b0bdc9');
 }else if(kind==='edda'){rect(c,-6,-20,12,14,'#d9ba93');rect(c,-7,-24,14,8,'#b6aa9a');rect(c,-8,-13,16,17,'#728b89');rect(c,-10,-4,20,6,'#b0a59b');rect(c,-3,-17,6,3,'#e4cfb1');rect(c,8,-15,2,19,'#a89376');rect(c,7,-20,5,6,'#f3d594')}
 else if(kind==='bram'){rect(c,-7,-21,14,15,'#ae9380');rect(c,-8,-24,16,7,'#8b6e61');rect(c,-9,-13,18,17,'#745950');rect(c,-7,-8,14,9,'#a78e7a');rect(c,-6,2,5,4,'#3e4245');rect(c,3,2,5,4,'#3e4245');rect(c,9,-18,4,19,'#a3aab0')}
 else if(kind==='lune'){rect(c,-7,-21,14,13,'#d2bca9');rect(c,-10,-25,20,11,'#576a82');rect(c,-8,-13,16,18,'#a5a5bf');rect(c,-8,-13,3,15,'#d9b4a4');rect(c,5,-13,3,15,'#768ea1');rect(c,-3,-18,6,3,'#f0d7be')}
 c.restore()}
function drawMonster(c,e){const x=Math.floor(e.x),y=Math.floor(e.y+Math.sin(gameTime*3+e.wobble)*1.1);if(e.dead){c.globalAlpha=clamp(e.deadT,0,1);disk(c,x,y,13,'#495a66');c.globalAlpha=1;return}const blink=e.hitT>0&&Math.floor(gameTime*30)%2===0;const flash=blink?'#e9f0ef':null;
 disk(c,x,y+3,e.r,'#101c28a0');
 if(e.type==='wolf'){rect(c,x-13,y-17,27,16,flash||'#475660');rect(c,x-10,y-13,22,14,flash||'#67727b');polygon(c,[[x-12,y-17],[x-8,y-27],[x-2,y-19]],'#414d59');polygon(c,[[x+3,y-19],[x+10,y-28],[x+13,y-16]],'#414d59');rect(c,x-7,y-13,3,3,'#eab1a1');rect(c,x+5,y-13,3,3,'#eab1a1');rect(c,x-11,y-2,5,6,'#404957');rect(c,x+8,y-2,5,6,'#404957')}
 else if(e.type==='wraith'){polygon(c,[[x-13,y-4],[x-7,y-27],[x+8,y-30],[x+14,y-3],[x+5,y+2],[x-4,y-3]],flash||'#7c91ac');polygon(c,[[x-8,y-8],[x-6,y-26],[x+6,y-27],[x+9,y-8]],'#394e67');rect(c,x-5,y-18,4,2,'#b0dce8');rect(c,x+3,y-18,4,2,'#b0dce8');rect(c,x-9,y-4,3,10,'#677895');rect(c,x+7,y-3,3,10,'#677895')}
 else if(e.type==='guardian'){rect(c,x-15,y-20,30,23,flash||'#60646d');rect(c,x-13,y-22,26,9,'#92939b');rect(c,x-10,y-32,20,15,'#707781');rect(c,x-8,y-34,17,5,'#b6b4ac');rect(c,x-5,y-24,3,2,'#d7aaa4');rect(c,x+4,y-24,3,2,'#d7aaa4');rect(c,x-18,y-13,7,10,'#6c6b72');rect(c,x+12,y-13,7,10,'#6c6b72')}
 else if(e.type==='boss'){disk(c,x,y-15,26,'#6986b022');rect(c,x-18,y-26,36,30,flash||'#64758a');rect(c,x-15,y-28,30,20,'#7c8ca1');rect(c,x-12,y-37,24,16,'#687f94');polygon(c,[[x-14,y-33],[x-7,y-50],[x,y-39],[x+9,y-52],[x+15,y-34]],'#a2a9b0');rect(c,x-8,y-26,6,3,'#b9e6f3');rect(c,x+3,y-26,6,3,'#b9e6f3');rect(c,x-19,y-13,7,13,'#536477');rect(c,x+12,y-13,8,13,'#526073');rect(c,x+19,y-36,4,37,'#c2d4e4');rect(c,x+18,y-40,6,8,'#e6e8eb');rect(c,x+13,y-12,15,4,'#b0a484');rect(c,x-10,y-4,8,11,'#313e4f');rect(c,x+4,y-4,8,11,'#313e4f');}
 if(e.windup>0){const amt=e.windup/(e.windupMax||.8);ctx.strokeStyle=amt<.35?'#f8b9a7':'#d16d82';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y-5,e.range+12,-Math.PI/2,-Math.PI/2+TWO*(1-amt));ctx.stroke()}
 if(e.hp<e.maxHp){rect(c,x-17,y-(e.type==='boss'?59:43),34,4,'#2a2c31');rect(c,x-16,y-(e.type==='boss'?58:42),32*e.hp/e.maxHp,2,e.type==='boss'?'#d49f9a':'#afc6b6')}
}
function drawChest(c,p){const opened=fragmentFlags[p.id],t=gameTime;const x=p.x,y=p.y;if(!opened){const shimmer=.6+.4*Math.sin(t*2+p.id);disk(c,x,y-27,12+2*shimmer,'#a4d6e02b');rect(c,x-9,y-37,18,11,'#a7cad4');rect(c,x-6,y-42,12,5,'#d3edf1');rect(c,x-3,y-49,6,8,'#f4e5c1');rect(c,x-2,y-51,4,4,'#ffffff');if(t%2.7<.8){rect(c,x-21,y-28,3,3,'#d4e7fa');rect(c,x+18,y-36,2,3,'#d4e7fa')}}else {rect(c,x-4,y-33,8,8,'#b6b1a2');rect(c,x-2,y-36,4,4,'#a1c2c8')}}
function drawLantern(c,x,y){rect(c,x-2,y-21,4,24,'#594d47');rect(c,x-6,y-25,12,11,'#9e8160');rect(c,x-4,y-23,8,8,'#f1c58a');rect(c,x-1,y-21,2,5,'#fff4bb');rect(c,x-7,y-26,14,3,'#4b4e4b')}
function drawAmbient(c){const x0=cam.x,y0=cam.y;
 // Moonlight beams with transparent compositing, centered on landmarks.
 for(const [x,y,r,col] of [[294,345,85,'#f3c188'],[485,450,65,'#f7db9c'],[890,250,88,'#b9d9d4'],[1090,325,75,'#a2cee1'],[1580,628,66,'#a6ccdd'],[1880,334,72,'#a3bbf3'],[2290,473,130,'#81acd7']]){if(Math.abs(x-hero.x)>750)continue;let sx=x-x0,sy=y-y0;const grad=c.createRadialGradient(sx,sy,2,sx,sy,r);grad.addColorStop(0,col+'38');grad.addColorStop(1,col+'00');c.fillStyle=grad;c.fillRect(sx-r,sy-r,r*2,r*2)}
 for(const f of flecks){const sx=f.x-x0,sy=f.y-y0;if(sx<0||sy<0||sx>W||sy>H)continue;c.globalAlpha=.24+.5*Math.pow(Math.sin(gameTime*f.tw+f.phase),2);rect(c,sx,sy,f.size,f.size,f.color)}c.globalAlpha=1;
 // Living air: wisps and warm fireflies between stone, forest and chapel.
 for(let i=0;i<42;i++){
  const xx=((i*137.3+Math.sin(gameTime*.3+i)*21)%WW),yy=40+(i*71)%790;
  if(Math.abs(xx-hero.x)>340||Math.abs(yy-hero.y)>230)continue;
  const sx=xx-x0,sy=yy-y0,w=Math.sin(gameTime*1.6+i*1.33);
  c.globalAlpha=.24+.38*Math.abs(w);disk(c,sx,sy,1.1,xx<730?'#f1ca8e':xx<1450?'#c8e8bb':xx<1970?'#d1cde9':'#c0e5fa');
 }c.globalAlpha=1;
 // small moving drizzle near the woods and cathedral
 const region=hero.x; if(region>700){c.globalAlpha=.15;for(let i=0;i<48;i++){let x=((i*77.3+gameTime*(region>1900?24:14))%600)-70,y=((i*43+gameTime*38+i*3)%335)-30;line(c,x,y,x-3,y+8,'#a1b9c8',.6)}c.globalAlpha=1}
}
function drawGame(){ctx.clearRect(0,0,W,H);const tx=clamp(hero.x-W*.5,0,WW-W),ty=clamp(hero.y-H*.56,0,WH-H);const ease=scene==='menu'?.14:1-Math.exp(-Math.min(.05,frameDelta||.016)*6.8);cam.x+=(tx-cam.x)*ease;cam.y+=(ty-cam.y)*ease;const X=Math.floor(cam.x),Y=Math.floor(cam.y);
 ctx.drawImage(terrain,X,Y,W,H,0,0,W,H);
 drawAmbient(ctx);
 ctx.save();ctx.translate(-X,-Y);
 if(window.LB_VISUALS)window.LB_VISUALS.drawLivingWorld(ctx,cam,hero,gameTime,railPhase);
 for(const [x,y] of [[78,500],[637,528],[875,475],[1456,490],[2070,469]])drawLantern(ctx,x,y);
 for(const p of chests)if(Math.abs(p.x-hero.x)<450)drawChest(ctx,p);
 for(const npc of npcPositions){if(Math.abs(npc.x-hero.x)>460)continue;drawCharacter(ctx,npc.x,npc.y,npc.id,1,Math.sin(gameTime*2+npc.x)*.9);if(dist(npc,hero)<116){disk(ctx,npc.x,npc.y-40,8,'#142634');ctx.font='bold 12px Georgia';ctx.textAlign='center';ctx.fillStyle='#ebd2a0';ctx.fillText('!',npc.x,npc.y-36)}}
 for(const e of entities)if(!e.dead||e.deadT>0)if(Math.abs(e.x-hero.x)<540)drawMonster(ctx,e);
 if(hero.inv<=0||Math.floor(gameTime*15)%2===0){drawCharacter(ctx,hero.x,hero.y,'hero',hero.face,hero.walk,hero.atkSwing>.09);if(window.LB_VISUALS)window.LB_VISUALS.drawHeroDetails(ctx,hero,gameTime);}
 if(hero.atkSwing>0){ctx.globalAlpha=hero.atkSwing/.21;ctx.save();ctx.translate(hero.x,hero.y-13);ctx.scale(hero.face,1);ctx.strokeStyle='#ebead1';ctx.lineWidth=3;ctx.beginPath();ctx.arc(1,0,30,-1.2,.75);ctx.stroke();ctx.strokeStyle='#98cce4';ctx.lineWidth=2;ctx.beginPath();ctx.arc(1,0,36,-1.25,.4);ctx.stroke();ctx.restore();ctx.globalAlpha=1}
 if(railPhase==='battle'){
   ctx.save();ctx.strokeStyle='#a7d7e877';ctx.lineWidth=1.2;ctx.setLineDash([5,8]);ctx.beginPath();ctx.ellipse(combatCenter.x,combatCenter.y-3,177,124,0,0,TWO);ctx.stroke();ctx.setLineDash([]);
   entities.filter(e=>!e.dead&&e.windup>0).forEach(e=>{const r=e.rangedWindup?20:e.range+17;const gx=e.windupX??e.x,gy=e.windupY??e.y,part=clamp(1-e.windup/(e.windupMax||.8),0,1);ctx.fillStyle='#d46f6350';ctx.beginPath();ctx.ellipse(gx,gy-2,r,r*.66,0,0,TWO);ctx.fill();ctx.strokeStyle=part>.7?'#ffdd9a':'#de998d';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(gx,gy-2,r,r*.66,0,0,TWO);ctx.stroke();ctx.fillStyle='#f0c5a7';ctx.fillRect(gx-2,gy-2,4,4);});
   ctx.restore();
 }
 for(const s of shines){const prog=1-s.life/s.max;ctx.globalAlpha=1-prog;ctx.lineWidth=2.2;ctx.strokeStyle=s.color;ctx.beginPath();ctx.ellipse(s.x,s.y-4,Math.max(6,s.r*prog),Math.max(3,s.r*prog*.55),0,0,TWO);ctx.stroke();ctx.globalAlpha=1}
 for(const b of shots){disk(ctx,b.x,b.y-10,7,'#9dc8e666');disk(ctx,b.x,b.y-10,3,'#d4f0fc')}
 for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);rect(ctx,p.x,p.y,p.size,p.size,p.color)}ctx.globalAlpha=1;
 for(const p of floatText){ctx.globalAlpha=Math.min(1,p.life*2);ctx.fillStyle='#0a1424';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText(p.txt,p.x+1,p.y+1);ctx.fillStyle=p.color;ctx.fillText(p.txt,p.x,p.y);ctx.globalAlpha=1}
 // A hand-authored moonlight route makes the next destination unmistakable.
 if(railPhase==='travel'&&railGoal){
  const a=Math.atan2(railGoal.y-hero.y,railGoal.x-hero.x),d=dist(railGoal,hero);
  ctx.save();for(let j=0;j<17;j++){
   const away=16+j*clamp(d/17,4,13),px=hero.x+Math.cos(a)*away,py=hero.y+Math.sin(a)*away;
   const k=.45+.55*Math.sin(gameTime*2.7-j*.45)**2;
   if(!isBlocked(px,py)){disk(ctx,px,py,1+j%3,k>.6?'#f4e3a7':'#9bc9dc');if(j%4===0){ctx.fillStyle='#f7e8c7';ctx.font='10px Georgia';ctx.textAlign='center';ctx.fillText('✧',px,py-8)}}
  }ctx.restore();
  const halo=.7+.3*Math.sin(gameTime*3);disk(ctx,railGoal.x,railGoal.y-13,15*halo,'#c3def734');ctx.fillStyle='#ffe4a6';ctx.font='bold 20px Georgia';ctx.textAlign='center';ctx.fillText('✧',railGoal.x,railGoal.y-18);
 }
 // Quest direction: a softly pulsing waypoint at the edge of the screen.
 let marker=null;if(questStage===0||questStage===2||questStage===4)marker=npcPositions[0];else if(questStage===1)marker=chests.find(p=>!fragmentFlags[p.id]);else if(questStage===3&&!bossGone)marker=entities.find(e=>e.type==='boss'&&!e.dead);if(marker&&railPhase==='free'){const d=dist(marker,hero);if(d>130){const a=Math.atan2(marker.y-hero.y,marker.x-hero.x),sx=hero.x+Math.cos(a)*Math.min(174,d),sy=hero.y+Math.sin(a)*Math.min(95,d);disk(ctx,sx,sy,7,'#b5cdd488');ctx.fillStyle='#f5dfac';ctx.font='13px Georgia';ctx.textAlign='center';ctx.fillText('◇',sx,sy+4)}}
 ctx.restore();
 // Dynamic low-contrast twilight layer.
 const v=ctx.createLinearGradient(0,0,0,H);v.addColorStop(0,'#09152518');v.addColorStop(.7,'#20314700');v.addColorStop(1,'#0b142b18');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
 // Skylight dust overlays foreground at small scale
 for(let i=0;i<12;i++){const x=((i*59+gameTime*4*(i%3+1))%(W+20))-10,y=(i*71+Math.sin(gameTime*.8+i)*10)%H;if(i%3===0){ctx.globalAlpha=.24+.17*Math.sin(gameTime+i);rect(ctx,x,y,1,1,'#e8cf9c')}}ctx.globalAlpha=1;
}
// Audio: minimal original ambient tones and action chimes; all generated with WebAudio.
let ac=null,master=null,musicTick=0,nextMusic=0;const fantasyBgm=new Audio('audio/the-bells-beyond-the-vale.ogg');fantasyBgm.loop=true;fantasyBgm.volume=.37;fantasyBgm.preload='none';
function audioInit(){if(!audioOn)return;if(fantasyBgm.paused)fantasyBgm.play().catch(()=>{});try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();if(!master){master=ac.createGain();master.gain.value=.16;master.connect(ac.destination)}}catch(err){ac=null}}
function tone(freq,dur=.32,vol=.2,type='sine',delay=0){if(!ac||!audioOn)return;try{const o=ac.createOscillator(),v=ac.createGain();o.type=type;o.frequency.setValueAtTime(freq,ac.currentTime+delay);v.gain.setValueAtTime(0,ac.currentTime+delay);v.gain.linearRampToValueAtTime(vol,ac.currentTime+delay+.025);v.gain.exponentialRampToValueAtTime(.001,ac.currentTime+delay+dur);o.connect(v);v.connect(master);o.start(ac.currentTime+delay);o.stop(ac.currentTime+delay+dur+.04)}catch(err){}}
function chime(freq=670){audioInit();tone(freq,.33,.10);tone(freq*1.5,.38,.038,'sine',.09)}
function pageTurnSfx(){if(!ac||!audioOn)return;tone(310,.085,.028,'triangle');tone(420,.115,.015,'sine',.045)}
function sfx(type){if(!ac)return; if(type==='slash'){tone(190,.075,.13,'triangle');tone(340,.09,.12,'sawtooth',.02)}else if(type==='hurt')tone(94,.28,.28,'triangle');else if(type==='spell'){tone(440,.65,.25);tone(660,.85,.12,'sine',.18)}else if(type==='dodge'){tone(220,.09,.075,'sine');tone(440,.13,.038,'triangle',.025)}else if(type==='death')tone(270,.23,.1,'triangle')}
function playBell(){audioInit();for(let i=0;i<4;i++){tone(185*(i===3?2:1),3,.3,'sine',i*1.2);tone(370*(i===3?2:1),2.6,.11,'sine',i*1.2+.04)}}
function music(dt){if(!audioOn&&!fantasyBgm.paused)fantasyBgm.pause();}
// Input / HUD
const keys={up:false,down:false,left:false,right:false};
function gameCoords(e){const b=canvas.getBoundingClientRect();return {x:(e.clientX-b.left)/b.width*W,y:(e.clientY-b.top)/b.height*H}}
function handleTap(e){if(scene!=='play'||railPhase!=='free')return;const pt=gameCoords(e),world={x:clamp(cam.x+pt.x,0,WW),y:clamp(cam.y+pt.y,0,WH)};const npc=npcPositions.find(n=>dist(n,world)<32);if(npc){setGoal(npc.x,npc.y,npc);if(dist(hero,npc)<45)checkInteractions();return}const enemy=entities.find(n=>!n.dead&&dist(n,world)<38);if(enemy){setGoal(enemy.x,enemy.y,enemy);return}const chest=chests.find(c=>!fragmentFlags[c.id]&&dist(c,world)<40);if(chest){setGoal(chest.x,chest.y,chest);return}setGoal(world.x,world.y)}
canvas.addEventListener('pointerdown',e=>{if(scene==='play'&&railPhase==='battle'){if(gameCoords(e).x<W*.6){thumb.active=true;thumb.pointer=e.pointerId;thumb.originX=e.clientX;thumb.originY=e.clientY;thumb.x=thumb.y=0;canvas.setPointerCapture(e.pointerId);}return;}if(scene!=='play'||railPhase!=='free')return;canvas.setPointerCapture(e.pointerId);const p=gameCoords(e);pointer=p;pointerDown=true;handleTap(e)});
canvas.addEventListener('pointermove',e=>{if(scene==='play'&&railPhase==='battle'&&thumb.active&&thumb.pointer===e.pointerId){const dx=e.clientX-thumb.originX,dy=e.clientY-thumb.originY,len=Math.max(1,Math.hypot(dx,dy)),scale=Math.min(1,len/46);thumb.x=dx/len*scale;thumb.y=dy/len*scale;return;}if(!pointerDown||scene!=='play')return;pointer=gameCoords(e)});
const pointerRelease=()=>{pointerDown=false;if(thumb.active)clearThumb()};canvas.addEventListener('pointerup',pointerRelease);canvas.addEventListener('pointercancel',pointerRelease);window.addEventListener('blur',pointerRelease);
window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(['arrowup','w'].includes(key))keys.up=true;if(['arrowdown','s'].includes(key))keys.down=true;if(['arrowleft','a'].includes(key))keys.left=true;if(['arrowright','d'].includes(key))keys.right=true;if([' ','enter','escape','arrowup','arrowdown','arrowleft','arrowright'].includes(key))e.preventDefault();if(e.repeat)return;if(key===' '&&scene==='play')attackSword();if(key==='q'&&scene==='play')useSkill();if((key==='shift'||key==='f')&&scene==='play')dodge();if(key==='tab'&&scene==='play'){e.preventDefault();cycleSpell();}if(key==='e'&&scene==='play'){let near=npcPositions.filter(n=>dist(n,hero)<58).sort((a,b)=>dist(a,hero)-dist(b,hero))[0];if(near)talkNpc(near)}if(key==='escape'){if(scene==='panel')closePanel();else if(scene==='play')showPause();else if(scene==='dialog')$('dialogNext').click()}if(key==='m'&&scene==='play')showMap();if(key==='i'&&scene==='play')showJournal()});
window.addEventListener('keyup',e=>{const key=e.key.toLowerCase();if(['arrowup','w'].includes(key))keys.up=false;if(['arrowdown','s'].includes(key))keys.down=false;if(['arrowleft','a'].includes(key))keys.left=false;if(['arrowright','d'].includes(key))keys.right=false});
UI.skill.onclick=()=>{audioInit();useSkill()};$('spellSwitch').onclick=()=>{audioInit();cycleSpell()};$('attackButton').onclick=()=>{audioInit();attackSword()};$('dodgeButton').onclick=()=>{audioInit();dodge()};
const stick=$('movePad'),stickNub=$('stickNub');
function stickUpdate(e){const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;const dx=e.clientX-cx,dy=e.clientY-cy,l=Math.max(1,Math.hypot(dx,dy)),scale=Math.min(1,l/(r.width*.34));thumb.x=dx/l*scale;thumb.y=dy/l*scale;stickNub.style.transform=`translate(calc(-50% + ${thumb.x*31}px),calc(-50% + ${thumb.y*31}px))`;}
stick.addEventListener('pointerdown',e=>{if(scene!=='play'||railPhase!=='battle')return;e.preventDefault();stick.setPointerCapture(e.pointerId);thumb.active=true;thumb.pointer=e.pointerId;stickUpdate(e)});
stick.addEventListener('pointermove',e=>{if(thumb.active&&thumb.pointer===e.pointerId)stickUpdate(e)});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(ev,clearThumb);$('mapBtn').onclick=()=>{if(scene==='play')showMap()};$('bagBtn').onclick=()=>{if(scene==='play')showJournal()};$('pauseBtn').onclick=()=>{if(scene==='play')showPause()};$('panelClose').onclick=closePanel;
function showJournal(){const fragments=fragmentFlags.filter(Boolean).length;const note=questStage<2?'달의 조각이 흩어져 있습니다.':questStage<4?'종의 울림이 성당에서 기다리고 있습니다.':'종의 울림이 다시 돌아왔습니다.';const html=`<div class="panelRow"><span>여행자</span><strong>Lv. ${hero.level}</strong></div><div class="panelRow"><span>검의 위력</span><strong>${hero.damage}</strong></div><div class="panelRow"><span>장비 외형</span><strong>검 +${hero.swordLevel} · 갑옷 +${hero.armorLevel}</strong></div><div class="panelRow"><span>배운 마법</span><strong>${unlockedSpells().map(sk=>sk.name).join(' · ')}</strong></div><div class="panelRow"><span>월광의 조각</span><strong>${fragments} / 3</strong></div><div class="panelRow"><span>현재 은화</span><strong>✦ ${hero.gold}</strong></div><p>“${note}”</p><p class="tiny">서약의 기록: ${(hero.oaths||[]).length}개 · 여정의 장면: ${railIndex+1} / ${RAIL_STOPS.length}</p><p><strong>${questData[questStage][0]}</strong><br>${questData[questStage][1]}</p><p class="tiny">기록은 12초마다 자동 저장됩니다. 전투는 직접 검격 버튼을 누르고 마법을 선택해 진행합니다. 성장에 따라 마법이 해금됩니다.</p>`;openPanel('여정 일지',html,'A TALE IN SILVER AND ASH')}
function showMap(){const html=`<p>달빛이 정해진 길로 이끕니다. 지도는 현재 위치와 여정의 주요 장면을 보여줍니다.</p><canvas id="mapView" width="530" height="185"></canvas><div class="panelRow"><span>◇ 미회수 달의 조각</span><strong>${fragmentFlags.filter(Boolean).length} / 3</strong></div><p class="tiny">푸른 빛 점이 현재 위치입니다. 다음 장면으로 자동 이동합니다.</p>`;openPanel('찢어진 고지도',html,'THE LANDS OF ELDEN',node=>{const m=node.querySelector('canvas'),c=m.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(terrain,0,0,WW,WH,0,0,530,185);c.fillStyle='#09152266';c.fillRect(0,0,530,185);for(const p of chests){if(fragmentFlags[p.id])continue;c.fillStyle='#f6dba1';c.font='bold 17px serif';c.fillText('◇',p.x/WW*530,p.y/WH*185)}for(const n of npcPositions){c.fillStyle='#e3c599';c.fillRect(n.x/WW*530-2,n.y/WH*185-2,4,4)}c.fillStyle='#c9ebff';c.beginPath();c.arc(hero.x/WW*530,hero.y/WH*185,4,0,TWO);c.fill();c.strokeStyle='#0c263e';c.lineWidth=1.5;c.stroke();m.addEventListener('click',()=>{closePanel();toast('길잡이의 노래','이동은 이야기 진행에 따라 자동으로 이루어집니다',2.5)})})}
function showPause(){openPanel('밤의 쉼터',`<p>조용한 밤길에서 잠시 발걸음을 멈췄습니다.</p><div class="panelRow"><span>진행 상황</span><strong>자동 저장 중</strong></div><button id="soundToggle" class="upgrade">♫ 배경 음악: ${audioOn?'켜짐':'꺼짐'}</button><button id="backTitle" class="upgrade">⌂ 시작 화면으로 돌아가기</button><p class="tiny">이야기는 자동 이동 · 전투는 왼쪽 스틱/드래그로 이동, 검격·마법·달걸음. 완벽 회피 후 쌓인 공명은 검격을 강화합니다.</p>`,'PAUSE · THE LAST BELL',node=>{node.querySelector('#soundToggle').onclick=()=>{audioOn=!audioOn;node.querySelector('#soundToggle').textContent='♫ 배경 음악: '+(audioOn?'켜짐':'꺼짐');if(audioOn)audioInit();else fantasyBgm.pause()};node.querySelector('#backTitle').onclick=()=>{save();closePanel();showMenu()}})}
function startGame(continued){if(continued){if(!load())reset();}else reset();initMonsters();UI.menu.classList.add('hidden');active=true;scene='play';paused=false;audioInit();hero.x=railIndex===0?250:hero.x;hero.y=railIndex===0?460:hero.y;cam.x=clamp(hero.x-W/2,0,WW-W);cam.y=clamp(hero.y-H*.56,0,WH-H);bumpQuest();UI.place.textContent=regionName(hero.x);if(railIndex===10&&questStage===5){setRail(CHRONICLE.length?INTRO_STOPS:10);if(!CHRONICLE.length){railPhase='done';showEnding();}return;}if(!continued){setRail(0);prologueActive=true;prologueTime=0;openingUpdate(.01)}else{setRail(railIndex);if(pendingLevels>0)maybeLevelUp()}}
function showMenu(){UI.menu.classList.remove('hidden');scene='menu';paused=true;$('continueBtn').classList.toggle('hidden',!hasSave())}
$('routeAction').onclick=()=>{if(scene!=='play')return;audioInit();if(railPhase==='idle'){setRail(railIndex);return;}if(railPhase==='travel'){setGoal(railGoal.x,railGoal.y);toast('✦ 다음 장면',RAIL_LABELS[railIndex]+'(으)로 자동 이동합니다',2.6)}else if(railPhase==='battle'){attackSword()}else if(railPhase==='done')showEnding();else toast('달빛의 길','대화를 이어가면 다음 장면으로 이동합니다',2.5)};
$('startBtn').onclick=()=>{try{localStorage.removeItem(SKEY)}catch(e){}startGame(false)};$('continueBtn').onclick=()=>startGame(true);
// generate a few quietly glowing fireflies, including night fog drifting in shallow swirls
function boot(){generateTerrain();if(window.LB_VISUALS)window.LB_VISUALS.decorateTerrain(g,{width:WW,height:WH,rnd,roadY});makeGrid();flecks=Array.from({length:155},(_,i)=>({x:rnd(i,31,21)*WW,y:rnd(i,32,11)*WH,vx:2+rnd(i,35)*9,vy:1+rnd(i,34)*3,tw:.5+rnd(i,8)*1.3,phase:rnd(i,3)*TWO,size:rnd(i,49)>.8?2:1,color:rnd(i,18)>.45?'#d9deb0':'#a4d4d4'}));initMonsters();$('continueBtn').classList.toggle('hidden',!hasSave());UI.place.textContent='잿빛 마을, 엘든';updateUI();drawGame();requestAnimationFrame(frame)}
if(location.search.includes('lastbell-test'))window.__lastBellTest={tick:dt=>{update(dt);drawGame()},getState:()=>({railIndex,railPhase,questStage,hero:{...hero},entities:entities.filter(e=>!e.dead).length,pendingLevels,scene,selectedSpell:currentSpell().name,spellCount:unlockedSpells().length,moving:hero.moving,velocity:Math.hypot(hero.vx,hero.vy)}),next:()=>{if(railPhase==='travel'){hero.x=railGoal.x;hero.y=railGoal.y;railArrival()}},win:()=>{if(railPhase==='battle'){entities.filter(e=>!e.dead).forEach(e=>hitEnemy(e,9999))}},choice:()=>{const b=document.querySelector('[data-choice]');if(b)b.click()}};
function frame(t){const dt=clamp((t-last)/1000||.016,0,.042);last=t;frameDelta=dt;update(dt);music(dt);drawGame();requestAnimationFrame(frame)}
boot();
})();