#!/usr/bin/env python3
"""Build the 4 standalone pages from src/.  Usage: python3 tools/build.py"""
import os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = lambda *p: os.path.join(ROOT, *p)
read = lambda p: open(S(*p.split('/')), encoding='utf-8').read()

PAGES = [  # output, head, app, short, title
    ('practice.html',       'src/practice_head.html', 'src/practice_app.js', False, 'ฝึกแผนที่และเข็มทิศ'),
    ('practice-short.html', 'src/practice_head.html', 'src/practice_app.js', True,  'ฝึกแผนที่เข็มทิศ ฉบับย่อ'),
    ('game.html',           'src/game_head.html',     'src/game_app.js',     False, 'ปฏิบัติการเข็มทิศ'),
    ('game-short.html',     'src/game_head.html',     'src/game_app.js',     True,  'ปฏิบัติการเข็มทิศ ฉบับย่อ'),
]
EXTRA_CSS = '[hidden]{display:none!important}body{margin:0}.homebtn{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:8px;border:1px solid var(--line);text-decoration:none;color:inherit;margin-right:6px;flex:none}'

def build(out, head, app, short, title):
    h = read(head)
    cut = h.index('</style>') + len('</style>')
    head_part, body_part = h[:cut], h[cut:]
    head_part = re.sub(r'<title>.*?</title>', '<title>%s</title>' % title, head_part, count=1)
    head_part = head_part.replace('</style>', EXTRA_CSS + '</style>', 1)
    if short:
        body_part = body_part.replace('<span>ฝึกแผนที่และเข็มทิศ</span>', '<span>ฝึกแผนที่และเข็มทิศ <small style="font-size:.7em;opacity:.7">ฉบับย่อ 30 นาที</small></span>')
        body_part = body_part.replace('<span>ปฏิบัติการ<em>เข็มทิศ</em></span>', '<span>ปฏิบัติการ<em>เข็มทิศ</em> <small style="font-size:.65em;opacity:.7">ย่อ 30 นาที</small></span>')
    body_part = body_part.replace('<div class="brand">', '<div class="brand"><a class="homebtn" href="./" aria-label="หน้าแรก" title="หน้าแรก">⌂</a>', 1)
    cfg = "const CFG={short:%s,web:true,form:{url:'',e:{}}};" % ('true' if short else 'false')
    html = ('<!doctype html>\n<html lang="th">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
            '<meta name="theme-color" content="#2f3d27">\n<link rel="manifest" href="manifest.webmanifest">\n'
            '<link rel="icon" href="icons/icon-192.png">\n<link rel="apple-touch-icon" href="icons/icon-192.png">\n'
            + head_part + '\n<script src="config.js"></script>\n</head>\n<body>\n' + body_part +
            '\n<script>\n(function(){\n\'use strict\';\n' + cfg + '\n' + read('src/core.js') + '\n' + read(app) +
            '\n})();\n</script>\n<script>if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("sw.js").catch(function(){});</script>\n</body>\n</html>\n')
    open(S(out), 'w', encoding='utf-8').write(html)
    print('built', out, len(html) // 1024, 'KB')

for p in PAGES:
    build(*p)
