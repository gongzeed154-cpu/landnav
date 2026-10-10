/* ================= GAME SHELL ================= */
const APP={view:'map'};
const sheet=$('#sheet');
const setSheet=h=>{sheet.innerHTML=h;sheet.scrollTop=0;};
const on=(id,fn,ev)=>{const el=document.getElementById(id);if(el)el.addEventListener(ev||'click',fn);};
const val=id=>{const el=document.getElementById(id);return el?el.value:'';};
const num=id=>{const s=val(id).replace(/[^\d.\-]/g,'');return s===''?NaN:Number(s);};
function setStageView(v,showSeg){APP.view=v;$('#map').hidden=v!=='map';$('#comp').hidden=v!=='comp';$('#zoombar').hidden=v!=='map';$('#turnbar').hidden=v!=='comp';$('#turnhint').hidden=v!=='comp';$('#compbar').hidden=v!=='comp';
  $('#viewseg').hidden=!showSeg;$('#vMap').setAttribute('aria-pressed',v==='map');$('#vComp').setAttribute('aria-pressed',v==='comp');resize();}
$('#vMap').onclick=()=>setStageView('map',true);$('#vComp').onclick=()=>setStageView('comp',true);

/* ---------- persistence ---------- */
const GS={code:'ALPHA-01',sound:true,db:null,uid:null,writeOK:null,board:null,boardErr:'',tab:'camp'};
function loadLocal(){try{return JSON.parse(localStorage.getItem(CFG.short?'opcompass-s1':'opcompass-v1')||'{}')||{};}catch(e){return{};}}
GS.st=Object.assign({callsign:'',levels:{},so:{}},loadLocal());
try{if(!GS.st.callsign)GS.st.callsign=(localStorage.getItem('lnav-name')||'').slice(0,40);if(!GS.st.sid)GS.st.sid=(localStorage.getItem('lnav-sid')||'').slice(0,20);}catch(e){}
function saveLocal(){try{localStorage.setItem(CFG.short?'opcompass-s1':'opcompass-v1',JSON.stringify(GS.st));}catch(e){}}
let writeChain=Promise.resolve();
function remoteBody(){const so={};Object.keys(GS.st.so).slice(-20).forEach(k=>so[k]=GS.st.so[k]);
  return{callsign:(GS.st.callsign||'').slice(0,40),stars:totalStars(),cleared:cleared(),levels:GS.st.levels,so,at:Date.now()};}
function saveRemote(){if(!GS.db||!GS.uid||GS.writeOK===false)return;const body=remoteBody();
  writeChain=writeChain.then(()=>GS.db.doc('scores/'+GS.uid).set(body)).then(()=>{GS.writeOK=true;},e=>{
    if(e&&e.code==='unavailable')return new Promise(r=>setTimeout(r,800+Math.random()*800)).then(()=>GS.db.doc('scores/'+GS.uid).set(body)).catch(()=>{});
    if(e&&(e.code==='invalid_argument'||e.code==='not_granted'))GS.writeOK=false;});}

/* ---------- progression ---------- */
const RANKS=['นักเรียน','พลทหาร','จ่าอากาศตรี','จ่าอากาศโท','จ่าอากาศเอก','พันจ่าอากาศตรี','พันจ่าอากาศโท','พันจ่าอากาศเอก','เรืออากาศตรี','เรืออากาศโท','เรืออากาศเอก','นาวาอากาศตรี','นาวาอากาศโท'];
const starsOf=s=>s>=95?3:s>=80?2:s>=60?1:0;
const cleared=()=>LEVELS.filter(l=>(GS.st.levels[l.id]||0)>=60).length;
const totalStars=()=>LEVELS.reduce((a,l)=>a+starsOf(GS.st.levels[l.id]||0),0);
const unlocked=i=>i===0||(GS.st.levels[LEVELS[i-1].id]||0)>=60;
function badge(r,size){size=size||30;const off=r>=8;r=Math.min(r,7);let inner='';
  if(off)inner='<path d="M15 8l2 4.3 4.7.5-3.5 3.2 1 4.6-4.2-2.4-4.2 2.4 1-4.6-3.5-3.2 4.7-.5z" fill="#f0b03a"/>';
  else for(let k=0;k<Math.min(r,4);k++){const y=19-k*4.2;inner+=`<path d="M8.5 ${y}l6.5-4 6.5 4" fill="none" stroke="#f0b03a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;}
  if(r>4&&!off)inner+=`<circle cx="15" cy="23.5" r="1.8" fill="#f0b03a"/>`;
  return`<svg width="${size}" height="${size}" viewBox="0 0 30 30" aria-hidden="true"><path d="M15 2l11 4v8c0 7-5 11.5-11 14C9 25.5 4 21 4 14V6z" fill="#26301f" stroke="#4d5c44" stroke-width="1.2"/>${inner}</svg>`;}
const starStr=n=>'★'.repeat(n)+`<i>${'★'.repeat(3-n)}</i>`;
function renderRankChip(){const r=cleared();$('#rankchip').innerHTML=`${badge(r,26)}<b>${RANKS[r]}</b><span class="st">★ ${totalStars()}/${LEVELS.length*3}</span>`;}

/* ---------- sound & flash ---------- */
let AC=null;
function tone(f,t0,d,type,vol){const o=AC.createOscillator(),g=AC.createGain();o.type=type||'sine';o.frequency.value=f;g.gain.setValueAtTime(0,AC.currentTime+t0);g.gain.linearRampToValueAtTime(vol||.12,AC.currentTime+t0+.01);g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+t0+d);o.connect(g);g.connect(AC.destination);o.start(AC.currentTime+t0);o.stop(AC.currentTime+t0+d+.05);}
function sfx(k){if(!GS.sound)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();
  if(k==='ok'){tone(880,0,.12,'triangle');tone(1320,.08,.16,'triangle');}
  else if(k==='bad'){tone(160,0,.25,'sawtooth',.08);}
  else if(k==='win'){[523,659,784,1047].forEach((f,i)=>tone(f,i*.11,.22,'triangle'));}
  else if(k==='tick'){tone(1500,0,.04,'square',.04);}}catch(e){}}
function flash(ok){const f=$('#flash');f.className='flash '+(ok?'ok':'bad');setTimeout(()=>f.className='flash',350);sfx(ok?'ok':'bad');}
$('#snd').onclick=()=>{GS.sound=!GS.sound;$('#snd').setAttribute('aria-pressed',GS.sound);$('#sndwave').style.opacity=GS.sound?1:.15;};

/* ---------- timer ---------- */
let TM=null;
function startTimer(sec,onEnd){stopTimer();const t0=performance.now();const left=()=>Math.max(0,sec-(performance.now()-t0)/1000);
  TM=setInterval(()=>{const l=left(),b=$('#tbar');if(b){b.firstElementChild.style.width=(l/sec*100)+'%';b.classList.toggle('low',l<sec*0.2);}const t=$('#tleft');if(t)t.textContent=Math.ceil(l)+' วิ';if(l<=0){stopTimer();onEnd();}},200);return left;}
function stopTimer(){if(TM){clearInterval(TM);TM=null;}}
const hud=(name,timed)=>`<div class="hud"><span class="lvl">${esc(name)}</span><span class="combo" id="combo"></span>${timed?'<span class="mono muted" id="tleft"></span>':''}<span class="pts" id="pts">0</span></div>${timed?'<div class="tbar" id="tbar"><span style="width:100%"></span></div>':'<div style="height:8px"></div>'}`;
function setPts(p,combo){const e=$('#pts');if(e)e.textContent=Math.round(p);const c=$('#combo');if(c)c.textContent=combo>=3?`คอมโบ ×${combo}`:'';}

/* ---------- levels ---------- */
function levelSession(idx){let done=false;const S={pts:0,combo:0,idx,
  hit(p){S.pts+=p;S.combo++;if(S.combo>=3)S.pts+=2;flash(true);setPts(S.pts,S.combo);},
  miss(){S.combo=0;flash(false);setPts(S.pts,0);},
  end(bonus){if(done)return;done=true;S.over=true;stopTimer();tapHandler=null;setStageView('map',false);finishLevel(idx,S.pts+(bonus||0),S.extra||'');}};return S;}
function finishLevel(idx,raw,extra){const L=LEVELS[idx],score=clamp(Math.round(raw),0,100),stars=starsOf(score);
  const prevBest=GS.st.levels[L.id]||0,prevRank=cleared();if(score>prevBest)GS.st.levels[L.id]=score;saveLocal();
  const nowRank=cleared(),promoted=nowRank>prevRank;renderRankChip();saveRemote();gameSubmit();sfx(stars?'win':'bad');
  const next=idx+1<LEVELS.length&&unlocked(idx+1);
  setSheet(`<div class="result"><div class="eyebrow">ภารกิจ ${idx+1} · ${esc(L.name)}</div>
    <div class="bigstars">${[0,1,2].map(k=>k<stars?'<b>★</b>':'<i>★</i>').join('')}</div>
    <div class="score mono">${score}<span class="muted" style="font-size:18px"> / 100</span></div>
    <p class="muted">${stars?(score>prevBest&&prevBest?'ทำลายสถิติเดิม ('+prevBest+')':'สถิติดีที่สุด '+Math.max(score,prevBest)):'ต้องได้ 60 คะแนนขึ้นไปจึงผ่านภารกิจ'}</p>
    ${promoted?`<div class="promo">${badge(nowRank,40)}<br>เลื่อนยศเป็น ${RANKS[nowRank]}</div>`:''}
    ${extra?`<div style="text-align:left">${extra}</div>`:''}
    <div class="row" style="justify-content:center"><button class="btn" id="again">เล่นอีกครั้ง</button>${next?'<button class="btn primary" id="nxt">ภารกิจถัดไป</button>':''}<button class="btn" id="home">แผนที่ภารกิจ</button></div></div>`);
  on('again',()=>startLevel(idx));on('nxt',()=>startLevel(idx+1));on('home',()=>setTab('camp'));}
function startLevel(i){O={};tapHandler=null;stopTimer();DRAW.on=false;resetCompass({mode:'top'});setStageView('map',false);LEVELS[i].run(levelSession(i),LEVELS[i]);requestDraw();}

/* L1 symbols speed round */
function runL1(S,L){const qs=mapQuestions(5,2,3,2);const limit=100;let i=0;const left=startTimer(limit,()=>S.end(0));
  const show=()=>{if(S.over)return;if(i>=qs.length)return S.end(Math.round(16*left()/limit));const q=qs[i];O={marks:[{x:q.p.x,y:q.p.y,kind:'ring'}]};setView(q.p.x,q.p.y,qZoom(q));const opts=q.opts,ans=q.ans;
    setSheet(hud(`ภารกิจ ${S.idx+1} · ${L.name} · ${i+1}/${qs.length}`,true)+`<p class="q">${QTEXT[q.kind]}</p><div class="choices">${opts.map((o,k)=>`<button data-k="${k}">${esc(o)}</button>`).join('')}</div>`);setPts(S.pts,S.combo);
    sheet.querySelectorAll('.choices button').forEach(b=>b.onclick=()=>{const ok=opts[+b.dataset.k]===ans;sheet.querySelectorAll('.choices button').forEach(x=>{x.disabled=true;if(opts[+x.dataset.k]===ans)x.classList.add('ok');});
      if(ok)S.hit(7);else{b.classList.add('no');S.miss();}setTimeout(()=>{i++;show();},ok?450:1200);});};show();}
/* L2 grid read */
function runL2(S,L){const qs=[];for(let k=0;k<8;k++){const d=k<5?6:8;let p=null;for(let t=0;t<100&&!p;t++){const x=d===6?100*Math.floor(rnd(3,77))+rnd(30,70):10*Math.floor(rnd(30,770))+rnd(3,7),y=d===6?100*Math.floor(rnd(3,77))+rnd(30,70):10*Math.floor(rnd(30,770))+rnd(3,7);if(!W.isWater(x,y))p={x,y};}qs.push({d,p:p||{x:4050,y:4050}});}
  const limit=150;let i=0;const left=startTimer(limit,()=>S.end(0));
  const show=()=>{if(S.over)return;if(i>=qs.length)return S.end(Math.round(20*left()/limit));const q=qs[i];O={plate:O.plate||null,marks:[{x:q.p.x,y:q.p.y,kind:'dot'}]};setView(q.p.x,q.p.y,q.d===8?0.9:0.35);
    setSheet(hud(`ภารกิจ ${S.idx+1} · ${L.name} · ${i+1}/${qs.length}`,true)+`<p class="q">พิกัด <b>${q.d} หลัก</b> ของจุดแดงคืออะไร?</p>
      <div class="row"><div class="field"><label for="ans">ตัวเลข ${q.d} หลัก (ขวาก่อน แล้วขึ้น)${q.d===8?` · ยอมคลาด ±${TOL.g8} หลักสุดท้าย`:""}</label><input id="ans" inputmode="numeric" autocomplete="off"></div><button class="btn primary" id="ok">ยิง!</button></div>
      <div class="tools">${plateBtns('<button class="btn" id="ps">วางมุมไม้วัดพิกัดที่จุด</button>')}</div><div id="fbx"></div>`);setPts(S.pts,S.combo);
    $('#ans').focus({preventScroll:true});
    bindPlate({romerAt:()=>q.p});
    const check=()=>{const s=val('ans').replace(/\D/g,'');if(s.length!==q.d)return;const g=gridCheck(s,q.p,q.d),ok=g.ok;$('#ok').disabled=true;$('#ans').disabled=true;
      if(ok)S.hit(g.exact?10:8);else S.miss();$('#fbx').innerHTML=`<div class="fb ${ok?'good':'bad'}"><strong>${g.exact?'✓ แม่นยำ':ok?'✓ ผ่าน (คลาดเล็กน้อย) +8':'✗'}</strong> ${g.msg}</div>`;
      if(g.exact)setTimeout(()=>{i++;show();},600);else{$('#fbx').insertAdjacentHTML('beforeend','<div class="row"><button class="btn primary" id="nx">ต่อไป</button></div>');on('nx',()=>{i++;show();});}};
    on('ok',check);on('ans',e=>{if(e.key==='Enter')check();},'keydown');};show();}
/* L3 plot by grid */
function runL3(S,L){const qs=[];for(let k=0;k<6;k++)qs.push(randLand(400));let i=0,sum=0;
  const show=()=>{if(S.over)return;if(i>=qs.length)return S.end(0);const p=qs[i],ref=gridRef(p.x,p.y,6),cx=Math.floor((E0+p.x)/100)*100-E0+50,cy=Math.floor((N0+p.y)/100)*100-N0+50;let pin=null;O={plate:O.plate||null,marks:[]};fitView();
    tapHandler=(x,y)=>{pin={x,y};O.marks=[{x,y,kind:'pin',color:'#d6261c'}];$('#ok').disabled=false;requestDraw();};nudgeReg(()=>pin,p=>{O.marks=[{x:p.x,y:p.y,kind:'pin',color:'#d6261c'}];});
    setSheet(hud(`ภารกิจ ${S.idx+1} · ${L.name} · ${i+1}/${qs.length}`,false)+`<p class="q">ปักธงที่พิกัด <span class="mono">${ZONE} ${ref}</span></p><p class="muted">ห่างจากกลางช่อง ≤80 ม. = เต็ม · ≤150 ม. = 70% · ≤250 ม. = 35% · ปักแล้วใช้ปุ่มลูกศรมุมซ้ายล่างเลื่อนธงทีละนิดได้</p><div class="tools">${plateBtns()}</div><div class="row"><button class="btn primary" id="ok" disabled>ปักธง!</button></div><div id="fbx"></div>`);bindPlate();setPts(S.pts,S.combo);
    on('ok',()=>{tapHandler=null;const d=hyp(pin.x-cx,pin.y-cy),g=d<=80?1:d<=150?.7:d<=250?.35:0;const p2=100/6*g;if(g>=.7)S.hit(p2);else{S.pts+=p2;S.miss();}
      O.marks.push({x:cx-50,y:cy-50,kind:'sq'});setView(cx,cy,Math.max(V.z,0.3));$('#ok').disabled=true;
      const dE=Math.floor((E0+pin.x)/100)-Math.floor((E0+cx)/100),dN=Math.floor((N0+pin.y)/100)-Math.floor((N0+cy)/100);
      const tip=g>=1?'':(Math.abs(dE)>=10||Math.abs(dN)>=10)?'ตรวจตัวเลขใหญ่ของเส้นกริด (หลักกิโลเมตร)':(dE||dN)?`ธงอยู่คนละช่อง (ตะวันออก ${dE>0?'+':''}${dE} · เหนือ ${dN>0?'+':''}${dN} ช่อง): ค่า 3 ตัวแรก = ขวา ค่า 3 ตัวหลัง = ขึ้น นับจากเส้นกริดทางซ้ายและทางใต้ของช่อง`:'อยู่ในช่องที่ถูกแล้ว ปักให้ใกล้กลางช่องมากขึ้น';
      $('#fbx').innerHTML=`<div class="fb ${g>=.7?'good':'bad'}">ห่างกลางช่องเป้า ${Math.round(d)} ม. · ได้ ${Math.round(p2)} คะแนน<br>ช่องที่ถูก (กรอบเขียว) <span class="mono">${ZONE} ${ref}</span> · ธงของคุณอ่านได้ <span class="mono">${gridRef(pin.x,pin.y,6)}</span>${tip?'<br>• '+tip:''}</div><div class="row"><button class="btn primary" id="nx">ต่อไป</button></div>`;on('nx',()=>{i++;show();});});};show();}
/* compass helpers */
function standPoint(n){for(let i=0;i<40;i++){const p=randLand(500);const l=computePano(p.x,p.y);if(l.filter(x=>x.vis).length>=n)return p;}const p=randLand(500);computePano(p.x,p.y);return p;}
/* L4 face azimuth */
function runL4(S,L){const sp=standPoint(2);C.heading=rnd(0,360);C.disp=magHeading();C.vel=0;O={marks:[{x:sp.x,y:sp.y,kind:'sp',label:'จุดยืน'}]};setView(sp.x,sp.y,0.12);setStageView('comp',false);resetCompass({mode:'top'});
  const ts=[];for(let k=0;k<6;k++)ts.push(Math.round(rnd(0,359)));const limit=90;let i=0;const left=startTimer(limit,()=>S.end(0));
  const show=()=>{if(S.over)return;if(i>=ts.length)return S.end(Math.round(22*left()/limit));const m=ts[i];
    setSheet(hud(`ภารกิจ ${S.idx+1} · ${L.name} · ${i+1}/${ts.length}`,true)+`<p class="q">หันไปที่มุมภาคแม่เหล็ก <span class="mono" style="color:var(--accent);font-size:22px">${m}°</span></p><p class="muted">±2° = 13 คะแนน · ±${TOL.comp}° = 11 (ผ่าน) · ±7° = 5 · รอหน้าปัดนิ่งก่อนกด</p><div class="row"><button class="btn primary" id="ok">ล็อกเป้า!</button></div><div id="fbx"></div>`);setPts(S.pts,S.combo);
    on('ok',()=>{const err=Math.round(angDiff(magHeading(),m)*10)/10,a=Math.abs(err),p=a<=2.05?13:a<=TOL.comp+0.05?11:a<=7?5:0;$('#ok').disabled=true;if(p>=11)S.hit(p);else{S.pts+=p;S.miss();}
      $('#fbx').innerHTML=`<div class="fb ${p>=11?'good':'bad'}">เป้าหมาย ${m}° · คุณหันไปที่ ${fd(magHeading())}° (คลาด ${err>0?'+':''}${err}°) · +${p}${p>=11?'':'<br>• หมุนตัวช้าลงเมื่อใกล้ค่า รอหน้าปัดนิ่ง แล้วอ่านตัวเลขสีแดง (องศา) ใต้เส้นขีดดำ'}</div>`;setTimeout(()=>{i++;C.heading=wrap360(C.heading+rnd(60,200));requestDraw();show();},p>=11?1000:2600);});};show();}
/* L5 read landmark */
function runL5(S,L){const sp=standPoint(3);C.heading=rnd(0,360);C.disp=magHeading();C.vel=0;O={marks:[{x:sp.x,y:sp.y,kind:'sp',label:'จุดยืน'}]};setView(sp.x,sp.y,0.12);setStageView('comp',false);resetCompass({mode:'sight'});
  const vis=C.lms.filter(l=>l.vis);const ts=[];for(let k=0;k<5;k++)ts.push(vis.length?vis[k%vis.length]:null);const limit=150;let i=0;const left=startTimer(limit,()=>S.end(0));
  const show=()=>{if(S.over)return;if(i>=ts.length||!ts[i])return S.end(Math.round(20*left()/limit));const lm=ts[i];C.target=lm.name;requestDraw();
    setSheet(hud(`ภารกิจ ${S.idx+1} · ${L.name} · ${i+1}/${ts.length}`,true)+`<p class="q">ส่องเข็มทิศไปที่ <b>${esc(lm.name)}</b> มุมภาคแม่เหล็กเท่าไร?</p><div class="row"><div class="field"><label for="ans">องศา</label><input id="ans" inputmode="decimal" autocomplete="off"></div><button class="btn primary" id="ok">ส่ง</button></div><div id="fbx"></div>`);setPts(S.pts,S.combo);
    const check=()=>{const a=num('ans');if(isNaN(a))return;const t=wrap360(lm.az-W.gmDeg),err=Math.round(angDiff(a,t)*10)/10,e=Math.abs(err),p=e<=2.05?16:e<=TOL.comp+0.05?13:e<=7?6:0;$('#ok').disabled=true;$('#ans').disabled=true;
      if(p>=13)S.hit(p);else{S.pts+=p;S.miss();}$('#fbx').innerHTML=`<div class="fb ${p>=13?'good':'bad'}">ค่าจริง <span class="mono">${fd(t)}°</span> · คุณตอบ ${fd(a)}° (คลาด ${err>0?'+':''}${err}°) · +${p}${p>=13?'':compassTip(a,t)}</div>`;
      if(p>=13)setTimeout(()=>{i++;show();},1300);else{$('#fbx').insertAdjacentHTML('beforeend','<div class="row"><button class="btn primary" id="nx">ต่อไป</button></div>');on('nx',()=>{i++;show();});}};
    on('ok',check);on('ans',e=>{if(e.key==='Enter')check();},'keydown');};show();}
/* L6 conversion quick-fire */
function runL6(S,L){O={};fitView();const qs=[];for(let k=0;k<12;k++){const v=Math.round(rnd(0,359));qs.push({t:'back',v,ans:wrap360(v+180)});}
  const limit=120;let i=0;const left=startTimer(limit,()=>S.end(0));
  const LBL={back:['มุมภาค','→ มุมภาคกลับ']};
  const show=()=>{if(S.over)return;if(i>=qs.length)return S.end(Math.round(16*left()/limit));const q=qs[i];
    setSheet(hud(`ภารกิจ ${S.idx+1} · ${L.name} · ${i+1}/${qs.length}`,true)+`<p class="muted">มุมกลับ: น้อยกว่า 180° บวก 180° · ตั้งแต่ 180° ขึ้นไป ลบ 180° (ชุดนี้มุมกริด = มุมแม่เหล็ก)</p>
      <p class="q">${LBL[q.t][0]} <span class="mono" style="color:var(--accent);font-size:22px">${q.v}°</span> ${LBL[q.t][1]} = ?</p>
      <div class="row"><div class="field"><label for="ans">คำตอบ (องศา)</label><input id="ans" inputmode="decimal" autocomplete="off"></div><button class="btn primary" id="ok">ส่ง</button></div><div id="fbx"></div>`);setPts(S.pts,S.combo);$('#ans').focus({preventScroll:true});
    const check=()=>{const a=num('ans');if(isNaN(a))return;const ok=Math.abs(angDiff(a,q.ans))<=1.05;$('#ok').disabled=true;$('#ans').disabled=true;if(ok)S.hit(7);else S.miss();
      $('#fbx').innerHTML=`<div class="fb ${ok?'good':'bad'}"><strong>${ok?'✓':'✗'}</strong> ${q.v}° ${q.v<180?'+ 180':'− 180'} = <span class="mono">${fd(q.ans)}°</span>${ok?'':` · คุณตอบ ${fd(a)}°${Math.abs(angDiff(a,q.v))<1.1?' (ยังไม่ได้กลับทิศ)':''}`}</div>`;setTimeout(()=>{i++;show();},ok?700:2200);};
    on('ok',check);on('ans',e=>{if(e.key==='Enter')check();},'keydown');};show();}
/* L7 azimuth & distance */
function runL7(S,L){const qs=[];for(let k=0;k<4;k++){let A,B;for(let t=0;t<100;t++){A=randLand(600);B=randLand(600);const d=dist(A,B);if(d>800&&d<3200)break;}qs.push({A,B});}let i=0;
  const show=()=>{if(S.over)return;if(i>=qs.length)return S.end(0);const{A,B}=qs[i],gaz=gridAz(A,B),gm=Math.round(gaz),mm=wrap360(gm-W.gmDeg),dd=Math.round(dist(A,B));DRAW.on=false;
    O={plate:O.plate?{x:A.x,y:A.y}:null,lines:[],marks:[{x:A.x,y:A.y,kind:'dot',label:'A'},{x:B.x,y:B.y,kind:'dot',label:'B'}]};setView((A.x+B.x)/2,(A.y+B.y)/2,clamp(Math.min(mapC.clientWidth,mapC.clientHeight)*0.7/Math.max(dist(A,B),600),fitZoom(),0.6));
    setSheet(hud(`ภารกิจ ${S.idx+1} · ${L.name} · ${i+1}/${qs.length}`,false)+`<p class="q">จาก A ไป B</p><p class="muted">ขีดเส้นดินสอ A→B · วางแผ่นวัดมุมที่ A · วางขอบเข็มทิศวัดระยะ · มุมกริด = มุมแม่เหล็ก</p>
      <div class="tools">${drawBtns()}<button class="btn" id="tp" aria-pressed="${!!O.plate}">แผ่นวัดมุมที่ A</button></div>
      <div class="row"><div class="field"><label for="a1">มุมภาค (องศา)</label><input id="a1" inputmode="decimal"></div><div class="field"><label for="a2">ระยะ (ม.)</label><input id="a2" inputmode="numeric"></div></div>
      <div class="row"><button class="btn primary" id="ok">ส่งคำตอบ</button></div><div id="fbx"></div>`);setPts(S.pts,S.combo);bindDraw();
    on('tp',e=>{O.plate=O.plate?null:{x:A.x,y:A.y};e.currentTarget.setAttribute('aria-pressed',!!O.plate);if(O.plate)setView(A.x,A.y,Math.min(mapC.clientWidth,mapC.clientHeight)/5400);requestDraw();});
    on('ok',()=>{const a=[num('a1'),num('a2')];if(a.some(isNaN))return;const r=[Math.abs(angDiff(a[0],gaz))<=TOL.az,Math.abs(a[1]-dd)<=Math.max(dd*TOL.dist,TOL.distMin)];
      r.forEach((ok,k)=>{const el=$('#a'+(k+1));el.classList.add(ok?'ok':'no');el.disabled=true;});const p=(r[0]?13:0)+(r[1]?12:0);if(p>=17)S.hit(p);else{S.pts+=p;S.miss();}$('#ok').disabled=true;DRAW.on=false;
      O.line={a:A,b:B,color:'#d6261c',dash:[6,4]};O.plate={x:A.x,y:A.y,az:gaz};requestDraw();$('#fbx').innerHTML=`<div class="fb ${p>=17?'good':'bad'}">+${p} · ค่าที่ถูก: มุมภาค <span class="mono">${fd(gm)}°</span> · ระยะ <span class="mono">${dd}</span> ม.<br><span class="muted">คุณตอบ ${fd(a[0])}° · ${a[1]} ม. · ยอมคลาด มุม ±${TOL.az}° ระยะ ±${Math.round(Math.max(dd*TOL.dist,TOL.distMin))} ม.</span>${angTip(a[0],gaz,'มุมภาค')}${distTip(a[1],dd)}</div><div class="row"><button class="btn primary" id="nx">ต่อไป</button></div>`;on('nx',()=>{i++;show();});});};show();}
/* compass parts & cautions */
function runParts(S,L){const sp=standPoint(1);C.heading=rnd(0,360);C.disp=magHeading();setStageView('comp',false);resetCompass({mode:'top'});
  const qs=[];const used=new Set();while(qs.length<6){const q=partQuestion();if(used.has(q.key))continue;used.add(q.key);qs.push({kind:'part',...q});}
  for(let k=0;k<2;k++){const q=cautionQuestion();qs.push({kind:'caution',...q});}
  const limit=80;let i=0;const left=startTimer(limit,()=>S.end(0));
  const show=()=>{if(S.over)return;if(i>=qs.length)return S.end(Math.round(20*left()/limit));const q=qs[i];resetCompass({mode:'top',hl:q.kind==='part'?q.key:null});
    setSheet(hud(`ภารกิจ ${S.idx+1} · ${L.name} · ${i+1}/${qs.length}`,true)+`<p class="q">${q.kind==='part'?'ส่วนที่มีวงแดงกะพริบคืออะไร?':`ใช้เข็มทิศให้ห่างจาก<b>${q.item}</b> อย่างน้อยเท่าไร?`}</p><div class="choices">${q.opts.map((o,k)=>`<button data-k="${k}">${esc(o)}</button>`).join('')}</div>`);setPts(S.pts,S.combo);
    sheet.querySelectorAll('.choices button').forEach(b=>b.onclick=()=>{const ok=q.opts[+b.dataset.k]===q.ans;sheet.querySelectorAll('.choices button').forEach(x=>{x.disabled=true;if(q.opts[+x.dataset.k]===q.ans)x.classList.add('ok');});
      if(ok)S.hit(10);else{b.classList.add('no');S.miss();}setTimeout(()=>{i++;show();},ok?450:1300);});};show();}
/* geographic coordinates */
function runGeo(S,L){const qs=[];for(let k=0;k<4;k++)qs.push(randLand(500));let i=0;
  const show=()=>{if(S.over)return;if(i>=qs.length)return S.end(0);const p=qs[i],la=latSecAt(p.y),lo=lonSecAt(p.x);O={plate:O.plate||null,lines:O.lines||[],marks:[{x:p.x,y:p.y,kind:'dot'}]};setView(p.x,p.y,0.16);
    setSheet(hud(`ภารกิจ ${S.idx+1} · ${L.name} · ${i+1}/${qs.length}`,false)+`<p class="q">พิกัดภูมิศาสตร์ของจุดแดง (องศา ลิปดา ฟิลิปดา)</p><p class="muted">±${TOL.geo}″ = 25 คะแนน · ±15″ = 12 · กากบาทบนแผนที่ทุก 1 ลิปดา</p>
      <div class="row"><div class="field"><label for="la">ละติจูด N</label><input id="la" autocomplete="off" placeholder="14 16 50"></div><div class="field"><label for="lo">ลองจิจูด E</label><input id="lo" autocomplete="off" placeholder="99 32 05"></div><button class="btn primary" id="ok">ส่ง</button></div>
      <div class="tools">${plateBtns('<button class="btn" id="pg">วางมุมช่องวัดค่าลิปดาที่จุด</button>')}${drawBtns()}</div><div id="fbx"></div>`);setPts(S.pts,S.combo);bindPlate({romerAt:()=>p});bindDraw();
    on('ok',()=>{const a=parseDMS(val('la')),b=parseDMS(val('lo'));if(isNaN(a)||isNaN(b))return;const e=Math.max(Math.abs(a-la),Math.abs(b-lo)),pt=e<=TOL.geo?25:e<=15?12:0;$('#ok').disabled=true;if(pt>=25)S.hit(pt);else{S.pts+=pt;S.miss();}
      const ea=Math.round(a-la),eo=Math.round(b-lo);$('#fbx').innerHTML=`<div class="fb ${pt>=25?'good':'bad'}">+${pt} · พิกัดจริง <span class="mono">${fmtDMS(la,'N')} , ${fmtDMS(lo,'E')}</span> (คลาด ${ea>0?'+':''}${ea}″ / ${eo>0?'+':''}${eo}″)${pt>=25?'':e>=50?'<br>• คลาดเกือบ 1 ลิปดา: ใช้ค่าลิปดาของเส้นด้านใต้ (ละติจูด) และด้านตะวันตก (ลองจิจูด) ของจุด':'<br>• วางมุมช่องวัดค่าทับจุดพอดี อ่านฟิลิปดาตรงที่เส้นลิปดาตัดแขนช่องวัดค่า'}</div><div class="row"><button class="btn primary" id="nx">ต่อไป</button></div>`;on('nx',()=>{i++;show();});});};show();}
/* night setting of the compass */
function runNight(S,L){const sp=standPoint(1);C.heading=rnd(0,360);C.disp=magHeading();setStageView('comp',false);
  const ts=[{k:'dark'},{k:'light'},{k:'dark'}];let i=0;
  const show=()=>{if(S.over)return;if(i>=ts.length)return S.end(1);const t=ts[i];
    if(t.k==='dark'){const n=Math.round(rnd(4,40)),X=n*3;resetCompass({mode:'top',night:true,lum:0});C.heading=wrap360(C.heading+rnd(40,160));
      setSheet(hud(`ภารกิจ ${S.idx+1} · ${L.name} · ${i+1}/${ts.length}`,false)+`<p class="q">ไม่มีแสงสว่าง ต้องเดินมุม <span class="mono" style="color:var(--accent);font-size:22px">${X}°</span></p><p class="muted">ขีดพรายน้ำเริ่มตรงเส้นดัชนี · หมุนวงแหวนทวนเข็ม (↺) = มุม ÷ 3 คลิก · แล้วหันตัวจนลูกศรพรายน้ำตรงขีดพรายน้ำ</p><div class="row"><button class="btn primary" id="ok">ยืนยันทิศ</button></div><div id="fbx"></div>`);setPts(S.pts,S.combo);
      on('ok',()=>{const err=Math.abs(angDiff(magHeading(),X)),pt=err<=TOL.compNight?33:err<=9?15:0,clicks=Math.round(wrap360(-C.lum)/3)%120;C.night=false;requestDraw();$('#ok').disabled=true;if(pt>=33)S.hit(pt);else{S.pts+=pt;S.miss();}
        $('#fbx').innerHTML=`<div class="fb ${pt>=33?'good':'bad'}">+${pt} · เป้าหมาย ${X}° = ${X} ÷ 3 = ${n} คลิกทวนเข็ม · คุณหมุน ${clicks} คลิก · หันไปที่ ${fd(magHeading())}° (คลาด ${Math.round(err)}°)${pt>=33?'':clicks!==n?'<br>• จำนวนคลิกไม่ตรง: เริ่มจากขีดพรายน้ำตรงเส้นดัชนี แล้วหมุนวงแหวนทวนเข็ม (↺) มุม ÷ 3 คลิก':'<br>• คลิกถูกแล้ว หันตัวช้าๆ จนลูกศรพรายน้ำทับขีดพรายน้ำพอดี'}</div><div class="row"><button class="btn primary" id="nx">ต่อไป</button></div>`;on('nx',()=>{i++;show();});});}
    else{const X=Math.round(rnd(10,350));resetCompass({mode:'top',lum:Math.round(rnd(0,119))*3});let ph=1;
      const ui=()=>{setSheet(hud(`ภารกิจ ${S.idx+1} · ${L.name} · ${i+1}/${ts.length}`,false)+(ph===1?`<p class="q">มีแสงสว่าง: ตั้งมุม <span class="mono" style="color:var(--accent);font-size:22px">${X}°</span></p><p class="muted">หันให้ ${X}° อยู่ใต้เส้นขีดดำ แล้วหมุนวงแหวนจนขีดพรายน้ำทับลูกศรเหนือ</p><div class="row"><button class="btn primary" id="ok">ตั้งเสร็จ</button></div>`
        :`<p class="q">ไฟดับ! หันตัวจนลูกศรพรายน้ำตรงขีดพรายน้ำ</p><div class="row"><button class="btn primary" id="ok">ยืนยันทิศ</button></div>`)+'<div id="fbx"></div>');setPts(S.pts,S.combo);
        on('ok',()=>{if(ph===1){if(Math.abs(angDiff(magHeading(),X))>3.5||Math.abs(lumErr(X))>3.5){$('#fbx').innerHTML='<div class="fb bad">ยังตั้งไม่ตรง ตรวจทั้งมุมใต้เส้นขีดดำและตำแหน่งขีดพรายน้ำ</div>';return;}
            ph=2;C.night=true;C.heading=wrap360(C.heading+(Math.random()<.5?-1:1)*rnd(60,150));requestDraw();ui();}
          else{const err=Math.abs(angDiff(magHeading(),X)),pt=err<=TOL.compNight?34:err<=9?15:0;C.night=false;requestDraw();$('#ok').disabled=true;if(pt>=34)S.hit(pt);else{S.pts+=pt;S.miss();}
            $('#fbx').innerHTML=`<div class="fb ${pt>=34?'good':'bad'}">+${pt} · หันไปที่ ${fd(magHeading())}° (เป้าหมาย ${X}° · คลาด ${Math.round(err)}°)${pt>=34?'':'<br>• หลังไฟดับ ห้ามหมุนวงแหวน ให้หมุนตัวช้าๆ จนลูกศรพรายน้ำทับขีดพรายน้ำพอดี'}</div><div class="row"><button class="btn primary" id="nx">ต่อไป</button></div>`;on('nx',()=>{i++;show();});}});};ui();}};show();}

/* ---------- navigation engine (L8 patrol & Score-O) ---------- */
function runNav(cfg){
  const sp=cfg.start;const N={stride:1+gauss()*0.03,tp:{...sp},pp:{...sp},found:new Set(),trueTrack:[{...sp}],plan:[[{...sp}]],pins:[],rays:[],searches:[],time:0,counted:0,actual:0,log:[],pinMode:false,done:false,endArm:false};
  const tg=cfg.targets;
  const pointsNow=()=>[...N.found].reduce((a,k)=>a+tg[k].pts,0);
  const nextIdx=()=>{for(let k=0;k<tg.length;k++)if(!N.found.has(k))return k;return -1;};
  const draw=()=>{const marks=[{x:sp.x,y:sp.y,kind:'sp',label:cfg.mode==='scoreo'?'เริ่ม/เส้นชัย':'SP'}];
    tg.forEach((c,k)=>{if(N.found.has(k))marks.push({x:c.x,y:c.y,kind:'cp',label:c.label,color:'#1f8a3a'});});
    N.pins.forEach((p,k)=>marks.push({x:p.x,y:p.y,kind:'pin',label:'หมุด '+(k+1)}));
    O={plate:O.plate||null,lines:O.lines||[],ruler:O.ruler||null,marks,rays:N.rays,tracks:N.plan.map(seg=>({pts:seg,color:'#555',dash:[6,5],width:1.8}))};routeApply(sp,N.pins);requestDraw();};
  const rows=()=>tg.map((c,k)=>`<span class="mono">${esc(c.label)}</span><span class="mono">${gridRef(c.x,c.y,8)}</span><span class="mono" style="color:var(--accent)">${cfg.mode==='scoreo'?c.pts:''}</span><span>${N.found.has(k)?'<span class="pill pass">✓</span>':(cfg.mode==='patrol'&&k===nextIdx()?'<span class="pill">ถัดไป</span>':'')}</span>`).join('');
  const lmOpts=()=>W.landmarks.map((l,k)=>`<option value="${k}">${esc(l.name)} (${gridRef(l.x,l.y,6)})</option>`).join('');
  const clock=()=>`<span class="mono ${cfg.limit&&N.time>cfg.limit?'':'muted'}" style="${cfg.limit&&N.time>cfg.limit?'color:var(--bad)':''}">เวลา ${Math.round(N.time)}${cfg.limit?'/'+cfg.limit:''} นาที</span>`;
  const ui=msg=>{draw();setSheet(`<div class="hud"><span class="lvl">${esc(cfg.title)}</span>${clock()}<span class="pts">${cfg.mode==='scoreo'?pointsNow():N.found.size+'/'+tg.length}</span></div><div style="height:6px"></div>
    <p class="muted" style="font-size:14px">เริ่มที่ <span class="mono">${ZONE} ${gridRef(sp.x,sp.y,8)}</span> · ตำแหน่งจริงของคุณถูกซ่อน เส้นประคือเส้นทางที่คุณคิดว่าเดิน${cfg.mode==='scoreo'?' · เก็บธงลำดับไหนก็ได้ แล้วกลับเส้นชัยก่อนหมดเวลา (เกินเวลาหัก 2 คะแนน/นาที)':''}</p>
    <div class="flaglist">${rows()}</div>
    ${msg?`<div class="fb">${msg}</div>`:''}
    <div class="row"><div class="field"><label for="laz">มุมภาค (องศา)</label><input id="laz" inputmode="decimal"></div><div class="field"><label for="ld">จำนวนก้าวที่นับ</label><input id="ld" inputmode="numeric"></div><button class="btn primary" id="walk">เดิน</button></div><p class="muted" style="font-size:12.5px;margin:4px 0 0">ก้าวมาตรฐาน 140 ก้าว/100 ม. · ระยะ = ก้าว × 100 ÷ 140</p>
    <div class="tools"><button class="btn" id="obs">สังเกตรอบตัว</button><button class="btn" id="look">ส่องเข็มทิศ</button><button class="btn" id="find">${cfg.mode==='scoreo'?'ค้นหาธง':'ค้นหาจุดตรวจ'}</button><button class="btn" id="pin" aria-pressed="${N.pinMode}">ปักหมุด</button><button class="btn" id="pinx" ${N.pins.length?'':'disabled'}>ลบหมุดล่าสุด</button>${routeBtn()}${plateBtns()}${drawBtns()}</div>
    <details><summary>ตัดกลับหาตำแหน่งตัวเอง</summary>
      <div class="row"><div class="field" style="flex-basis:100%"><label for="lm">จุดสังเกต</label><select id="lm">${lmOpts()}</select></div><div class="field"><label for="raz">มุมภาคกลับ จากจุดสังเกตมาหาเรา (องศา)</label><input id="raz" inputmode="decimal"></div><button class="btn" id="ray">ลากเส้น</button></div>
      <div class="tools"><button class="btn" id="rlast" ${N.rays.length?'':'disabled'}>ลบเส้นล่าสุด</button><button class="btn" id="rclr">ลบเส้นทั้งหมด</button><button class="btn" id="usepin" ${N.pins.length?'':'disabled'}>ใช้หมุดล่าสุดเป็นตำแหน่งของฉัน</button></div></details>
    <div class="row"><button class="btn" id="end">${cfg.mode==='scoreo'?(N.endArm?'ยืนยันจบนอกเส้นชัย (หักครึ่ง)':'เข้าเส้นชัย'):'จบภารกิจ'}</button></div>
    <ul class="log">${N.log.slice(-5).reverse().map(l=>`<li>${l}</li>`).join('')}</ul>`);
    bindPlate();bindDraw();bindRoute(m=>ui(m));on('walk',walk);on('obs',()=>ui('<b>สังเกตได้:</b> '+observeText(N.tp.x,N.tp.y).join(' · ')));
    on('look',()=>{computePano(N.tp.x,N.tp.y);C.disp=magHeading();resetCompass({mode:'sight'});setStageView('comp',true);});
    on('find',find);on('pin',()=>{N.pinMode=!N.pinMode;setStageView('map',true);ui(N.pinMode?'แตะแผนที่เพื่อปักหมุด':'');});
    on('ray',()=>{const k=+val('lm'),a=num('raz');if(isNaN(a))return;const Lm=W.landmarks[k];N.rays.push({x:Lm.x,y:Lm.y,az:wrap360(a)});ui(`ลากเส้นจาก ${esc(Lm.name)} ที่ ${fd(a)}°`);});
    on('rclr',()=>{N.rays.length=0;ui('');});
    on('rlast',()=>{N.rays.pop();ui('ลบเส้นสกัดกลับเส้นล่าสุดแล้ว');});
    on('pinx',()=>{N.pins.pop();ui(N.pins.length?`เหลือหมุด ${N.pins.length} อัน`:'ลบหมุดหมดแล้ว');});
    on('usepin',()=>{const p=N.pins[N.pins.length-1];N.pp={...p};N.plan.push([{...p}]);N.log.push('ตั้งตำแหน่งใหม่ที่หมุด '+N.pins.length);ui('ตั้งตำแหน่งของคุณที่หมุดล่าสุดแล้ว');});
    on('end',endPress);};
  tapHandler=(x,y)=>{if(!N.pinMode||N.done)return;N.pins.push({x,y});ui(`ปักหมุด ${N.pins.length} ที่ ${gridRef(x,y,8)} · ใช้ปุ่มลูกศรมุมซ้ายล่างเลื่อนหมุดล่าสุดได้`);};
  nudgeReg(()=>N.pins[N.pins.length-1],()=>draw());N.legs=[];N.fails=0;
  const aimOf=(pp,az,cnt)=>{if(cfg.mode==='patrol'){const k=nextIdx();return k>=0?tg[k]:null;}const a=(az+W.gmDeg)*Math.PI/180,e={x:pp.x+Math.sin(a)*cnt,y:pp.y+Math.cos(a)*cnt};let b=null,bd=1e9;tg.forEach((c,k)=>{if(N.found.has(k))return;const d=dist(e,c);if(d<bd){bd=d;b=c;}});return b;};
  function walk(){const az=num('laz'),P=num('ld');if(isNaN(az)||isNaN(P)||P<=0)return ui('กรอกมุมภาคและจำนวนก้าวก่อนเดิน');const Dm=Math.min(P*100/140,3000);N.endArm=false;
    const legErr=gauss()*0.5,scale=N.stride*(1+gauss()*0.015);let hdg=wrap360(az)+W.gmDeg+legErr,x=N.tp.x,y=N.tp.y,cnt=0,act=0,stop='',wet=false;
    while(cnt<Dm){const step=Math.min(10,Dm-cnt);hdg+=gauss()*(W.isForest(x,y)?0.2:0.1);const a=hdg*Math.PI/180,h1=W.elev(x,y),sl=(W.elev(x+Math.sin(a)*step,y+Math.cos(a)*step)-h1)/step,f=scale;
      const mx=x+Math.sin(a)*step*f,my=y+Math.cos(a)*step*f;if(mx<0||my<0||mx>MAP||my>MAP){stop='ถึงขอบพื้นที่';break;}
      if(W.isWater(mx,my))wet=true;
      x=mx;y=my;cnt+=step;act+=step*f;N.time+=0.15*(step/10)*(1+2*Math.max(0,sl))*(W.isWater(x,y)?2:1)*(W.isForest(x,y)?1.4:1)*(W.roadDist(x,y)<20?0.8:1);if(((cnt/10)|0)%5===0)N.trueTrack.push({x,y});}
    const pc=Math.round(cnt*1.4);const aim=aimOf(N.pp,wrap360(az),cnt);if(aim)N.legs.push({from:{...N.tp},pp:{...N.pp},az:wrap360(az),paces:pc,cnt,end:{x,y},tgt:{x:aim.x,y:aim.y},label:aim.label});N.trueTrack.push({x,y});N.tp={x,y};N.counted+=pc;N.actual+=act;const pa=(wrap360(az)+W.gmDeg)*Math.PI/180;N.pp={x:N.pp.x+Math.sin(pa)*cnt,y:N.pp.y+Math.cos(pa)*cnt};N.plan[N.plan.length-1].push({...N.pp});
    N.log.push(`เดิน ${fd(az)}° นับได้ ${pc} ก้าว${wet?' (ลุยข้ามน้ำ)':''}${stop?' — '+stop:''}`);if(stop)sfx('bad');ui(stop?`<b>${stop}</b> หลังนับได้ ${pc} ก้าว`:`เดินครบ ${pc} ก้าว${wet?' · ลุยข้ามน้ำระหว่างทาง':''}`);}
  function find(){N.endArm=false;N.time+=cfg.mode==='scoreo'?3:5;let hit=-1;
    if(cfg.mode==='patrol'){const k=nextIdx();if(k>=0&&dist(N.tp,tg[k])<=TOL.find)hit=k;}else{let bd=TOL.find+1;tg.forEach((c,k)=>{if(N.found.has(k))return;const d=dist(N.tp,c);if(d<bd){bd=d;hit=k;}});}
    N.searches.push({x:N.tp.x,y:N.tp.y,ok:hit>=0});
    if(hit>=0){N.fails=0;N.found.add(hit);const c=tg[hit];N.pp={...c};N.plan.push([{...c}]);N.log.push(`พบ ${c.label}`);flash(true);
      if(cfg.mode==='patrol'&&N.found.size===tg.length)return finish(true);ui(`<b>พบ ${esc(c.label)}!</b>${cfg.mode==='scoreo'?' +'+c.pts+' คะแนน':''} ตำแหน่งของคุณคือ ${gridRef(c.x,c.y,8)}`);}
    else{flash(false);N.fails++;N.log.push('ค้นหาไม่พบ');let c=null;if(cfg.mode==='patrol'){const k=nextIdx();c=k>=0?tg[k]:null;}else{let bd=1e9;tg.forEach((t,k)=>{if(N.found.has(k))return;const d=dist(N.tp,t);if(d<bd){bd=d;c=t;}});}
      ui(`ไม่พบ${cfg.mode==='scoreo'?'ธง':'จุดตรวจ'}ในรัศมี ${TOL.find} ม.${c?' · '+(cfg.mode==='scoreo'?'ธงที่ใกล้ที่สุด: ':'')+searchHelp(dist(N.tp,c),gridAz(N.tp,c),N.fails):''}`);}}
  function endPress(){if(cfg.mode==='patrol')return finish(false);const atFinish=dist(N.tp,sp)<=TOL.find;if(atFinish)return finish(true);if(!N.endArm){N.endArm=true;return ui(`คุณยังไม่อยู่ที่เส้นชัย (ห่างเกิน ${TOL.find} ม.) จบตอนนี้คะแนนจะถูกหักครึ่ง · เส้นชัย${navBand(dist(N.tp,sp))} ไปทาง${dir8(gridAz(N.tp,sp))}`);}finish(false);}
  function finish(ok){N.done=true;tapHandler=null;setStageView('map',false);
    const marks=[{x:sp.x,y:sp.y,kind:'sp',label:cfg.mode==='scoreo'?'เส้นชัย':'SP'}];tg.forEach((c,k)=>marks.push({x:c.x,y:c.y,kind:'cp',label:c.label,color:N.found.has(k)?'#1f8a3a':'#d6261c'}));
    N.searches.forEach(s=>marks.push({x:s.x,y:s.y,kind:'x',color:s.ok?'#1f8a3a':'#d6261c'}));
    O={marks,tracks:[...N.plan.map(seg=>({pts:seg,color:'#555',dash:[6,5],width:1.8})),{pts:N.trueTrack,color:'#d6261c',width:2.6}]};fitView();
    cfg.onEnd({ok,review:legReview(N.legs,140),found:N.found.size,points:pointsNow(),time:N.time,wrong:N.searches.filter(s=>!s.ok).length,counted:N.counted,actual:N.actual,endDist:dist(N.tp,sp)});}
  setView(sp.x,sp.y,0.2);ui('');}
function navStart(){for(let i=0;i<80;i++){const p=randLand(900);if(W.roadDist(p.x,p.y)<60)return p;}return randLand(900);}
function runL8(S,L){const sp=navStart();const tg=[];let prev=sp;for(let k=0;k<2;k++){let c=null;for(let i=0;i<300&&!c;i++){const a=rnd(0,6.283),d=rnd(700,1200),p={x:prev.x+Math.sin(a)*d,y:prev.y+Math.cos(a)*d};if(landOK(p.x,p.y)&&p.x>500&&p.y>500&&p.x<MAP-500&&p.y<MAP-500&&dist(p,sp)>500)c=p;}c=c||randLand(600);tg.push({...c,label:'CP'+(k+1),pts:40});prev=c;}
  const par=(dist(sp,tg[0])+dist(tg[0],tg[1]))/1000*15*1.3;
  runNav({title:`ภารกิจ ${S.idx+1} · ${L.name}`,mode:'patrol',start:sp,targets:tg,onEnd:r=>{const bonus=r.found===2?Math.round(20*clamp(par/Math.max(r.time,1),0,1)):0;S.pts=45*r.found+Math.round(bonus/2)-3*r.wrong;S.extra=`<p class="muted" style="font-size:13.5px">พบ ${r.found}/2 จุดตรวจ (จุดละ 45) · ค้นหาผิดที่ ${r.wrong} ครั้ง (ครั้งละ −3) · พบเมื่ออยู่ห่างจุดตรวจไม่เกิน ${TOL.find} ม. · เส้นแดง = ทางที่เดินจริง · เส้นประ = ทางที่คิดว่าเดิน</p>`+r.review;S.end(0);}});}

function runFix(S,L){const kinds=CFG.short?[1,2]:[1,2,3];let i=0;
  const go=()=>{if(S.over)return;if(i>=kinds.length)return S.end(1);
    runFixDrill({kind:kinds[i],title:`ภารกิจ ${S.idx+1} · ${L.name} · ${i+1}/${kinds.length}`,onDone:r=>{const full=CFG.short?50:33,pt=r.err<=TOL.fixFull?full:r.err<=TOL.fixHalf?Math.round(full/2):0;if(pt>=full)S.hit(pt);else{S.pts+=pt;S.miss();}
      setSheet(hud(`ภารกิจ ${S.idx+1} · ${L.name} · ${i+1}/${kinds.length}`,false)+`<div class="fb ${pt>=full?'good':'bad'}">+${pt} คะแนน</div>${r.html}<div class="row"><button class="btn primary" id="nx">ต่อไป</button></div>`);setPts(S.pts,S.combo);on('nx',()=>{i++;go();});}});};go();}
const LEVELS=[
  {id:'L1',name:'ตาเหยี่ยว',sub:'เครื่องหมาย เส้นชั้นความสูง ภูมิประเทศ · 100 วินาที',run:runL1},
  {id:'L9',name:'รู้จักเข็มทิศ',sub:'ส่วนประกอบเลนเซติกและข้อระวัง · 80 วินาที',run:runParts},
  {id:'L2',name:'พิกัดสายฟ้า',sub:'อ่านพิกัดกริด (MGRS) 6 และ 8 หลัก · 150 วินาที',run:runL2},
  {id:'L10',name:'ลิปดาฟิลิปดา',sub:'อ่านพิกัดภูมิศาสตร์ด้วยช่องวัดค่า',run:runGeo},
  {id:'L3',name:'ปักธงแม่นเป้า',sub:'แตะตำแหน่งตามพิกัด',run:runL3},
  {id:'L4',name:'หันให้ตรง',sub:'มองหน้าปัด หันตามมุมภาค · 90 วินาที',run:runL4},
  {id:'L5',name:'ส่องเป้า',sub:'ยกขึ้นเล็ง อ่านมุมผ่านแว่นขยาย · 150 วินาที',run:runL5},
  {id:'L11',name:'ปฏิบัติการกลางคืน',sub:'ตั้งเข็มทิศแบบมีแสงและไม่มีแสง (นับคลิก)',run:runNight},
  {id:'L6',name:'นักคำนวณ',sub:'คิดมุมภาคกลับเร็ว · 120 วินาที',run:runL6},
  {id:'L7',name:'วัดมุมวัดระยะ',sub:'ขีดเส้นดินสอ แผ่นวัดมุม ขอบเข็มทิศ',run:runL7},
  {id:'L12',name:'หาที่อยู่ตนเอง',sub:'อ่านภูเขา เล็ง สกัดกลับ 1 · 2 · 3 ที่หมาย',run:runFix},
  {id:'L8',name:'ลาดตระเวน',sub:'นับก้าว เดินตามมุม หา 2 จุดตรวจ',run:runL8},
].filter(L=>!CFG.short||['L1','L2','L4','L5','L7','L12','L8'].includes(L.id));

/* ---------- screens ---------- */
function showCampaign(){stopTimer();O={};tapHandler=null;setStageView('map',false);fitView();const r=cleared(),nextR=Math.min(r+1,RANKS.length-1),NL=LEVELS.length;
  setSheet(`<div class="rankcard">${badge(r,54)}<div style="flex:1;min-width:0"><div class="eyebrow">ยศปัจจุบัน</div><div class="big">${RANKS[r]}</div>
    <div class="muted" style="font-size:13px">${r<NL?`ผ่านภารกิจ ${r+1} เพื่อเลื่อนเป็น ${RANKS[nextR]}`:`ผ่านครบทุกภารกิจแล้ว ล่าดาวให้ครบ ${NL*3} ดวง`}</div><div class="meter"><span style="width:${r/NL*100}%"></span></div></div></div>
    <div class="levels">${LEVELS.map((L,i)=>{const b=GS.st.levels[L.id]||0,u=unlocked(i);return`<button class="lv" data-i="${i}" ${u?'':'disabled'}><span class="no">${u?i+1:'<svg width="16" height="18" viewBox="0 0 16 18" aria-label="ล็อก"><rect x="2" y="8" width="12" height="9" rx="2" fill="currentColor"/><path d="M5 8V5.5a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'}</span><span><span class="nm">${esc(L.name)}</span><span class="sb">${esc(L.sub)}</span></span><span style="text-align:right"><span class="stars">${starStr(starsOf(b))}</span><br><span class="mono muted" style="font-size:12px">${b?b+' คะแนน':''}</span></span></button>`;}).join('')}</div>
    <p class="muted" style="font-size:13px;margin-top:12px">ได้ 60 คะแนน = ★ ผ่าน · 80 = ★★ · 95 = ★★★ · ผ่านแล้วปลดล็อกภารกิจถัดไปและเลื่อนยศ</p><div class="row"><button class="btn" id="tosend">ส่งคะแนนให้ครูฝึก</button></div>`);on('tosend',()=>setTab('lb'));
  sheet.querySelectorAll('.lv').forEach(b=>b.onclick=()=>startLevel(+b.dataset.i));}
const SOLIM=CFG.short?45:90;
function makeFlags(sp){const r=mulberry32(hashStr(GS.code+'#scoreo'));const fl=[];let guard=0;
  while(fl.length<(CFG.short?6:10)&&guard++<2000){const x=500+r()*7000,y=500+r()*7000,p={x,y};if(!landOK(x,y))continue;const d=dist(p,sp);if(d<400||d>(CFG.short?2400:3600))continue;if(fl.some(f=>dist(f,p)<450))continue;
    let pts=d<1500?10:d<2500?20:30;if(W.isForest(x,y))pts+=10;fl.push({x,y,pts});}
  fl.sort((a,b)=>a.pts-b.pts);return fl.map((f,k)=>({...f,label:'ธง '+String.fromCharCode(65+k)}));}
function scoreOStart(){const r=mulberry32(hashStr(GS.code+'#start'));for(let i=0;i<200;i++){const p={x:2500+r()*3000,y:2500+r()*3000};if(landOK(p.x,p.y)&&W.roadDist(p.x,p.y)<80)return p;}return{x:4000,y:4000};}
function showScoreO(){stopTimer();O={};tapHandler=null;setStageView('map',false);const sp=scoreOStart(),fl=makeFlags(sp);const best=GS.st.so[GS.code];
  O={marks:[{x:sp.x,y:sp.y,kind:'sp',label:'เริ่ม/เส้นชัย'}]};setView(sp.x,sp.y,0.08);
  setSheet(`<div class="eyebrow">โหมดแข่งขัน · รหัส ${esc(GS.code)}</div><h2>Score-O ล่าธง</h2>
    <p>ธง ${fl.length} ผืนซ่อนอยู่ในพื้นที่ แต่ละผืนมีแต้ม 10-40 ตามความไกลและความยาก มีเวลา <b>${SOLIM} นาที</b> (เวลาในเกม) เลือกเก็บธงลำดับไหนก็ได้แล้วกลับเส้นชัย</p>
    <ul style="padding-left:20px;font-size:14px;margin:6px 0"><li>เกินเวลา หักนาทีละ 2 คะแนน</li><li>ค้นหาผิดที่เสียเวลา 3 นาที</li><li>จบนอกเส้นชัย คะแนนหักครึ่ง</li><li>ทุกคนที่ใช้รหัสเดียวกันได้ธงชุดเดียวกัน แข่งกันบนตารางอันดับ</li></ul>
    <p class="mono">สถิติของคุณ: ${best?best.pts+' คะแนน · '+best.time+' นาที':'ยังไม่มี'}</p>
    <div class="row"><button class="btn primary" id="go">เริ่มแข่ง</button></div>`);
  on('go',()=>runNav({title:'Score-O · '+GS.code,mode:'scoreo',start:sp,targets:fl,limit:SOLIM,onEnd:r=>{
    let pts=r.points-Math.max(0,Math.ceil(r.time-SOLIM))*2;if(!r.ok)pts=Math.floor(pts/2);pts=Math.max(0,pts);const t=Math.round(r.time);
    const prev=GS.st.so[GS.code];const better=!prev||pts>prev.pts||(pts===prev.pts&&t<prev.time);if(better){GS.st.so[GS.code]={pts,time:t,flags:r.found};saveLocal();saveRemote();gameSubmit();}sfx(pts?'win':'bad');
    setSheet(`<div class="result"><div class="eyebrow">Score-O · ${esc(GS.code)}</div><div class="score mono">${pts}<span class="muted" style="font-size:18px"> คะแนน</span></div>
      <p>ธง ${r.found}/${fl.length} · เวลา ${t} นาที ${r.ok?'· เข้าเส้นชัย':'· <span style="color:var(--bad)">ไม่เข้าเส้นชัย (หักครึ่ง)</span>'}</p>
      ${better?'<div class="promo">สถิติใหม่ของคุณ!</div>':''}
      <p class="muted" style="font-size:13.5px">เส้นแดง = ทางที่เดินจริง · เส้นประ = ทางที่คิดว่าเดิน · ✕ = จุดค้นหา (พบเมื่ออยู่ห่างไม่เกิน ${TOL.find} ม.)</p><div style="text-align:left">${r.review}</div>
      <div class="row" style="justify-content:center"><button class="btn primary" id="again">แข่งอีกครั้ง</button><button class="btn" id="lb">ดูตารางอันดับ</button></div></div>`);
    on('again',showScoreO);on('lb',()=>setTab('lb'));}}));}

function boardRows(){if(GS.webBoard)return GS.webBoard.slice();const rows=(GS.board||[]).slice();if(!GS.board){const me={id:GS.uid||'me',...remoteBody()};rows.push(me);}return rows;}
function hashS(t){let h=2166136261;for(const c of t){h^=c.codePointAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(36).padStart(4,'0').slice(-4);}
const GSET=CFG.short?'เกม (ย่อ 30 นาที)':'เกม (เต็ม)';
function gameSum(){let got=0;for(const L of LEVELS)got+=Math.min(100,GS.st.levels[L.id]||0);return{got,tot:LEVELS.length*100,cl:cleared(),stars:totalStars(),so:(GS.st.so[GS.code]||{}).pts||0};}
function gameCode(){const g=gameSum(),cl=v=>String(v||'').replace(/[|\n\r#,:]/g,' ').trim();const so=Object.keys(GS.st.so).slice(-6).map(k=>`${k}:${GS.st.so[k].pts}`).join(',');
  const body=`OC2|${CFG.short?'S':'F'}|${cl(GS.st.callsign)}|${cl(GS.st.sid)}|${g.stars}|${g.cl}|${so}|${Math.floor(Date.now()/1000).toString(36)}`;return body+'|'+hashS(body);}
function gamePayload(){const g=gameSum();return{key:'game-'+(CFG.short?'S':'F'),kind:'game',set:CFG.short?'S':'F',setName:GSET,name:String(GS.st.callsign||'').trim(),sid:String(GS.st.sid||'').trim(),code:GS.code,score:g.got,total:g.tot,cleared:g.cl,levels:LEVELS.length,stars:g.stars,starsMax:LEVELS.length*3,so:g.so,lv:GS.st.levels,soAll:GS.st.so,chk:gameCode(),at:Date.now()};}
window.APPKIND='game';
window.onRoomJoin=()=>{if(Object.keys(GS.st.levels||{}).length)gameSubmit();};
window.onIdentity=(nm,sd)=>{GS.st.callsign=nm.slice(0,40);GS.st.sid=sd.slice(0,20);saveLocal();try{renderRankChip();}catch(e){}if(GS.tab==='lb')showBoard();};
window.onRestore=d=>{let n=0;const lv=d&&d.lv||{};for(const k of Object.keys(lv)){const v=Math.min(100,+lv[k]||0);if(v>(GS.st.levels[k]||0)){GS.st.levels[k]=v;n++;}}
  const so=d&&d.soAll||{};for(const c of Object.keys(so)){const a=so[c],b=GS.st.so[c];if(a&&(!b||a.pts>b.pts)){GS.st.so[c]=a;n++;}}
  if(n){saveLocal();try{renderRankChip();}catch(e){}if(GS.tab==='camp')showCampaign();}return n;};
function gameSubmit(){if(!CFG.web||!String(GS.st.callsign||'').trim())return;netSend(gamePayload());}
window.onNetStatus=()=>{const el=document.getElementById('netst');if(el)el.textContent=netText();};
GS.webBoard=null;
function fetchWebBoard(){const u=netURL();if(!CFG.web||!u)return;getJSON(u+'?action=board&set='+(CFG.short?'S':'F')+(ROOM.code&&ROOM.state==='open'?'&room='+encodeURIComponent(ROOM.code):'')).then(j=>{if(!j||!Array.isArray(j.rows))return;
  GS.webBoard=j.rows.map(r=>({id:'w-'+(r.sid||'')+r.name,callsign:r.name,stars:+r.stars||0,cleared:+r.cleared||0,at:0,so:r.code&&r.so?{[r.code]:{pts:+r.so,time:'',flags:''}}:{}}));renderBoard();}).catch(()=>{});}
function gameFormURL(){const F=CFG.form;if(!F||!F.url)return'';const g=gameSum();
  const v={name:GS.st.callsign||'',sid:GS.st.sid||'',set:GSET,code:GS.code,score:g.got,total:g.tot,passed:`${g.cl}/${LEVELS.length}`,stars:`${g.stars}/${LEVELS.length*3}`,so:g.so,chk:gameCode()};
  return F.url+'?usp=pp_url'+Object.keys(F.e).filter(k=>v[k]!==undefined).map(k=>'&'+F.e[k]+'='+encodeURIComponent(v[k])).join('');}
function renderBoard(){const el=$('#boardbox');if(!el)return;const rows=boardRows();const me=GS.uid||'me';
  const camp=rows.filter(r=>(r.stars||0)>0||(r.cleared||0)>0).sort((a,b)=>(b.stars||0)-(a.stars||0)||(b.cleared||0)-(a.cleared||0)||(a.at||0)-(b.at||0));
  const so=rows.filter(r=>r.so&&r.so[GS.code]).sort((a,b)=>b.so[GS.code].pts-a.so[GS.code].pts||a.so[GS.code].time-b.so[GS.code].time);
  const nm=r=>r.callsign?esc(r.callsign):'<span class="muted">ไม่ระบุชื่อ</span>';
  el.innerHTML=`<h3>แคมเปญ · ดาวสะสม</h3><div class="wrapx"><table><tr><th>#</th><th>ชื่อเรียกขาน</th><th>ยศ</th><th>ดาว</th></tr>${camp.length?camp.slice(0,50).map((r,i)=>`<tr class="${r.id===me?'me':''}"><td class="mono">${i+1}</td><td>${nm(r)}</td><td>${RANKS[clamp(r.cleared||0,0,RANKS.length-1)]}</td><td class="mono" style="color:var(--star)">★ ${r.stars||0}</td></tr>`).join(''):'<tr><td colspan="4" class="muted">ยังไม่มีใครผ่านภารกิจ เล่นภารกิจ 1 เพื่อขึ้นตาราง</td></tr>'}</table></div>
    <h3>Score-O · รหัส ${esc(GS.code)}</h3><div class="wrapx"><table><tr><th>#</th><th>ชื่อเรียกขาน</th><th>คะแนน</th><th>เวลา</th><th>ธง</th></tr>${so.length?so.slice(0,50).map((r,i)=>{const s=r.so[GS.code];return`<tr class="${r.id===me?'me':''}"><td class="mono">${i+1}</td><td>${nm(r)}</td><td class="mono" style="color:var(--accent)">${s.pts}</td><td class="mono">${s.time} น.</td><td class="mono">${s.flags||0}</td></tr>`;}).join(''):'<tr><td colspan="5" class="muted">ยังไม่มีผลแข่งสำหรับรหัสนี้</td></tr>'}</table></div>`;}
function showBoard(){stopTimer();O={};tapHandler=null;setStageView('map',false);fitView();
  const status=CFG.web?(netURL()?'ตารางอันดับรวมจาก Google Sheet ของครูฝึก (อัปเดตเมื่อเปิดหน้านี้)':'ด้านล่างคือคะแนนของคุณในเครื่องนี้'):!GS.db||!GS.uid?'ตารางอันดับออนไลน์ใช้ได้เฉพาะผู้ที่เข้าสู่ระบบ ด้านล่างคือคะแนนของคุณในเครื่องนี้':GS.writeOK===false?'คุณดูอันดับได้ แต่คะแนนของคุณส่งขึ้นตารางออนไลน์ไม่ได้ ใช้ปุ่มส่งคะแนนด้านบนแทน':GS.board?'อัปเดตสด · คะแนนส่งขึ้นตารางอัตโนมัติเมื่อจบภารกิจ':'กำลังโหลดตารางอันดับ…';
  setSheet(`<div class="eyebrow">ตารางอันดับ</div><h2>ใครเก่งที่สุดในหน่วย</h2>
    <div class="row"><div class="field"><label for="cs">ยศ ชื่อ-สกุล (แสดงบนตาราง)</label><input id="cs" maxlength="40" value="${esc(GS.st.callsign||'')}" style="font-family:var(--f-body)" placeholder="เช่น ร.ต.สมชาย ใจดี"></div><div class="field" style="flex:0 1 120px"><label for="sid">เลขที่</label><input id="sid" maxlength="20" value="${esc(GS.st.sid||'')}"></div><button class="btn primary" id="cssave">บันทึก</button></div>
    <div class="fb"><b>ส่งคะแนนให้ครูฝึก</b> · คะแนนรวม <span class="mono">${gameSum().got}/${gameSum().tot}</span> (${Math.round(gameSum().got/gameSum().tot*1000)/10}%) · ผ่าน ${gameSum().cl}/${LEVELS.length} ภารกิจ · ★ ${gameSum().stars}${gameSum().so?' · Score-O '+gameSum().so:''}
      ${CFG.web?`<div class="tools" style="margin-top:6px"><button class="btn primary" id="websend">ส่งคะแนนตอนนี้</button></div><span class="muted" id="netst" style="font-size:12.5px">${esc(netText())}</span></div>`:`<div class="tools" style="margin-top:6px"><a class="btn primary" id="formgo" href="#" target="_blank" rel="noopener" style="text-decoration:none">ส่งคะแนน (Google Form)</a></div>
      <span class="muted" id="sharemsg" style="font-size:12.5px">${CFG.form&&CFG.form.url?'เปิดแบบฟอร์มที่กรอกคะแนนไว้ให้แล้ว เลื่อนลงกด "ส่ง" ได้เลย ไม่ต้องแก้ไขข้อมูล':'ครูฝึกยังไม่ได้ตั้งค่า Google Form · แคปหน้าจอนี้ส่งครูฝึกแทน'}</span></div>`}
    <p class="muted" style="font-size:13px">${status}</p><div id="boardbox"></div>`);
  if(CFG.web){on('websend',()=>{if(!String(GS.st.callsign||'').trim()){$('#netst').textContent='กรอกยศ ชื่อ-สกุล แล้วกดบันทึกก่อนส่งคะแนน';return;}$('#netst').textContent='กำลังส่ง…';gameSubmit();});fetchWebBoard();}
  else{const fg=$('#formgo');fg.addEventListener('click',e=>{if(!String(GS.st.callsign||'').trim()){e.preventDefault();$('#sharemsg').textContent='กรอกยศ ชื่อ-สกุล แล้วกดบันทึกก่อนส่งคะแนน';return;}const u=gameFormURL();if(!u){e.preventDefault();return;}fg.href=u;});}
  on('cssave',()=>{GS.st.callsign=val('cs').trim().slice(0,40);GS.st.sid=val('sid').trim().slice(0,20);saveLocal();try{if(GS.st.callsign)localStorage.setItem('lnav-name',GS.st.callsign);if(GS.st.sid)localStorage.setItem('lnav-sid',GS.st.sid);}catch(e){}saveRemote();gameSubmit();showBoard();const b=$('#cssave');b.textContent='บันทึกแล้ว';setTimeout(()=>{if(b.isConnected)b.textContent='บันทึก';},1500);});renderBoard();}
function showHelp(){stopTimer();O={};tapHandler=null;setStageView('map',false);fitView();
  setSheet(`<div class="eyebrow">วิธีเล่น</div><h2>คู่มือภาคสนาม</h2>
    <p><b>แคมเปญ</b> ${LEVELS.length} ภารกิจตามลำดับบทเรียน ตั้งแต่เครื่องหมายแผนที่ พิกัดกริดและพิกัดภูมิศาสตร์ เข็มทิศเลนเซติก การใช้กลางคืน จนถึงเดินทางนับก้าว ผ่านภารกิจ (60 คะแนน) เพื่อปลดล็อกและเลื่อนยศ ตั้งแต่นักเรียนถึงนาวาอากาศตรี</p><h3>เข็มทิศเลนเซติก</h3><ul style="padding-left:20px;font-size:14px"><li>มองหน้าปัด: ถือระดับเอว อ่านค่าใต้เส้นขีดดำ · ยกขึ้นเล็ง: มองช่องเล็งหลัง ให้เส้นเล็งทับที่หมาย อ่านผ่านแว่นขยาย</li><li>ตัวเลขแดงด้านในคือองศา ตัวเลขดำด้านนอกคือมิล ×100</li><li>วงแหวนคลิก 1 คลิก = 3° · กลางคืนไม่มีแสง: หมุนทวนเข็ม มุม÷3 คลิก แล้วหันจนลูกศรพรายน้ำตรงขีดพรายน้ำ</li><li>อยู่ห่างสายไฟแรงสูง 55 ม. · รถ 18 ม. · สายโทรศัพท์/ลวดหนาม 10 ม. · ปืนกล 2.7 ม. · ปืนพก 0.9 ม.</li></ul>
    <p><b>Score-O</b> แข่งล่าธงด้วยรหัสภารกิจเดียวกันทั้งหน่วย ใช้กลยุทธ์เลือกธงให้คุ้มเวลา</p>
    <p><b>รหัสภารกิจ</b> ใช้สร้างพื้นที่ ครูฝึกประกาศรหัสเดียวกันให้ทุกคนแข่งบนแผนที่เดียวกัน</p>
    <h3>มุมภาค</h3>${declHTML()}
    <h3>สัญลักษณ์แผนที่</h3><div class="legend">${LEG.map(([k,t])=>`<div><canvas data-k="${k}" aria-hidden="true"></canvas><span>${t}</span></div>`).join('')}</div>
    <h3>สูตรลัด</h3><ul style="padding-left:20px;font-size:14px"><li>มุมกลับ: น้อยกว่า 180° บวก 180° · มากกว่าหรือเท่ากับ 180° ลบ 180°</li><li>1 ช่องกริด = 1 กม. · พิกัด 6 หลัก = 100 ม. · 8 หลัก = 10 ม.</li><li>คลาด 1° ≈ ออกทิศ 17 ม. ต่อระยะ 1 กม.</li></ul>`);
  sheet.querySelectorAll('.legend canvas').forEach(cv=>drawLeg(cv,cv.dataset.k));}

const TABS=[['camp','แคมเปญ',showCampaign],['so','Score-O',showScoreO],['lb','ส่งคะแนน/อันดับ',showBoard],['help','วิธีเล่น',showHelp]];
function setTab(t){GS.tab=t;$('#tabs').innerHTML=TABS.map(([id,n])=>`<button class="tab" role="tab" data-t="${id}" aria-selected="${id===t}">${n}</button>`).join('');
  $('#tabs').querySelectorAll('.tab').forEach(b=>b.onclick=()=>setTab(b.dataset.t));(TABS.find(x=>x[0]===t)||TABS[0])[2]();requestDraw();}
function regen(){const c=($('#code').value||'ALPHA-01').trim().toUpperCase().replace(/[^A-Z0-9\-]/g,'')||'ALPHA-01';$('#code').value=c;GS.code=c;try{localStorage.setItem('opcompass-code',c);}catch(e){}genWorld(c);fitView();setTab(GS.tab==='lb'||GS.tab==='help'?GS.tab:GS.tab==='so'?'so':'camp');}
$('#gen').onclick=regen;$('#code').addEventListener('keydown',e=>{if(e.key==='Enter')regen();});

/* ---------- boot ---------- */
try{const c=localStorage.getItem('opcompass-code');if(c)$('#code').value=c;}catch(e){}
new ResizeObserver(resize).observe($('#stage'));window.addEventListener('resize',resize);
resize();renderRankChip();regen();
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>requestDraw());
(async()=>{try{if(!window.claude||!window.claude.use)return;const[db,user]=await Promise.all([window.claude.use('db'),window.claude.use('user')]);if(!db)return;GS.db=db;
  GS.uid=user?await user.id():null;
  db.collection('scores').limit(500).onSnapshot(snap=>{GS.board=snap.docs.map(d=>({id:d.id,...d.data()}));renderBoard();},e=>{GS.boardErr=e&&e.code||'error';});
  if(GS.tab==='lb')showBoard();}catch(e){}})();
