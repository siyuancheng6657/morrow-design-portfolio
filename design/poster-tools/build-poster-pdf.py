from pathlib import Path
import json
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter
from pypdf.generic import RectangleObject

root = Path(__file__).resolve().parents[2]
sources = root / 'design' / 'poster-sources'
out = root / 'public' / 'posters'
layout = json.loads((sources / 'autumn-a3.json').read_text(encoding='utf-8'))
for name,file in [('SimSun','simsun.ttc'),('Microsoft YaHei','msyh.ttc'),('Georgia','georgia.ttf'),('Arial','arial.ttf')]:
    pdfmetrics.registerFont(TTFont(name,str(Path('C:/Windows/Fonts') / file)))
mm = 72/25.4
scale = mm / 6
bleed = 3*mm
page_w,page_h = 303*mm,426*mm
draft = sources / 'poster-pdf-intermediate.pdf'
final = out / 'autumn-a3.pdf'
c = canvas.Canvas(str(draft), pagesize=(page_w,page_h), pageCompression=1)
c.setTitle('MORROW 日常之间 | 秋日生活节 A3 概念海报')
c.setAuthor('MORROW 应聘作品 · 概念设计')
c.setSubject('A3 trim 297 x 420 mm with 3 mm bleed. RGB design proof.')
c.setFillColor(HexColor('#f5f2ec'))
c.rect(0,0,page_w,page_h,fill=1,stroke=0)
c.setFillColor(HexColor('#203a32'))
c.rect(0,0,page_w,bleed+278*scale,fill=1,stroke=0)
c.translate(bleed,bleed)
c.scale(scale,scale)
H=layout['h']
for o in layout['layers']:
    kind=o['kind']
    if kind != 'photo':
        c.setFillColor(HexColor(o['color']))
        c.setStrokeColor(HexColor(o['color']))
    if kind=='rect': c.rect(o['x'],H-o['y']-o['h'],o['w'],o['h'],fill=1,stroke=0)
    if kind=='line':
        c.setLineWidth(o['width']);c.line(o['x'],H-o['y'],o['x2'],H-o['y2'])
    if kind=='circle':
        c.setLineWidth(o['width']);c.circle(o['x'],H-o['y'],o['r'],stroke=1,fill=0)
    if kind=='text':
        t=c.beginText(o['x'],H-o['y']);t.setFont(o['font'],o['size']);t.setCharSpace(o['spacing']);t.textOut(o['text']);c.drawText(t)
    if kind=='photo':
        im=ImageReader(str(out/o['source']));iw,ih=im.getSize()
        s=max(o['w']/iw,o['h']/ih)
        x=o['x']+(o['w']-iw*s)/2
        y=H-o['y']-o['h']+(o['h']-ih*s)/2
        c.saveState();p=c.beginPath();p.rect(o['x'],H-o['y']-o['h'],o['w'],o['h']);c.clipPath(p,stroke=0,fill=0)
        c.drawImage(im,x,y,width=iw*s,height=ih*s,mask='auto');c.restoreState()
c.showPage();c.save()
reader=PdfReader(str(draft));writer=PdfWriter();writer.append(reader)
p=writer.pages[0]
p.trimbox=RectangleObject([bleed,bleed,page_w-bleed,page_h-bleed])
p.bleedbox=RectangleObject([0,0,page_w,page_h])
writer.add_metadata({'/Title':'MORROW 秋日生活节 A3 海报','/Subject':'297 x 420 mm trim; 3 mm bleed; RGB proof; conceptual campaign'})
with final.open('wb') as f:writer.write(f)
draft.unlink()
check=PdfReader(str(final));page=check.pages[0];text=page.extract_text()
assert '秋日生活节' in text and '10.01' in text and 'MORROW' in text
print(json.dumps({'pdf':str(final),'pages':len(check.pages),'trim_mm':[297,420],'bleed_mm':3,'extracted_text':text},ensure_ascii=False,indent=2))
