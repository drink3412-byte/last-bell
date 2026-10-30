
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
let W=480,H=270;const WW=2520,WH=880,TWO=Math.PI*2;
function resizeWorld(){const a=innerWidth/Math.max(1,innerHeight);if(a<1){W=440;H=Math.min(768,Math.max(330,Math.round(W/a)))}else{W=480;H=Math.max(270,Math.min(490,Math.round(W/a)))}canvas.width=W;canvas.height=H;ctx.imageSmoothingEnabled=false;}
resizeWorld();window.addEventListener('resize',()=>{resizeWorld();if(active)drawGame()});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const rnd=(x,y,s=0)=>{let h=(Math.imul(x+Math.imul(y,17)+s,1597334677)^0x9e3779b9)|0; h^=h>>>15;h=Math.imul(h,2246822519);h^=h>>>13;return (h>>>0)/4294967295};
const rand=(min,max)=>min+Math.random()*(max-min);
let paused=true, active=false, scene='menu', gameTime=0, last=0, cam={x:0,y:0},timeToSave=0;
let entities=[],decor=[],colliders=[],particles=[],flecks=[],floatText=[],shines=[],shots=[];
let autoGoal=null, followTarget=null, destination=null, waypointPath=[], pointerDown=false,pointer={x:0,y:0};
let toastT=0,phaseBanner='',phaseT=0,questStage=0,fragmentFlags=[false,false,false], loreGift=false, bossGone=false, audioOn=true;
const SKEY='last-bell-save-v3';
let railIndex=0,railPhase='idle',railGoal=null,railTimer=0,railStuck=0,railLastD=Infinity,railClear=0,pendingLevels=0;
const railNames=['종지기의 부름','안개숲의 첫 시련','속삭임의 제단','숲을 지키는 그림자','오래된 병사의 비석','폐허의 망령들','푸른 달의 유적','마을로 돌아온 빛','성당 앞의 맹세','달의 기사','새벽을 부르는 종'];
const railStops=[[394,466],[833,487],[1055,335],[1360,469],[1582,585],[1748,467],[1842,341],[400,466],[2094,469],[2235,460],[400,466]];
const hero={x:250,y:460,face:1,hp:120,maxHp:120,mp:100,maxMp:100,gold:12,level:1,xp:0,damage:15,swordLevel:0,armorLevel:0,blessings:{blade:0,heart:0,moon:0},atkT:0,atkSwing:0,atkCombo:0,skillT:0,inv:0,lastHurt:0,walk:0,shadow:0,speed:108};
const npcPositions=[{id:'edda',x:422,y:465,name:'에다',title:'마지막 종지기',color:'#ccb198'}, {id:'bram',x:361,y:640,name:'브람',title:'방랑 대장장이',color:'#d1a175'},{id:'lune',x:585,y:320,name:'루네',title:'길 잃은 여행자',color:'#aabbe2'}];
const chests=[{id:0,x:1090,y:328,label:'속삭임 숲의 제단'},{id:1,x:1580,y:628,label:'잊힌 병사의 비석'},{id:2,x:1880,y:334,label:'푸른 달의 유적'}];
const regionName=x=>x<730?'잿빛 마을, 엘든':x<1460?'속삭임 숲':x<1970?'잊힌 왕국의 폐허':'달이 잠든 성당';
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
 for(let y=0;y<WH;y+=16)for(let x=0;x<WW;x+=16){const zone=x<730?0:x<1460?1:x<1970?2:3;const palettes=[['#334e4d','#365552','#3b5753','#3e5551'],['#234348','#24494b','#2a4d50','#304b4b'],['#35424c','#3b464f','#3e4d57','#394954'],['#303b49','#343c4d','#3a4051','#3d4552']][zone];rect(g,x,y,16,16,palettes[Math.floor(rnd(x,y,39)*4)]);if(rnd(x,y,12)>.34){rect(g,x+Math.floor(rnd(x,y,13)*12),y+Math.floor(rnd(x,y,15)*12),2,2,'#5e6b6270')}}
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
 // Fine-tuned environmental pixels, rune gravel, moss and reflected starlight.
 for(let i=0;i<440;i++){const x=20+rnd(i,127,31)*(WW-42),y=22+rnd(i,71,29)*(WH-44);
 if(Math.abs(y-roadY(x))<38)continue;const z=x<730?0:x<1450?1:x<1980?2:3;
 if(z===0){rect(g,x,y,3,1,'#bca67a');rect(g,x+4,y-2,1,2,'#87a79b');if(i%7===0)pixelFlower(g,x+7,y+2,1)}
 else if(z===1){rect(g,x,y,5,1,['#496963','#80a6a0','#536c6b'][i%3]);rect(g,x+3,y-3,2,1,'#a1b4a1');if(i%11===0)disk(g,x,y,6,'#567e7850')}
 else if(z===2){rect(g,x,y,7,2,'#82919a66');rect(g,x-2,y+2,5,1,'#233b4e');if(i%9===0)disk(g,x,y,3,'#9fb5c06a')}
 else {rect(g,x,y,8,1,'#7a859577');if(i%13===0){rect(g,x-3,y-3,9,7,'#8497ac35');rect(g,x,y,2,2,'#c6c7c1')}}}
 for(const [cx,cy] of [[1090,328],[1580,628],[1880,334]]){
 for(let a=0;a<12;a++){const th=a*TWO/12,px=cx+Math.cos(th)*43,py=cy+Math.sin(th)*29;rect(g,px,py,3,2,'#c6ae8a');if(a%3===0)rect(g,px+4,py-3,2,2,'#99c7d7')}}
 // shrines and decals
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
 const simplified=[];for(let i=0;i<nodes.length;i++){const a=nodes[i-1],b=nodes[i],c=nodes[i+1];if(!a||!c){simplified.push(b);continue}const ax=Math.sign(b.x-a.x),ay=Math.sign(b.y-a.y),bx=Math.sign(c.x-b.x),by=Math.sign(c.y-b.y);if(ax!==bx||ay!==by||i%5===0)simplified.push(b)}return simplified;
}
function setGoal(x,y,thing=null){x=clamp(x,20,WW-20);y=clamp(y,20,WH-20);followTarget=thing;const target=thing||{x,y};destination={x:target.x,y:target.y};autoGoal=destination;waypointPath=pathTo(destination);}
function moveTry(dx,dy){const nx=hero.x+dx,ny=hero.y+dy;if(!isBlocked(nx,ny)) {hero.x=nx;hero.y=ny;return true}let moved=false;if(!isBlocked(nx,hero.y)){hero.x=nx;moved=true}if(!isBlocked(hero.x,ny)){hero.y=ny;moved=true}return moved}
function spawnMonster(type,x,y,id){const stats=type==='wolf'?{hp:43,speed:30,damage:9,r:12,range:23,exp:15}:type==='wraith'?{hp:62,speed:25,damage:11,r:12,range:24,exp:24}:type==='guardian'?{hp:92,speed:19,damage:15,r:15,range:27,exp:39}:{hp:370,speed:27,damage:18,r:23,range:37,exp:140};let e={id:id||'e'+Math.random(),type,x,y,homeX:x,homeY:y,hp:stats.hp,maxHp:stats.hp,speed:stats.speed,damage:stats.damage,r:stats.r,range:stats.range,exp:stats.exp,dead:false,deadT:0,attack:0,windup:0,aggro:0,wobble:Math.random()*TWO,hitT:0,stun:0,summoned:false,phase:0};entities.push(e);return e}
function initMonsters(){entities=[];shots=[];} // scripted encounters only
function makeParticles(x,y,n,colors,vel=1){for(let i=0;i<n;i++){const a=rand(0,TWO),speed=rand(15,63)*vel;particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-12,life:rand(.36,.95),max:.95,size:rand(1,3.5),color:colors[Math.floor(rand(0,colors.length))]})}}
function floating(x,y,label,col='#f1e5b5',life=1.2){floatText.push({x,y,txt:label,color:col,life,max:life})}
function pulse(x,y,r,col='#a0cffb'){shines.push({x,y,r,life:.4,max:.4,color:col})}
function toast(top,msg,sec=3){$('toastTop').textContent=top;$('toastMsg').textContent=msg;toastT=sec;$('screenToast').style.opacity='1'}
function bumpQuest(){let [q,detail]=questData[questStage];if(questStage===1)detail=`월광의 조각 ${fragmentFlags.filter(Boolean).length} / 3 · 지도에서 ◇를 찾으세요.`;UI.questTitle.textContent=q;UI.questDetail.textContent=detail;updateUI();save()}
function updateUI(){UI.hpFill.style.width=(100*hero.hp/hero.maxHp)+'%';UI.hpValue.textContent=Math.ceil(hero.hp)+' / '+hero.maxHp;UI.mpFill.style.width=(100*hero.mp/hero.maxMp)+'%';UI.mpValue.textContent=Math.floor(hero.mp)+' / '+hero.maxMp;UI.money.textContent='✦ '+hero.gold;const remain=hero.skillT;UI.cooldown.classList.toggle('hidden',remain<=0);if(remain>0)UI.cooldown.textContent=Math.ceil(remain)+'s';UI.skill.classList.toggle('skillReady',remain<=0);}
function save(){try{localStorage.setItem(SKEY,JSON.stringify({hero:{x:hero.x,y:hero.y,hp:hero.hp,maxHp:hero.maxHp,mp:hero.mp,maxMp:hero.maxMp,gold:hero.gold,level:hero.level,xp:hero.xp,damage:hero.damage,swordLevel:hero.swordLevel,armorLevel:hero.armorLevel},questStage,fragmentFlags,loreGift,bossGone}))}catch(e){}}
function hasSave(){try{return!!localStorage.getItem(SKEY)}catch(e){return false}}
function load(){try{const state=JSON.parse(localStorage.getItem(SKEY));if(!state)return false;Object.assign(hero,state.hero||{});questStage=state.questStage||0;fragmentFlags=state.fragmentFlags||[false,false,false];loreGift=!!state.loreGift;bossGone=!!state.bossGone;return true}catch(e){return false}}
function reset(){Object.assign(hero,{x:250,y:460,hp:120,maxHp:120,mp:100,maxMp:100,gold:12,level:1,xp:0,damage:15,swordLevel:0,armorLevel:0,atkT:0,skillT:0,inv:0});questStage=0;fragmentFlags=[false,false,false];loreGift=false;bossGone=false;autoGoal=null;followTarget=null;waypointPath=[];initMonsters();}
function dialog(name,lines,done){if(typeof lines==='string')lines=[lines];scene='dialog';paused=true;autoGoal=null;waypointPath=[];const box=UI.dialog;box.classList.remove('hidden');let idx=0;function show(){box.querySelector('#dialogName').textContent=name;box.querySelector('#dialogText').textContent=lines[idx];$('dialogNext').textContent=idx<lines.length-1?'계속 ▸':'닫기 ◇'}show();$('dialogNext').onclick=()=>{chime(440+idx*90);if(++idx<lines.length){show()}else{box.classList.add('hidden');scene='play';paused=false;if(done)done();}}}
function openPanel(title,contents,kicker='TRAVELER\'S JOURNAL',onOpen){scene='panel';paused=true;UI.panel.classList.remove('hidden');$('panelKicker').textContent=kicker;$('panelTitle').textContent=title;const node=$('panelContent');node.innerHTML=contents;$('panelClose').onclick=closePanel;if(onOpen)onOpen(node)}
function closePanel(){UI.panel.classList.add('hidden');scene='play';paused=false;save()}
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
function hurt(amount,enemy){if(hero.inv>0||scene!=='play')return;hero.hp=Math.max(0,hero.hp-amount);hero.inv=.58;hero.lastHurt=gameTime;makeParticles(hero.x,hero.y-8,7,['#b94d5a','#c89078','#d1c1aa']);floating(hero.x,hero.y-24,'−'+amount,'#ffaaa3');sfx('hurt');if(enemy){const a=Math.atan2(hero.y-enemy.y,hero.x-enemy.x);moveTry(Math.cos(a)*11,Math.sin(a)*11)} if(hero.hp<=0){autoGoal=null;followTarget=null;waypointPath=[];scene='dialog';paused=true;dialog('기억의 불씨',["잠깐, 눈을 감았을 뿐입니다. 이야기가 끝난 것은 아니에요.","낯선 바람이 당신을 엘든의 모닥불 곁으로 데려옵니다. 잃은 것은 약간의 은화뿐, 달빛의 조각은 그대로입니다."],()=>{hero.hp=hero.maxHp;hero.mp=hero.maxMp;hero.gold=Math.max(0,hero.gold-12);hero.inv=2;entities=[];startRail(railIndex);toast('기억의 불씨','현재 장면에서 다시 시작합니다',4);save()})}}
function awardRailXp(v){hero.xp+=v;let req=35+hero.level*25;while(hero.xp>=req){hero.xp-=req;hero.level++;hero.maxHp+=8;hero.hp=hero.maxHp;hero.mp=hero.maxMp;pendingLevels++;req=35+hero.level*25;toast('LEVEL UP','레벨 '+hero.level+' · 원하는 능력을 선택하세요',3);makeParticles(hero.x,hero.y-18,35,['#d9e7c1','#f1d7a1','#c5d5ee'],2)}}
function hitEnemy(e,amount,skill=false){if(e.dead)return;e.hp=Math.max(0,e.hp-amount);e.hitT=.17;e.aggro=5;e.stun=skill?.45:.08;makeParticles(e.x,e.y-12,skill?15:7,skill?['#c5dcff','#a1c9ef','#e6d4b3']:['#e6b68f','#e7d8bc','#9a9da2'],skill?1.5:1);floating(e.x,e.y-23,'−'+amount,skill?'#addbff':'#f1daae');if(e.hp<=0){e.dead=true;e.deadT=1;const amountGold=e.type==='boss'?68:e.type==='guardian'?14:e.type==='wraith'?8:5;hero.gold+=amountGold;awardRailXp(e.exp);floating(e.x,e.y-39,'✦ '+amountGold,'#ffdc9a',1.5);if(e.type==='boss')bossVictory();else if(Math.random()<.25){hero.hp=clamp(hero.hp+12,0,hero.maxHp);floating(hero.x,hero.y-28,'♥ +12','#9ce9b9')}sfx('death');save()}else{sfx(skill?'spell':'slash')}}
function useSkill(){if(scene!=='play'||hero.skillT>0)return;if(hero.mp<40){toast('마력이 부족합니다','잠시 지나면 마력이 회복됩니다',1.8);return;}hero.mp-=40;hero.skillT=Math.max(3.7,6.7-(hero.blessings.moon||0)*.85);hero.inv=Math.max(hero.inv,.3);pulse(hero.x,hero.y,105,'#a2d7ff');makeParticles(hero.x,hero.y-8,45,['#c9e7fd','#b4c9f5','#f0e1b6','#709eca'],2.2);for(const e of entities)if(!e.dead&&dist(hero,e)<110){hitEnemy(e,38+hero.level*5+hero.swordLevel*3,true);const a=Math.atan2(e.y-hero.y,e.x-hero.x);e.x+=Math.cos(a)*15;e.y+=Math.sin(a)*15}chime(750);sfx('spell');updateUI()}
function checkInteractions(){if(scene!=='play'||railPhase!=='free')return;for(const chest of chests)if(!fragmentFlags[chest.id]&&dist(hero,chest)<32){pickChest(chest);return}if(followTarget){const targ=followTarget,near=dist(hero,targ);if(targ.id&&npcPositions.includes(targ)&&near<43){followTarget=null;waypointPath=[];autoGoal=null;talkNpc(targ)}else if(targ.id==='bellknight'&&near<45){followTarget=null;waypointPath=[];autoGoal=null;}else if(targ.type&&near<43){followTarget=null;waypointPath=[];autoGoal=null}}}
function update(dt){if(paused)return;gameTime+=dt;timeToSave+=dt;hero.atkT=Math.max(0,hero.atkT-dt);hero.atkSwing=Math.max(0,hero.atkSwing-dt);hero.skillT=Math.max(0,hero.skillT-dt);hero.inv=Math.max(0,hero.inv-dt);hero.mp=clamp(hero.mp+dt*3.2,0,hero.maxMp);if(gameTime-hero.lastHurt>6)hero.hp=clamp(hero.hp+dt*2.1,0,hero.maxHp);
 if(pointerDown&&pointer.x>0){const dest={x:cam.x+pointer.x,y:cam.y+pointer.y};if(!autoGoal||Math.hypot(dest.x-autoGoal.x,dest.y-autoGoal.y)>24){setGoal(dest.x,dest.y)}}
 let didMove=false;
 if(autoGoal&&waypointPath.length){let goal=waypointPath[0],dd=Math.hypot(goal.x-hero.x,goal.y-hero.y);if(dd<12){waypointPath.shift();if(!waypointPath.length){autoGoal=null;destination=null;}else goal=waypointPath[0];}if(autoGoal){const a=Math.atan2(goal.y-hero.y,goal.x-hero.x);const s=Math.min(hero.speed*dt,Math.hypot(goal.x-hero.x,goal.y-hero.y));didMove=moveTry(Math.cos(a)*s,Math.sin(a)*s);hero.face=Math.cos(a)>=0?1:-1}}
 else if(autoGoal){autoGoal=null}
 if(keys.up||keys.down||keys.left||keys.right){let dx=(keys.right?1:0)-(keys.left?1:0),dy=(keys.down?1:0)-(keys.up?1:0),len=Math.hypot(dx,dy)||1;didMove=moveTry(dx/len*hero.speed*dt,dy/len*hero.speed*dt)||didMove;if(dx)hero.face=dx>0?1:-1;autoGoal=null;followTarget=null;waypointPath=[]}
 if(didMove)hero.walk+=dt*9;
 // Auto combat. Attack is never a mandatory control: approaching a foe suffices.
 let nearest=null,closest=railPhase==='battle'?67:0;for(const e of entities){if(e.dead)continue;const d=dist(hero,e);if(d<closest){closest=d;nearest=e}}if(nearest&&hero.atkT<=0){hero.atkT=.49;hero.atkSwing=.21;hero.atkCombo=(hero.atkCombo+1)%3;hero.face=nearest.x>hero.x?1:-1;const dmg=hero.damage+(hero.atkCombo===2?7:hero.atkCombo===1?3:0);hitEnemy(nearest,dmg);for(const e of entities){if(e!==nearest&&!e.dead&&dist(hero,e)<39&&Math.abs(e.x-hero.x)<45)hitEnemy(e,Math.floor(dmg*.45))}}
 // Monster AI: tells (glow) before hits; simple movement can avoid the attack.
 for(const e of entities){if(e.dead){e.deadT-=dt;continue}e.hitT=Math.max(0,e.hitT-dt);e.stun=Math.max(0,e.stun-dt);e.attack=Math.max(0,e.attack-dt);const d=dist(e,hero),activeNear=d<(e.type==='boss'?230:168);if(activeNear)e.aggro=6;else e.aggro=Math.max(0,e.aggro-dt);
 if(e.aggro>0&&e.stun<=0){if(e.windup>0){e.windup-=dt;if(e.windup<=0){if(e.type==='wraith'&&e.rangedWindup){const a=Math.atan2(hero.y-e.y,hero.x-e.x);shots.push({x:e.x,y:e.y-12,vx:Math.cos(a)*83,vy:Math.sin(a)*83,life:3.5,damage:e.damage});e.rangedWindup=false;makeParticles(e.x,e.y-12,7,['#8baecd','#a2d3e9'])}else{if(e.type==='wolf'&&dist(e,hero)<60){const a=Math.atan2(hero.y-e.y,hero.x-e.x);e.x+=Math.cos(a)*15;e.y+=Math.sin(a)*15}if(dist(e,hero)<e.range+18)hurt(e.damage+(e.type==='boss'&&e.hp<e.maxHp*.5?5:0),e)}e.attack=e.type==='boss'?1.38:e.type==='guardian'?1.9:1.45;e.windup=0}}else if(e.type==='wraith'&&d>50&&d<130&&e.attack<=0){e.windup=.9;e.rangedWindup=true;}else if(d<e.range+9&&e.attack<=0){e.windup=e.type==='boss'?.85:e.type==='guardian'?.8:.63;e.rangedWindup=false;}else if(d>e.range+6&&d<255){const a=Math.atan2(hero.y-e.y,hero.x-e.x);const speed=e.speed*(e.type==='boss'&&e.hp<e.maxHp*.5?1.3:1);let nx=e.x+Math.cos(a)*speed*dt,ny=e.y+Math.sin(a)*speed*dt;if(!isBlocked(nx,ny)){e.x=nx;e.y=ny}else if(!isBlocked(nx,e.y))e.x=nx;else if(!isBlocked(e.x,ny))e.y=ny}}
 else if(e.windup>0)e.windup=Math.max(0,e.windup-dt);
 if(e.type==='boss'&&e.hp<e.maxHp*.5&&!e.summoned){e.summoned=true;spawnMonster('wraith',e.x-82,e.y-76,'called1');spawnMonster('wraith',e.x+82,e.y+76,'called2');toast('THE OATH REMAINS','달의 기사가 그림자를 불렀습니다',4)}
 }
 for(let i=shots.length-1;i>=0;i--){const b=shots[i];b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(dist(b,hero)<12){hurt(b.damage,null);makeParticles(b.x,b.y,9,['#a3def2','#b8c4f0','#dae5fa']);b.life=0}if(b.life<=0||isBlocked(b.x,b.y))shots.splice(i,1)}
 for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=25*dt;if(p.life<=0)particles.splice(i,1)}
 for(let i=floatText.length-1;i>=0;i--){let p=floatText[i];p.y-=dt*21;p.life-=dt;if(p.life<=0)floatText.splice(i,1)}
 for(let i=shines.length-1;i>=0;i--){shines[i].life-=dt;if(shines[i].life<=0)shines.splice(i,1)}
 for(const f of flecks){f.x+=f.vx*dt;f.y+=f.vy*dt;if(f.y>WH+15){f.y=-5;f.x=rand(0,WW)}if(f.x>WW)f.x=0}
 if(toastT>0){toastT-=dt;if(toastT<=0)$('screenToast').style.opacity='0'}
 if(timeToSave>12){timeToSave=0;save()}checkInteractions();updateUI();
 const zone=regionName(hero.x);if(UI.place.textContent!==zone){UI.place.textContent=zone;toast('NOW ENTERING',zone,3.5);if(zone==='달이 잠든 성당'&&!bossGone)UI.tip.textContent='✦ 잊힌 기사가 마지막 맹세를 지키고 있습니다.';else UI.tip.textContent='✦ 달빛이 길을 기억하고 있습니다.'}
}
function drawCharacter(c,x,y,kind,dir=1,t=0,flash=false){
 const bounce=Math.sin(t)*1.4;
 c.save();c.translate(Math.floor(x),Math.floor(y+bounce));c.scale(dir,1);
 disk(c,0,2,10,'#101e29a8');
 if(kind==='hero'){
 rect(c,-6,-23,12,13,flash?'#ffffff':'#515c74');rect(c,-7,-21,14,9,flash?'#ffffff':'#8296a6');rect(c,-4,-25,8,5,'#bfad9a');rect(c,-5,-28,10,5,'#536679');rect(c,1,-19,3,2,'#e4cbab');
 rect(c,-7,-11,14,14,'#36495a');rect(c,-6,-13,13,6,'#acb2b2');rect(c,-4,-8,8,7,'#7f8795');rect(c,-2,-7,4,4,'#d0b78b');
 rect(c,-6,-1,5,6,'#222d39');rect(c,2,-1,5,6,'#222d39');rect(c,-9,-12,4,9,'#9b9da1');rect(c,6,-12,4,9,'#959aa8');
 // An unmistakable red traveler's cape, a recurring visual motif.
 rect(c,-8,-17,4,13,'#a85f65');rect(c,-11,-10,4,9,'#783f52');rect(c,-10,-4,5,6,'#c27c75');
 if((hero.blessings.heart||0)>0){disk(c,-8,-10,8,'#ec9a8a44');rect(c,-12,-7,3,3,'#ffd0ad')}rect(c,11,-19,3,18,(hero.blessings.blade||0)>0?'#f1dba4':'#d0d8cf');rect(c,10,-16,2,13,'#e8eef1');rect(c,8,-4,8,3,'#ad8c65');rect(c,12,-1,2,5,'#766150');if((hero.blessings.blade||0)>0){disk(c,12,-20,6,'#e9d6a644');rect(c,11,-25,2,5,'#fff1c1')}if((hero.blessings.moon||0)>0){rect(c,-7,-28,3,2,'#a9d9ed');rect(c,2,-29,3,2,'#a9d9ed');disk(c,0,-36,4,'#95cce866')}
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
 if(e.windup>0){const amt=e.windup/(e.type==='wraith'&&e.rangedWindup?.9:e.type==='boss'?.85:e.type==='guardian'?.8:.63);ctx.strokeStyle=amt<.35?'#f8b9a7':'#d16d82';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y-5,e.range+12,-Math.PI/2,-Math.PI/2+TWO*(1-amt));ctx.stroke()}
 if(e.hp<e.maxHp){rect(c,x-17,y-(e.type==='boss'?59:43),34,4,'#2a2c31');rect(c,x-16,y-(e.type==='boss'?58:42),32*e.hp/e.maxHp,2,e.type==='boss'?'#d49f9a':'#afc6b6')}
}
function drawChest(c,p){const opened=fragmentFlags[p.id],t=gameTime;const x=p.x,y=p.y;if(!opened){const shimmer=.6+.4*Math.sin(t*2+p.id);disk(c,x,y-27,12+2*shimmer,'#a4d6e02b');rect(c,x-9,y-37,18,11,'#a7cad4');rect(c,x-6,y-42,12,5,'#d3edf1');rect(c,x-3,y-49,6,8,'#f4e5c1');rect(c,x-2,y-51,4,4,'#ffffff');if(t%2.7<.8){rect(c,x-21,y-28,3,3,'#d4e7fa');rect(c,x+18,y-36,2,3,'#d4e7fa')}}else {rect(c,x-4,y-33,8,8,'#b6b1a2');rect(c,x-2,y-36,4,4,'#a1c2c8')}}
function drawLantern(c,x,y){rect(c,x-2,y-21,4,24,'#594d47');rect(c,x-6,y-25,12,11,'#9e8160');rect(c,x-4,y-23,8,8,'#f1c58a');rect(c,x-1,y-21,2,5,'#fff4bb');rect(c,x-7,y-26,14,3,'#4b4e4b')}
function drawAmbient(c){const x0=cam.x,y0=cam.y;
 // Moonlight beams with transparent compositing, centered on landmarks.
 for(const [x,y,r,col] of [[294,345,85,'#f3c188'],[485,450,65,'#f7db9c'],[890,250,88,'#b9d9d4'],[1090,325,75,'#a2cee1'],[1580,628,66,'#a6ccdd'],[1880,334,72,'#a3bbf3'],[2290,473,130,'#81acd7']]){if(Math.abs(x-hero.x)>750)continue;let sx=x-x0,sy=y-y0;const grad=c.createRadialGradient(sx,sy,2,sx,sy,r);grad.addColorStop(0,col+'38');grad.addColorStop(1,col+'00');c.fillStyle=grad;c.fillRect(sx-r,sy-r,r*2,r*2)}
 for(const f of flecks){const sx=f.x-x0,sy=f.y-y0;if(sx<0||sy<0||sx>W||sy>H)continue;c.globalAlpha=.24+.5*Math.pow(Math.sin(gameTime*f.tw+f.phase),2);rect(c,sx,sy,f.size,f.size,f.color)}c.globalAlpha=1;
 // small moving drizzle near the woods and cathedral
 const region=hero.x; if(region>700){c.globalAlpha=.15;for(let i=0;i<48;i++){let x=((i*77.3+gameTime*(region>1900?24:14))%600)-70,y=((i*43+gameTime*38+i*3)%335)-30;line(c,x,y,x-3,y+8,'#a1b9c8',.6)}c.globalAlpha=1}
}
function drawGame(){ctx.clearRect(0,0,W,H);cam.x=clamp(hero.x-W*.5,0,WW-W);cam.y=clamp(hero.y-H*.56,0,WH-H);const X=Math.floor(cam.x),Y=Math.floor(cam.y);
 ctx.drawImage(terrain,X,Y,W,H,0,0,W,H);
 drawAmbient(ctx);
 ctx.save();ctx.translate(-X,-Y);
 for(const [x,y] of [[78,500],[637,528],[875,475],[1456,490],[2070,469]])drawLantern(ctx,x,y);
 for(const p of chests)if(Math.abs(p.x-hero.x)<450)drawChest(ctx,p);
 for(const npc of npcPositions){if(Math.abs(npc.x-hero.x)>460)continue;drawCharacter(ctx,npc.x,npc.y,npc.id,1,Math.sin(gameTime*2+npc.x)*.9);if(dist(npc,hero)<116){disk(ctx,npc.x,npc.y-40,8,'#142634');ctx.font='bold 12px Georgia';ctx.textAlign='center';ctx.fillStyle='#ebd2a0';ctx.fillText('!',npc.x,npc.y-36)}}
 for(const e of entities)if(!e.dead||e.deadT>0)if(Math.abs(e.x-hero.x)<540)drawMonster(ctx,e);
 if(hero.inv<=0||Math.floor(gameTime*15)%2===0)drawCharacter(ctx,hero.x,hero.y,'hero',hero.face,hero.walk,hero.atkSwing>.09);
 if(hero.atkSwing>0){ctx.globalAlpha=hero.atkSwing/.21;ctx.save();ctx.translate(hero.x,hero.y-13);ctx.scale(hero.face,1);ctx.strokeStyle='#ebead1';ctx.lineWidth=3;ctx.beginPath();ctx.arc(1,0,30,-1.2,.75);ctx.stroke();ctx.strokeStyle='#98cce4';ctx.lineWidth=2;ctx.beginPath();ctx.arc(1,0,36,-1.25,.4);ctx.stroke();ctx.restore();ctx.globalAlpha=1}
 for(const s of shines){const prog=1-s.life/s.max;ctx.globalAlpha=1-prog;ctx.lineWidth=2.2;ctx.strokeStyle=s.color;ctx.beginPath();ctx.ellipse(s.x,s.y-4,Math.max(6,s.r*prog),Math.max(3,s.r*prog*.55),0,0,TWO);ctx.stroke();ctx.globalAlpha=1}
 for(const b of shots){disk(ctx,b.x,b.y-10,7,'#9dc8e666');disk(ctx,b.x,b.y-10,3,'#d4f0fc')}
 for(const p of particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);rect(ctx,p.x,p.y,p.size,p.size,p.color)}ctx.globalAlpha=1;
 for(const p of floatText){ctx.globalAlpha=Math.min(1,p.life*2);ctx.fillStyle='#0a1424';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText(p.txt,p.x+1,p.y+1);ctx.fillStyle=p.color;ctx.fillText(p.txt,p.x,p.y);ctx.globalAlpha=1}
 // Quest direction: a softly pulsing waypoint at the edge of the screen.
 let marker=null;if(questStage===0||questStage===2||questStage===4)marker=npcPositions[0];else if(questStage===1)marker=chests.find(p=>!fragmentFlags[p.id]);else if(questStage===3&&!bossGone)marker=entities.find(e=>e.type==='boss'&&!e.dead);if(marker){const d=dist(marker,hero);if(d>130){const a=Math.atan2(marker.y-hero.y,marker.x-hero.x),sx=hero.x+Math.cos(a)*Math.min(174,d),sy=hero.y+Math.sin(a)*Math.min(95,d);disk(ctx,sx,sy,7,'#b5cdd488');ctx.fillStyle='#f5dfac';ctx.font='13px Georgia';ctx.textAlign='center';ctx.fillText('◇',sx,sy+4)}}
 ctx.restore();
 // Dynamic low-contrast twilight layer.
 const v=ctx.createLinearGradient(0,0,0,H);v.addColorStop(0,'#09152518');v.addColorStop(.7,'#20314700');v.addColorStop(1,'#0b142b18');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
 // Skylight dust overlays foreground at small scale
 for(let i=0;i<12;i++){const x=((i*59+gameTime*4*(i%3+1))%(W+20))-10,y=(i*71+Math.sin(gameTime*.8+i)*10)%H;if(i%3===0){ctx.globalAlpha=.24+.17*Math.sin(gameTime+i);rect(ctx,x,y,1,1,'#e8cf9c')}}ctx.globalAlpha=1;
}
// Audio: minimal original ambient tones and action chimes; all generated with WebAudio.
let ac=null,master=null,musicTick=0,nextMusic=0;
function audioInit(){if(!audioOn)return;try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();if(!master){master=ac.createGain();master.gain.value=.16;master.connect(ac.destination)}}catch(err){ac=null}}
function tone(freq,dur=.32,vol=.2,type='sine',delay=0){if(!ac||!audioOn)return;try{const o=ac.createOscillator(),v=ac.createGain();o.type=type;o.frequency.setValueAtTime(freq,ac.currentTime+delay);v.gain.setValueAtTime(0,ac.currentTime+delay);v.gain.linearRampToValueAtTime(vol,ac.currentTime+delay+.025);v.gain.exponentialRampToValueAtTime(.001,ac.currentTime+delay+dur);o.connect(v);v.connect(master);o.start(ac.currentTime+delay);o.stop(ac.currentTime+delay+dur+.04)}catch(err){}}
function chime(freq=670){audioInit();tone(freq,.45,.32);tone(freq*1.5,.65,.12,'sine',.11)}
function sfx(type){if(!ac)return; if(type==='slash'){tone(190,.075,.13,'triangle');tone(340,.09,.12,'sawtooth',.02)}else if(type==='hurt')tone(94,.28,.28,'triangle');else if(type==='spell'){tone(440,.65,.25);tone(660,.85,.12,'sine',.18)}else if(type==='death')tone(270,.23,.1,'triangle')}
function playBell(){audioInit();for(let i=0;i<4;i++){tone(185*(i===3?2:1),3,.3,'sine',i*1.2);tone(370*(i===3?2:1),2.6,.11,'sine',i*1.2+.04)}}
function music(dt){if(!ac||!audioOn||paused)return;nextMusic-=dt;if(nextMusic>0)return;nextMusic=1.3;const seq=[220,261.63,293.66,246.94,196,220,174.61,196];const i=musicTick++%seq.length;const f=seq[i]/2;tone(f,2.7,.05,'sine');if(i%2===0)tone(f*2,.7,.037,'triangle',.06);if(i===0||i===4)tone(f*1.5,3.4,.027)}
// Input / HUD
const keys={up:false,down:false,left:false,right:false};
function gameCoords(e){const b=canvas.getBoundingClientRect();return {x:(e.clientX-b.left)/b.width*W,y:(e.clientY-b.top)/b.height*H}}
function handleTap(e){if(scene!=='play'||railPhase!=='free')return;const pt=gameCoords(e),world={x:clamp(cam.x+pt.x,0,WW),y:clamp(cam.y+pt.y,0,WH)};const npc=npcPositions.find(n=>dist(n,world)<32);if(npc){setGoal(npc.x,npc.y,npc);if(dist(hero,npc)<45)checkInteractions();return}const enemy=entities.find(n=>!n.dead&&dist(n,world)<38);if(enemy){setGoal(enemy.x,enemy.y,enemy);return}const chest=chests.find(c=>!fragmentFlags[c.id]&&dist(c,world)<40);if(chest){setGoal(chest.x,chest.y,chest);return}setGoal(world.x,world.y)}
canvas.addEventListener('pointerdown',e=>{if(scene!=='play'||railPhase!=='free')return;canvas.setPointerCapture(e.pointerId);const p=gameCoords(e);pointer=p;pointerDown=true;handleTap(e)});
canvas.addEventListener('pointermove',e=>{if(!pointerDown||scene!=='play')return;pointer=gameCoords(e)});
const pointerRelease=()=>{pointerDown=false};canvas.addEventListener('pointerup',pointerRelease);canvas.addEventListener('pointercancel',pointerRelease);window.addEventListener('blur',pointerRelease);
window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(['arrowup','w'].includes(key))keys.up=true;if(['arrowdown','s'].includes(key))keys.down=true;if(['arrowleft','a'].includes(key))keys.left=true;if(['arrowright','d'].includes(key))keys.right=true;if([' ','enter','escape','arrowup','arrowdown','arrowleft','arrowright'].includes(key))e.preventDefault();if(e.repeat)return;if(key===' '&&scene==='play')useSkill();if(key==='e'&&scene==='play'){let near=npcPositions.filter(n=>dist(n,hero)<58).sort((a,b)=>dist(a,hero)-dist(b,hero))[0];if(near)talkNpc(near)}if(key==='escape'){if(scene==='panel')closePanel();else if(scene==='play')showPause();else if(scene==='dialog')$('dialogNext').click()}if(key==='m'&&scene==='play')showMap();if(key==='i'&&scene==='play')showJournal()});
window.addEventListener('keyup',e=>{const key=e.key.toLowerCase();if(['arrowup','w'].includes(key))keys.up=false;if(['arrowdown','s'].includes(key))keys.down=false;if(['arrowleft','a'].includes(key))keys.left=false;if(['arrowright','d'].includes(key))keys.right=false});
UI.skill.onclick=()=>{audioInit();useSkill()};$('mapBtn').onclick=()=>{if(scene==='play')showMap()};$('bagBtn').onclick=()=>{if(scene==='play')showJournal()};$('pauseBtn').onclick=()=>{if(scene==='play')showPause()};$('panelClose').onclick=closePanel;
function showJournal(){const fragments=fragmentFlags.filter(Boolean).length;const note=questStage<2?'달의 조각이 흩어져 있습니다.':questStage<4?'종의 울림이 성당에서 기다리고 있습니다.':'종의 울림이 다시 돌아왔습니다.';const html=`<div class="panelRow"><span>여행자</span><strong>Lv. ${hero.level}</strong></div><div class="panelRow"><span>검의 위력</span><strong>${hero.damage}</strong></div><div class="panelRow"><span>월광의 조각</span><strong>${fragments} / 3</strong></div><div class="panelRow"><span>현재 은화</span><strong>✦ ${hero.gold}</strong></div><p>“${note}”</p><p><strong>${questData[questStage][0]}</strong><br>${questData[questStage][1]}</p><p class="tiny">기록은 12초마다 자동 저장됩니다. 브람에게 검을 강화하면 싸움이 편해집니다.</p>`;openPanel('여정 일지',html,'A TALE IN SILVER AND ASH')}
function showMap(){const html=`<p>달빛이 정해진 길로 이끕니다. 지도는 현재 위치와 앞으로 진행할 경로를 보여줍니다.</p><canvas id="mapView" width="530" height="185"></canvas><div class="panelRow"><span>◇ 미회수 달의 조각</span><strong>${fragmentFlags.filter(Boolean).length} / 3</strong></div><p class="tiny">푸른 점이 현재 위치입니다. 다음 장면으로 자동 이동합니다.</p>`;openPanel('찢어진 고지도',html,'THE LANDS OF ELDEN',node=>{const m=node.querySelector('canvas'),c=m.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(terrain,0,0,WW,WH,0,0,530,185);c.fillStyle='#09152266';c.fillRect(0,0,530,185);for(const p of chests){if(fragmentFlags[p.id])continue;c.fillStyle='#f6dba1';c.font='bold 17px serif';c.fillText('◇',p.x/WW*530,p.y/WH*185)}for(const n of npcPositions){c.fillStyle='#e3c599';c.fillRect(n.x/WW*530-2,n.y/WH*185-2,4,4)}c.fillStyle='#c9ebff';c.beginPath();c.arc(hero.x/WW*530,hero.y/WH*185,4,0,TWO);c.fill();c.strokeStyle='#0c263e';c.lineWidth=1.5;c.stroke();m.addEventListener('click',()=>{closePanel();toast('달빛의 길','다음 이야기로 자동 이동합니다',2.3)})})}
function showPause(){openPanel('밤의 쉼터',`<p>조용한 밤길에서 잠시 발걸음을 멈췄습니다.</p><div class="panelRow"><span>진행 상황</span><strong>자동 저장 중</strong></div><button id="soundToggle" class="upgrade">♫ 배경 음악: ${audioOn?'켜짐':'꺼짐'}</button><button id="backTitle" class="upgrade">⌂ 시작 화면으로 돌아가기</button><p class="tiny">조작: 터치로 이동 / 몬스터에게 다가가면 자동 공격 / 오른쪽 달빛 파동 버튼 / 지도의 먼 곳을 눌러 자동 이동</p>`,'PAUSE · THE LAST BELL',node=>{node.querySelector('#soundToggle').onclick=()=>{audioOn=!audioOn;node.querySelector('#soundToggle').textContent='♫ 배경 음악: '+(audioOn?'켜짐':'꺼짐');if(audioOn)audioInit()};node.querySelector('#backTitle').onclick=()=>{save();closePanel();showMenu()}})}
function startGame(continued){if(continued){if(!load())reset();initMonsters();}else reset();UI.menu.classList.add('hidden');active=true;scene='play';paused=false;audioInit();bumpQuest();UI.place.textContent=regionName(hero.x);cam.x=clamp(hero.x-W/2,0,WW-W);cam.y=clamp(hero.y-H*.56,0,WH-H);toast('CHAPTER I','달이 잠든 밤',4);if(!continued)dialog('이름 없는 나그네',["한때 이 땅에는 모든 저녁을 밝히는 종이 있었습니다.","그러나 달이 세 조각으로 깨진 밤, 종소리는 멎고 길은 빛을 잃었습니다.","당신은 이제 이 작은 마을에서, 잊힌 이야기를 시작합니다."],()=>toast('TIP','화면을 터치하면 그곳으로 걸어갑니다',4));}
function showMenu(){UI.menu.classList.remove('hidden');scene='menu';paused=true;$('continueBtn').classList.toggle('hidden',!hasSave())}
$('startBtn').onclick=()=>{try{localStorage.removeItem(SKEY)}catch(e){}startGame(false)};$('continueBtn').onclick=()=>startGame(true);
// generate a few quietly glowing fireflies, including night fog drifting in shallow swirls
function boot(){generateTerrain();makeGrid();flecks=Array.from({length:155},(_,i)=>({x:rnd(i,31,21)*WW,y:rnd(i,32,11)*WH,vx:2+rnd(i,35)*9,vy:1+rnd(i,34)*3,tw:.5+rnd(i,8)*1.3,phase:rnd(i,3)*TWO,size:rnd(i,49)>.8?2:1,color:rnd(i,18)>.45?'#d9deb0':'#a4d4d4'}));initMonsters();$('continueBtn').classList.toggle('hidden',!hasSave());UI.place.textContent='잿빛 마을, 엘든';updateUI();drawGame();requestAnimationFrame(frame)}
function frame(t){const dt=clamp((t-last)/1000||.016,0,.042);last=t;update(dt);music(dt);drawGame();requestAnimationFrame(frame)}

// Chapter 1.2 guided journey: visible goals, authored battles, three growth paths.
const oldUpdate=update,oldDraw=drawGame,oldUI=updateUI,oldBump=bumpQuest;
update=function(dt){if(railPhase!=='free'){pointerDown=false;keys.up=keys.down=keys.left=keys.right=false;}oldUpdate(dt);if(!paused)railTick(dt)};
drawGame=function(){
 oldDraw();
 if(railPhase==='travel'&&railGoal){
  const sx=hero.x-cam.x,sy=hero.y-cam.y,a=Math.atan2(railGoal.y-hero.y,railGoal.x-hero.x),dd=dist(hero,railGoal);
  ctx.save();for(let i=0;i<19;i++){
   const step=20+i*Math.min(13,dd/20),x=sx+Math.cos(a)*step,y=sy+Math.sin(a)*step;
   if(x>2&&x<W-2&&y>2&&y<H-2){ctx.globalAlpha=.4+.5*Math.abs(Math.sin(gameTime*2-i*.4));ctx.fillStyle=i%3?'#c3e2e5':'#f9df9f';ctx.fillRect(x,y,2+i%3,2+i%3);}
  }ctx.restore();
 }
};
updateUI=function(){
 oldUI();
 if(!$('levelBadge'))return;
 $('levelBadge').textContent='LV '+hero.level+'  ·  ⚔ '+hero.damage+'  ·  ♥ '+hero.maxHp;
 $('xpFill').style.width=(100*hero.xp/(35+hero.level*25))+'%';
 $('xpText').textContent='EXP '+Math.floor(hero.xp)+' / '+(35+hero.level*25);
 $('routeIndex').textContent=String(railIndex+1).padStart(2,'0')+' / 11';
 $('routeTitle').textContent=railNames[railIndex]||'새벽의 서약';
 $('routeMode').textContent=railPhase==='travel'?'✧ 다음 장면으로 자동 이동 중':railPhase==='battle'?'⚔ 자동 전투 중 · 달빛 파동으로 지원':railPhase==='scene'?'✦ 이야기 진행 중':railPhase==='done'?'✧ 제1장 완료':'✧ 여정 준비 중';
 $('routeAction').textContent=railPhase==='travel'?'✦ 길 안내 / 이동 계속':railPhase==='battle'?'✧ 달빛 파동 사용':railPhase==='done'?'✦ 이야기 기록 보기':'✧ 다음 장면 보기';
};
bumpQuest=function(){oldBump();if(railPhase!=='free'&&questStage===1)UI.questDetail.textContent='달의 조각 '+fragmentFlags.filter(Boolean).length+' / 3 · 자동 경로를 따라가세요.'};
save=function(){
 try{localStorage.setItem(SKEY,JSON.stringify({hero:{x:hero.x,y:hero.y,hp:hero.hp,maxHp:hero.maxHp,mp:hero.mp,maxMp:hero.maxMp,gold:hero.gold,level:hero.level,xp:hero.xp,damage:hero.damage,swordLevel:hero.swordLevel,armorLevel:hero.armorLevel,blessings:hero.blessings},questStage,fragmentFlags,loreGift,bossGone,railIndex,pendingLevels,railV:1}))}catch(e){}
};
load=function(){
 try{const st=JSON.parse(localStorage.getItem(SKEY));if(!st)return false;Object.assign(hero,st.hero||{});hero.blessings={blade:0,heart:0,moon:0,...hero.blessings};questStage=st.questStage||0;fragmentFlags=st.fragmentFlags||[false,false,false];loreGift=!!st.loreGift;bossGone=!!st.bossGone;railIndex=st.railV?clamp(st.railIndex||0,0,10):0;pendingLevels=st.pendingLevels||0;if(!st.railV){questStage=0;fragmentFlags=[false,false,false];bossGone=false;hero.x=250;hero.y=460;hero.hp=hero.maxHp;}return true;}catch(e){return false;}
};
reset=function(){Object.assign(hero,{x:250,y:460,hp:120,maxHp:120,mp:100,maxMp:100,gold:12,level:1,xp:0,damage:15,swordLevel:0,armorLevel:0,blessings:{blade:0,heart:0,moon:0},atkT:0,skillT:0,inv:0});questStage=0;fragmentFlags=[false,false,false];loreGift=false;bossGone=false;railIndex=0;railPhase='idle';pendingLevels=0;autoGoal=null;followTarget=null;waypointPath=[];initMonsters()};
checkInteractions=function(){}; // story arrival interactions replace open-world auto-pickup
function startRail(index){
 railIndex=clamp(index,0,10);railPhase='travel';railTimer=0;railStuck=0;railLastD=Infinity;railClear=0;entities=[];shots=[];
 if(index===7||index===10){hero.x=253;hero.y=465;makeParticles(hero.x,hero.y-20,35,['#ecd6aa','#b4d7e5','#d1dbf1'],1.5);toast('기억의 길','달빛이 당신을 엘든으로 인도합니다',3);}
 if(index===8){hero.x=1979;hero.y=465;toast('달이 잠든 성당','마지막 맹세를 향한 길',3);}
 const p=railStops[railIndex];railGoal={x:p[0],y:p[1]};setGoal(p[0],p[1]);followTarget=null;toast('CHAPTER I · '+String(railIndex+1).padStart(2,'0'),railNames[railIndex],2.6);save();
}
function nextRail(){startRail(railIndex+1)}
function stageFight(wave,title){
 entities=[];shots=[];autoGoal=null;waypointPath=[];hero.hp=clamp(hero.hp+hero.maxHp*.3,0,hero.maxHp);hero.mp=hero.maxMp;hero.inv=1;railPhase='battle';
 wave.forEach((v,i)=>{const e=spawnMonster(v[0],hero.x+v[1],hero.y+v[2],'wave'+railIndex+'-'+i);e.aggro=8;e.attack=.9+i*.2});toast('⚔ ENCOUNTER',title,4);chime(320);save();
}
function findShard(id){if(!fragmentFlags[id]){fragmentFlags[id]=true;hero.gold+=16;awardRailXp(35);hero.mp=hero.maxMp;makeParticles(chests[id].x,chests[id].y-27,60,['#f9edc4','#a2cfe9','#d5e6ff'],2);pulse(chests[id].x,chests[id].y-30,110);chime(850);}if(fragmentFlags.every(Boolean))questStage=2;bumpQuest()}
function levelChoice(){
 if(pendingLevels<=0||scene!=='play')return false;
 const html='<p class="levelIntro">새롭게 얻은 힘을 직접 선택하세요. 선택한 능력은 영구히 적용됩니다.</p><div class="statsBefore">⚔ '+hero.damage+'　♥ '+hero.maxHp+'　✧ '+hero.maxMp+'</div>'+
 '<button class="levelPick" data-branch="blade"><span class="pickIcon">⚔</span><span><strong>별빛의 검</strong><small>공격력 '+hero.damage+' → '+(hero.damage+6)+' · 검에 금빛이 스며듭니다.</small></span></button>'+
 '<button class="levelPick" data-branch="heart"><span class="pickIcon">♥</span><span><strong>붉은 망토의 맹세</strong><small>최대 체력 '+hero.maxHp+' → '+(hero.maxHp+30)+' · 수호의 빛이 감돕니다.</small></span></button>'+
 '<button class="levelPick" data-branch="moon"><span class="pickIcon">✧</span><span><strong>푸른 달의 숨결</strong><small>마력 '+hero.maxMp+' → '+(hero.maxMp+25)+' · 스킬 재사용 시간 감소.</small></span></button>';
 openPanel('레벨 '+hero.level+' · 성장의 선택',html,'✦ LEVEL UP · CHOOSE YOUR LEGACY',node=>{
  $('panelClose').classList.add('hidden');
  node.querySelectorAll('[data-branch]').forEach(b=>b.onclick=()=>{
   const type=b.dataset.branch;hero.blessings[type]=(hero.blessings[type]||0)+1;
   if(type==='blade')hero.damage+=6;
   if(type==='heart'){hero.maxHp+=30;hero.hp+=30;}
   if(type==='moon'){hero.maxMp+=25;hero.mp=hero.maxMp;}
   pendingLevels--;chime(860);$('panelClose').classList.remove('hidden');closePanel();toast('성장 완료','⚔ '+hero.damage+' · ♥ '+hero.maxHp+' · ✧ '+hero.maxMp,3);save();
   if(pendingLevels)levelChoice();else if(railPhase==='scene')nextRail();
  });
 });return true;
}
function stageArrival(){
 railPhase='scene';autoGoal=null;followTarget=null;waypointPath=[];
 switch(railIndex){
  case 0:dialog('에다 · 마지막 종지기',['달이 부서진 밤부터 마을의 종이 울리지 않아요.','세 조각의 달빛을 모아 주세요. 길은 제 기억 속에 남아 있으니, 발걸음은 달빛이 인도할 거예요.','더는 길을 찾아 헤매지 않아도 됩니다. 이야기를 따라가 주세요.'],()=>{questStage=1;bumpQuest();nextRail()});break;
  case 1:stageFight([['wolf',68,10],['wolf',80,-45],['wolf',108,32],['wolf',135,-22]],'안개숲의 늑대 떼');break;
  case 2:findShard(0);dialog('속삭임의 제단',['첫 번째 달빛이 떠오르자 숲의 나뭇잎들이 작은 종처럼 흔들립니다.','당신의 길은 오래된 왕국의 기억을 따라 이어집니다.'],()=>{if(!levelChoice())nextRail()});break;
  case 3:stageFight([['wolf',55,-18],['wolf',68,41],['wraith',105,-27]],'숲의 끝에서 나타난 망령');break;
  case 4:findShard(1);dialog('잊힌 병사의 비석',['돌에 새겨진 맹세가 희미하게 빛납니다. “새벽은 끝까지 길을 걷는 이의 것.”','두 번째 조각이 검 끝에 내려앉았습니다.'],()=>{if(!levelChoice())nextRail()});break;
  case 5:stageFight([['wraith',68,-23],['guardian',105,20],['wraith',125,49]],'왕국의 마지막 문지기');break;
  case 6:findShard(2);dialog('푸른 달의 유적',['세 번째 조각이 떠오릅니다. 멀리서 오래 잊힌 종소리가 들리는 듯합니다.','이제 엘든으로 돌아가 종지기에게 모든 달빛을 보여줄 시간입니다.'],()=>{if(!levelChoice())nextRail()});break;
  case 7:dialog('에다 · 마지막 종지기',['모든 조각을 되찾으셨군요. 아직 동쪽 성당에는 오래된 맹세에 갇힌 기사가 남아 있어요.','그를 넘어 잠든 종을 깨워 주세요. 마을의 등불을 켜 두고 기다리겠습니다.'],()=>{questStage=3;hero.hp=hero.maxHp;hero.mp=hero.maxMp;hero.gold+=24;bumpQuest();nextRail()});break;
  case 8:stageFight([['wraith',67,-22],['guardian',93,27]],'성당을 지키는 그림자');break;
  case 9:stageFight([['boss',92,0]],'달의 기사 · 마지막 맹세');break;
  case 10:dialog('에다 · 마지막 종지기',['들리시나요? 마침내 잊힌 종소리가 다시 울립니다.','당신이 돌아올 때까지 이 등불을 지켰습니다. 새벽은 이제 이곳의 것이에요.'],()=>{questStage=5;bumpQuest();railPhase='done';showEnding()});break;
 }
}
function railTick(dt){
 if(railPhase==='travel'){
  railTimer+=dt;
  const dd=dist(hero,railGoal);if(dd>railLastD-.06)railStuck+=dt;else railStuck=Math.max(0,railStuck-dt*2);railLastD=dd;
  if(railStuck>2.6){setGoal(railGoal.x,railGoal.y);railStuck=0;}
  if(railTimer>22){hero.x=railGoal.x;hero.y=railGoal.y;autoGoal=null;}
  if(dd<22||(!autoGoal&&railTimer>.3))stageArrival();
 }else if(railPhase==='battle'&&entities.length&&entities.every(e=>e.dead)){
  railClear+=dt;if(railClear>.85){railPhase='scene';hero.hp=clamp(hero.hp+hero.maxHp*.5,0,hero.maxHp);hero.mp=hero.maxMp;entities=[];shots=[];
   dialog('전투의 끝 · 남은 여운',['흩어진 그림자가 안개 속으로 스며듭니다. 잠시 숨을 고르면 다음 길이 보입니다.'],()=>{if(!levelChoice())nextRail()});
  }
 }
}
startGame=function(continued){
 if(continued){if(!load())reset();}else reset();initMonsters();UI.menu.classList.add('hidden');active=true;scene='play';paused=false;audioInit();if(railIndex===0){hero.x=250;hero.y=460;}
 bumpQuest();UI.place.textContent=regionName(hero.x);
 if(railIndex===10&&questStage===5){railPhase='done';showEnding();return;}
 if(!continued)dialog('이름 없는 나그네',['한때 이 땅에는 모든 저녁을 밝히는 종이 있었습니다.','그러나 달이 부서진 날부터 종소리가 멎고 밤이 머물렀습니다.','이야기를 끝낼 때마다 다음 목적지로 자동 이동합니다. 몬스터와의 전투도 자동이며, 달빛 파동 버튼만 사용하면 됩니다.'],()=>startRail(0));
 else{startRail(railIndex);if(pendingLevels)levelChoice();}
};
const originalSkill=useSkill;useSkill=function(){if(railPhase==='battle')originalSkill()};
$('startBtn').onclick=()=>{try{localStorage.removeItem(SKEY)}catch(e){}startGame(false)};
$('continueBtn').onclick=()=>startGame(true);
$('routeAction').onclick=()=>{if(scene!=='play')return;audioInit();if(railPhase==='travel'){setGoal(railGoal.x,railGoal.y);toast('✦ 다음 장면',railNames[railIndex]+'(으)로 이동 중',2)}else if(railPhase==='battle')useSkill();else if(railPhase==='done')showEnding()};
$('dialog').addEventListener('click',e=>{if(!e.target.closest('button')&&scene==='dialog')$('dialogNext').click()});
$('mapBtn').onclick=()=>{if(scene==='play')showMap()};
if(location.search.includes('lastbell-test'))window.__lastBellTest={state:()=>({railIndex,railPhase,questStage,scene,pendingLevels}),next:()=>{if(railPhase==='travel'){hero.x=railGoal.x;hero.y=railGoal.y;stageArrival()}},win:()=>{entities.filter(e=>!e.dead).forEach(e=>hitEnemy(e,9999))}};
boot();
})();

