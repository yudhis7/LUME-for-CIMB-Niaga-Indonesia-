import pathlib
src = pathlib.Path('src')
css = (src/'styles.css').read_text()
js = '\n'.join((src/f).read_text() for f in ['ui.js','data.js','engine.js','views1.js','views2.js','views3.js','views4.js','phone.js','app.js'])
html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lume for CIMB Niaga</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
{css}
</style>
</head>
<body>
<div class="app">
  <header class="topbar" id="topbar"></header>
  <div class="body">
    <nav class="nav" id="nav" aria-label="Main"></nav>
    <main class="main" id="main"></main>
  </div>
</div>
<script>
"use strict";
{js}
</script>
</body>
</html>
'''
out = pathlib.Path('dist/lume-cimb-niaga.html'); out.write_text(html)
print(out, len(html)//1024, 'KB')
