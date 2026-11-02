"""Builds docs/Lume-User-Guide.pdf from docs/USER_GUIDE.md.
Needs: pip install markdown, and Node with Playwright (Chromium).
Run from the repository root:  python3 docs/tools/build_pdf.py"""
import pathlib, re, subprocess, markdown

DOCS = pathlib.Path(__file__).resolve().parents[1]
REPO_URL = 'https://github.com/yudhis7/LUME-for-CIMB-Niaga-Indonesia-/blob/main/'
CSS = """
@page { size: A4; }
body { font-family: "Plus Jakarta Sans", "Segoe UI", system-ui, -apple-system, sans-serif; color: #131a27; font-size: 10.5pt; line-height: 1.5; }
h1 { font-size: 24pt; color: #1668e3; margin: 0 0 4pt; }
h2 { font-size: 16pt; color: #1668e3; border-bottom: 2px solid #e4e8ef; padding-bottom: 4pt; margin-top: 18pt; break-after: avoid; break-before: page; }
h2#contents { break-before: auto; }
h3 { font-size: 12.5pt; margin-top: 14pt; break-after: avoid; }
p, li { orphans: 3; widows: 3; }
img { max-width: 100%; max-height: 205mm; display: block; margin: 8pt auto; border: 1px solid #d3d9e3; border-radius: 6px; break-inside: avoid; }
table { border-collapse: collapse; width: 100%; font-size: 9.5pt; margin: 8pt 0; }
th, td { border: 1px solid #e4e8ef; padding: 4pt 6pt; vertical-align: top; text-align: left; }
th { background: #f3f5f9; }
td img { max-height: 120mm; }
blockquote { margin: 8pt 0; padding: 6pt 10pt; background: #fff5dc; border-left: 4px solid #fab219; }
code { background: #f3f5f9; padding: 1px 4px; border-radius: 3px; font-size: 9pt; }
pre { background: #f3f5f9; padding: 8pt; border-radius: 6px; white-space: pre-wrap; }
a { color: #0f4fb3; text-decoration: none; }
hr { display: none; }
ol li, ul li { margin: 2pt 0; }
"""
PDF_JS = r"""
const { chromium } = require('playwright');
(async () => {
  const [src, out] = process.argv.slice(1);
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + src, { waitUntil: 'load' }); await p.waitForTimeout(500);
  await p.pdf({ path: out, format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:8px;color:#8790a3;width:100%;padding:0 14mm;display:flex;justify-content:space-between"><span>Lume for CIMB Niaga · User Guide · v1.0.0</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
    margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' } });
  await b.close();
})();
"""

md = (DOCS / 'USER_GUIDE.md').read_text()
md = re.sub(r'\]\(\.\./([^)]+)\)', lambda m: '](' + REPO_URL + m.group(1) + ')', md)  # repo links → GitHub
md = re.sub(r'(?m)^   (?=\S)', '    ', md)  # python-markdown needs 4-space list nesting
# python-markdown also needs a blank line before a list item that follows indented content
lines, fixed = md.split('\n'), []
for i, line in enumerate(lines):
    if re.match(r'^(\d+\.|-) ', line) and fixed and fixed[-1].startswith('    ') and fixed[-1].strip():
        fixed.append('')
    fixed.append(line)
md = '\n'.join(fixed)
html = markdown.markdown(md, extensions=['tables', 'fenced_code', 'toc', 'sane_lists'])
cover = '<div style="text-align:center;margin:40mm 0 16mm"><img src="icon.png" style="width:90px;border:0;margin:0 auto 14pt"></div>'
tmp = DOCS / '_guide_print.html'
tmp.write_text(f'<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lume for CIMB Niaga · User Guide</title><style>{CSS}</style></head><body>{cover}{html}</body></html>')
try:
    subprocess.run(['node', '-e', PDF_JS, str(tmp), str(DOCS / 'Lume-User-Guide.pdf')], check=True)
finally:
    tmp.unlink(missing_ok=True)
print('wrote', DOCS / 'Lume-User-Guide.pdf')
