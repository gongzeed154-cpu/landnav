/* ================= TRAINING APP ================= */
const APP={code:'ALPHA-01',mod:'m1',view:'map',store:{},night:false};
const SKEY=CFG.short?'lnav-s1':'lnav-v1',HKEY=CFG.short?'lnav-shist':'lnav-hist';
const PASSAT=(total,full)=>CFG.short?Math.ceil(total*0.8):full;
function loadStore(){try{return JSON.parse(localStorage.getItem(SKEY)||'{}')||{};}catch(e){return{};}}
function saveStore(){try{localStorage.setItem(SKEY,JSON.stringify(APP.store));}catch(e){}}
function rec(mod,score,total,pass){const s=APP.store[APP.code]||(APP.store[APP.code]={});const p=s[mod];if(!p||score/total>=p.score/p.total)s[mod]={score,total,pass:pass||(p&&p.pass)||false,at:Date.now()};else if(pass&&!p.pass)p.pass=true;saveStore();renderTabs();logAttempt(mod,score,total,score>=0&&pass);}
const MODS=[
  {id:'m1',n:'1',t:'แผนที่และภูมิประเทศ'},{id:'m2',n:'2',t:'อ่านพิกัด'},{id:'m3',n:'3',t:'เข็มทิศเลนเซติก'},{id:'m4',n:'4',t:'มุมภาค-ระยะ'},{id:'m5',n:'5',t:'เดินทางจำลอง'},{id:'m6',n:'6',t:'หาที่อยู่ตนเอง'},
  {id:'res',n:'',t:'ผลการฝึก'},{id:'leg',n:'',t:'ขอบระวาง'}];
function renderTabs(){const s=APP.store[APP.code]||{};$('#tabs').innerHTML=MODS.map(m=>`<button class="tab" role="tab" data-m="${m.id}" aria-selected="${APP.mod===m.id}">${m.n?`<b>${m.n}</b>`:''}${m.t}${s[m.id]&&s[m.id].pass?'<span class="dot" title="ผ่านแล้ว"></span>':''}</button>`).join('');
  $('#tabs').querySelectorAll('.tab').forEach(b=>b.onclick=()=>setModule(b.dataset.m));}
const sheet=$('#sheet');
const setSheet=h=>{sheet.innerHTML=h;sheet.scrollTop=0;};
const on=(id,fn,ev)=>{const el=document.getElementById(id);if(el)el.addEventListener(ev||'click',fn);};
const val=id=>{const el=document.getElementById(id);return el?el.value:'';};
const num=id=>{const s=val(id).replace(/[^\d.\-]/g,'');return s===''?NaN:Number(s);};
function setStageView(v,showSeg){APP.view=v;$('#map').hidden=v!=='map';$('#comp').hidden=v!=='comp';$('#zoombar').hidden=v!=='map';$('#turnbar').hidden=v!=='comp';$('#turnhint').hidden=v!=='comp';$('#compbar').hidden=v!=='comp';
  $('#viewseg').hidden=!showSeg;$('#vMap').setAttribute('aria-pressed',v==='map');$('#vComp').setAttribute('aria-pressed',v==='comp');resize();}
$('#vMap').onclick=()=>setStageView('map',true);$('#vComp').onclick=()=>setStageView('comp',true);
/* in-progress snapshot per module: survives reload, closing the tab, or re-scanning the QR in the same browser */
const PKEY=CFG.short?'lnav-sprog':'lnav-prog';
const PROG={cur:null,
  all(){try{return JSON.parse(localStorage.getItem(PKEY)||'{}')||{};}catch(e){return{};}},
  put(a){try{localStorage.setItem(PKEY,JSON.stringify(a));}catch(e){}},
  get(m){const s=this.all()[m];return s&&s.code===APP.code&&Date.now()-s.at<5*864e5?s:null;},
  clear(m){const a=this.all();if(a[m]){delete a[m];this.put(a);}if(this.cur&&this.cur.mod===m)this.cur.ref=null;},
  st(def){const c=this.cur;if(!c)return def;if(c.resume&&c.st){Object.assign(def,c.st);c.resumed=true;}c.ref=def;return def;},
  save(){const c=this.cur;if(!c||!c.ref||c.mod!==APP.mod)return;const a=this.all();a[c.mod]={code:c.code,seed:c.seed,retry:c.retry,st:c.ref,at:Date.now()};this.put(a);}};
const PMODS=['m1','m2','m3','m4','m5','m6'];
function setModule(m,fresh){APP.mod=m;try{localStorage.setItem(CFG.short?'lnav-smod':'lnav-mod',m);}catch(e){}if(RETRY&&RETRY.mod!==m)RETRY=null;O={};tapHandler=null;DRAW.on=false;resetCompass({mode:'top'});renderTabs();setStageView('map',false);
  let snap=null;if(PMODS.includes(m)){if(fresh)PROG.clear(m);else snap=PROG.get(m);}if(snap&&snap.retry)RETRY=snap.retry;
  const seed=snap?snap.seed:(Date.now()^(Math.random()*4294967296))|0;
  PROG.cur=PMODS.includes(m)?{mod:m,code:APP.code,seed,retry:RETRY&&RETRY.mod===m?JSON.parse(JSON.stringify(RETRY)):null,resume:!!snap,st:snap&&snap.st}:null;
  RNG.f=mulberry32(seed);try{(MOD[m]||MOD.m1).start();}finally{RNG.f=Math.random;}
  const c=PROG.cur;if(c&&c.resumed&&c.ref&&((c.ref.i||0)>0||(c.ref.step||0)>0||(c.ref.score||0)>0||(c.ref.paces||0)>0||(c.ref.pins&&c.ref.pins.length))){const r=c.ref,where=r.i!=null?`ข้อ ${r.i+1}`:r.step!=null?`ขั้น ${r.step+1}`:r.found!=null?`พบแล้ว ${r.found} จุด · เดินไป ${r.paces||0} ก้าว`:'';
    toast(`ทำต่อจากที่ค้างไว้ · ${where}${r.score!=null?` · คะแนนสะสม ${r.score}`:''}`);}
  requestDraw();}
function regen(){const c=($('#code').value||'ALPHA-01').trim().toUpperCase();$('#code').value=c;APP.code=c;try{localStorage.setItem('lnav-code',c);}catch(e){}genWorld(c);fitView();setModule(APP.mod);}
$('#gen').onclick=regen;$('#code').addEventListener('keydown',e=>{if(e.key==='Enter')regen();});
$('#night').onclick=()=>{APP.night=!APP.night;document.body.classList.toggle('night',APP.night);$('#night').setAttribute('aria-pressed',APP.night);};
const progress=(i,n)=>`<div class="prog" aria-hidden="true"><span style="width:${Math.round(i/n*100)}%"></span></div>`;
let RETRY=null;const takeRetry=mod=>{const r=RETRY&&RETRY.mod===mod?RETRY:null;return r;};
function finishCard(title,score,total,passAt,mod,extra,wrong){const R=takeRetry(mod);RETRY=null;PROG.clear(mod);
  let note='';if(R){note=`<p class="muted">รอบซ่อม: ทำใหม่ ${R.kinds.length} ข้อ ได้เพิ่ม ${score}/${total} คะแนน · รวมกับที่ได้ไว้ ${R.carry} คะแนน</p>`;score=Math.min(R.total,R.carry+score);total=R.total;passAt=R.passAt;}
  const pass=score>=passAt;rec(mod,score,total,pass);
  const fix=!pass&&wrong&&wrong.length?`<button class="btn primary" id="fixwrong">ฝึกซ่อมเฉพาะข้อที่ผิด (${wrong.length} ข้อ · สุ่มโจทย์ใหม่)</button>`:'';
  extra=note+(extra||'');
  setSheet(`<div class="eyebrow">${esc(title)}</div><div class="score mono">${score}/${total}</div><p>${pass?'<span class="pill pass">ผ่านเกณฑ์</span>':'<span class="pill fail">ยังไม่ผ่าน</span>'} <span class="muted">เกณฑ์ผ่าน ${passAt}/${total}</span></p>${extra||''}<div class="row">${fix}<button class="btn${fix?'':' primary'}" id="again">${fix?'ทำใหม่ทั้งหมด':'ฝึกอีกครั้ง'}</button><button class="btn" id="tores">ดูผลการฝึกทั้งหมด</button></div>`);
  on('fixwrong',()=>{RETRY={mod,kinds:wrong,carry:score,total,passAt};setModule(mod,true);});
  on('again',()=>{RETRY=null;setModule(mod,true);});on('tores',()=>setModule('res'));}
const fb=(ok,msg)=>`<div class="fb ${ok?'good':'bad'}">${ok?'✓ ถูกต้อง':'<strong>✗ ยังไม่ถูก</strong>'}${msg?' — '+msg:''}</div>`;
const nextBtn=(label)=>`<div class="row"><button class="btn primary" id="nx">${label||'ข้อต่อไป'}</button></div>`;
function choiceUI(opts,ans,onDone){sheet.querySelectorAll('.choices button').forEach(b=>b.onclick=()=>{const ok=opts[+b.dataset.k]===ans;
  sheet.querySelectorAll('.choices button').forEach(x=>{x.disabled=true;if(opts[+x.dataset.k]===ans)x.classList.add('ok');});if(!ok)b.classList.add('no');onDone(ok);});}
const choicesHTML=opts=>`<div class="choices">${opts.map((o,k)=>`<button data-k="${k}">${esc(o)}</button>`).join('')}</div>`;

const MOD={};
/* ---------- module 1: map symbols, contours, terrain ---------- */
MOD.m1={start(){
  const R=takeRetry('m1');let qs;
  if(R){const n=k=>R.kinds.filter(x=>x===k).length;qs=mapQuestions(n('sym'),n('cont'),n('ter'),n('elev'));if(qs.length<R.kinds.length)qs=qs.concat(mapQuestions(R.kinds.length-qs.length,0,0,0));}
  else qs=CFG.short?mapQuestions(3,1,2,1):mapQuestions(5,2,3,2);
  const st=PROG.st({i:0,score:0,wrong:[]});const show=()=>{PROG.save();
    if(st.i>=qs.length)return finishCard('โมดูล 1 · แผนที่และภูมิประเทศ',st.score,qs.length,PASSAT(qs.length,10),'m1','',st.wrong);
    const q=qs[st.i];O={marks:[{x:q.p.x,y:q.p.y,kind:'ring'}]};setView(q.p.x,q.p.y,qZoom(q));
    setSheet(`<div class="eyebrow">โมดูล 1 · ข้อ ${st.i+1}/${qs.length}</div>${progress(st.i,qs.length)}<p class="q">${QTEXT[q.kind]}</p>${choicesHTML(q.opts)}<div id="fbx"></div>
      <details><summary>ทบทวน</summary><ul><li>เครื่องหมายแผนที่ 5 กลุ่ม: การคมนาคม · แหล่งน้ำ · ภูมิประเทศ · พืชพรรณ · สิ่งปลูกสร้าง (ดูที่ "ขอบระวาง")</li><li>เส้นชั้นความสูงหลักหนาทุก 100 ม. มีตัวเลข · เส้นรองบางทุก 20 ม. · เส้นแทรกเป็นเส้นประทุก 10 ม. ในที่ราบ · เส้นคุ้งกระทะมีขีดสั้นชี้เข้าด้านใน</li><li>ยอดเขา: วงปิดสูงขึ้นเข้าหาศูนย์กลาง · สันเขา: รูปตัวยู ชี้ลงที่ต่ำ · คอเขา: ที่ต่ำระหว่างยอดสองยอด · หุบเขา: รูปตัววี ชี้ขึ้นที่สูง · หน้าผา: เส้นชิดกันมาก · ที่ต่ำ: วงปิดมีขีดชี้เข้าใน</li></ul></details>`);
    choiceUI(q.opts,q.ans,ok=>{if(ok)st.score++;else st.wrong.push(q.kind);if(q.kind==='ter')setView(q.p.x,q.p.y,0.35);
      $('#fbx').innerHTML=fb(ok,ok?'':`คำตอบคือ ${esc(q.ans)}${q.kind==='elev'?` (ค่าจริง ${Math.round(W.elev(q.p.x,q.p.y))} ม.)`:''}`)+nextBtn();on('nx',()=>{st.i++;show();});});
  };show();}};

/* ---------- module 2: MGRS and geographic coordinates ---------- */
MOD.m2={start(){
  const R2=takeRetry('m2');const qs=R2?R2.kinds.map(k=>({kind:k.kind,d:k.d})):[],NQ=R2?[0,0,0,0]:CFG.short?[2,1,1,1]:[3,2,2,3];for(let i=0;i<NQ[0];i++)qs.push({kind:'read',d:6});for(let i=0;i<NQ[1];i++)qs.push({kind:'read',d:8});for(let i=0;i<NQ[2];i++)qs.push({kind:'plot',d:6});for(let i=0;i<NQ[3];i++)qs.push({kind:'geo'});
  qs.forEach(q=>{for(let k=0;k<100;k++){let x,y;if(q.d===6){x=100*Math.floor(rnd(3,77))+rnd(30,70);y=100*Math.floor(rnd(3,77))+rnd(30,70);}else if(q.d===8){x=10*Math.floor(rnd(30,770))+rnd(3,7);y=10*Math.floor(rnd(30,770))+rnd(3,7);}
    else{x=rnd(500,7300);y=rnd(500,7300);}if(!W.isWater(x,y)){q.p={x,y};break;}}if(!q.p)q.p={x:4050,y:4050};});
  const st=PROG.st({i:0,score:0,wrong:[]});const W2=q=>st.wrong.push({kind:q.kind,d:q.d});const show=()=>{PROG.save();
    if(st.i>=qs.length)return finishCard('โมดูล 2 · อ่านพิกัด',st.score,qs.length,PASSAT(qs.length,8),'m2','',st.wrong);
    const q=qs[st.i];tapHandler=null;const head=`<div class="eyebrow">โมดูล 2 · ข้อ ${st.i+1}/${qs.length}</div>${progress(st.i,qs.length)}`;
    if(q.kind==='read'){O={plate:O.plate||null,lines:O.lines||[],marks:[{x:q.p.x,y:q.p.y,kind:'dot'}]};setView(q.p.x,q.p.y,q.d===8?0.9:0.35);
      setSheet(`${head}<p class="q">อ่านพิกัดกริด (MGRS) <b>${q.d} หลัก</b> ของจุดสีแดง</p><p class="muted">เขตกริด <span class="mono">${ZONE}</span> · Read Right Up: อ่านขวาก่อน แล้วขึ้น · พิมพ์เฉพาะตัวเลข${q.d===8?` · 8 หลักยอมคลาดได้ ±${TOL.g8} ในหลักสุดท้ายทั้งแนวขวาและแนวขึ้น (±${TOL.g8*10} ม.)`:""}</p>
        <div class="row"><div class="field"><label for="ans">พิกัด ${q.d} หลัก</label><input id="ans" inputmode="numeric" autocomplete="off" placeholder="${q.d===6?'เช่น 717843':'เช่น 71738435'}"></div><button class="btn primary" id="ok">ตรวจคำตอบ</button></div>
        <div class="tools">${plateBtns('<button class="btn" id="ps">วางมุมไม้วัดพิกัดที่จุด</button>')}</div><div id="fbx"></div>
        <details><summary>วิธีอ่าน</summary><ol><li>อ่านตัวเลขใหญ่ 2 ตัวของเส้นกริดตั้งทางซ้ายของจุด (ขอบบน) = จัตุรัส 1,000 ม.</li><li>วางมุมไม้วัดพิกัดบนแผ่นวัดมุม (จุดแดง) ทับจุด อ่านตัวเลขตรงที่เส้นกริดตัดแขนไม้ = หลัก 100 ม.</li><li>ทำเช่นเดียวกันกับเส้นกริดราบด้านล่างของจุด (ขอบซ้าย)</li><li>8 หลัก: ประมาณต่อจากขีด 100 ม. ให้ละเอียดถึง 10 ม. (ขยายแผนที่)</li></ol></details>`);
      bindPlate({romerAt:()=>q.p});
      const check=()=>{const s=val('ans').replace(/\D/g,'');if(s.length!==q.d){$('#fbx').innerHTML=`<div class="fb bad">พิมพ์ตัวเลขให้ครบ ${q.d} หลัก</div>`;return;}
        const g=gridCheck(s,q.p,q.d),ok=g.ok;if(ok)st.score++;else W2(q);$('#ans').classList.add(ok?'ok':'no');$('#ans').disabled=true;$('#ok').disabled=true;
        $('#fbx').innerHTML=fb(ok,g.msg)+nextBtn();on('nx',()=>{st.i++;show();});};
      on('ok',check);on('ans',e=>{if(e.key==='Enter')check();},'keydown');
    }else if(q.kind==='plot'){const ref=gridRef(q.p.x,q.p.y,6);O={plate:O.plate||null,marks:[]};fitView();let pin=null;
      tapHandler=(x,y)=>{pin={x,y};O.marks=[{x,y,kind:'pin',color:'#d6261c'}];$('#ok').disabled=false;requestDraw();};nudgeReg(()=>pin,p=>{O.marks=[{x:p.x,y:p.y,kind:'pin',color:'#d6261c'}];});
      setSheet(`${head}<p class="q">แตะแผนที่ตรงพิกัด <span class="mono">${ZONE} ${ref}</span></p><p class="muted">ขยายแผนที่ให้พอดีก่อนแตะ แตะใหม่ได้ หรือใช้ปุ่มลูกศรมุมซ้ายล่างเลื่อนหมุดทีละนิด แล้วกดยืนยัน (ยอมคลาดนอกช่องได้ ${TOL.plot} ม.)</p>
        <div class="tools">${plateBtns()}</div><div class="row"><button class="btn primary" id="ok" disabled>ยืนยันตำแหน่ง</button></div><div id="fbx"></div>`);bindPlate();
      on('ok',()=>{tapHandler=null;const cx=Math.floor((E0+q.p.x)/100)*100-E0,cy=Math.floor((N0+q.p.y)/100)*100-N0;
        const T=TOL.plot,ok=pin.x>=cx-T&&pin.x<=cx+100+T&&pin.y>=cy-T&&pin.y<=cy+100+T;if(ok)st.score++;else W2(q);O.marks.push({x:cx,y:cy,kind:'sq'});setView(cx+50,cy+50,Math.max(V.z,0.35));
        const mine=gridRef(pin.x,pin.y,6),dE=Math.floor((E0+pin.x)/100)-Math.floor((E0+cx+1)/100),dN=Math.floor((N0+pin.y)/100)-Math.floor((N0+cy+1)/100);
        const tip=ok?'':(Math.abs(dE)>=10||Math.abs(dN)>=10)?'ตรวจตัวเลขใหญ่ของเส้นกริด (หลักกิโลเมตร)':(dE&&dN&&mine.replace(' ','')===ref.split(' ').reverse().join(''))?'สลับลำดับ: ค่าแรกคือแนวขวา (ตะวันออก) ค่าหลังคือแนวขึ้น (เหนือ)':`คลาด ${dE?`ตะวันออก ${dE>0?'+':''}${dE} ช่อง `:''}${dN?`เหนือ ${dN>0?'+':''}${dN} ช่อง`:''}: นับจากเส้นกริดทางซ้ายและทางใต้ของช่อง ช่องละ 100 ม.`;
        $('#ok').disabled=true;$('#fbx').innerHTML=fb(ok,`ตำแหน่งที่ถูกคือกรอบสีเขียว <span class="mono">${ZONE} ${ref}</span> · ที่คุณปักอ่านได้ <span class="mono">${mine}</span> (ห่างกลางช่อง ${Math.round(hyp(pin.x-cx-50,pin.y-cy-50))} ม.)${tip?'<br>• '+tip:''}`)+nextBtn();on('nx',()=>{st.i++;show();});});
    }else{const la=latSecAt(q.p.y),lo=lonSecAt(q.p.x);O={plate:O.plate||null,lines:O.lines||[],marks:[{x:q.p.x,y:q.p.y,kind:'dot'}]};setView(q.p.x,q.p.y,0.16);
      setSheet(`${head}<p class="q">อ่านพิกัดภูมิศาสตร์ของจุดสีแดง ถึงหน่วยฟิลิปดา</p><p class="muted">กากบาทบนแผนที่คือจุดตัดละติจูด/ลองจิจูดทุก 1 ลิปดา (ค่ากำกับอยู่ขอบขวาและขอบล่าง) · ยอมคลาดได้ ±${TOL.geo}″</p>
        <div class="row"><div class="field"><label for="la">ละติจูด (เหนือ) องศา ลิปดา ฟิลิปดา</label><input id="la" autocomplete="off" placeholder="เช่น 14 16 50"></div><div class="field"><label for="lo">ลองจิจูด (ตะวันออก)</label><input id="lo" autocomplete="off" placeholder="เช่น 99 32 05"></div></div>
        <div class="row"><button class="btn primary" id="ok">ตรวจคำตอบ</button></div>
        <div class="tools">${plateBtns('<button class="btn" id="pg">วางมุมช่องวัดค่าลิปดาที่จุด</button>')}${drawBtns()}</div><div id="fbx"></div>
        <details><summary>วิธีอ่าน (ตามบทเรียน)</summary><ol><li>หากากบาทลิปดาที่ล้อมรอบจุด ลากเส้นโยงด้วยดินสอให้เป็นช่อง 1 ลิปดา</li><li>อ่านค่าลิปดาเต็มของเส้นด้านใต้ (ละติจูด) และเส้นด้านตะวันตก (ลองจิจูด) จุด</li><li>วางมุมช่องวัดค่า (จุดน้ำเงิน) ทับจุด อ่านจำนวนฟิลิปดาตรงที่เส้นลิปดาตัดแขนช่องวัดค่า (1 ลิปดา = 60 ฟิลิปดา)</li><li>อ่านแนวเหนือ-ใต้ (ละติจูด) ก่อน แล้วอ่านแนวตะวันออก-ตก (ลองจิจูด)</li></ol></details>`);
      bindPlate({romerAt:()=>q.p});bindDraw();
      on('ok',()=>{const a=parseDMS(val('la')),b=parseDMS(val('lo'));if(isNaN(a)||isNaN(b)){$('#fbx').innerHTML='<div class="fb bad">พิมพ์ให้ครบ องศา ลิปดา ฟิลิปดา เช่น 14 16 50</div>';return;}
        const ea=Math.round(a-la),eo=Math.round(b-lo),ok=Math.abs(ea)<=TOL.geo&&Math.abs(eo)<=TOL.geo;if(ok)st.score++;else W2(q);$('#ok').disabled=true;
        $('#fbx').innerHTML=fb(ok,`พิกัดจริง <span class="mono">${fmtDMS(la,'N')} , ${fmtDMS(lo,'E')}</span> (คลาด ${ea>0?'+':''}${ea}″ / ${eo>0?'+':''}${eo}″)${ok?'':Math.abs(ea)>=50||Math.abs(eo)>=50?'<br>• คลาดเกือบ 1 ลิปดา: ใช้ค่าลิปดาของเส้นด้านใต้ (ละติจูด) และด้านตะวันตก (ลองจิจูด) ของจุด':'<br>• วางมุมช่องวัดค่าทับจุดพอดี อ่านฟิลิปดาตรงที่เส้นลิปดาตัดแขนช่องวัดค่า'}`)+nextBtn();on('nx',()=>{st.i++;show();});});
    }};show();}};

/* ---------- module 3: lensatic compass ---------- */
MOD.m3={start(){
  const sp=goodStand(3)||randLand(500);computePano(sp.x,sp.y);C.heading=rnd(0,360);C.disp=magHeading();C.vel=0;
  O={marks:[{x:sp.x,y:sp.y,kind:'sp',label:'จุดยืน'}]};setView(sp.x,sp.y,0.12);
  setStageView('comp',true);
  const vis=C.lms.filter(l=>l.vis);
  const R3=takeRetry('m3');const kinds=R3?R3.kinds.slice():CFG.short?['part','face','read','nlight','caution']:['part','part','face','read','read','nlight','ndark','caution','part','face'];const tasks=kinds.map((k,i)=>({kind:k==='read'&&!vis.length?'face':k,lm:vis.length?vis[i%vis.length]:null}));
  const st=PROG.st({i:0,score:0,wrong:[]});
  const help=`<details><summary>ทบทวนการใช้เข็มทิศ</summary><ul><li>"มองหน้าปัด" = ถือแบบไม่ต้องยกขึ้นเล็ง อ่านค่าใต้เส้นขีดดำ · "ยกขึ้นเล็ง" = มองผ่านช่องเล็งหลังให้เส้นเล็งตรงที่หมาย แล้วมองผ่านแว่นขยายอ่านค่า</li><li>ตัวเลขสีแดงด้านในคือองศา ตัวเลขดำด้านนอกคือมิล (×100)</li><li>วงแหวนคลิก: 1 คลิก = 3° (120 คลิกรอบวง)</li><li>เข็มทิศเลนเซติกอ่านได้ถูกต้องใกล้เคียง 2°</li></ul></details>`;
  const show=()=>{PROG.save();
    if(st.i>=tasks.length){resetCompass({mode:'top'});setStageView('map',false);return finishCard('โมดูล 3 · เข็มทิศเลนเซติก',st.score,tasks.length,PASSAT(tasks.length,8),'m3','',st.wrong);}
    const t=tasks[st.i];const head=`<div class="eyebrow">โมดูล 3 · งาน ${st.i+1}/${tasks.length}</div>${progress(st.i,tasks.length)}`;
    const done=(ok,msg)=>{if(ok)st.score++;else st.wrong.push(t.kind);$('#fbx').innerHTML=fb(ok,msg)+nextBtn('งานต่อไป');on('nx',()=>{st.i++;show();});};
    setStageView('comp',true);
    if(t.kind==='part'){const q=partQuestion();resetCompass({mode:'top',hl:q.key});
      setSheet(`${head}<p class="q">ส่วนที่มีวงแดงกะพริบคือส่วนใดของเข็มทิศเลนเซติก?</p>${choicesHTML(q.opts)}<div id="fbx"></div>`);
      choiceUI(q.opts,q.ans,ok=>done(ok,'คำตอบที่ถูก: <b>'+esc(q.ans)+'</b>'));}
    else if(t.kind==='caution'){const q=cautionQuestion();resetCompass({mode:'top'});
      setSheet(`${head}<p class="q">ขณะใช้เข็มทิศ ควรอยู่ห่างจาก<b>${q.item}</b> อย่างน้อยเท่าไร?</p>${choicesHTML(q.opts)}<div id="fbx"></div>`);
      choiceUI(q.opts,q.ans,ok=>done(ok,'คำตอบที่ถูก: <b>'+esc(q.ans)+'</b>'));}
    else if(t.kind==='face'){const X=Math.round(rnd(0,359));resetCompass({mode:'top'});
      setSheet(`${head}<p class="q">หันไปตามมุมภาคแม่เหล็ก <span class="mono">${X}°</span></p><p class="muted">หมุนตัวจนค่าใต้เส้นขีดดำเป็น ${X}° แล้วกดยืนยัน (ยอมคลาด ±${TOL.comp}°) จะสลับไป "ยกขึ้นเล็ง" เพื่ออ่านผ่านแว่นขยายก็ได้</p>
        <div class="row"><button class="btn primary" id="ok">ยืนยันทิศ</button></div><div id="fbx"></div>${help}`);
      on('ok',()=>{const err=Math.round(angDiff(magHeading(),X)*10)/10;$('#ok').disabled=true;const ok=Math.abs(err)<=TOL.comp;done(ok,`เป้าหมาย <span class="mono">${X}°</span> · คุณหันไปที่ <span class="mono">${fd(magHeading())}°</span> (คลาด ${err>0?'+':''}${err}°)${ok?'':'<br>• หมุนตัวช้าลงเมื่อใกล้ค่า รอหน้าปัดนิ่ง แล้วอ่านค่าใต้เส้นขีดดำ (ตัวเลขสีแดง = องศา)'}`);});}
    else if(t.kind==='read'){resetCompass({mode:'sight',target:t.lm.name});
      setSheet(`${head}<p class="q">ยกขึ้นเล็งไปที่ <b>${esc(t.lm.name)}</b> แล้วอ่านมุมภาคแม่เหล็ก</p><p class="muted">ให้เส้นเล็งในช่องเล็งหลังทับที่หมาย แล้วอ่านค่าใต้เส้นดัชนีในแว่นขยาย (ยอมคลาด ±${TOL.comp}°)</p>
        <div class="row"><div class="field"><label for="ans">มุมภาคแม่เหล็ก (องศา)</label><input id="ans" inputmode="decimal" autocomplete="off"></div><button class="btn primary" id="ok">ตรวจคำตอบ</button></div><div id="fbx"></div>${help}`);
      const check=()=>{const a=num('ans');if(isNaN(a))return;const truth=wrap360(t.lm.az-W.gmDeg),err=Math.round(angDiff(a,truth)*10)/10;$('#ans').disabled=true;$('#ok').disabled=true;
        done(Math.abs(err)<=TOL.comp,`ค่าจริง <span class="mono">${fd(truth)}°</span> · คุณตอบ ${fd(a)}° (คลาด ${err>0?'+':''}${err}°)${compassTip(a,truth)}`);};
      on('ok',check);on('ans',e=>{if(e.key==='Enter')check();},'keydown');}
    else if(t.kind==='nlight'){const X=Math.round(rnd(10,350));resetCompass({mode:'top',lum:Math.round(rnd(0,119))*3});let phase=1;
      const ui=()=>setSheet(`${head}<p class="q">ตั้งเข็มทิศใช้งานกลางคืน <b>แบบมีแสงสว่าง</b> มุม <span class="mono">${X}°</span></p>
        ${phase===1?`<ol style="font-size:14.5px;padding-left:20px;margin:6px 0"><li>หันตัวจนมุม ${X}° อยู่ใต้เส้นขีดดำ</li><li>หมุนวงแหวนคลิก (↺/↻) จนขีดพรายน้ำทับลูกศรพรายน้ำชี้ทิศเหนือ</li></ol><div class="row"><button class="btn primary" id="ok">ตั้งเสร็จ</button></div>`
        :`<p>ไฟดับแล้ว ให้หันตัวจน<b>ลูกศรพรายน้ำตรงกับขีดพรายน้ำ</b> แล้วกดยืนยัน</p><div class="row"><button class="btn primary" id="ok">ยืนยันทิศ</button></div>`}<div id="fbx"></div>`);
      ui();const bind=()=>on('ok',()=>{if(phase===1){const e1=Math.abs(angDiff(magHeading(),X)),e2=Math.abs(lumErr(X));
          if(e1>3.5||e2>3.5){$('#fbx').innerHTML=`<div class="fb bad">${e1>3.5?`ยังหันไม่ตรง ${X}° (ตอนนี้ ${fd(magHeading())}°)`:''} ${e2>3.5?'ขีดพรายน้ำยังไม่ทับลูกศร':''}</div>`;return;}
          phase=2;C.night=true;C.heading=wrap360(C.heading+(Math.random()<.5?-1:1)*rnd(60,150));requestDraw();ui();bind();}
        else{const err=Math.round(angDiff(magHeading(),X)*10)/10;C.night=false;requestDraw();$('#ok').disabled=true;const ok=Math.abs(err)<=TOL.compNight;done(ok,`เป้าหมาย ${X}° · คุณหันไปที่ ${fd(magHeading())}° (คลาด ${err>0?'+':''}${err}°)${ok?'':'<br>• หลังไฟดับ ห้ามหมุนวงแหวน ให้หมุนตัวช้าๆ จนลูกศรพรายน้ำทับขีดพรายน้ำพอดี'}`);}});bind();}
    else if(t.kind==='ndark'){const k=Math.round(rnd(4,40)),X=k*3;resetCompass({mode:'top',night:true,lum:0});
      setSheet(`${head}<p class="q">ตั้งเข็มทิศใช้งานกลางคืน <b>แบบไม่มีแสงสว่าง</b> มุม <span class="mono">${X}°</span></p>
        <ol style="font-size:14.5px;padding-left:20px;margin:6px 0"><li>เริ่มต้นขีดพรายน้ำตรงกับเส้นดัชนี (ตั้งไว้ให้แล้ว)</li><li>คำนวณจำนวนคลิก: มุม ÷ 3 แล้วหมุนวงแหวนทวนเข็ม (↺) ตามจำนวนคลิก</li><li>หันตัวจนลูกศรพรายน้ำตรงกับขีดพรายน้ำ</li></ol>
        <div class="row"><button class="btn primary" id="ok">ยืนยันทิศ</button></div><div id="fbx"></div>`);
      on('ok',()=>{const err=Math.round(angDiff(magHeading(),X)*10)/10,clicks=Math.round(wrap360(-C.lum)/3)%120;C.night=false;requestDraw();$('#ok').disabled=true;
const ok=Math.abs(err)<=TOL.compNight;done(ok,`เป้าหมาย ${X}° = หมุนทวนเข็ม ${k} คลิก (${X} ÷ 3) · คุณหมุน ${clicks} คลิก · หันไปที่ ${fd(magHeading())}° คลาด ${err>0?'+':''}${err}°${ok?'':clicks!==k?`<br>• จำนวนคลิกไม่ตรง: ${X} ÷ 3 = ${k} คลิก หมุนทวนเข็ม (↺) เริ่มจากขีดพรายน้ำตรงเส้นดัชนี`:'<br>• คลิกถูกแล้ว หันตัวช้าๆ จนลูกศรพรายน้ำทับขีดพรายน้ำพอดี'}`);});}
  };show();}};

/* ---------- module 4: azimuth & distance with pencil, plate and compass edge ---------- */
MOD.m4={start(){
  const R4=takeRetry('m4');const qs=[];for(let i=0;i<(R4?R4.kinds.length:CFG.short?2:5);i++){let A,B;for(let k=0;k<100;k++){A=randLand(600);B=randLand(600);const d=dist(A,B);if(d>800&&d<3200)break;}qs.push({A,B});}
  const st=PROG.st({i:0,score:0,wrong:[]});const show=()=>{PROG.save();
    if(st.i>=qs.length)return finishCard('โมดูล 4 · มุมภาคและระยะ',st.score,qs.length*3,PASSAT(qs.length*3,12),'m4','',st.wrong);
    const{A,B}=qs[st.i];const gaz=gridAz(A,B),gm=Math.round(gaz),mm=wrap360(gm-W.gmDeg),bm=wrap360(mm+180),dd=Math.round(dist(A,B));
    O={plate:O.plate?{x:A.x,y:A.y}:null,lines:[],marks:[{x:A.x,y:A.y,kind:'dot',label:'A'},{x:B.x,y:B.y,kind:'dot',label:'B'}]};DRAW.on=false;
    const z=clamp(Math.min(mapC.clientWidth,mapC.clientHeight)*0.7/Math.max(dist(A,B),600),fitZoom(),0.6);setView((A.x+B.x)/2,(A.y+B.y)/2,z);
    setSheet(`<div class="eyebrow">โมดูล 4 · โจทย์ ${st.i+1}/${qs.length}</div>${progress(st.i,qs.length)}
      <p class="q">จาก A ไป B — หามุมภาคและระยะ</p><p class="muted">ขีดเส้นด้วยดินสอจาก A ไป B แล้ววัดด้วยแผ่นวัดมุมและขอบเข็มทิศ · ชุดนี้มุมกริด = มุมแม่เหล็ก ไม่ต้องแปลง</p>
      <div class="tools">${drawBtns()}<button class="btn" id="tp" aria-pressed="${!!O.plate}">แผ่นวัดมุมที่ A</button></div>
      <div class="row"><div class="field"><label for="a1">มุมภาค (องศา)</label><input id="a1" inputmode="decimal"></div><div class="field"><label for="a2">มุมภาคกลับ (องศา)</label><input id="a2" inputmode="decimal"></div><div class="field"><label for="a3">ระยะ (ม.)</label><input id="a3" inputmode="numeric"></div></div>
      <div class="row"><button class="btn primary" id="ok">ตรวจคำตอบ</button></div><div id="fbx"></div>
      <details><summary>ขั้นตอน</summary><ol><li>กด "ขีดเส้นดินสอ" แล้วลากจาก A ไป B (ลากเลยออกไปได้ เพื่อให้ตัดขอบแผ่น)</li><li>วางจุดกึ่งกลางแผ่นวัดมุมที่ A ให้เส้น N-S ขนานเส้นกริดตั้ง อ่านมุมตรงที่เส้นดินสอตัดขอบแผ่น</li><li>ชุดนี้ใช้มุมที่วัดได้ตั้งเข็มทิศได้ทันที (ไม่ต้องบวก/ลบ G-M)</li><li>มุมกลับ: มากกว่า 180° ลบ 180° · น้อยกว่า 180° บวก 180°</li><li>วางขอบเข็มทิศ (มาตรา 1:50000) ตามเส้น อ่านระยะที่ B</li></ol></details>`);
    bindDraw();
    on('tp',e=>{O.plate=O.plate?null:{x:A.x,y:A.y};e.currentTarget.setAttribute('aria-pressed',!!O.plate);if(O.plate)setView(A.x,A.y,Math.min(mapC.clientWidth,mapC.clientHeight)/5400);requestDraw();});
        on('ok',()=>{const a=[num('a1'),num('a2'),num('a3')];if(a.some(isNaN)){$('#fbx').innerHTML='<div class="fb bad">กรอกให้ครบทั้ง 3 ช่อง</div>';return;}
      const r=[Math.abs(angDiff(a[0],gaz))<=TOL.az,Math.abs(angDiff(a[1],wrap360(gaz+180)))<=TOL.az,Math.abs(a[2]-dd)<=Math.max(dd*TOL.dist,TOL.distMin)];
      const bt=Math.abs(angDiff(a[1],wrap360(a[0]+180)))>0.6?'<br>• มุมกลับ: มากกว่า 180° ลบ 180° · น้อยกว่า 180° บวก 180° (จากมุมที่คุณวัด '+fd(a[0])+'° ควรได้ '+fd(a[0]+180)+'°)':'';
      r.forEach((ok,k)=>{const el=$('#a'+(k+1));el.classList.add(ok?'ok':'no');el.disabled=true;});const n=r.filter(Boolean).length;st.score+=n;if(n<3)st.wrong.push('ab');$('#ok').disabled=true;DRAW.on=false;
      $('#fbx').innerHTML=`<div class="fb ${n===3?'good':'bad'}"><strong>${n}/3</strong> · ค่าที่ถูก: มุมภาค <span class="mono">${fd(gm)}°</span> · กลับ <span class="mono">${fd(bm)}°</span> · ระยะ <span class="mono">${dd}</span> ม.<br><span class="muted">คุณตอบ ${fd(a[0])}° · ${fd(a[1])}° · ${a[2]} ม. · ยอมคลาด มุม ±${TOL.az}° ระยะ ±${Math.round(Math.max(dd*TOL.dist,TOL.distMin))} ม.</span>${angTip(a[0],gaz,'มุมภาค')}${r[1]?'':bt}${distTip(a[2],dd)}</div>${nextBtn('โจทย์ต่อไป')}`;
      O.line={a:A,b:B,color:'#d6261c',dash:[6,4]};O.plate={x:A.x,y:A.y,az:gaz};requestDraw();on('nx',()=>{st.i++;show();});});
  };show();}};

/* ---------- module 5: navigation exercise with pace count ---------- */
function paceStd(){try{return Number(localStorage.getItem('lnav-pace'))||140;}catch(e){return 140;}}
MOD.m5={start(){
  let sp=null;for(let i=0;i<60&&!sp;i++){const p=randLand(900);if(W.roadDist(p.x,p.y)<60)sp=p;}sp=sp||randLand(900);
  const R5=takeRetry('m5');RETRY=null;const cps=[];let prev=sp;for(let k=0;k<(R5?R5.kinds.length:CFG.short?2:3);k++){let c=null;for(let i=0;i<300;i++){const a=rnd(0,2*Math.PI),d=rnd(800,1400),p={x:prev.x+Math.sin(a)*d,y:prev.y+Math.cos(a)*d};if(landOK(p.x,p.y)&&p.x>500&&p.y>500&&p.x<MAP-500&&p.y<MAP-500&&dist(p,sp)>600){c=p;break;}}c=c||randLand(600);cps.push(c);prev=c;}
  const trueStride=1+gauss()*0.03;
  const N={tp:{...sp},pp:{...sp},cps,found:0,trueTrack:[{...sp}],plan:[[{...sp}]],pins:[],rays:[],searches:[],time:0,paces:0,actual:0,log:[],pinMode:false,done:false};
  const draw=()=>{const marks=[{x:sp.x,y:sp.y,kind:'sp',label:'SP'}];
    N.cps.forEach((c,k)=>{if(k<N.found)marks.push({x:c.x,y:c.y,kind:'cp',label:'CP'+(k+1),color:'#1f8a3a'});});
    N.pins.forEach((p,k)=>marks.push({x:p.x,y:p.y,kind:'pin',label:'หมุด '+(k+1)}));
    O={plate:O.plate||null,lines:O.lines||[],ruler:O.ruler||null,marks,rays:N.rays,tracks:N.plan.map(seg=>({pts:seg,color:'#555',dash:[6,5],width:1.8}))};routeApply(sp,N.pins);requestDraw();};
  const cpRows=()=>N.cps.map((c,k)=>`<span class="mono">CP${k+1}</span><span class="mono">${ZONE} ${gridRef(c.x,c.y,8)}</span><span>${k<N.found?'<span class="pill pass">พบแล้ว</span>':k===N.found?'<span class="pill">ถัดไป</span>':''}</span>`).join('');
  const lmOpts=()=>W.landmarks.map((l,k)=>`<option value="${k}">${esc(l.name)} (${gridRef(l.x,l.y,6)})</option>`).join('');
  const ui=msg=>{draw();PROG.save();setSheet(`<div class="eyebrow">โมดูล 5 · เดินทางจำลอง</div>
    <p>เริ่มที่ <b>SP</b> <span class="mono">${ZONE} ${gridRef(sp.x,sp.y,8)}</span> ไปหาจุดตรวจตามลำดับ ตำแหน่งจริงของคุณจะไม่แสดง เส้นประคือเส้นทางที่คุณคิดว่าเดิน</p>
    <div class="cplist">${cpRows()}</div>
    ${msg?`<div class="fb">${msg}</div>`:''}
    <h3>เดินหนึ่งขา (นับก้าว)</h3>
    <div class="row"><div class="field"><label for="laz">มุมภาค (องศา)</label><input id="laz" inputmode="decimal"></div><div class="field"><label for="ld">จำนวนก้าวที่นับ</label><input id="ld" inputmode="numeric"></div><button class="btn primary" id="walk">เดิน</button></div>
    <div class="row"><div class="field" style="flex:0 1 200px"><label for="pstd">ก้าวมาตรฐานของฉัน (ก้าว/100 ม.)</label><input id="pstd" inputmode="numeric" value="${paceStd()}"></div></div>
    <div class="tools"><button class="btn" id="obs">สังเกตรอบตัว</button><button class="btn" id="look">ส่องเข็มทิศ</button><button class="btn" id="find">ค้นหาจุดตรวจ</button><button class="btn" id="pin" aria-pressed="${N.pinMode}">ปักหมุด</button>${routeBtn()}${plateBtns()}${drawBtns()}</div>
    <h3>หาที่อยู่ของตนเอง (สกัดกลับ)</h3>
    <div class="row"><div class="field" style="flex-basis:100%"><label for="lm">จุดสังเกต</label><select id="lm">${lmOpts()}</select></div><div class="field"><label for="raz">มุมภาคกลับ จากจุดสังเกตมาหาเรา (องศา)</label><input id="raz" inputmode="decimal"></div><button class="btn" id="ray">ลากเส้น</button></div>
    <div class="tools"><button class="btn" id="rlast" ${N.rays.length?'':'disabled'}>ลบเส้นสกัดกลับล่าสุด</button><button class="btn" id="rclr">ลบเส้นสกัดกลับทั้งหมด</button><button class="btn" id="pinx" ${N.pins.length?'':'disabled'}>ลบหมุดล่าสุด</button><button class="btn" id="usepin" ${N.pins.length?'':'disabled'}>ใช้หมุดล่าสุดเป็นตำแหน่งของฉัน</button><button class="btn" id="end">จบภารกิจ · ดูผล</button></div>
    <p class="muted mono">เวลาที่ใช้ ${Math.round(N.time)} นาที · นับก้าวรวม ${N.paces} ก้าว</p>
    <ul class="log">${N.log.slice(-6).reverse().map(l=>`<li>${l}</li>`).join('')}</ul>
    <details><summary>เทคนิคจากบทเรียน</summary><ul><li>ก้าวมาตรฐาน: เดินทางราบ 100 ม. 3-5 ครั้งแล้วหาค่าเฉลี่ย (เช่น 140 ก้าว/100 ม.) · ระยะ = จำนวนก้าว × 100 ÷ ก้าวมาตรฐาน</li><li>พื้นที่ลาดชันหรือขรุขระ ก้าวจะสั้นลง ต้องนับก้าวเพิ่ม</li><li>เดินตามมุม: ตั้งมุมใต้เส้นขีดดำ เล็งหาที่หมายในแนวเส้นเล็ง เดินไปที่หมายนั้น ทำซ้ำ</li><li>ชุดนี้เดินตัดผ่านแม่น้ำ หนองน้ำ และหน้าผาได้เป็นเส้นตรง ระยะที่นับคือระยะกระจัด (ระยะตรงบนแผนที่) จึงไม่ต้องเดินอ้อม · มุมภาคกริด = มุมภาคแม่เหล็ก</li><li>สกัดกลับแบบสองที่หมาย: เล็งไปยังที่หมาย 2 จุด หามุมกลับ (มากกว่า 180 ลบ 180 · น้อยกว่า 180 บวก 180) แปลงเป็นกริด ลากเส้น จุดตัดคือตำแหน่งของเรา</li><li>แบบหนึ่งที่หมาย: ถ้าอยู่บนถนนหรือลำน้ำ ใช้เส้นสกัดกลับเส้นเดียวตัดกับแนวถนน/ลำน้ำนั้น</li></ul></details>`);
    on('walk',walk);on('obs',()=>ui('<b>สิ่งที่สังเกตได้:</b> '+observeText(N.tp.x,N.tp.y).join(' · ')));
    on('pstd',e=>{const v=Number(e.target.value);if(v>=80&&v<=220){try{localStorage.setItem('lnav-pace',String(Math.round(v)));}catch(err){}}},'change');
    on('look',()=>{computePano(N.tp.x,N.tp.y);C.disp=magHeading();resetCompass({mode:'sight'});setStageView('comp',true);sheet.scrollTop=0;});
    on('find',find);on('pin',()=>{N.pinMode=!N.pinMode;DRAW.on=false;ui(N.pinMode?'แตะแผนที่เพื่อปักหมุด (แตะอีกครั้งเพื่อเพิ่มหมุด)':'');setStageView('map',true);});
    bindPlate();bindDraw();bindRoute(m=>ui(m));
    on('ray',()=>{const k=+val('lm'),a=num('raz');if(isNaN(a))return;const L=W.landmarks[k];N.rays.push({x:L.x,y:L.y,az:wrap360(a)});ui(`ลากเส้นจาก ${esc(L.name)} ที่มุมภาคกริด ${fd(a)}°`);});
    on('rclr',()=>{N.rays.length=0;ui('');});
    on('rlast',()=>{N.rays.pop();ui('ลบเส้นสกัดกลับเส้นล่าสุดแล้ว');});
    on('pinx',()=>{N.pins.pop();ui(N.pins.length?`เหลือหมุด ${N.pins.length} อัน`:'ลบหมุดหมดแล้ว');});
    on('usepin',()=>{const p=N.pins[N.pins.length-1];N.pp={...p};N.plan.push([{...p}]);N.log.push(`ตั้งตำแหน่งใหม่ที่หมุด ${N.pins.length} (${gridRef(p.x,p.y,8)})`);ui('ตั้งตำแหน่งของคุณที่หมุดล่าสุดแล้ว');});
    on('end',aar);
  };
  tapHandler=(x,y)=>{if(!N.pinMode||N.done)return;N.pins.push({x,y});ui(`ปักหมุด ${N.pins.length} ที่ ${gridRef(x,y,8)} · ใช้ปุ่มลูกศรมุมซ้ายล่างเลื่อนหมุดล่าสุดได้`);};
  nudgeReg(()=>N.pins[N.pins.length-1],()=>draw());N.legs=[];N.fails=0;PROG.st(N);if(PROG.cur&&PROG.cur.resumed){N.pinMode=false;N.done=false;}
  function walk(){const az=num('laz'),P=num('ld'),std=Number(val('pstd'))||paceStd();if(isNaN(az)||isNaN(P)||P<=0)return ui('กรอกมุมภาคและจำนวนก้าวก่อนเดิน');
    const Dm=Math.min(P*100/std,3000);const legErr=gauss()*0.5,scale=trueStride*(1+gauss()*0.015);let hdg=wrap360(az)+W.gmDeg+legErr;let x=N.tp.x,y=N.tp.y,cnt=0,act=0,stop='',wet=false;
    while(cnt<Dm){const step=Math.min(10,Dm-cnt);hdg+=gauss()*(W.isForest(x,y)?0.2:0.1);const a=hdg*Math.PI/180;
      const h1=W.elev(x,y),sl=(W.elev(x+Math.sin(a)*step,y+Math.cos(a)*step)-h1)/step;const f=scale;
      const mx=x+Math.sin(a)*step*f,my=y+Math.cos(a)*step*f;
      if(mx<0||my<0||mx>MAP||my>MAP){stop='ถึงขอบพื้นที่ฝึก';break;}
      if(W.isWater(mx,my))wet=true;
      x=mx;y=my;cnt+=step;act+=step*f;N.time+=0.15*(step/10)*(1+2*Math.max(0,sl))*(W.isWater(x,y)?2:1)*(W.isForest(x,y)?1.4:1)*(W.roadDist(x,y)<20?0.8:1);
      if(((cnt/10)|0)%5===0)N.trueTrack.push({x,y});}
    const pc=Math.round(cnt*std/100);const tg=N.cps[Math.min(N.found,N.cps.length-1)];N.legs.push({from:{...N.tp},pp:{...N.pp},az:wrap360(az),paces:pc,cnt,end:{x,y},tgt:{...tg},label:'CP'+(Math.min(N.found,N.cps.length-1)+1)});
    N.trueTrack.push({x,y});N.tp={x,y};N.paces+=pc;N.actual+=act;
    const pa=(wrap360(az)+W.gmDeg)*Math.PI/180;N.pp={x:N.pp.x+Math.sin(pa)*cnt,y:N.pp.y+Math.cos(pa)*cnt};N.plan[N.plan.length-1].push({...N.pp});
    N.log.push(`เดิน ${fd(az)}° นับได้ ${pc} ก้าว${wet?' (ลุยข้ามน้ำ)':''}${stop?' — หยุด: '+stop:''}`);ui(stop?`<b>${stop}</b> หลังนับได้ ${pc} ก้าว`:`เดินครบ ${pc} ก้าว${wet?' · ลุยข้ามน้ำระหว่างทาง':''}`);}
  function find(){if(N.found>=N.cps.length)return;const c=N.cps[N.found],d=dist(N.tp,c);N.searches.push({x:N.tp.x,y:N.tp.y,ok:d<=TOL.find,cp:N.found});N.time+=5;
    if(d<=TOL.find){N.found++;N.fails=0;N.pp={...c};N.plan.push([{...c}]);N.log.push(`พบ CP${N.found}`);
      if(N.found>=N.cps.length)return aar();ui(`<b>พบ CP${N.found}!</b> ตำแหน่งของคุณคือ ${gridRef(c.x,c.y,8)} วางแผนไป CP${N.found+1} ต่อ`);}
    else{N.fails++;N.log.push(`ค้นหา CP${N.found+1} ไม่พบ`);ui(`ไม่พบจุดตรวจในรัศมี ${TOL.find} ม. · ${searchHelp(d,gridAz(N.tp,c),N.fails)}`);}}
  function aar(){N.done=true;tapHandler=null;PROG.clear('m5');DRAW.on=false;setStageView('map',false);
    const marks=[{x:sp.x,y:sp.y,kind:'sp',label:'SP'}];N.cps.forEach((c,k)=>marks.push({x:c.x,y:c.y,kind:'cp',label:'CP'+(k+1),color:k<N.found?'#1f8a3a':'#d6261c'}));
    N.searches.forEach(s=>marks.push({x:s.x,y:s.y,kind:'x',color:s.ok?'#1f8a3a':'#d6261c'}));
    O={marks,tracks:[...N.plan.map(seg=>({pts:seg,color:'#555',dash:[6,5],width:1.8})),{pts:N.trueTrack,color:'#d6261c',width:2.6}]};fitView();
    const errs=N.searches.filter(s=>!s.ok).length;const NC=R5?R5.total:N.cps.length,got=R5?Math.min(NC,R5.carry+N.found):N.found,pass=got===NC;rec('m5',got,NC,pass);
    setSheet(`<div class="eyebrow">โมดูล 5 · ทบทวนหลังการฝึก (AAR)</div><div class="score mono">${got}/${NC} จุด</div>${R5?`<p class="muted">รอบซ่อม: หาเพิ่ม ${N.found}/${N.cps.length} จุด · รวมกับที่หาได้ไว้ ${R5.carry} จุด</p>`:''}
      <p>${pass?'<span class="pill pass">ผ่านเกณฑ์</span>':'<span class="pill fail">ยังไม่ผ่าน</span>'}</p>
      <table><tr><th>รายการ</th><th>ค่า</th></tr><tr><td>เวลาที่ใช้</td><td class="mono">${Math.round(N.time)} นาที</td></tr><tr><td>นับก้าวรวม / ระยะจริง</td><td class="mono">${N.paces} ก้าว / ${Math.round(N.actual)} ม.</td></tr><tr><td>ค้นหาผิดที่</td><td class="mono">${errs} ครั้ง</td></tr><tr><td>ห่างจาก CP ถัดไปตอนจบ</td><td class="mono">${N.found<N.cps.length?Math.round(dist(N.tp,N.cps[N.found]))+' ม.':'—'}</td></tr></table>
      <p class="muted">เส้นแดง = เส้นทางที่เดินจริง · เส้นประ = เส้นทางที่คิดว่าเดิน · ✕ = จุดที่ค้นหา (พบเมื่ออยู่ห่างจุดตรวจไม่เกิน ${TOL.find} ม.)</p>
      <p class="muted">ก้าวจริงของคุณในภารกิจนี้ ${Math.round(Math.abs(trueStride-1)*100)}% ${trueStride>=1?'ยาวกว่า':'สั้นกว่า'}ก้าวมาตรฐานที่ตั้งไว้ (จึงต้องวัดก้าวมาตรฐานของตนเองในพื้นที่จริง)</p>
      ${legReview(N.legs,paceStd())}
      <div class="row">${pass?'':`<button class="btn primary" id="fixwrong">ฝึกซ่อมเฉพาะจุดที่ยังไม่พบ (${NC-got} จุด · สุ่มเส้นทางใหม่)</button>`}<button class="btn${pass?' primary':''}" id="again">${pass?'ภารกิจใหม่':'ทำใหม่ทั้งหมด'}</button><button class="btn" id="tores">ดูผลการฝึกทั้งหมด</button></div>`);
    on('fixwrong',()=>{RETRY={mod:'m5',kinds:Array(NC-got).fill('cp'),carry:got,total:NC,passAt:NC};setModule('m5',true);});
    on('again',()=>{RETRY=null;setModule('m5',true);});on('tores',()=>setModule('res'));}
  setView(sp.x,sp.y,0.2);
  ui('');}};

/* ---------- module 6: terrain association and self-location (1, 2, 3 landmarks) ---------- */
MOD.m6={start(){
  const R6=takeRetry('m6');const st=PROG.st({score:0,step:0,wrong:[]});const steps=R6?R6.kinds.map(k=>({...k})):CFG.short?[{k:'id'},{k:'fix',n:1},{k:'fix',n:2}]:[{k:'id'},{k:'id'},{k:'fix',n:1},{k:'fix',n:2},{k:'fix',n:3}];const total=steps.reduce((a,x)=>a+(x.k==='id'?1:2),0);
  const next=()=>{st.step++;run();};
  const run=()=>{PROG.save();if(st.step>=steps.length){resetCompass({mode:'top'});setStageView('map',false);return finishCard('โมดูล 6 · หาที่อยู่ของตนเอง',st.score,total,PASSAT(total,6),'m6','',st.wrong);}
    const s=steps[st.step];const head=`<div class="eyebrow">โมดูล 6 · ขั้น ${st.step+1}/${steps.length}</div>${progress(st.step,steps.length)}`;
    if(s.k==='id'){let sp=null,vis=[];for(let i=0;i<40&&!sp;i++){const p=randLand(700);vis=computePano(p.x,p.y).filter(l=>l.vis&&l.kind==='peak'&&l.d>500&&l.d<5500);if(vis.length>=2)sp=p;}
      if(!sp){next();return;}const L=pick(vis);C.heading=L.az+rnd(-3,3);C.disp=magHeading();C.vel=0;
      O={marks:[{x:sp.x,y:sp.y,kind:'sp',label:'คุณอยู่ที่นี่'}]};setView(sp.x,sp.y,0.07);setStageView('comp',true);resetCompass({mode:'sight',labels:false});
      const ans=L.name,opts=shuffle([ans,...shuffle(W.peaks.map(p=>'ยอด '+Math.round(p.h)).filter(n=>n!==ans)).slice(0,3)]);
      setSheet(`${head}<p class="q">พิจารณาพื้นที่: ภูเขาที่เส้นเล็งชี้อยู่ตอนนี้คือยอดใดบนแผนที่?</p><p class="muted">รู้ตำแหน่งตนเอง (วงม่วงบนแผนที่) · อ่านมุมจากเข็มทิศ แล้วเทียบทิศทาง ระยะ และความสูงกับยอดเขาบนแผนที่ (สลับ "แผนที่/เข็มทิศ" ด้านซ้ายบน)</p>${choicesHTML(opts)}<div id="fbx"></div>`);
      choiceUI(opts,ans,ok=>{if(ok)st.score++;else st.wrong.push({k:'id'});$('#fbx').innerHTML=fb(ok,'คำตอบที่ถูก: <b>'+esc(ans)+`</b> (มุมภาค ${fd(L.az-W.gmDeg)}° ระยะ ${(L.d/1000).toFixed(1)} กม.)`+(ok?'':'<br>• เทียบทิศทางจากจุดยืนไปยอดเขาบนแผนที่ แล้วดูว่ายอดใดอยู่แนวมุมนั้นและสูงเด่นพอจะมองเห็น'))+nextBtn();on('nx',next);});return;}
    runFixDrill({kind:s.n,title:`โมดูล 6 · ขั้น ${st.step+1}/${steps.length}`,onDone:r=>{const pt=r.err<=TOL.fixFull?2:r.err<=TOL.fixHalf?1:0;st.score+=pt;if(pt<2)st.wrong.push({k:'fix',n:s.n});
      setSheet(`${head}${fb(pt===2,pt===2?'ตำแหน่งแม่นยำ':pt===1?`ใกล้เคียง (เกณฑ์เต็มคือไม่เกิน ${TOL.fixFull} ม.)`:'ยังคลาดมาก ตรวจการระบุยอดเขาและการคำนวณมุมกลับ')}${r.html}${nextBtn('ขั้นต่อไป')}`);on('nx',next);}});};
  run();}};

/* ---------- results ---------- */
/* ---------- sync to instructor (db) ---------- */
const SYNC={db:null,uid:null,owner:false,ok:null,dl:null,records:null,at:0};
const lsGet=(k,d)=>{try{return localStorage.getItem(k)||d;}catch(e){return d;}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};
function history(){try{return JSON.parse(localStorage.getItem(HKEY)||'[]')||[];}catch(e){return[];}}
let webT=0;function queueWeb(){if(!CFG.web)return;clearTimeout(webT);webT=setTimeout(webSubmit,1200);}
function logAttempt(mod,score,total,pass){queueWeb();const h=history();h.push({mod,score,total,pass:!!pass,code:APP.code,at:Date.now()});lsSet(HKEY,JSON.stringify(h.slice(-80)));pushRecord();}
function bestByModule(){const best={};for(const code of Object.keys(APP.store)){const s=APP.store[code]||{};for(const m of Object.keys(s)){const r=s[m],b=best[m];if(!b||r.score/r.total>b.score/b.total||(r.pass&&!b.pass))best[m]={score:r.score,total:r.total,pass:!!(r.pass||(b&&b.pass)),code,at:r.at};}}return best;}
let wChain=Promise.resolve();
function pushRecord(){if(!SYNC.db||!SYNC.uid||SYNC.ok===false)return;const name=lsGet('lnav-name','').trim();if(!name)return;
  const body={name:name.slice(0,80),sid:lsGet('lnav-sid','').trim().slice(0,30),best:bestByModule(),history:history().slice(-60),at:Date.now()};
  wChain=wChain.then(()=>SYNC.db.doc('records/'+SYNC.uid).set(body)).then(()=>{SYNC.ok=true;SYNC.at=Date.now();if(APP.mod==='res')syncStatus();},e=>{
    if(e&&e.code==='unavailable')return new Promise(r=>setTimeout(r,900)).then(()=>SYNC.db.doc('records/'+SYNC.uid).set(body)).then(()=>{SYNC.ok=true;SYNC.at=Date.now();}).catch(()=>{});
    if(e&&(e.code==='invalid_argument'||e.code==='not_granted'))SYNC.ok=false;if(APP.mod==='res')syncStatus();});}
function syncText(){if(CFG.web)return"";if(!SYNC.db||!SYNC.uid)return'ผลเก็บไว้ในเครื่องนี้ ฝึกครบแล้วกด "ส่งคะแนน (Google Form)" ด้านล่าง';if(!lsGet('lnav-name',''))return'กรอกยศ ชื่อ-สกุล ก่อน คะแนนจึงจะส่งถึงครูฝึก';
  if(SYNC.ok===false)return'ส่งออนไลน์ไม่ได้ ใช้ปุ่ม "ส่งคะแนน (Google Form)" แทน';
  return SYNC.at?`ส่งคะแนนถึงครูฝึกแล้ว ✓ ${new Date(SYNC.at).toLocaleTimeString('th-TH')}`:'คะแนนจะส่งถึงครูฝึกอัตโนมัติเมื่อจบแต่ละโมดูล';}
/* ---------- no-account submit (Google Form) ---------- */
function hashS(t){let h=2166136261;for(const c of t){h^=c.codePointAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(36).padStart(4,'0').slice(-4);}
const clean=v=>String(v||'').replace(/[|\n\r#]/g,' ').trim();
const TOT=CFG.short?{m1:7,m2:5,m3:5,m4:6,m5:2,m6:5}:{m1:12,m2:10,m3:10,m4:15,m5:3,m6:8};
const SETNAME=CFG.short?'แบบฝึก (ย่อ 30 นาที)':'แบบฝึก (เต็ม)';
function scoreSum(){const b=bestByModule();let got=0,tot=0;for(const m of MODN){tot+=b[m]?b[m].total:TOT[m];if(b[m])got+=b[m].score;}return{b,got,tot,passed:MODN.filter(m=>b[m]&&b[m].pass).length};}
function resultCode(){const b=bestByModule();const mods=MODN.filter(m=>b[m]).map(m=>`${m}:${b[m].score}/${b[m].total}${b[m].pass?'p':''}`).join(',');
  const body=`LN2|${CFG.short?'S':'F'}|${clean(lsGet('lnav-name',''))}|${clean(lsGet('lnav-sid',''))}|${mods}|${Math.floor(Date.now()/1000).toString(36)}`;return body+'|'+hashS(body);}
function appPayload(){const{b,got,tot,passed}=scoreSum();const mods={};for(const m of MODN)mods[m]=b[m]?`${b[m].score}/${b[m].total}${b[m].pass?' ผ่าน':''}`:'';
  return{key:'app-'+(CFG.short?'S':'F'),kind:'app',set:CFG.short?'S':'F',setName:SETNAME,name:lsGet('lnav-name','').trim(),sid:lsGet('lnav-sid','').trim(),code:APP.code,score:got,total:tot,passed,mods,chk:resultCode(),at:Date.now()};}
window.APPKIND='app';
window.onRestore=d=>{if(!d||!d.mods)return 0;const code=String(d.code||APP.code).toUpperCase();const s=APP.store[code]||(APP.store[code]={});let n=0;
  for(const m of MODN){const v=String(d.mods[m]||'');const mt=v.match(/(\d+)\s*\/\s*(\d+)/);if(!mt)continue;const sc=+mt[1],tt=+mt[2],ps=/ผ่าน/.test(v);const p=s[m];
    if(!p||sc/tt>p.score/p.total||(ps&&!p.pass)){s[m]={score:Math.max(sc,p&&p.total===tt?p.score:0),total:tt,pass:ps||(p&&p.pass)||false,at:Date.now()};n++;}}
  if(n){saveStore();renderTabs();if(APP.mod==='res')setModule('res');}return n;};
window.onRoomJoin=()=>{const st=APP.store[APP.code]||{};if(Object.keys(st).length)webSubmit();};
window.onIdentity=()=>{if(APP.mod==='res')setModule('res');};
function webSubmit(){if(!CFG.web||!lsGet('lnav-name','').trim())return;netSend(appPayload());}
window.onNetStatus=()=>{const el=document.getElementById('netst')||document.getElementById('sync');if(el)el.textContent=netText();};
function formURL(){const F=CFG.form;if(!F||!F.url)return'';const{b,got,tot,passed}=scoreSum();
  const detail=MODS.filter(m=>m.n).map(m=>`${m.n}.${m.t} ${b[m.id]?b[m.id].score+'/'+b[m.id].total+(b[m.id].pass?' ผ่าน':' ไม่ผ่าน'):'-'}`).join(' | ');
  const v={name:lsGet('lnav-name',''),sid:lsGet('lnav-sid',''),set:SETNAME,code:APP.code,score:got,total:tot,passed:`${passed}/6`,detail,chk:resultCode()};
  return F.url+'?usp=pp_url'+Object.keys(F.e).filter(k=>v[k]!==undefined).map(k=>'&'+F.e[k]+'='+encodeURIComponent(v[k])).join('');}
function syncStatus(){const el=document.getElementById('sync');if(el)el.textContent=syncText();}
MOD.res={start(){fitView();const s=APP.store[APP.code]||{};const name=lsGet('lnav-name',''),sid=lsGet('lnav-sid','');
  const rows=MODS.filter(m=>m.n).map(m=>{const r=s[m.id];return`<tr><td><b class="mono">${m.n}</b> ${m.t}</td><td class="mono">${r?r.score+'/'+r.total:'—'}</td><td>${r?(r.pass?'<span class="pill pass">ผ่าน</span>':'<span class="pill fail">ไม่ผ่าน</span>'):'<span class="muted">ยังไม่ฝึก</span>'}</td></tr>`;}).join('');
  const all=MODS.filter(m=>m.n).every(m=>s[m.id]&&s[m.id].pass);
  setSheet(`<div class="eyebrow">ผลการฝึก · รหัสภารกิจ <span class="mono">${esc(APP.code)}</span></div>
    ${!name?'<div class="fb bad"><strong>กรอกยศ ชื่อ-สกุลก่อนเริ่มฝึก</strong> เพื่อให้ครูฝึกเห็นคะแนนของคุณ</div>':''}
    <div class="row"><div class="field"><label for="nm">ยศ ชื่อ-สกุล ผู้รับการฝึก</label><input id="nm" value="${esc(name)}" style="font-family:var(--f-body)"></div><div class="field" style="flex:0 1 160px"><label for="sid">เลขที่/รหัสประจำตัว</label><input id="sid" value="${esc(sid)}"></div><button class="btn primary" id="nmsave">บันทึก</button></div>
    <div class="wrapx" style="margin-top:10px"><table><tr><th>โมดูล</th><th>คะแนนดีที่สุด</th><th>สถานะ</th></tr>${rows}</table></div>
    <p>${all?'<span class="pill pass">พร้อมออกภาคสนาม</span>':'<span class="pill">ต้องผ่านครบ 6 โมดูลก่อนออกภาคสนาม</span>'}</p>
    <p class="muted" id="sync">${syncText()}</p>
    <h3>ส่งคะแนนให้ครูฝึก</h3><p style="font-size:14px">คะแนนรวม <b class="mono">${scoreSum().got}/${scoreSum().tot}</b> (${Math.round(scoreSum().got/scoreSum().tot*1000)/10}%) · ผ่าน ${scoreSum().passed}/6 โมดูล</p>
    ${CFG.web?`<div class="tools"><button class="btn primary" id="websend">ส่งคะแนนตอนนี้</button></div><p class="muted" id="netst" style="font-size:12.5px">${esc(netText())}</p>`:`<div class="tools"><a class="btn primary" id="formgo" href="#" target="_blank" rel="noopener" style="text-decoration:none">ส่งคะแนน (Google Form)</a></div>
    <p class="muted" id="sharemsg" style="font-size:12.5px">${CFG.form&&CFG.form.url?'กดแล้วจะเปิดแบบฟอร์มที่กรอกคะแนนไว้ให้แล้ว เลื่อนลงกด "ส่ง" ได้เลย ไม่ต้องแก้ไขข้อมูล · ส่งซ้ำได้ ครูฝึกใช้คะแนนล่าสุด':'ครูฝึกยังไม่ได้ตั้งค่า Google Form · แคปหน้าจอนี้ส่งครูฝึกแทน'}</p>`}`);
  if(CFG.web){on('websend',()=>{if(!lsGet('lnav-name','').trim()){$('#netst').textContent='กรอกยศ ชื่อ-สกุล แล้วกดบันทึกก่อนส่งคะแนน';return;}$('#netst').textContent='กำลังส่ง…';webSubmit();});}else{const fg=$('#formgo');fg.addEventListener('click',e=>{if(!lsGet('lnav-name','').trim()){e.preventDefault();$('#sharemsg').textContent='กรอกยศ ชื่อ-สกุล แล้วกดบันทึกก่อนส่งคะแนน';return;}const u=formURL();if(!u){e.preventDefault();return;}fg.href=u;});}
  on('nmsave',()=>{lsSet('lnav-name',val('nm').trim());lsSet('lnav-sid',val('sid').trim());pushRecord();if(CFG.web)webSubmit();setModule('res');});}};

/* ---------- instructor dashboard (owner only) ---------- */
const MODN=['m1','m2','m3','m4','m5','m6'];
function insRows(){return(SYNC.records||[]).filter(r=>r.kind!=='game').map(r=>{const b=r.best||{};const passed=MODN.filter(m=>b[m]&&b[m].pass).length;
  const pct=MODN.reduce((a,m)=>a+(b[m]?b[m].score/b[m].total:0),0)/MODN.length;return{...r,passed,pct};});}
function csvCell(v){v=String(v==null?'':v);return/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
function buildCSV(kind){const rows=insRows();
  if(kind==='hist'){const out=[['ชื่อ','รหัส','โมดูล','คะแนน','เต็ม','ผ่าน','รหัสภารกิจ','เวลา']];for(const r of rows)for(const h of r.history||[])out.push([r.name,r.sid,h.mod,h.score,h.total,h.pass?'ผ่าน':'ไม่ผ่าน',h.code,new Date(h.at).toLocaleString('th-TH')]);return out.map(x=>x.map(csvCell).join(',')).join('\n');}
  const out=[['ชื่อ','รหัส',...MODS.filter(m=>m.n).map(m=>m.n+' '+m.t),'ผ่าน (โมดูล)','เฉลี่ย %','อัปเดตล่าสุด']];
  for(const r of rows.sort((a,b)=>String(a.sid||a.name).localeCompare(String(b.sid||b.name),'th',{numeric:true}))){const b=r.best||{};out.push([r.name,r.sid,...MODN.map(m=>b[m]?`${b[m].score}/${b[m].total}${b[m].pass?' ✓':''}`:''),r.passed+'/6',Math.round(r.pct*100),r.at?new Date(r.at).toLocaleString('th-TH'):'']);}
  return out.map(x=>x.map(csvCell).join(',')).join('\n');}
async function saveCSV(kind){const csv='﻿'+buildCSV(kind),fn=kind==='hist'?'ประวัติการฝึก-แผนที่เข็มทิศ.csv':'สรุปคะแนน-แผนที่เข็มทิศ.csv';const st=$('#insmsg');
  if(SYNC.dl){try{await SYNC.dl.save({filename:fn,data:csv});if(st)st.textContent='ดาวน์โหลดแล้ว';return;}catch(e){if(e&&e.code==='declined'){if(st)st.textContent='ยกเลิกการดาวน์โหลด';return;}}}
  try{await navigator.clipboard.writeText(csv);if(st)st.textContent='คัดลอก CSV แล้ว วางใน Excel/Google Sheets ได้เลย';}catch(e){if(st)st.textContent='ดาวน์โหลดไม่ได้ในมุมมองนี้';}}
let insSel=null,insQ='';
function parseCodes(txt){const out=[],bad=[];const re=/(LN[12]|OC[12])\|[^\s\t"]*/g;let m;
  while((m=re.exec(txt))){const parts=m[0].replace(/[",]+$/,'').split('|');const h=parts.pop(),body=parts.join('|');if(hashS(body)!==h){bad.push(parts[1]||'?');continue;}
    let t=parts[0],set='F';const rest=parts.slice(1);if(t==='LN2'||t==='OC2')set=rest.shift();
    if(t.startsWith('LN')){const[name,sid,mods,ts]=rest;const best={};for(const x of (mods||'').split(',').filter(Boolean)){const mm=/^(m\d):(\d+)\/(\d+)(p?)$/.exec(x);if(mm)best[mm[1]]={score:+mm[2],total:+mm[3],pass:!!mm[4]};}
      out.push({kind:'app',set,name,sid,best,at:parseInt(ts,36)*1000});}
    else{const[name,sid,stars,clr,so,ts]=t==='OC2'?rest:[rest[0],'',rest[1],rest[2],rest[3],rest[4]];out.push({kind:'game',set,name,sid,stars:+stars||0,cleared:+clr||0,so,at:parseInt(ts,36)*1000});}}
  return{out,bad};}
const better=(a,b)=>!a||b.score/b.total>a.score/a.total||(b.pass&&!a.pass);
async function importCodes(){const st=$('#impmsg'),txt=val('imptxt');const{out,bad}=parseCodes(txt);if(!out.length){st.textContent=bad.length?`รหัสผลถูกแก้ไข ${bad.length} รายการ จึงไม่นำเข้า`:'ไม่พบรหัสตรวจสอบในข้อความที่วาง';return;}
  const cur=Object.fromEntries((SYNC.records||[]).map(r=>[r.id,r]));let n=0,fail=0;
  for(const r of out){const id=(r.kind==='game'?'game-':'imp-')+r.set+'-'+hashS((r.sid||'')+'|'+r.name.replace(/\s+/g,''));const old=cur[id];let body;
    if(r.kind==='game'){if(old&&old.at>=r.at)continue;body={kind:'game',set:r.set,name:r.name,sid:r.sid,stars:r.stars,cleared:r.cleared,so:r.so,at:r.at,src:'form'};}
    else{const best={...(old&&old.best||{})};const hist=(old&&old.history||[]).slice();for(const m of Object.keys(r.best)){const b=r.best[m];if(better(best[m],b))best[m]={...b,code:'FORM',at:r.at};if(!hist.some(h=>h.mod===m&&h.at===r.at))hist.push({mod:m,score:b.score,total:b.total,pass:b.pass,code:'FORM',at:r.at});}
      body={name:r.name+(r.set==='S'?' (ย่อ)':''),sid:r.sid,set:r.set,best,history:hist.slice(-60),at:Math.max(r.at,old&&old.at||0),src:'form'};}
    cur[id]={id,...body};try{await SYNC.db.doc('records/'+id).set(body);n++;}catch(e){fail++;}}
  st.textContent=`นำเข้า/อัปเดต ${n} รายการ${fail?` · บันทึกไม่สำเร็จ ${fail}`:''}${bad.length?` · ข้ามรหัสที่ถูกแก้ไข ${bad.length}`:''}`;if(!n&&!fail)st.textContent+=' (ข้อมูลเป็นปัจจุบันแล้ว)';$('#imptxt').value='';}
function renderIns(){if(APP.mod!=='ins')return;const box=$('#insbox');if(!box)return;
  if(!SYNC.records){box.innerHTML='<p class="muted">กำลังโหลดข้อมูลผู้รับการฝึก…</p>';return;}
  const rows=insRows().filter(r=>!insQ||(r.name+' '+(r.sid||'')).toLowerCase().includes(insQ.toLowerCase())).sort((a,b)=>String(a.sid||a.name).localeCompare(String(b.sid||b.name),'th',{numeric:true}));
  const all=insRows(),n=all.length,ready=all.filter(r=>r.passed===6).length,avg=n?Math.round(all.reduce((a,r)=>a+r.pct,0)/n*100):0;
  const modStat=MODS.filter(m=>m.n).map(m=>{const done=all.filter(r=>r.best&&r.best[m.id]),pass=done.filter(r=>r.best[m.id].pass).length;return{m,done:done.length,pass};});
  box.innerHTML=`<div class="row" style="gap:16px"><div><div class="score mono">${n}</div><div class="muted">ผู้รับการฝึกที่ส่งคะแนน</div></div><div><div class="score mono">${ready}</div><div class="muted">ผ่านครบ 6 โมดูล</div></div><div><div class="score mono">${avg}%</div><div class="muted">คะแนนเฉลี่ย</div></div></div>
    <h3>อัตราผ่านรายโมดูล</h3><div style="display:grid;gap:5px">${modStat.map(s=>`<div style="display:grid;grid-template-columns:150px 1fr 60px;gap:8px;align-items:center;font-size:13.5px"><span>${s.m.n} ${s.m.t}</span><span style="height:10px;background:var(--surface-2);border-radius:5px;overflow:hidden"><span style="display:block;height:100%;width:${n?s.pass/n*100:0}%;background:var(--good)"></span></span><span class="mono">${s.pass}/${n}</span></div>`).join('')}</div>
    <h3>รายบุคคล</h3><div class="row"><div class="field"><label for="insq">ค้นหาชื่อ/รหัส</label><input id="insq" value="${esc(insQ)}" style="font-family:var(--f-body)"></div></div>
    <div class="wrapx" style="margin-top:8px"><table><tr><th>รหัส</th><th>ชื่อ</th>${MODN.map((m,k)=>`<th>${k+1}</th>`).join('')}<th>ผ่าน</th><th>ล่าสุด</th></tr>
    ${rows.map(r=>{const b=r.best||{};return`<tr data-id="${esc(r.id)}" style="cursor:pointer" class="${insSel===r.id?'sel':''}"><td class="mono">${esc(r.sid||'')}</td><td>${esc(r.name||'(ไม่ระบุ)')}</td>${MODN.map(m=>`<td class="mono" style="color:${b[m]?(b[m].pass?'var(--good)':'var(--bad)'):'var(--muted)'}">${b[m]?Math.round(b[m].score/b[m].total*100):'–'}</td>`).join('')}<td class="mono">${r.passed}/6</td><td class="mono" style="font-size:12px">${r.at?new Date(r.at).toLocaleDateString('th-TH'):''}</td></tr>`;}).join('')||'<tr><td colspan="10" class="muted">ยังไม่มีผู้รับการฝึกส่งคะแนน</td></tr>'}</table></div>
    ${gameTable()}<p class="muted" style="font-size:12.5px">ตัวเลขคือ % คะแนนดีที่สุด เขียว = ผ่าน แดง = ยังไม่ผ่าน · แตะแถวเพื่อดูประวัติ</p><div id="insdet"></div>`;
  const q=$('#insq');if(q)q.addEventListener('change',e=>{insQ=e.target.value;renderIns();});
  box.querySelectorAll('tr[data-id]').forEach(tr=>tr.onclick=()=>{insSel=tr.dataset.id;renderDet();});renderDet();}
function gameTable(){const g=(SYNC.records||[]).filter(r=>r.kind==='game').sort((a,b)=>(b.stars||0)-(a.stars||0));if(!g.length)return'';
  return`<h3>ผลเกม (จาก Google Form)</h3><div class="wrapx"><table><tr><th>ชื่อ</th><th>ภารกิจที่ผ่าน</th><th>ดาว</th><th>Score-O</th></tr>${g.map(r=>`<tr><td>${esc(r.name)}${r.set==='S'?' (ย่อ)':''}</td><td class="mono">${r.cleared}/${r.set==='S'?7:12}</td><td class="mono">★ ${r.stars}</td><td class="mono" style="font-size:12px">${esc(r.so||'')}</td></tr>`).join('')}</table></div>`;}
function renderDet(){const el=$('#insdet');if(!el||!insSel)return;const r=insRows().find(x=>x.id===insSel);if(!r){el.innerHTML='';return;}
  const T=Object.fromEntries(MODS.map(m=>[m.id,m.n+' '+m.t]));
  el.innerHTML=`<h3>ประวัติ: ${esc(r.name||'')} ${r.sid?'('+esc(r.sid)+')':''}</h3><ul class="log">${(r.history||[]).slice().reverse().map(h=>`<li>${new Date(h.at).toLocaleString('th-TH')} · ${esc(T[h.mod]||h.mod)} · <b>${h.score}/${h.total}</b> ${h.pass?'ผ่าน':'ไม่ผ่าน'} · <span class="mono">${esc(h.code||'')}</span></li>`).join('')||'<li>ไม่มีประวัติ</li>'}</ul>`;}
MOD.ins={start(){fitView();setSheet(`<div class="eyebrow">สำหรับครูฝึก</div><h2>สรุปคะแนนผู้รับการฝึก</h2>
  <div class="tools"><button class="btn primary" id="csv1">ดาวน์โหลดสรุป (CSV)</button><button class="btn" id="csv2">ดาวน์โหลดประวัติทั้งหมด (CSV)</button></div><p class="muted" id="insmsg" style="font-size:13px">ข้อมูลอัปเดตสดเมื่อผู้รับการฝึกจบแต่ละโมดูล · ผู้รับการฝึกเห็นเฉพาะคะแนนของตนเอง</p>
  <details style="margin:8px 0;padding:8px 12px;border:1px solid var(--line);border-radius:10px"><summary><b>ตรวจสอบ/นำเข้าผลจาก Google Sheets</b></summary>
  <p class="muted" style="font-size:13px">ในชีตคำตอบของ Google Form เลือกคอลัมน์ "รหัสตรวจสอบ" ทั้งคอลัมน์ (แบบฝึกและเกม) คัดลอกมาวางที่นี่ ระบบจะตรวจว่ามีใครแก้คะแนนในฟอร์มหรือไม่ แล้วรวมเข้าตารางด้านล่าง</p>
  <textarea id="imptxt" rows="5" style="width:100%;font-size:13px" placeholder="วางคอลัมน์รหัสตรวจสอบที่นี่"></textarea><div class="tools"><button class="btn primary" id="impgo">นำเข้า</button></div><p class="muted" id="impmsg" style="font-size:13px"></p></details>
  <div id="insbox"></div>`);
  on('impgo',importCodes);on('csv1',()=>saveCSV('sum'));on('csv2',()=>saveCSV('hist'));renderIns();}};

/* ---------- map margin ---------- */
MOD.leg={start(){fitView();const v0=W.villages[0];
  setSheet(`<div class="eyebrow">ขอบระวาง · รหัสภารกิจ <span class="mono">${esc(APP.code)}</span></div><h2>ระวาง${esc(v0?v0.name:'จำลอง')} (จำลอง)</h2>
    <table><tr><td>มาตราส่วน</td><td class="mono">1:50,000 (1 ช่องกริด = 1 กม. · 1 ซม. = 500 ม.)</td></tr><tr><td>เขตกริด</td><td class="mono">${ZONE} · WGS84 · UTM</td></tr><tr><td>ช่วงเส้นชั้นความสูง</td><td class="mono">20 ม. (เส้นแทรก 10 ม.)</td></tr>
    <tr><td>พิกัดภูมิศาสตร์</td><td class="mono">${fmtDMS(latSecAt(0),'N')} – ${fmtDMS(latSecAt(MAP),'N')}<br>${fmtDMS(lonSecAt(0),'E')} – ${fmtDMS(lonSecAt(MAP),'E')}</td></tr><tr><td>พื้นที่กริด</td><td class="mono">${E0/1000}-${E0/1000+8} / ${N0/1000}-${N0/1000+8}</td></tr></table>
    <h3>แผนภาพมุมเบี่ยงเบน</h3>${declHTML()}
    <h3>เครื่องหมายแผนที่</h3><div class="legend">${LEG.map(([k,t])=>`<div><canvas data-k="${k}" aria-hidden="true"></canvas><span>${t}</span></div>`).join('')}</div>
    <p class="muted" style="margin-top:12px">พื้นที่ แผนที่ และมุมเบี่ยงเบนสร้างจากรหัสภารกิจ ทุกคนที่ใช้รหัสเดียวกันจะได้ระวางเดียวกัน</p>`);
  sheet.querySelectorAll('.legend canvas').forEach(cv=>drawLeg(cv,cv.dataset.k));}};

/* ---------- boot ---------- */
APP.store=loadStore();
(async()=>{try{if(!window.claude||!window.claude.use){if(!CFG.web&&!lsGet('lnav-name',''))setModule('res');return;}const[db,user,dl]=await Promise.all([window.claude.use('db'),window.claude.use('user'),window.claude.use('downloads')]);SYNC.dl=dl;if(!db){if(!lsGet('lnav-name',''))setModule('res');return;}SYNC.db=db;
  SYNC.uid=user?await user.id():null;SYNC.owner=user?await user.isOwner():false;
  if(SYNC.owner){MODS.push({id:'ins',n:'',t:'ครูฝึก'});renderTabs();db.collection('records').limit(500).onSnapshot(s=>{SYNC.records=s.docs.map(d=>({id:d.id,...d.data()}));renderIns();},()=>{});}
  else if(!lsGet('lnav-name',''))setModule('res');
  pushRecord();if(APP.mod==='res')syncStatus();}catch(e){}})();try{const c=localStorage.getItem('lnav-code');if(c)$('#code').value=c;}catch(e){}
new ResizeObserver(resize).observe($('#stage'));window.addEventListener('resize',resize);
try{const lm=localStorage.getItem(CFG.short?'lnav-smod':'lnav-mod');if(lm&&MODS.some(x=>x.id===lm))APP.mod=lm;}catch(e){}
resize();regen();
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>requestDraw());
