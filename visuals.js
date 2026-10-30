/** THE LAST BELL — V1.4 VISUAL ATELIER
 * Handcrafted pixel scenery layered over the existing adventure world.
 * Rendered once into the background atlas; only subtle animated accents render each frame.
 */
(()=>{'use strict';
const TWO=Math.PI*2;
const fill=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.floor(x),Math.floor(y),Math.ceil(w),Math.ceil(h));};
const poly=(c,pts,col)=>{c.fillStyle=col;c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.closePath();c.fill();};
const line=(c,x,y,X,Y,col,w=1)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(X,Y);c.stroke();};
const circle=(c,x,y,r,col)=>{c.fillStyle=col;c.beginPath();c.arc(Math.floor(x),Math.floor(y),r,0,TWO);c.fill()};
function facetedRock(c,x,y,scale=1,hue=0){c.save();c.translate(x,y);c.scale(scale,scale);poly(c,[[-21,2],[-14,-17],[2,-23],[19,-13],[25,3]],'#182632');poly(c,[[-18,-1],[-11,-15],[1,-20],[7,-4],[1,6]],hue?'#687882':'#5a676e');poly(c,[[1,-20],[18,-12],[23,2],[1,6]],hue?'#405361':'#354752');line(c,-11,-14,-3,-11,'#a3a8aa',1.5);line(c,9,-9,17,-7,'#8fabb5',1);c.restore();}
function lantern(c,x,y,type=0){fill(c,x-1,y-26,3,23,'#243342');fill(c,x-6,y-29,13,3,'#a18d67');fill(c,x-5,y-26,11,12,'#4b555b');fill(c,x-3,y-24,7,8,type?'#b0dded':'#ffd38a');fill(c,x-1,y-22,3,4,'#fff4d0');fill(c,x-7,y-30,15,3,'#d0b58a');fill(c,x-3,y-33,7,3,'#615c54');fill(c,x-5,y-14,11,2,'#c0a680');circle(c,x,y-20,15,type?'#8fddfa16':'#efc88718');}
function moonflower(c,x,y,seed=0){fill(c,x,y-6,1,9,'#648e7b');fill(c,x-2,y-3,2,1,'#83a79d');fill(c,x+1,y-4,2,1,'#80ac94');const cols=seed%3===0?['#e9c6a3','#fff0d1']:seed%3===1?['#b6c3df','#e6edfa']:['#bddeb9','#f5f9df'];fill(c,x-2,y-9,2,3,cols[0]);fill(c,x+1,y-9,2,3,cols[0]);fill(c,x-1,y-11,3,2,cols[0]);fill(c,x-1,y-8,3,2,cols[1]);}
function lilyPond(c,x,y){circle(c,x,y,37,'#233d4e');circle(c,x,y-1,32,'#2e5261');circle(c,x,y-2,25,'#3e6b6f');for(let i=0;i<7;i++){let a=i*TWO/7,dx=Math.cos(a)*19,dy=Math.sin(a)*12;circle(c,x+dx,y+dy,5,'#597b67');poly(c,[[x+dx,y+dy],[x+dx+4,y+dy-3],[x+dx+6,y+dy+2]],'#2f5761')}moonflower(c,x+8,y+3,2);}
function mosaic(c,x,y,r=42){circle(c,x,y,r+8,'#2f414b');circle(c,x,y,r+4,'#89918d');circle(c,x,y,r,'#344d5d');circle(c,x,y,r-4,'#798e93');circle(c,x,y,r-6,'#334e5b');for(let i=0;i<16;i++){const a=i*TWO/16;line(c,x+Math.cos(a)*(r-16),y+Math.sin(a)*(r-16),x+Math.cos(a)*(r-4),y+Math.sin(a)*(r-4),i%2?'#c0ae86':'#b4c7bc',2)}poly(c,[[x,y-20],[x+7,y-4],[x+22,y],[x+7,y+4],[x,y+21],[x-7,y+4],[x-21,y],[x-7,y-4]],'#b7c9c5');poly(c,[[x,y-13],[x+5,y],[x,y+13],[x-5,y]],'#e4d09a');circle(c,x,y,2,'#fff9df');}
function enrichedHouse(c,x,y,w,h=95,variant=0){
 // The old cottage gets layers of carved timber, small warm windows, roofing and flowering vines.
 const side=variant?'#6d8591':'#806e6b';
 for(let k=0;k<5;k++){
  const yy=y+39+k*10;fill(c,x+5,yy,w-10,2,k%2?'#343847':'#b5a08a');
  for(let j=0;j<5;j++){const xx=x+12+j*((w-23)/5);fill(c,xx+((k%2)*5),yy+3,1,7,'#49454d')}
 }
 for(let k=0;k<9;k++){const pct=(k+.35)/9;const width=w*pct;const xx=x+w/2-width/2;
  fill(c,xx,y+8+k*3,width,2,k%2?'#8791a0':'#394f65');fill(c,xx+3,y+9+k*3,Math.max(1,width-6),1,k%2?'#d2c2ad':'#8b97a4')}
 for(let k=0;k<3;k++){const ox=x+16+(w-55)*k/2,oy=y+56;fill(c,ox-2,oy-3,27,28,'#344150');fill(c,ox,oy,23,24,'#d9ac7c');fill(c,ox+4,oy+2,15,18,'#f0d9a6');fill(c,ox+11,oy,3,24,'#82644f');fill(c,ox,oy+10,23,2,'#82644f');fill(c,ox-3,oy+23,29,3,side)}
 fill(c,x+3,y+34,5,h-35,'#53454b');fill(c,x+w-9,y+34,5,h-35,'#524c55');
 for(let j=0;j<5;j++){const vx=x+8+j*6;fill(c,vx,y+66+(j%3)*7,3,2,'#486d59');moonflower(c,vx,y+68+(j%3)*7,j)}
 fill(c,x+w*.54-2,y+h-43,3,32,'#e1c59b');fill(c,x+w*.46,y+h-12,w*.12,3,'#b58e69');
}
function gothicTower(c,x,y,s=1,style=0){c.save();c.translate(x,y);c.scale(s,s);
 fill(c,-34,-10,70,96,'#263a46');fill(c,-30,-15,62,99,style?'#667988':'#65737a');fill(c,-23,-12,6,92,'#8e999c');fill(c,14,-12,7,92,'#3f525f');
 for(let i=0;i<5;i++){let yy=-4+i*16;fill(c,-25,yy,49,2,'#9aa3a0');fill(c,-14,yy+4,5,4,'#a5a8a0');fill(c,9,yy+10,4,3,'#49515c')}
 poly(c,[[-44,-10],[0,-93],[43,-10]],'#273f54');poly(c,[[-35,-14],[0,-84],[32,-14]],style?'#8796a3':'#5a687b');poly(c,[[-25,-11],[0,-67],[25,-11]],'#354a60');
 for(let j=-1;j<=1;j++){let ax=j*18;poly(c,[[ax-7,15],[ax-7,-2],[ax, -12],[ax+7,-2],[ax+7,15]],'#283d51');fill(c,ax-4,-1,8,13,j===0?'#caa774':'#83a8bd');fill(c,ax-1,-2,2,15,'#364a55')}
 fill(c,-37,-17,74,6,'#a0a5a3');fill(c,-42,-19,84,2,'#4f6472');
 fill(c,-4,-111,8,25,'#6a717c');poly(c,[[-9,-110],[0,-129],[9,-110]],'#c0ad89');fill(c,1,-119,2,14,'#e9d29b');
 for(let j=0;j<5;j++){fill(c,-34+j*14,78,9,8,'#384c56');fill(c,-30+j*14,81,3,4,'#a5a89d')}
 c.restore();}
function enchantedTree(c,x,y,s=1,palette=0){c.save();c.translate(x,y);c.scale(s,s);
 circle(c,4,2,22,'#091c2ba4');fill(c,-5,-28,10,31,'#4c4356');fill(c,-2,-26,3,24,'#8d736e');
 const dark=palette===0?'#1c4c5a':palette===1?'#393b62':'#465766',medium=palette===0?'#3c7882':palette===1?'#6970a0':'#6b8495',light=palette===0?'#86abb3':palette===1?'#b8aacd':'#9bbbc1';
 const blocks=[[-21,-49,35,22],[-2,-72,37,30],[-34,-67,36,24],[-21,-88,38,27],[-5,-97,24,17]];
 blocks.forEach(([a,b,w,h],i)=>{fill(c,a+3,b+5,w,h,dark);fill(c,a,b,w-6,h-3,i%3===1?medium:dark);fill(c,a+2,b+2,Math.max(4,w-15),5,light)});
 for(let i=0;i<22;i++){let a=((i*19)%58)-32,b=-42-((i*23)%50);if(i%2)fill(c,a,b,3,3,i%4===0?'#e6d8b6':light)}
 fill(c,11,-51,4,8,'#c9d6c2');fill(c,12,-55,2,5,'#fdf6dd');c.restore();}
function stoneArch(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);
 for(let j=-1;j<=1;j+=2){fill(c,j*43-9,-78,20,93,'#475563');fill(c,j*43-7,-76,6,90,'#8f9291');for(let i=0;i<6;i++)fill(c,j*43-7,-70+i*13,19,2,'#a0a8a3')}
 poly(c,[[-63,-79],[-53,-99],[-34,-119],[34,-119],[54,-100],[62,-79],[45,-79],[28,-105],[-28,-105],[-45,-79]],'#697783');
 poly(c,[[-53,-82],[-48,-99],[-30,-112],[30,-112],[48,-99],[53,-82],[43,-82],[24,-102],[-24,-102],[-43,-82]],'#afb5ae');
 fill(c,-65,-83,130,5,'#c8b894');fill(c,-61,-90,122,3,'#556978');
 for(let i=0;i<5;i++){const dx=-48+i*22;fill(c,dx,-94,5,7,'#677b7d')}
 for(let k=0;k<16;k++){let px=-66+((k*23)%132),py=-15-((k*29)%75);if(k%2)fill(c,px,py,3,6,'#66876c')}
 c.restore();}
function tapestry(c,x,y,hue=0){fill(c,x-14,y-42,29,5,'#a18b72');fill(c,x-10,y-38,21,53,hue?'#7a608b':'#905966');poly(c,[[x-10,y+14],[x,y+25],[x+11,y+14]],hue?'#7a608b':'#905966');fill(c,x-7,y-32,3,40,'#b89a73');fill(c,x+5,y-31,3,39,'#b89a73');poly(c,[[x,y-26],[x+7,y-17],[x,y-6],[x-7,y-17]],'#dfc18d');fill(c,x-2,y-18,4,9,'#f6e8bf')}
function crystal(c,x,y,scale=1){c.save();c.translate(x,y);c.scale(scale,scale);circle(c,0,0,22,'#a4d4f126');poly(c,[[-11,-3],[-6,-24],[6,-29],[15,-6],[7,4]],'#779ac2');poly(c,[[-6,-24],[0,-30],[2,0],[-5,1]],'#b5dcde');poly(c,[[0,-30],[15,-6],[7,4],[2,0]],'#d5e9f5');line(c,2,-24,9,-7,'#ffffff',1);c.restore()}
function decorateTerrain(c,{width,height,rnd,roadY}){
 // Underfoot route textures (not opaque new scenery).
 for(let x=12;x<width-12;x+=25){const y=roadY(x);if(x<1900||x>2600){const off=((rnd(x,16)*25)|0)-12;fill(c,x,y+off,4,1,rnd(x,33)>.5?'#dbc8a358':'#c3c8b144');}}
 // Tiny moonlit wildflowers in deliberate banks — the route itself remains clear.
 for(let i=0;i<1700;i++){const x=rnd(i,32)*width,y=rnd(i,99)*height;if(Math.abs(y-roadY(x))<43)continue;if(x>=1970&&x<2520&&rnd(i,11)<.8)continue;if(rnd(i,61)<.53)moonflower(c,x,y,i);else{fill(c,x,y-3,2,5,'#4e8470');fill(c,x+2,y-1,2,2,'#99a986')}}
 // village / warm window glow
 enrichedHouse(c,88,303,128,99);enrichedHouse(c,386,300,143,106,1);enrichedHouse(c,126,617,115,98,1);enrichedHouse(c,443,646,123,92);
 lilyPond(c,304,235);for(const [x,y] of [[84,520],[112,555],[260,385],[550,550],[480,594]])lantern(c,x,y);
 for(const [x,y] of [[314,270],[337,266],[354,273],[545,587],[532,580],[562,591]])crystal(c,x,y,.3);
 // distant spires outside the village path, tall enough to be landmark silhouettes
 gothicTower(c,655,187,.76);tapestry(c,593,305);tapestry(c,240,627,1);
 // Deep forest: hand-built silhouettes, mooncap fungi, crystalline pools and ruins.
 for(let i=0;i<34;i++){const x=755+(i*193)%708,y=32+((i*147)%805);if(Math.abs(y-roadY(x))<110||Math.hypot(x-1055,y-335)<90)continue;enchantedTree(c,x,y,.56+rnd(i,30)*.43,i%7===0?1:0)}
 for(let i=0;i<88;i++){const x=780+((i*113)%660),y=45+((i*79)%780);if(Math.abs(y-roadY(x))<54)continue;fill(c,x-3,y-2,7,3,i%4===0?'#ddb5cc':'#9daedb');fill(c,x-4,y,9,3,i%3===0?'#f6d0c4':'#c2c1e2');fill(c,x-1,y+3,3,5,'#e5d6b8');if(i%9===0)circle(c,x,y-5,8,'#a5c8f422')}
 stoneArch(c,1210,233,.56);crystal(c,1090,285,.7);crystal(c,1337,260,.4);mosaic(c,1065,359,29);
 // Kingless kingdom: ceremonial mosaics, ancient stonework and tattered insignia.
 stoneArch(c,1607,285,.73);stoneArch(c,1833,737,.75);mosaic(c,1580,660,34);mosaic(c,1821,328,32);
 for(const [x,y] of [[1520,326],[1775,278],[1880,761]]){facetedRock(c,x,y,.7,1);lantern(c,x-17,y-28,1)}
 for(const [x,y] of [[1624,270],[1728,312],[1880,250]])tapestry(c,x,y,1);
 // Cathedral district: gold sigils and rose window of moon glass.
 gothicTower(c,2296,290,1.12,1);gothicTower(c,2064,296,.75,1);mosaic(c,2234,515,54);tapestry(c,2133,401);tapestry(c,2352,397,1);
 for(let j=0;j<18;j++){let a=j*TWO/18,x=2225+Math.cos(a)*65,y=467+Math.sin(a)*44;fill(c,x,y,4,4,j%2?'#d3bb90':'#85a5ad')}
 // Additional provinces: wildly different palettes and architecture, still keeping the road readable.
 for(let i=0;i<16;i++){const x=2590+((i*143)%775),y=20+((i*131)%830);if(Math.abs(y-465)<77)continue;facetedRock(c,x,y,.8+rnd(i,21)*1.2,i%2);if(i%3===0)crystal(c,x+32,y,.7)}
 for(const [x,y] of [[3538,265],[3725,665],[3933,251],[4058,670]])stoneArch(c,x,y,.65);
 for(let i=0;i<27;i++){const x=3470+(i*117)%720,y=35+(i*173)%790;if(Math.abs(y-465)<80)continue;crystal(c,x,y,.34+rnd(i,66)*.48)}
 for(const [x,y] of [[4250,318],[4541,658],[4802,268]])gothicTower(c,x,y,.7,1);
 for(let i=0;i<6;i++)tapestry(c,4213+i*105,i%2?737:240,i%2);
 for(const [x,y] of [[5099,275],[5190,718],[5290,290]])crystal(c,x,y,1.1);
}
function drawLivingWorld(c,cam,hero,time,phase){
 // Warm movement in lanterns & glass, no new screen-sized blur layers.
 const pts=[[84,500,'#f5cb80'],[637,528,'#f8d4a0'],[875,475,'#a7d6c2'],[1456,490,'#93cbeb'],[2070,469,'#bdceff'],[2261,467,'#ffd6a0'],[3750,480,'#cee4fb']];
 c.save();for(const [x,y,color] of pts){if(Math.abs(hero.x-x)>400||Math.abs(hero.y-y)>330)continue;const a=.38+.2*Math.sin(time*2+x),r=18+4*Math.sin(time*3+x);c.globalAlpha=a;circle(c,x,y-20,r,color+'18');circle(c,x,y-20,3,'#fff5cf');}c.globalAlpha=1;
 // Hand-placed animate bird silhouettes and floating motes.
 if(hero.x>700&&hero.x<1530){for(let i=0;i<4;i++){const x=hero.x+Math.sin(time*.45+i*2)*140,y=hero.y-85+Math.sin(time+i)*9;if(x<cam.x||x>cam.x+510)continue;c.strokeStyle='#a8d5d57a';c.lineWidth=1;c.beginPath();c.moveTo(x-4,y);c.lineTo(x,y+2);c.lineTo(x+4,y);c.stroke()}}
 if(hero.x>2000&&hero.x<2520){for(let i=0;i<8;i++){const x=2110+i*24+Math.sin(time+i)*3,y=240+((i*37)%170);c.globalAlpha=.3+.3*Math.abs(Math.sin(time*.7+i));fill(c,x,y,2,2,i%2?'#ffe5a8':'#b7dbf2')}c.globalAlpha=1}
 c.restore();
}
function drawHeroDetails(c,hero,t){
 // Extra 1px sprite detail: moon crest, raised pauldrons, metal sparkle, and living cape.
 const x=Math.floor(hero.x),y=Math.floor(hero.y),s=hero.face||1,walk=hero.moving||0;
 c.save();c.translate(x,y);c.scale(s,1);
 const sway=Math.sin(hero.walk||0)*walk;
 // Acquired fabrics keep the same silhouette and evolve the sprite in small increments.
 const clothing=hero.cosmetics||{cloak:0,trim:0,aura:0};
 const cloaks=['#bc696b','#4f9b94','#9982ba','#c2c9dc','#705d69'];
 const metal=['#c2a77e','#dfbf85','#bcd8e2','#dfd6f8','#f4d8a1'];
 const cape=cloaks[clothing.cloak||0],finish=metal[clothing.trim||0];
 fill(c,-12,-16+Math.round(sway),5,17,cape);fill(c,-11,-19,4,5,'#e6d2b8');
 fill(c,-12,-2+Math.round(sway),6,3,cape);
 if((clothing.trim||0)>0){fill(c,5,-15,4,2,finish);fill(c,-7,-10,3,2,finish)}
 if((clothing.trim||0)>1){fill(c,-10,-5,4,2,finish);fill(c,0,-10,3,2,'#eaf4ec')}
 if((clothing.trim||0)>2){fill(c,10,-17,3,3,finish);fill(c,-8,-15,2,4,finish)}
 if((clothing.trim||0)>3){fill(c,-5,-11,10,1,finish);fill(c,-1,-27,4,2,finish)}
 if((clothing.aura||0)>0){const shimmer=.45+.35*Math.sin(t*3);c.globalAlpha=shimmer;circle(c,-15,-20-(t*13%11),1.5,clothing.aura===1?'#b4e2fd':clothing.aura===2?'#fae0aa':'#b5c8ff');circle(c,17,-29-(t*7%16),1.6,clothing.aura===1?'#d8f3ff':clothing.aura===2?'#f7d4a7':'#d3c9ff');c.globalAlpha=1}
 // traveler's bronze cloak trim and hem in richer shades
 fill(c,-11,-12+Math.round(sway),2,10,'#d88e80');fill(c,-10,-3+Math.round(sway),5,3,'#8e5362');fill(c,-8,-18,3,3,'#eec99b');
 // interlocking plate shoulder, breast crest, bright rivets
 fill(c,5,-15,5,4,'#677b91');fill(c,7,-16,4,2,'#d8d7cd');fill(c,7,-13,2,2,'#fff0c2');fill(c,-6,-12,3,3,'#c4bbc0');
 fill(c,-3,-10,6,2,'#b9bec3');fill(c,-2,-8,4,4,'#8c98a6');fill(c,-1,-7,2,2,hero.swordLevel>2?'#d8e6ff':'#eed2a2');
 // facial glow within hood: do not obscure original sprite
 fill(c,-2,-23,5,2,'#dbc6af');fill(c,-1,-22,1,1,'#434250');fill(c,3,-22,1,1,'#434250');fill(c,1,-19,2,1,'#a47768');
 // segmented sharpened blade, with small progressive inlays rather than a sudden palette change
 fill(c,11,-31,3,14,'#e1e6e5');fill(c,12,-33,2,3,'#fff9df');fill(c,12,-28,1,7,'#ffffff');fill(c,9,-17,9,2,'#ae986f');fill(c,11,-17,5,1,'#f4d4a4');
 if(hero.swordLevel>0){for(let i=0;i<Math.min(7,hero.swordLevel);i++)fill(c,11,-21-i*2,2,1,i%2?'#f4ddb4':'#b4ebed')}
 if(hero.armorLevel>0){for(let i=0;i<Math.min(hero.armorLevel,5);i++){fill(c,-8+i*3,-13,2,2,'#d4c49b');fill(c,-7+i*3,-1,1,2,'#a7c3cc')}}
 if(hero.blessings.moon>0){fill(c,-6,-31,4,2,'#9bd9f5');fill(c,-4,-34,1,3,'#c8ebfb')}
 if(hero.swordLevel>=3){c.globalAlpha=.6+.3*Math.sin(t*3);circle(c,13,-34,4,'#acdbea55');c.globalAlpha=1}
 if(hero.armorLevel>=3){fill(c,-9,-14,3,4,'#e4bf91');fill(c,-9,-11,2,3,'#b0b6c0')}
 c.restore();
}
window.LB_VISUALS={decorateTerrain,drawLivingWorld,drawHeroDetails};
})();