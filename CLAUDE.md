# CLAUDE.md — Land navigation trainer (map & lensatic compass)

Static web app (no framework, no npm) for RTAF survival training. Thai UI. Four pages built from shared sources:
practice (6 modules) and game (12 levels + Score-O), each in a full and a 30-minute short variant.
Scores are POSTed to a Google Apps Script web app that writes to a Google Sheet.

## Build

```
python3 tools/build.py        # writes practice.html, practice-short.html, game.html, game-short.html
python3 -m http.server 8000   # then open http://localhost:8000/
```

Never edit the four generated `*.html` pages by hand — edit `src/` and rebuild.
`index.html`, `poster.html`, `config.js`, `sw.js`, `qr.js` are hand-written and edited directly.
After any change that ships, bump `VERSION` in `sw.js` so phones fetch the new files.

## Deploy

- This folder is a git clone of github.com/gongzeed154-cpu/landnav (branch `main`, served by GitHub Pages). Pushing to `main` publishes the site — ask the owner before every push.
- `config.js` on GitHub holds the live `SCRIPT_URL` and `UNIT`; never overwrite it with a blank one.
- `apps-script/Code.gs` is not deployed by git: the owner pastes it into Apps Script and makes a new version on both deployments.
- On the owner's Windows PC: Python is `%LOCALAPPDATA%\Python\bin\python.exe` (the `python` alias may hit the Store stub); git and gh are in `C:\Program Files\Git\cmd` and `C:\Program Files\GitHub CLI`. Repo uses `core.autocrlf=false` (LF everywhere).

## Layout

| Path | What |
| --- | --- |
| `src/core.js` | Shared engine: seeded terrain generator `genWorld(code)` (mulberry32 from the mission code), map renderer (contours, symbols, grid 47P PS, geographic graticule), overlays (pencil lines with colours `LCOL`, military unit symbols `drawUnit`/`UNITS`, square protractor plate, compass-edge ruler), pointer/pinch handling, lensatic compass model (`C`, `drawPano`, `drawDial`), question banks, self-location drill `runFixDrill`, and the score sender (`NET`, `netSend`, `netFlush`, outbox in localStorage `lnav-outbox`). |
| `src/practice_app.js` | Practice shell: modules `MOD.m1`…`MOD.m6`, results `MOD.res`, legend `MOD.leg`, instructor tab `MOD.ins` (only on claude.ai builds). |
| `src/game_app.js` | Game shell: `LEVELS` (filtered to 7 ids when `CFG.short`), ranks, Score-O (`showScoreO`, `SOLIM`), board tab `showBoard`. |
| `src/*_head.html` | CSS + static markup for each shell (title/links/style go to `<head>`, the rest to `<body>`). |
| rooms (in `src/core.js`, `ROOM`/`roomCheck`/`roomGate`) | Class rooms with open/close window. `GET ?action=room&code=X` → `{status:none|unknown|notyet|open|closed, open, close, now, mission}`. `none` = no rooms defined (gate off). Gate overlay blocks the app unless open; times use server `now` (offset). Payloads get `room`; `doPost` rejects (logs only) outside window + `GRACE_MIN`. localStorage `lnav-room`, `lnav-roommode`. |
| `apps-script/Code.gs` | `doPost` (upsert best score per person+set, log every send), `doGet?action=board&set=F|S` (game leaderboard JSON), `setup()` creates sheets, formulas, conditional formatting. |

## Tolerances and feedback

- `TOL` in `src/core.js` holds every pass threshold (8-digit grid ±2 last digit, compass ±4°, plate azimuth ±3°, distance ±8%/40 m, CP found within 100 m, self-location 150/300 m). Feedback always shows the true value; `gridCheck`, `compassTip`, `angTip`, `distTip`, `searchHelp`, `legReview` build the explanations.
- Pin nudge pad (`nudgeReg(get,moved)`) moves the last pin with arrow buttons/keys; route lines (`ROUTE`, `routeApply(sp,pins)`) draw SP→pin1→pin2 as pencil lines flagged `route:true`.
- Plate lock `PLOCK.mode`: off / all / v (moves only E-W) / h (moves only N-S).

## Resume and identity

- Practice keeps an in-progress snapshot per module (`PROG`, localStorage `lnav-prog`/`lnav-sprog`, last tab `lnav-mod`). `setModule(m)` reseeds `RNG.f` with the snapshot seed while `start()` runs, so the same questions come back; `setModule(m,true)` starts fresh. `finishCard`/`aar` clear the snapshot.
- `idGate()` asks rank-name + number once; `restoreFromServer` calls `GET ?action=resume&kind&set&name&sid` (Code.gs `resume_` reads the latest raw payload in บันทึกทั้งหมด) and hands it to `window.onRestore` in each app. Game payload carries `lv` and `soAll` for this.
- LINE in-app browser is redirected with `openExternalBrowser=1`.

## Build-time flags (`CFG`, injected by tools/build.py)

- `CFG.short` — 30-minute variant: fewer questions per module (`PASSAT` = 80% of total), 2 checkpoints in walking, game keeps L1 L2 L4 L5 L7 L12 L8, Score-O 6 flags / 45 min.
- `CFG.web` — self-hosted build: auto-sends scores to `window.LNAV_CONFIG.SCRIPT_URL` (from `config.js`) after each module/level; shows "ส่งคะแนนตอนนี้" button. When false (claude.ai artifact build), the old Google Form / `window.claude` paths are used instead.

## Invariants — keep these stable

- Grid azimuth = magnetic azimuth (`gm = 0` in `genWorld`); walking ignores obstacles (straight-line displacement).
- Same mission code ⇒ identical map for everyone. Do not change the RNG call order in `genWorld` without a reason; it changes every map.
- localStorage keys: `lnav-v1` / `lnav-s1` (practice store full/short), `lnav-hist` / `lnav-shist`, `lnav-name`, `lnav-sid`, `opcompass-v1` / `opcompass-s1` (game), `lnav-outbox`, `lnav-room`, `lnav-roommode`.
- Check code formats (verified by `hash_` in Code.gs and `hashS` in the apps — FNV-1a, base36, last 4 chars):
  - practice: `LN2|<F|S>|name|sid|m1:6/7p,m2:3/5|<ts base36>|<hash>`
  - game: `OC2|<F|S>|name|sid|stars|cleared|<code:pts,...>|<ts>|<hash>`
- POST body is JSON sent as `text/plain` with `mode:'no-cors'` (avoids CORS preflight to Apps Script). Payload fields: see `appPayload()` / `gamePayload()`; Code.gs reads `kind,set,name,sid,code,score,total,passed,mods,cleared,levels,stars,starsMax,so,chk`.
- Sheet layout: summaries have `ห้อง` as column A (upsert key = room+sid+name+set); log has `ห้อง` as column B. `migrate_` inserts these into older sheets. Rooms sheet `ห้องเรียน`: code | name | open | close | สั่งการ (ตามเวลา/เปิดเลย/ปิดเลย) | mission | status formula | note.
- Full-set totals: practice 58 (12+10+10+15+3+8), short 30 (7+5+5+6+2+5); game 100 per level.

## Testing

- Serve the folder, open each page, check the console is clean.
- For the score path, point `config.js` at a local mock (any server that accepts POST and answers `GET ?action=board` with `{"ok":true,"rows":[…]}`), or deploy Code.gs to a test sheet.
- Code.gs can be exercised in Node with small mocks of `SpreadsheetApp`, `LockService`, `ContentService`.
- QR generator `qr.js` (byte mode, ECC M, v1–10): verify changes by decoding output (e.g. OpenCV `QRCodeDetector`).
