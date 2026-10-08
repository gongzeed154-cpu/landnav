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
 *   ภาพรวม       สถิติทั้งชั้น
 */

var SHEET_APP = 'สรุป-แบบฝึก';
var SHEET_GAME = 'สรุป-เกม';
var SHEET_LOG = 'บันทึกทั้งหมด';
var SHEET_STAT = 'ภาพรวม';

var HEAD_APP = ['เลขที่', 'ยศ ชื่อ-สกุล', 'ชุด', 'คะแนน', 'คะแนนเต็ม', 'ร้อยละ', 'ผ่าน (โมดูล)',
  'ม.1 แผนที่', 'ม.2 พิกัด', 'ม.3 เข็มทิศ', 'ม.4 มุม-ระยะ', 'ม.5 เดินทาง', 'ม.6 หาที่อยู่',
  'รหัสภารกิจ', 'ส่งล่าสุด', 'จำนวนครั้งที่ส่ง', 'ตรวจสอบ'];
var HEAD_GAME = ['เลขที่', 'ยศ ชื่อ-สกุล', 'ชุด', 'คะแนน', 'คะแนนเต็ม', 'ร้อยละ', 'ภารกิจที่ผ่าน',
  'ดาว', 'Score-O', 'รหัสภารกิจ', 'ส่งล่าสุด', 'จำนวนครั้งที่ส่ง', 'ตรวจสอบ'];
var HEAD_LOG = ['เวลา', 'ประเภท', 'ชุด', 'เลขที่', 'ยศ ชื่อ-สกุล', 'รหัสภารกิจ', 'คะแนน', 'คะแนนเต็ม', 'ร้อยละ', 'ตรวจสอบ', 'ข้อมูลดิบ'];

/* ---------- web endpoints ---------- */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);
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
  var p = (e && e.parameter) || {};
  if (p.action === 'board') return json_({ ok: true, rows: board_(p.set === 'S' ? 'S' : 'F') });
  return json_({ ok: true, service: 'landnav-scores', time: new Date().toISOString() });
}

/* ---------- setup ---------- */
function setup() {
  ensureSheets_();
  SpreadsheetApp.getActive().toast('พร้อมรับคะแนนแล้ว ต่อไป: ทำให้ใช้งานได้เป็นเว็บแอป', 'ระบบคะแนน', 8);
}

function ensureSheets_() {
  var ss = SpreadsheetApp.getActive();
  makeSheet_(ss, SHEET_APP, HEAD_APP, 6);
  makeSheet_(ss, SHEET_GAME, HEAD_GAME, 6);
  makeSheet_(ss, SHEET_LOG, HEAD_LOG, 0);
  if (!ss.getSheetByName(SHEET_STAT)) {
    var st = ss.insertSheet(SHEET_STAT);
    var A = "'" + SHEET_APP + "'!", G = "'" + SHEET_GAME + "'!";
    var rows = [
      ['สถิติ', 'แบบฝึก (เต็ม)', 'แบบฝึก (ย่อ)', 'เกม (เต็ม)', 'เกม (ย่อ)'],
      ['จำนวนผู้ส่ง (คน)',
        '=COUNTIF(' + A + 'C2:C,"เต็ม")', '=COUNTIF(' + A + 'C2:C,"ย่อ")',
        '=COUNTIF(' + G + 'C2:C,"เต็ม")', '=COUNTIF(' + G + 'C2:C,"ย่อ")'],
      ['ร้อยละเฉลี่ย',
        '=IFERROR(ROUND(AVERAGEIF(' + A + 'C2:C,"เต็ม",' + A + 'F2:F),1),"-")', '=IFERROR(ROUND(AVERAGEIF(' + A + 'C2:C,"ย่อ",' + A + 'F2:F),1),"-")',
        '=IFERROR(ROUND(AVERAGEIF(' + G + 'C2:C,"เต็ม",' + G + 'F2:F),1),"-")', '=IFERROR(ROUND(AVERAGEIF(' + G + 'C2:C,"ย่อ",' + G + 'F2:F),1),"-")'],
      ['ผ่านเกณฑ์ 80% (คน)',
        '=COUNTIFS(' + A + 'C2:C,"เต็ม",' + A + 'F2:F,">=80")', '=COUNTIFS(' + A + 'C2:C,"ย่อ",' + A + 'F2:F,">=80")',
        '=COUNTIFS(' + G + 'C2:C,"เต็ม",' + G + 'F2:F,">=80")', '=COUNTIFS(' + G + 'C2:C,"ย่อ",' + G + 'F2:F,">=80")'],
      ['ต่ำกว่า 60% (คน)',
        '=COUNTIFS(' + A + 'C2:C,"เต็ม",' + A + 'F2:F,"<60")', '=COUNTIFS(' + A + 'C2:C,"ย่อ",' + A + 'F2:F,"<60")',
        '=COUNTIFS(' + G + 'C2:C,"เต็ม",' + G + 'F2:F,"<60")', '=COUNTIFS(' + G + 'C2:C,"ย่อ",' + G + 'F2:F,"<60")'],
      ['สูงสุด',
        '=IFERROR(MAXIFS(' + A + 'F2:F,' + A + 'C2:C,"เต็ม"),"-")', '=IFERROR(MAXIFS(' + A + 'F2:F,' + A + 'C2:C,"ย่อ"),"-")',
        '=IFERROR(MAXIFS(' + G + 'F2:F,' + G + 'C2:C,"เต็ม"),"-")', '=IFERROR(MAXIFS(' + G + 'F2:F,' + G + 'C2:C,"ย่อ"),"-")'],
      ['ต่ำสุด',
        '=IFERROR(MINIFS(' + A + 'F2:F,' + A + 'C2:C,"เต็ม"),"-")', '=IFERROR(MINIFS(' + A + 'F2:F,' + A + 'C2:C,"ย่อ"),"-")',
        '=IFERROR(MINIFS(' + G + 'F2:F,' + G + 'C2:C,"เต็ม"),"-")', '=IFERROR(MINIFS(' + G + 'F2:F,' + G + 'C2:C,"ย่อ"),"-")']
    ];
    st.getRange(1, 1, rows.length, 5).setValues(rows);
    st.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#e7ecdf');
    st.getRange(1, 1, rows.length, 1).setFontWeight('bold');
    st.setColumnWidth(1, 170);
    st.getRange(rows.length + 2, 1).setValue('ร้อยละ = คะแนน ÷ คะแนนเต็ม × 100 · สีเขียว ≥ 80 · สีแดง < 60 · คะแนนในแผ่นสรุปเป็นคะแนนดีที่สุดของแต่ละคน');
  }
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
  sh.setColumnWidth(2, 190);
  return sh;
}

/* ---------- recording ---------- */
function record_(d) {
  var kind = d.kind === 'game' ? 'game' : 'app';
  var set = d.set === 'S' ? 'ย่อ' : 'เต็ม';
  var name = clean_(d.name, 80), sid = clean_(d.sid, 20), code = clean_(d.code, 30);
  if (!name) throw new Error('missing name');
  var score = num_(d.score), total = num_(d.total);
  var pct = total > 0 ? Math.round(score / total * 1000) / 10 : 0;
  var check = verify_(d.chk) ? 'ถูกต้อง' : 'รหัสไม่ตรง';
  var now = new Date();
  var ss = SpreadsheetApp.getActive();

  ss.getSheetByName(SHEET_LOG).appendRow([now, kind === 'game' ? 'เกม' : 'แบบฝึก', set, "'" + sid, name, code, score, total, pct, check, JSON.stringify(d).slice(0, 2000)]);

  var sh = ss.getSheetByName(kind === 'game' ? SHEET_GAME : SHEET_APP);
  var row;
  if (kind === 'game') {
    row = [sid, name, set, score, total, pct, (num_(d.cleared)) + '/' + num_(d.levels), num_(d.stars) + '/' + num_(d.starsMax), num_(d.so), code, now, 1, check];
  } else {
    var m = d.mods || {};
    row = [sid, name, set, score, total, pct, num_(d.passed) + '/6', m.m1 || '', m.m2 || '', m.m3 || '', m.m4 || '', m.m5 || '', m.m6 || '', code, now, 1, check];
  }
  var countCol = kind === 'game' ? 12 : 16, lastCol = row.length;
  var data = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, lastCol).getValues() : [];
  var key = keyOf_(sid, name, set), at = -1;
  for (var i = 0; i < data.length; i++) if (keyOf_(String(data[i][0]), String(data[i][1]), String(data[i][2])) === key) { at = i; break; }
  if (at < 0) {
    sh.appendRow(row);
  } else {
    var old = data[at];
    var keep = Number(old[5]) > pct; // keep the better score
    if (kind === 'game') {
      var bestSo = Math.max(num_(old[8]), num_(d.so));
      if (keep) { row = old.slice(); }
      row[8] = bestSo;
    } else if (keep) {
      row = old.slice();
    }
    row[0] = sid; row[1] = name; row[countCol - 2] = now; row[countCol - 1] = num_(old[countCol - 1]) + 1;
    if (!keep) row[lastCol - 1] = check;
    sh.getRange(at + 2, 1, 1, lastCol).setValues([row]);
  }
  if (sh.getLastRow() > 2) sh.getRange(2, 1, sh.getLastRow() - 1, lastCol).sort([{ column: 3, ascending: true }, { column: 1, ascending: true }]);
  return { pct: pct, check: check };
}

function board_(set) {
  var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_GAME);
  if (!sh || sh.getLastRow() < 2) return [];
  var want = set === 'S' ? 'ย่อ' : 'เต็ม';
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, HEAD_GAME.length).getValues();
  return v.filter(function (r) { return r[2] === want; }).map(function (r) {
    return { sid: String(r[0]), name: String(r[1]), pct: Number(r[5]) || 0, cleared: parseInt(String(r[6]), 10) || 0,
      stars: parseInt(String(r[7]), 10) || 0, so: Number(r[8]) || 0, code: String(r[9]) };
  }).sort(function (a, b) { return b.pct - a.pct || b.so - a.so; }).slice(0, 60);
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
function keyOf_(sid, name, set) { return [String(sid).trim(), String(name).replace(/\s+/g, ''), set].join('|'); }
function clean_(v, n) { return String(v == null ? '' : v).replace(/[\r\n\t]/g, ' ').replace(/^[=+\-@]/, "'$&").trim().slice(0, n); }
function num_(v) { var x = Number(v); return isFinite(x) ? x : 0; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
