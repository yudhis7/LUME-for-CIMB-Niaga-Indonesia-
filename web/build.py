import pathlib, sys, base64, json
src = pathlib.Path('src')
# Editions: the default build is neutral Lume; `--edition cimb` adds the CIMB Niaga logo and sign-in (desktop apps).
edition = sys.argv[sys.argv.index('--edition') + 1] if '--edition' in sys.argv else 'default'
def data_uri(path):
    return 'data:image/png;base64,' + base64.b64encode(pathlib.Path(path).read_bytes()).decode()
if edition == 'cimb':
    EDITION = {'id': 'cimb', 'signin': True, 'logo': data_uri('brand/cimb-niaga-logo.png'), 'symbol': data_uri('brand/cimb-niaga-symbol.png')}
    out_name, body_class = 'dist/lume-cimb-niaga-desktop.html', 'ed-cimb'
else:
    EDITION, out_name, body_class = {}, 'dist/lume-cimb-niaga.html', ''
css = (src/'styles.css').read_text()
js = '\n'.join((src/f).read_text() for f in ['ui.js','data.js','engine.js','views1.js','views2.js','views3.js','views4.js','phone.js','signin.js','app.js'])
html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{'Lume · CIMB Niaga' if EDITION else 'Lume for CIMB Niaga'}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
{css}
</style>
</head>
<body class="{body_class}">
<div class="app">
  <header class="topbar" id="topbar"></header>
  <div class="body">
    <nav class="nav" id="nav" aria-label="Main"></nav>
    <main class="main" id="main"></main>
  </div>
</div>
<script>
"use strict";
const EDITION = {json.dumps(EDITION)};
{js}
</script>
</body>
</html>
'''
out = pathlib.Path(out_name); out.write_text(html)
print(out, len(html)//1024, 'KB')
