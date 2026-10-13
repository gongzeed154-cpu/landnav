/**
 * ระบบรับคะแนน ฝึกแผนที่-เข็มทิศ (Google Apps Script)
 * ---------------------------------------------------
 * วางไฟล์นี้ใน Apps Script ของ Google Sheet ที่ใช้เก็บคะแนน แล้ว
 *   1) เลือกฟังก์ชัน setup แล้วกด "เรียกใช้" ครั้งแรก (อนุญาตสิทธิ์)
 *   2) ทำให้ใช้งานได้ > การทำให้ใช้งานได้รายการใหม่ > เว็บแอป
 *      ดำเนินการในฐานะ: ฉัน · ผู้ที่มีสิทธิ์เข้าถึง: ทุกคน
 *   3) คัดลอก URL ที่ลงท้ายด้วย /exec ไปใส่ใน config.js ของเว็บแอป
 *
 * แผ่นงานที่สร้างให้:
 *   สรุป-แบบฝึก  1 แถวต่อคนต่อชุด เก็บคะแนนดีที่สุด (ร้อยละคำนวณให้)
 *   สรุป-เกม     1 แถวต่อคนต่อชุด
 *   บันทึกทั้งหมด  ทุกครั้งที่ส่ง (ไว้ตรวจย้อนหลัง)
 *   ภาพรวม       สถิติทั้งชั้น + แยกตามห้อง
 *   ห้องเรียน      ครูฝึกตั้งรหัสห้อง เวลาเปิด-ปิด (ผู้ฝึกกรอกรหัสห้องก่อนเข้าฝึก)
 *
 * อัปเดตโค้ด: วางทับทั้งไฟล์ > บันทึก > เรียกใช้ setup อีกครั้ง >
 *   ทำให้ใช้งานได้ > จัดการการทำให้ใช้งานได้ > ✎ แก้ไข > เวอร์ชัน: เวอร์ชันใหม่ > ทำให้ใช้งานได้
 */

var SHEET_APP = 'สรุป-แบบฝึก';
var SHEET_GAME = 'สรุป-เกม';
var SHEET_LOG = 'บันทึกทั้งหมด';
var SHEET_STAT = 'ภาพรวม';
var SHEET_ROOM = 'ห้องเรียน';
var SHEET_DEMO = 'ทดลองเล่น (Demo)';
var SHEET_ONLINE = 'ออนไลน์';
var PRESENCE_SEC = 120; // ไม่ส่งสัญญาณเกินนี้ = หลุด
var GRACE_MIN = 15; // รับคะแนนที่ส่งช้าหลังปิดห้องได้อีกกี่นาที (กรณีเน็ตหลุดตอนท้ายคาบ)

var HEAD_APP = ['ห้อง', 'เลขที่', 'ยศ ชื่อ-สกุล', 'ชุด', 'คะแนน', 'คะแนนเต็ม', 'ร้อยละ', 'ผ่าน (โมดูล)',
  'ม.1 แผนที่', 'ม.2 พิกัด', 'ม.3 เข็มทิศ', 'ม.4 มุม-ระยะ', 'ม.5 เดินทาง', 'ม.6 หาที่อยู่',
  'รหัสภารกิจ', 'ส่งล่าสุด', 'จำนวนครั้งที่ส่ง', 'ตรวจสอบ'];
var HEAD_GAME = ['ห้อง', 'เลขที่', 'ยศ ชื่อ-สกุล', 'ชุด', 'คะแนน', 'คะแนนเต็ม', 'ร้อยละ', 'ภารกิจที่ผ่าน',
  'ดาว', 'Score-O', 'รหัสภารกิจ', 'ส่งล่าสุด', 'จำนวนครั้งที่ส่ง', 'ตรวจสอบ'];
var HEAD_ROOM = ['รหัสห้อง', 'ชื่อห้อง / หลักสูตร', 'เปิด (วัน เวลา)', 'ปิด (วัน เวลา)', 'สั่งการ', 'รหัสภารกิจ (แผนที่)', 'สถานะตอนนี้', 'หมายเหตุ'];
var HEAD_DEMO = ['เวลาล่าสุด', 'ยศ ชื่อ-สกุล', 'ติดต่อ', 'ประเภท', 'คะแนน', 'คะแนนเต็ม', 'ร้อยละ', 'รายละเอียด',
  'ต้องการเล่นเวอร์ชันเต็ม', 'ความเห็น', 'จำนวนครั้งที่ส่ง', 'เริ่มทดลองเมื่อ'];
var HEAD_LOG = ['เวลา', 'ห้อง', 'ประเภท', 'ชุด', 'เลขที่', 'ยศ ชื่อ-สกุล', 'รหัสภารกิจ', 'คะแนน', 'คะแนนเต็ม', 'ร้อยละ', 'ตรวจสอบ', 'ข้อมูลดิบ'];

/* ---------- web endpoints ---------- */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.kind === 'ping') return json_(presence_(d)); // สัญญาณออนไลน์: ไม่ต้องตรวจแผ่นงานทุกครั้ง
    ensureSheets_();
    var res = record_(d);
    return json_({ ok: true, result: res });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var p = (e && e.parameter) || {}, o;
  if (p.action === 'board') o = { ok: true, rows: board_(p.set === 'S' ? 'S' : 'F', String(p.room || '')) };
  else if (p.action === 'room') o = roomInfo_(p.code);
  else if (p.action === 'resume') o = resume_(p);
  else o = { ok: true, service: 'landnav-scores', time: new Date().toISOString() };
  var cb = String(p.callback || '');
  if (/^[A-Za-z_$][\w$]{0,60}$/.test(cb)) // JSONP: บางเครื่อง (เช่น iPhone) โหลดแบบ fetch ไม่ได้
    return ContentService.createTextOutput(cb + '(' + JSON.stringify(o) + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return json_(o);
}

/* ---------- setup ---------- */
function setup() {
  ensureSheets_();
  repairOnline_(); // แก้ชีท 'ออนไลน์' รุ่นแรกที่ชื่อโหมดขึ้น #ERROR!
  writeStats_(SpreadsheetApp.getActive());
  CacheService.getScriptCache().remove('rooms');
  SpreadsheetApp.getActive().toast('พร้อมรับคะแนนแล้ว ต่อไป: ทำให้ใช้งานได้เป็นเว็บแอป', 'ระบบคะแนน', 8);
}

function ensureSheets_() {
  var ss = SpreadsheetApp.getActive();
  migrate_(makeSheet_(ss, SHEET_APP, HEAD_APP, 7), 1);
  migrate_(makeSheet_(ss, SHEET_GAME, HEAD_GAME, 7), 1);
  migrate_(makeSheet_(ss, SHEET_LOG, HEAD_LOG, 0), 2);
  makeRoomSheet_(ss);
  makeDemoSheet_(ss);
  makeOnlineSheet_(ss);
  var st = ss.getSheetByName(SHEET_STAT);
  if (!st || st.getRange('A1').getValue() !== 'ภาพรวมทั้งหมด') writeStats_(ss);
}

/* แผ่นที่สร้างจากรุ่นก่อน (ยังไม่มีคอลัมน์ "ห้อง") เพิ่มคอลัมน์ให้โดยไม่ลบข้อมูลเดิม */
function migrate_(sh, col) {
  if (sh.getRange(1, col).getValue() === 'ห้อง') return;
  if (col === 1) sh.insertColumnBefore(1); else sh.insertColumnAfter(col - 1);
  sh.getRange(1, col).setValue('ห้อง').setFontWeight('bold').setBackground('#2f3d27').setFontColor('#ffffff');
  sh.getRange(1, col, sh.getMaxRows(), 1).setNumberFormat('@');
  if (col === 1) sh.getRange('B:B').setNumberFormat('@');
}

function makeRoomSheet_(ss) {
  var sh = ss.getSheetByName(SHEET_ROOM);
  if (sh) return sh;
  sh = ss.insertSheet(SHEET_ROOM, 0);
  sh.getRange(1, 1, 1, HEAD_ROOM.length).setValues([HEAD_ROOM]).setFontWeight('bold').setBackground('#7a4f12').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.getRange('A2:A').setNumberFormat('@');
  sh.getRange('F2:F').setNumberFormat('@');
  sh.getRange('C2:D').setNumberFormat('d mmm yyyy HH:mm');
  sh.getRange('C2:D').setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false)
    .setHelpText('วันที่และเวลา เช่น 8/10/2026 08:00 หรือดับเบิลคลิกเลือกจากปฏิทิน · ว่างไว้ = ไม่จำกัด').build());
  sh.getRange('E2:E').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['ตามเวลา', 'เปิดเลย', 'ปิดเลย'], true).build());
  sh.getRange('G2').setFormula('=ARRAYFORMULA(IF(A2:A="","",IF(E2:E="ปิดเลย","ปิด (สั่งปิด)",IF(E2:E="เปิดเลย","เปิดอยู่ (สั่งเปิด)",' +
    'IF((C2:C<>"")*(NOW()<C2:C),"ยังไม่เปิด",IF((D2:D<>"")*(NOW()>D2:D),"ปิดแล้ว","เปิดอยู่"))))))');
  var t = new Date(); t.setHours(8, 0, 0, 0);
  var t2 = new Date(t.getTime()); t2.setHours(16, 30, 0, 0);
  sh.getRange(2, 1, 1, 6).setValues([['A1', 'ตัวอย่าง: หลักสูตรดำรงชีพ รุ่นที่ 1', t, t2, 'ตามเวลา', '']]);
  sh.getRange('H2').setValue('แก้แถวนี้ได้เลย · ห้องละ 1 แถว');
  var rules = [
    SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('เปิดอยู่').setBackground('#cdebd3').setRanges([sh.getRange('G2:G')]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('ปิด').setBackground('#f6cdcd').setRanges([sh.getRange('G2:G')]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('ยังไม่เปิด').setBackground('#fff1c2').setRanges([sh.getRange('G2:G')]).build()];
  sh.setConditionalFormatRules(rules);
  sh.setColumnWidth(2, 240); sh.setColumnWidth(3, 150); sh.setColumnWidth(4, 150); sh.setColumnWidth(7, 130); sh.setColumnWidth(8, 260);
  var n = HEAD_ROOM.length + 2;
  sh.getRange(1, n).setValue('วิธีใช้').setFontWeight('bold');
  sh.getRange(2, n, 6, 1).setValues([
    ['1) รหัสห้อง: ตัวอักษร/ตัวเลขสั้นๆ เช่น A1, B2, RTAF-3 ประกาศให้ผู้ฝึกกรอกตอนเปิดเว็บ'],
    ['2) เปิด-ปิด: ใส่วันและเวลา ผู้ฝึกเข้าได้เฉพาะช่วงนี้ (ใช้เวลาของ Google แก้นาฬิกามือถือไม่ได้)'],
    ['3) สั่งการ: ตามเวลา = ใช้เวลาเปิด-ปิด · เปิดเลย / ปิดเลย = สั่งทันที (มีผลภายใน 1-2 นาที)'],
    ['4) รหัสภารกิจ (ไม่บังคับ): ใส่แล้วทุกคนในห้องได้แผนที่เดียวกันโดยไม่ต้องพิมพ์เอง'],
    ['5) ไม่มีห้องเลย (ลบทุกแถว) = ใช้แบบเดิม ไม่ต้องกรอกรหัสห้อง'],
    ['6) คะแนนที่ส่งหลังปิดเกิน ' + GRACE_MIN + ' นาที จะไม่นับ แต่ยังเห็นใน "บันทึกทั้งหมด"']]);
  sh.setColumnWidth(n, 520);
  return sh;
}

function writeStats_(ss) {
  var st = ss.getSheetByName(SHEET_STAT) || ss.insertSheet(SHEET_STAT);
  st.clear();
  var A = "'" + SHEET_APP + "'!", G = "'" + SHEET_GAME + "'!";
  var sets = function (fn) { return [fn(A, 'เต็ม'), fn(A, 'ย่อ'), fn(G, 'เต็ม'), fn(G, 'ย่อ')]; };
  var rows = [
    ['ภาพรวมทั้งหมด', 'แบบฝึก (เต็ม)', 'แบบฝึก (ย่อ)', 'เกม (เต็ม)', 'เกม (ย่อ)'],
    ['จำนวนผู้ส่ง (แถว)'].concat(sets(function (S, t) { return '=COUNTIF(' + S + 'D2:D,"' + t + '")'; })),
    ['ร้อยละเฉลี่ย'].concat(sets(function (S, t) { return '=IFERROR(ROUND(AVERAGEIF(' + S + 'D2:D,"' + t + '",' + S + 'G2:G),1),"-")'; })),
    ['ผ่านเกณฑ์ 80%'].concat(sets(function (S, t) { return '=COUNTIFS(' + S + 'D2:D,"' + t + '",' + S + 'G2:G,">=80")'; })),
    ['ต่ำกว่า 60%'].concat(sets(function (S, t) { return '=COUNTIFS(' + S + 'D2:D,"' + t + '",' + S + 'G2:G,"<60")'; })),
    ['สูงสุด'].concat(sets(function (S, t) { return '=IFERROR(MAXIFS(' + S + 'G2:G,' + S + 'D2:D,"' + t + '"),"-")'; })),
    ['ต่ำสุด'].concat(sets(function (S, t) { return '=IFERROR(MINIFS(' + S + 'G2:G,' + S + 'D2:D,"' + t + '"),"-")'; }))
  ];
  st.getRange(1, 1, rows.length, 5).setValues(rows);
  st.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#e7ecdf');
  st.getRange(1, 1, rows.length, 1).setFontWeight('bold');
  st.setColumnWidth(1, 170);
  st.getRange(rows.length + 1, 1).setValue('ร้อยละ = คะแนน ÷ คะแนนเต็ม × 100 · สีเขียว ≥ 80 · สีแดง < 60 · คะแนนในแผ่นสรุปเป็นคะแนนดีที่สุดของแต่ละคนในแต่ละห้อง').setFontColor('#5a6553');
  var q = function (S, label) {
    return '=IFERROR(QUERY({' + S + 'A2:A,' + S + 'D2:D,' + S + 'G2:G,ARRAYFORMULA(IF(' + S + 'G2:G>=80,1,0))},' +
      '"select Col1, Col2, count(Col3), avg(Col3), sum(Col4), max(Col3), min(Col3) where Col3 is not null group by Col1, Col2 order by Col1, Col2 ' +
      'label Col1 \'ห้อง\', Col2 \'ชุด\', count(Col3) \'จำนวน (คน)\', avg(Col3) \'ร้อยละเฉลี่ย\', sum(Col4) \'ผ่าน ≥80%\', max(Col3) \'สูงสุด\', min(Col3) \'ต่ำสุด\'",0),"ยังไม่มีข้อมูล")';
  };
  st.getRange(10, 1).setValue('แยกตามห้อง · แบบฝึก').setFontWeight('bold').setBackground('#e7ecdf');
  st.getRange(11, 1).setFormula(q(A));
  st.getRange(10, 9).setValue('แยกตามห้อง · เกม').setFontWeight('bold').setBackground('#e7ecdf');
  st.getRange(11, 9).setFormula(q(G));
  st.getRange('D12:D500').setNumberFormat('0.0');
  st.getRange('L12:L500').setNumberFormat('0.0');
  return st;
}

function makeSheet_(ss, name, head, pctCol) {
  var sh = ss.getSheetByName(name);
  if (sh) return sh;
  sh = ss.insertSheet(name);
  sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#2f3d27').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.getRange('A:A').setNumberFormat('@');
  if (pctCol) {
    var r = sh.getRange(2, pctCol, 1000, 1);
    r.setNumberFormat('0.0');
    var rules = sh.getConditionalFormatRules();
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThanOrEqualTo(80).setBackground('#cdebd3').setRanges([r]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(60).setBackground('#f6cdcd').setRanges([r]).build());
    sh.setConditionalFormatRules(rules);
  }
  sh.getRange('B:B').setNumberFormat('@');
  sh.setColumnWidth(head[0] === 'ห้อง' ? 3 : 2, 190);
  return sh;
}

/* ---------- rooms ---------- */
function roomTable_() {
  var cache = CacheService.getScriptCache(), hit = cache.get('rooms');
  if (hit) return JSON.parse(hit);
  var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_ROOM), out = [];
  if (sh && sh.getLastRow() > 1) {
    var v = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();
    for (var i = 0; i < v.length; i++) {
      var code = normCode_(v[i][0]);
      if (!code) continue;
      out.push({ code: code, name: String(v[i][1] || '').trim(), open: when_(v[i][2]), close: when_(v[i][3]),
        cmd: String(v[i][4] || '').trim(), mission: String(v[i][5] || '').trim().toUpperCase().replace(/[^A-Z0-9\-]/g, '').slice(0, 16) });
    }
  }
  cache.put('rooms', JSON.stringify(out), 20);
  return out;
}
function when_(v) { // Date cell → ms ; also accepts text like 8/10/2569 08:00 (Buddhist year)
  if (v instanceof Date) { var d = new Date(v.getTime()); if (d.getFullYear() > 2400) d.setFullYear(d.getFullYear() - 543); return d.getTime(); }
  var m = String(v || '').trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:\s+(\d{1,2})[:.](\d{2}))?/);
  if (!m) return 0;
  var y = +m[3]; if (y < 100) y += 2500; if (y > 2400) y -= 543;
  return new Date(y, +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)).getTime();
}
function normCode_(v) { return String(v == null ? '' : v).trim().toUpperCase().replace(/\s+/g, ''); }
function roomStatus_(r, now, grace) {
  if (r.cmd === 'ปิดเลย') return 'closed';
  if (r.cmd === 'เปิดเลย') return 'open';
  if (r.open && now < r.open) return 'notyet';
  if (r.close && now > r.close + (grace || 0)) return 'closed';
  return 'open';
}
function roomInfo_(code) {
  var rooms = roomTable_(), now = Date.now();
  if (!rooms.length) return { ok: true, status: 'none', now: now };
  var c = normCode_(code), r = null;
  for (var i = 0; i < rooms.length; i++) if (rooms[i].code === c) { r = rooms[i]; break; }
  if (!r) return { ok: true, status: 'unknown', now: now };
  return { ok: true, status: roomStatus_(r, now, 0), code: r.code, name: r.name, open: r.open || 0,
    close: r.cmd === 'เปิดเลย' ? 0 : (r.close || 0), mission: r.mission, now: now };
}

/* ---------- recording ---------- */
function record_(d) {
  if (d.demo) return recordDemo_(d); // รุ่น Demo: แยกชีท ไม่ผ่านห้องเรียน
  var kind = d.kind === 'game' ? 'game' : 'app';
  var set = d.set === 'S' ? 'ย่อ' : 'เต็ม';
  var name = clean_(d.name, 80), sid = clean_(d.sid, 20), code = clean_(d.code, 30), room = normCode_(clean_(d.room, 20));
  if (!name) throw new Error('missing name');
  var score = num_(d.score), total = num_(d.total);
  var pct = total > 0 ? Math.round(score / total * 1000) / 10 : 0;
  var check = verify_(d.chk) ? 'ถูกต้อง' : 'รหัสไม่ตรง';
  var now = new Date();
  var ss = SpreadsheetApp.getActive();

  // room gate (only when the ห้องเรียน sheet has rooms)
  var rooms = roomTable_(), reject = '';
  if (rooms.length) {
    var r = null;
    for (var i = 0; i < rooms.length; i++) if (rooms[i].code === room) { r = rooms[i]; break; }
    if (!room) { // เครื่องที่ยังไม่ได้เข้าห้อง: ถ้าตอนนี้เปิดอยู่ห้องเดียว ให้นับเข้าห้องนั้น
      var openNow = rooms.filter(function (x) { return roomStatus_(x, now.getTime(), GRACE_MIN * 60000) === 'open'; });
      if (openNow.length === 1) { room = openNow[0].code; r = openNow[0]; }
    }
    if (!room) reject = 'ไม่ระบุห้อง (ไม่นับ)';
    else if (!r) reject = 'ไม่พบห้อง (ไม่นับ)';
    else {
      var stt = roomStatus_(r, now.getTime(), GRACE_MIN * 60000);
      if (stt === 'notyet') reject = 'ก่อนเปิดห้อง (ไม่นับ)';
      else if (stt === 'closed') reject = 'หลังปิดห้อง (ไม่นับ)';
    }
  }

  ss.getSheetByName(SHEET_LOG).appendRow([now, room, kind === 'game' ? 'เกม' : 'แบบฝึก', set, "'" + sid, name, code, score, total, pct,
    reject ? check + ' · ' + reject : check, JSON.stringify(d).slice(0, 8000)]);
  if (reject) return { pct: pct, check: check, rejected: reject };

  var sh = ss.getSheetByName(kind === 'game' ? SHEET_GAME : SHEET_APP);
  var row;
  if (kind === 'game') {
    row = [room, sid, name, set, score, total, pct, (num_(d.cleared)) + '/' + num_(d.levels), num_(d.stars) + '/' + num_(d.starsMax), num_(d.so), code, now, 1, check];
  } else {
    var m = d.mods || {};
    row = [room, sid, name, set, score, total, pct, num_(d.passed) + '/6', m.m1 || '', m.m2 || '', m.m3 || '', m.m4 || '', m.m5 || '', m.m6 || '', code, now, 1, check];
  }
  var lastCol = row.length, countCol = lastCol - 1, pctI = 6;
  var data = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, lastCol).getValues() : [];
  var key = keyOf_(room, sid, name, set), at = -1;
  for (var k = 0; k < data.length; k++) if (keyOf_(data[k][0], data[k][1], data[k][2], data[k][3]) === key) { at = k; break; }
  if (at < 0) {
    sh.appendRow(row);
  } else {
    var old = data[at];
    var keep = Number(old[pctI]) > pct; // keep the better score
    if (kind === 'game') {
      var bestSo = Math.max(num_(old[9]), num_(d.so));
      if (keep) { row = old.slice(); }
      row[9] = bestSo;
    } else if (keep) {
      row = old.slice();
    }
    row[0] = room; row[1] = sid; row[2] = name; row[countCol - 2] = now; row[countCol - 1] = num_(old[countCol - 1]) + 1;
    if (!keep) row[lastCol - 1] = check;
    sh.getRange(at + 2, 1, 1, lastCol).setValues([row]);
  }
  if (sh.getLastRow() > 2) sh.getRange(2, 1, sh.getLastRow() - 1, lastCol).sort([{ column: 1, ascending: true }, { column: 4, ascending: true }, { column: 2, ascending: true }]);
  return { pct: pct, check: check };
}

function board_(set, room) {
  var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_GAME);
  if (!sh || sh.getLastRow() < 2) return [];
  var want = set === 'S' ? 'ย่อ' : 'เต็ม', rm = normCode_(room);
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, HEAD_GAME.length).getValues();
  return v.filter(function (r) { return r[3] === want && (!rm || normCode_(r[0]) === rm); }).map(function (r) {
    return { room: String(r[0]), sid: String(r[1]), name: String(r[2]), pct: Number(r[6]) || 0, cleared: parseInt(String(r[7]), 10) || 0,
      stars: parseInt(String(r[8]), 10) || 0, so: Number(r[9]) || 0, code: String(r[10]) };
  }).sort(function (a, b) { return b.pct - a.pct || b.so - a.so; }).slice(0, 60);
}

/* ---------- resume: latest full payload of one trainee (new phone / browser lost its data) ---------- */
function resume_(p) {
  var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_LOG);
  var name = String(p.name || '').replace(/\s+/g, ''), sid = String(p.sid || '').trim();
  var kind = p.kind === 'game' ? 'เกม' : 'แบบฝึก', set = p.set === 'S' ? 'ย่อ' : 'เต็ม';
  if (!sh || !name || sh.getLastRow() < 2) return { ok: true, found: false };
  var last = sh.getLastRow(), n = Math.min(last - 1, 6000), first = last - n + 1;
  var v = sh.getRange(first, 1, n, HEAD_LOG.length).getValues();
  for (var i = v.length - 1; i >= 0; i--) {
    var r = v[i];
    if (r[2] !== kind || r[3] !== set) continue;
    if (String(r[5]).replace(/\s+/g, '') !== name) continue;
    if (sid && String(r[4]).replace(/^'/, '').trim() !== sid) continue;
    try { return { ok: true, found: true, at: r[0], data: JSON.parse(String(r[HEAD_LOG.length - 1])) }; } catch (e) { /* truncated row: keep looking */ }
  }
  return { ok: true, found: false };
}

/* ---------- menu (คอมพิวเตอร์) ---------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('ระบบฝึก')
    .addItem('เพิ่มห้องใหม่ (เปิดตอนนี้ 3 ชั่วโมง)', 'menuNewRoom')
    .addItem('เปิดห้องที่เลือกตอนนี้', 'menuOpenRoom')
    .addItem('ปิดห้องที่เลือกตอนนี้', 'menuCloseRoom')
    .addSeparator()
    .addItem('เปลี่ยนแผนที่ของห้องที่เลือก (สุ่มแผนที่ใหม่)', 'menuNewMap')
    .addItem('ตั้งแผนที่ของห้องที่เลือกเอง (พิมพ์รหัส)', 'menuSetMap')
    .addSeparator()
    .addItem('ล้างคะแนนเฉพาะห้องที่เลือก (สำรองไฟล์ก่อน)', 'menuClearRoom')
    .addItem('ล้างคะแนนทั้งหมด เริ่มรุ่นใหม่ (สำรองไฟล์ก่อน)', 'menuClearAll')
    .addSeparator().addItem('ตั้งค่าแผ่นงาน (setup)', 'setup').addToUi();
  try { // ป้ายหัวคอลัมน์ให้ชัดว่ารหัสภารกิจคือตัวเลือกแผนที่
    var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_ROOM);
    if (sh && sh.getRange(1, 6).getValue() === 'รหัสภารกิจ') sh.getRange(1, 6).setValue('รหัสภารกิจ (แผนที่)')
      .setNote('รหัสนี้กำหนดแผนที่ของห้อง: รหัสเดียวกัน = แผนที่เดียวกันทุกเครื่อง · เปลี่ยนรหัส = เปลี่ยนแผนที่\nใช้ A-Z 0-9 และ - ไม่เกิน 16 ตัว เช่น RTAF-01\nว่างไว้ = ผู้ฝึกพิมพ์รหัสเองที่หัวเว็บ\nหรือใช้เมนู ระบบฝึก > เปลี่ยนแผนที่ของห้องที่เลือก');
  } catch (e) {}
}

/* ---------- แผนที่ (รหัสภารกิจ) ---------- */
function setMap_(code) {
  var x = roomRow_(); if (!x) return;
  x.sh.getRange(x.row, 6).setNumberFormat('@').setValue(code);
  CacheService.getScriptCache().remove('rooms');
  SpreadsheetApp.getActive().toast('ห้อง ' + x.sh.getRange(x.row, 1).getValue() + ' ใช้แผนที่ ' + code + ' แล้ว · โทรศัพท์ผู้ฝึกจะเปลี่ยนเองภายใน 1-2 นาที', 'ระบบฝึก', 8);
}
function menuNewMap() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', c = '';
  for (var i = 0; i < 4; i++) c += chars.charAt(Math.floor(Math.random() * chars.length));
  setMap_('MAP-' + c);
}
function menuSetMap() {
  var ui = SpreadsheetApp.getUi(), r = ui.prompt('ตั้งแผนที่ของห้องที่เลือก', 'พิมพ์รหัสภารกิจ (A-Z 0-9 และ - ไม่เกิน 16 ตัว) เช่น RTAF-01\nรหัสเดียวกัน = แผนที่เดียวกัน', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var code = String(r.getResponseText() || '').toUpperCase().replace(/[^A-Z0-9\-]/g, '').slice(0, 16);
  if (!code) { ui.alert('รหัสว่างหรือมีแต่ตัวอักษรที่ใช้ไม่ได้'); return; }
  setMap_(code);
}

/* ---------- ล้างคะแนน (สำรองทั้งไฟล์ไว้ใน Google Drive ก่อนเสมอ) ---------- */
function backup_() {
  var ss = SpreadsheetApp.getActive(), name = ss.getName() + ' (สำรอง ' + Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd HH.mm') + ')';
  ss.copy(name); return name;
}
function clearRows_(sh, keep) { // keep(row) true = เก็บแถวนั้นไว้ ; ไม่ส่ง keep = ลบทั้งหมด (เก็บหัวตาราง)
  if (!sh || sh.getLastRow() < 2) return 0;
  var n = sh.getLastRow() - 1;
  if (!keep) { sh.getRange(2, 1, n, sh.getMaxColumns()).clearContent(); return n; }
  var v = sh.getRange(2, 1, n, sh.getLastColumn()).getValues(), left = v.filter(keep), gone = n - left.length;
  sh.getRange(2, 1, n, sh.getLastColumn()).clearContent();
  if (left.length) sh.getRange(2, 1, left.length, left[0].length).setValues(left);
  return gone;
}
function menuClearAll() {
  var ui = SpreadsheetApp.getUi();
  if (ui.alert('ล้างคะแนนทั้งหมด', 'จะลบคะแนนทุกแถวในแผ่น สรุป-แบบฝึก · สรุป-เกม · บันทึกทั้งหมด (เก็บหัวตารางและแผ่นห้องเรียนไว้)\nระบบจะสำรองทั้งไฟล์ไว้ใน Google Drive ก่อน\n\nดำเนินการต่อ?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  var ss = SpreadsheetApp.getActive(), b = backup_(), n = 0;
  [SHEET_APP, SHEET_GAME, SHEET_LOG].forEach(function (nm) { n += clearRows_(ss.getSheetByName(nm)); });
  ui.alert('ล้างแล้ว ' + n + ' แถว\nไฟล์สำรอง: "' + b + '" (อยู่ใน Google Drive ของคุณ)');
}
function menuClearRoom() {
  var x = roomRow_(); if (!x) return;
  var ui = SpreadsheetApp.getUi(), room = normCode_(x.sh.getRange(x.row, 1).getValue());
  if (ui.alert('ล้างคะแนนห้อง ' + room, 'จะลบคะแนนของห้อง ' + room + ' ในแผ่น สรุป-แบบฝึก · สรุป-เกม · บันทึกทั้งหมด\nระบบจะสำรองทั้งไฟล์ไว้ใน Google Drive ก่อน\n\nดำเนินการต่อ?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  var ss = SpreadsheetApp.getActive(), b = backup_(), n = 0;
  n += clearRows_(ss.getSheetByName(SHEET_APP), function (r) { return normCode_(r[0]) !== room; });
  n += clearRows_(ss.getSheetByName(SHEET_GAME), function (r) { return normCode_(r[0]) !== room; });
  n += clearRows_(ss.getSheetByName(SHEET_LOG), function (r) { return normCode_(r[1]) !== room; });
  ui.alert('ล้างคะแนนห้อง ' + room + ' แล้ว ' + n + ' แถว\nไฟล์สำรอง: "' + b + '"');
}
function roomRow_() {
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(SHEET_ROOM) || makeRoomSheet_(ss), r = ss.getActiveRange();
  if (ss.getActiveSheet().getName() !== SHEET_ROOM || !r || r.getRow() < 2 || !sh.getRange(r.getRow(), 1).getValue()) {
    ss.setActiveSheet(sh); SpreadsheetApp.getUi().alert('คลิกเลือกแถวของห้องในแผ่น "ห้องเรียน" ก่อน แล้วเลือกเมนูอีกครั้ง'); return null;
  }
  return { sh: sh, row: r.getRow() };
}
function menuNewRoom() {
  var ui = SpreadsheetApp.getUi(), res = ui.prompt('เพิ่มห้องใหม่', 'รหัสห้อง (เช่น A1, B2)', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var code = normCode_(res.getResponseText()); if (!code) return;
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(SHEET_ROOM) || makeRoomSheet_(ss), now = new Date();
  var row = Math.max(2, sh.getRange('A1:A').getValues().filter(String).length + 1);
  sh.getRange(row, 1, 1, 6).setValues([[code, '', now, new Date(now.getTime() + 3 * 3600000), 'ตามเวลา', '']]);
  CacheService.getScriptCache().remove('rooms'); ss.setActiveSheet(sh); sh.setActiveRange(sh.getRange(row, 2));
  ss.toast('ห้อง ' + code + ' เปิดแล้ว ถึง ' + Utilities.formatDate(sh.getRange(row, 4).getValue(), ss.getSpreadsheetTimeZone(), 'HH:mm') + ' น.', 'ระบบฝึก', 6);
}
function menuOpenRoom() {
  var x = roomRow_(); if (!x) return; var now = new Date(), close = x.sh.getRange(x.row, 4).getValue();
  x.sh.getRange(x.row, 3).setValue(now); x.sh.getRange(x.row, 5).setValue('ตามเวลา');
  if (!(close instanceof Date) || close.getTime() < now.getTime() + 600000) x.sh.getRange(x.row, 4).setValue(new Date(now.getTime() + 3 * 3600000));
  CacheService.getScriptCache().remove('rooms'); SpreadsheetApp.getActive().toast('เปิดห้องแล้ว', 'ระบบฝึก', 4);
}
function menuCloseRoom() {
  var x = roomRow_(); if (!x) return;
  x.sh.getRange(x.row, 4).setValue(new Date()); x.sh.getRange(x.row, 5).setValue('ตามเวลา');
  CacheService.getScriptCache().remove('rooms'); SpreadsheetApp.getActive().toast('ปิดห้องแล้ว (ผู้ฝึกจะถูกล็อกภายใน 1-2 นาที)', 'ระบบฝึก', 5);
}

/* ---------- helpers ---------- */
function verify_(chk) {
  if (!chk) return false;
  var parts = String(chk).split('|');
  var h = parts.pop();
  return hash_(parts.join('|')) === h;
}
function hash_(t) { // same checksum as the web app (FNV-1a, base36, last 4 chars)
  var h = 2166136261;
  for (var _i = 0, _a = Array.from(t); _i < _a.length; _i++) { h ^= _a[_i].codePointAt(0); h = Math.imul(h, 16777619); }
  var s = (h >>> 0).toString(36);
  while (s.length < 4) s = '0' + s;
  return s.slice(-4);
}
function keyOf_(room, sid, name, set) { return [normCode_(room), String(sid).trim(), String(name).replace(/\s+/g, ''), String(set)].join('|'); }
function clean_(v, n) { return String(v == null ? '' : v).replace(/[\r\n\t]/g, ' ').replace(/^[=+\-@]/, "'$&").trim().slice(0, n); }
function num_(v) { var x = Number(v); return isFinite(x) ? x : 0; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* แก้แผ่น "ห้องเรียน" แล้วให้มีผลทันที (ล้างแคช) */
function onEdit(e) {
  try { if (e && e.range && e.range.getSheet().getName() === SHEET_ROOM) CacheService.getScriptCache().remove('rooms'); } catch (err) {}
}


/* ---------- รุ่น Demo (ทดลองเล่น): เก็บแยกชีท ไม่ต้องมีห้อง ---------- */
function makeDemoSheet_(ss) {
  var sh = ss.getSheetByName(SHEET_DEMO);
  if (sh) return sh;
  sh = ss.insertSheet(SHEET_DEMO);
  sh.getRange(1, 1, 1, HEAD_DEMO.length).setValues([HEAD_DEMO]).setFontWeight('bold').setBackground('#7a5c00').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.getRange('C:C').setNumberFormat('@');
  sh.getRange('A:A').setNumberFormat('d/m/yyyy HH:mm:ss');
  sh.getRange('L:L').setNumberFormat('d/m/yyyy HH:mm:ss');
  sh.setColumnWidth(2, 190); sh.setColumnWidth(8, 260); sh.setColumnWidth(9, 150); sh.setColumnWidth(10, 220);
  var r = sh.getRange('I2:I1000');
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('ต้องการ').setBackground('#cdebd3').setRanges([r]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('ไม่ต้องการ').setBackground('#f6e2cd').setRanges([r]).build()]);
  // สรุปอยู่แถว 1 เท่านั้น (ถ้าใส่แถวล่าง appendRow จะไปต่อท้ายผิดที่)
  sh.getRange('N1:S1').setValues([['ทดลองทั้งหมด', '', 'ต้องการเวอร์ชันเต็ม', '', 'ไม่ต้องการ', '']]).setFontWeight('bold');
  sh.getRange('O1').setFormula('=COUNTA(B2:B)');
  sh.getRange('Q1').setFormula('=COUNTIF(I2:I,"ต้องการ")');
  sh.getRange('S1').setFormula('=COUNTIF(I2:I,"ไม่ต้องการ")');
  return sh;
}

function recordDemo_(d) {
  var kind = d.kind === 'demofb' ? 'fb' : (d.kind === 'game' ? 'game' : 'app');
  var name = clean_(d.name, 80), sid = clean_(d.sid, 40);
  if (!name) throw new Error('missing name');
  var app = kind === 'fb' ? (d.app === 'game' ? 'game' : 'app') : kind;
  var label = app === 'game' ? 'เกม' : 'แบบฝึก';
  var sh = makeDemoSheet_(SpreadsheetApp.getActive());
  var n = sh.getLastRow(), row = 0, vals = n > 1 ? sh.getRange(2, 1, n - 1, HEAD_DEMO.length).getValues() : [];
  for (var i = 0; i < vals.length; i++)
    if (String(vals[i][1]).replace(/\s+/g, '') === name.replace(/\s+/g, '') && String(vals[i][2]).replace(/^'/, '') === sid && vals[i][3] === label) { row = i + 2; break; }
  var now = new Date(), cur = row ? vals[row - 2] : null;
  if (!row) { sh.appendRow([now, name, "'" + sid, label, 0, 0, 0, '', '', '', 0, now]); row = sh.getLastRow(); cur = [now, name, sid, label, 0, 0, 0, '', '', '', 0, now]; }
  if (kind === 'fb') {
    sh.getRange(row, 1).setValue(now);
    sh.getRange(row, 9).setValue(d.want === 'yes' ? 'ต้องการ' : 'ไม่ต้องการ');
    if (clean_(d.note, 300)) sh.getRange(row, 10).setValue(clean_(d.note, 300));
    return { demo: true, feedback: d.want };
  }
  var score = num_(d.score), total = num_(d.total), pct = total > 0 ? Math.round(score / total * 1000) / 10 : 0;
  var detail = app === 'game'
    ? 'ผ่าน ' + num_(d.cleared) + '/' + num_(d.levels) + ' ภารกิจ · ดาว ' + num_(d.stars) + ' · ' + clean_(JSON.stringify(d.lv || {}), 200)
    : clean_(Object.keys(d.mods || {}).map(function (k) { return k + ' ' + (d.mods[k] || '-'); }).join(' · '), 300);
  var better = score >= num_(cur[4]);
  sh.getRange(row, 1).setValue(now);
  if (better) sh.getRange(row, 5, 1, 4).setValues([[score, total, pct, detail]]);
  sh.getRange(row, 11).setValue(num_(cur[10]) + 1);
  return { demo: true, pct: pct };
}

/* ---------- ออนไลน์ตอนนี้: เครื่องส่งสัญญาณทุก ~45 วินาที เก็บไว้ในแคช แล้วเขียนลงชีทไม่เกินทุก 30 วินาที ---------- */
var ONLINE_HEAD_ROW = 13;
var ONLINE_MODES = ['ฝึก · เต็ม', 'ฝึก · ย่อ', 'ฝึก · Demo', 'เกม · เต็ม', 'เกม · ย่อ', 'เกม · Demo'];

function makeOnlineSheet_(ss) {
  var sh = ss.getSheetByName(SHEET_ONLINE);
  if (sh) return sh;
  sh = ss.insertSheet(SHEET_ONLINE);
  sh.getRange('A1').setValue('ออนไลน์ตอนนี้ (เครื่อง)').setFontWeight('bold').setFontSize(14);
  sh.getRange('B1').setFormula('=COUNTIF(I' + (ONLINE_HEAD_ROW + 1) + ':I,"ออนไลน์")').setFontWeight('bold').setFontSize(18).setBackground('#cdebd3');
  sh.getRange('A2').setValue('อัปเดตอัตโนมัติเมื่อมีเครื่องส่งสัญญาณ (ไม่เกินทุก 30 วินาที) · "หลุด" = ไม่ส่งสัญญาณเกิน ' + PRESENCE_SEC + ' วินาที (ปิดหน้า/ล็อกจอ/ไม่มีเน็ต)').setFontColor('#666666');
  sh.getRange('A4:B4').setValues([['แยกตามโหมด', 'เครื่อง']]).setFontWeight('bold').setBackground('#2f3d27').setFontColor('#ffffff');
  sh.getRange(5, 1, ONLINE_MODES.length, 1).setValues(ONLINE_MODES.map(function (m) { return [m]; })); // ชื่อโหมดเป็นข้อความ ห้ามใช้ setFormulas
  sh.getRange(5, 2, ONLINE_MODES.length, 1).setFormulas(ONLINE_MODES.map(function (m) {
    return ['=COUNTIFS(E' + (ONLINE_HEAD_ROW + 1) + ':E,"' + m + '",I' + (ONLINE_HEAD_ROW + 1) + ':I,"ออนไลน์")'];
  }));
  var head = ['เครื่อง', 'ยศ ชื่อ-สกุล', 'เลขที่/ติดต่อ', 'ห้อง', 'โหมด', 'กำลังทำ', 'เข้ามาเมื่อ', 'เห็นล่าสุด', 'สถานะ'];
  sh.getRange(ONLINE_HEAD_ROW, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#2f3d27').setFontColor('#ffffff');
  sh.setFrozenRows(ONLINE_HEAD_ROW);
  sh.getRange('C:C').setNumberFormat('@');
  sh.setColumnWidth(2, 190); sh.setColumnWidth(6, 230); sh.setColumnWidth(1, 160);
  var rg = sh.getRange('I' + (ONLINE_HEAD_ROW + 1) + ':I1000');
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('ออนไลน์').setBackground('#cdebd3').setRanges([rg]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('หลุด').setBackground('#eeeeee').setFontColor('#888888').setRanges([rg]).build()]);
  return sh;
}

function presence_(d) {
  var dev = clean_(d.dev, 40);
  if (!dev) return { ok: false };
  var cache = CacheService.getScriptCache(), now = Date.now(), map = {};
  try { map = JSON.parse(cache.get('pres') || '{}'); } catch (e) { map = {}; }
  var old = map[dev];
  if (d.bye) { if (old) old.t = now - PRESENCE_SEC * 1000 - 1; }
  else map[dev] = {
    n: clean_(d.name, 60), s: clean_(d.sid, 30), r: normCode_(clean_(d.room, 20)), p: clean_(d.page, 30), a: clean_(d.act, 60),
    f: old ? old.f : now, t: now
  };
  var keys = Object.keys(map);
  for (var i = 0; i < keys.length; i++) if (now - map[keys[i]].t > 15 * 60000) delete map[keys[i]]; // ทิ้งเครื่องที่หายเกิน 15 นาที
  var txt = JSON.stringify(map);
  if (txt.length > 90000) { // แคชจุได้ ~100KB: ตัดเครื่องที่เก่าสุดออก
    var arr = Object.keys(map).sort(function (a, b) { return map[a].t - map[b].t; });
    while (txt.length > 90000 && arr.length) { delete map[arr.shift()]; txt = JSON.stringify(map); }
  }
  cache.put('pres', txt, 3600);
  var last = Number(cache.get('presf') || 0);
  if (now - last > 30000) { cache.put('presf', String(now), 600); flushPresence_(map); }
  return { ok: true };
}

function flushPresence_(map) {
  var sh = makeOnlineSheet_(SpreadsheetApp.getActive()), H = ONLINE_HEAD_ROW;
  var list = Object.keys(map).map(function (k) { return { k: k, v: map[k] }; }).sort(function (a, b) { return b.v.t - a.v.t; });
  var old = sh.getLastRow() - H;
  if (old > 0) sh.getRange(H + 1, 1, old, 9).clearContent();
  if (!list.length) return;
  var vals = list.map(function (o) {
    var v = o.v;
    return [o.k, v.n, "'" + v.s, v.r, v.p, v.a, new Date(v.f), new Date(v.t)];
  });
  sh.getRange(H + 1, 1, vals.length, 8).setValues(vals);
  var fm = vals.map(function (x, i) {
    var r = H + 1 + i;
    return ['=IF(H' + r + '="","",IF((NOW()-H' + r + ')*86400<' + PRESENCE_SEC + ',"ออนไลน์","หลุด"))'];
  });
  sh.getRange(H + 1, 9, fm.length, 1).setFormulas(fm);
  sh.getRange(H + 1, 7, vals.length, 2).setNumberFormat('HH:mm:ss');
}

/* ชีท 'ออนไลน์' ที่สร้างไว้แล้ว: เขียนชื่อโหมดและสูตรนับใหม่ให้ถูกต้อง (ปลอดภัย รันซ้ำได้) */
function repairOnline_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_ONLINE);
  if (!sh) return;
  sh.getRange(5, 1, ONLINE_MODES.length, 1).setValues(ONLINE_MODES.map(function (m) { return [m]; }));
  sh.getRange(5, 2, ONLINE_MODES.length, 1).setFormulas(ONLINE_MODES.map(function (m) {
    return ['=COUNTIFS(E' + (ONLINE_HEAD_ROW + 1) + ':E,"' + m + '",I' + (ONLINE_HEAD_ROW + 1) + ':I,"ออนไลน์")'];
  }));
}
