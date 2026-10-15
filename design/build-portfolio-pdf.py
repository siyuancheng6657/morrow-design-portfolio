"""Build the five-page MORROW application portfolio from final local screenshots.

Usage: bundled Python design/build-portfolio-pdf.py
Screenshots are read from docs/previews and are never edited.
The PDF uses native vector typography and layout; source images are embedded.
"""
from pathlib import Path
from datetime import datetime
from io import BytesIO
import json
import os
from PIL import Image

from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
TEMP = Path(os.environ.get('TEMP', str(ROOT)))
OUT = ROOT / 'MORROW-作品集.pdf'
QA = TEMP / 'morrow-portfolio-pdf-qa'
QA.mkdir(exist_ok=True)

PAPER = '#f7f5f0'
GREEN = '#263d34'
CLAY = '#ac664b'
MUTED = '#777970'
LINE = '#dedfd7'
WHITE = '#ffffff'
W, H = 841.8898, 595.2756
M = 42

for name, filename in [
    ('Song', 'simsun.ttc'), ('Sans', 'msyh.ttc'),
    ('SansBold', 'msyhbd.ttc'), ('Georgia', 'georgia.ttf'),
    ('Arial', 'arial.ttf'),
]:
    pdfmetrics.registerFont(TTFont(name, str(Path('C:/Windows/Fonts') / filename)))

ASSETS = {
    'hero': ROOT / 'public/assets/hero.png',
    'desktop': ROOT / 'docs/previews/store-desktop.png',
    'mobile': ROOT / 'docs/previews/shop-mobile.png',
    'admin': ROOT / 'docs/previews/admin-desktop.png',
    'poster': ROOT / 'public/posters/autumn-a3.png',
    'social': ROOT / 'public/posters/autumn-social.png',
}
for key, file in ASSETS.items():
    if not file.exists():
        raise FileNotFoundError(f'Missing {key}: {file}')

c = canvas.Canvas(str(OUT), pagesize=(W, H), pageCompression=1)
c.setTitle('MORROW 日常之间 | 家居生活方式商城应聘作品集')
c.setAuthor('MORROW 概念项目')
c.setSubject('商城网站设计、运营系统 UI、活动海报与前端实现；独立概念作品')
layout_checks = []
pdf_image_cache = {}


def fill(color):
    c.setFillColor(HexColor(color))


def box(x, y, width, height, color, radius=0, stroke=None):
    fill(color)
    if stroke:
        c.setStrokeColor(HexColor(stroke))
        c.setLineWidth(.6)
    if radius:
        c.roundRect(x, H-y-height, width, height, radius, fill=1, stroke=bool(stroke))
    else:
        c.rect(x, H-y-height, width, height, fill=1, stroke=bool(stroke))


def line(x1, y1, x2, y2, color=LINE, thickness=.6):
    c.setStrokeColor(HexColor(color))
    c.setLineWidth(thickness)
    c.line(x1, H-y1, x2, H-y2)


def text(value, x, top, size=11, font='Sans', color=GREEN, tracking=0):
    fill(color)
    t = c.beginText(x, H-top-size)
    t.setFont(font, size)
    t.setCharSpace(tracking)
    t.textOut(value)
    c.drawText(t)
    measured = pdfmetrics.stringWidth(value, font, size) + max(0, len(value)-1)*tracking
    layout_checks.append({'page': c.getPageNumber(), 'text': value, 'x': x,
                          'top': top, 'right': x+measured, 'bottom': top+size})


def paragraph(value, x, top, width, size=10, leading=17, font='Sans', color=MUTED):
    cursor = top
    for part in value.split('\n'):
        line_text = ''
        for ch in part:
            proposal = line_text + ch
            if line_text and pdfmetrics.stringWidth(proposal, font, size) > width:
                text(line_text, x, cursor, size, font, color)
                cursor += leading
                line_text = ch
            else:
                line_text = proposal
        if line_text:
            text(line_text, x, cursor, size, font, color)
        cursor += leading
    return cursor


def image(path, x, top, width, height, mode='cover', anchor='center'):
    # Optimize only the raster encoding embedded in the PDF. Source files stay intact.
    # 180 ppi and high-quality 4:4:4 JPEG retain screenshot legibility at layout size.
    source = Image.open(path)
    iw, ih = source.size
    scale = min(width/iw, height/ih) if mode == 'contain' else max(width/iw, height/ih)
    dw, dh = iw*scale, ih*scale
    desired = min(1, max(dw*2.5/iw, dh*2.5/ih))
    key = (str(path), round(desired, 4))
    if key not in pdf_image_cache:
        embedded = source.convert('RGB')
        if desired < 1:
            embedded = embedded.resize((round(iw*desired), round(ih*desired)), Image.Resampling.LANCZOS)
        buffer = BytesIO()
        embedded.save(buffer, format='JPEG', quality=94, subsampling=0, optimize=True)
        buffer.seek(0)
        pdf_image_cache[key] = ImageReader(buffer)
    reader = pdf_image_cache[key]
    dx = x + (width-dw)/2
    dy = H-top-height + (height-dh)/2
    if anchor == 'top':
        dy = H-top-dh
    c.saveState()
    clip = c.beginPath()
    clip.rect(x, H-top-height, width, height)
    c.clipPath(clip, stroke=0, fill=0)
    c.drawImage(reader, dx, dy, width=dw, height=dh, mask='auto')
    c.restoreState()


def browser_frame(path, x, top, width, height, label):
    box(x, top+3, width, height, '#e8e6de', radius=3)
    box(x, top, width, height, WHITE, radius=3, stroke=LINE)
    box(x+.6, top+.6, width-1.2, 19, '#efeee7', radius=2)
    for j, color in enumerate(['#c3c5b9', '#d1c3af', '#b9c4b7']):
        fill(color)
        c.circle(x+10+j*7, H-top-10, 1.8, fill=1, stroke=0)
    text(label, x+43, top+5, 6.5, 'Sans', MUTED)
    image(path, x+.6, top+20, width-1.2, height-20.6, 'cover', 'top')


def base(page, label=None, title=None, subtitle=None):
    box(0, 0, W, H, PAPER)
    if label:
        text(label, M, 27, 8.5, 'Arial', CLAY, .75)
    if title:
        text(title, M, 51, 27, 'Song')
    if subtitle:
        text(subtitle, M, 95, 9.5, 'Sans', MUTED)
    line(M, 566, W-M, 566)
    text('MORROW  /  日常之间', M, 576, 7.5, 'Sans', MUTED)
    text('独立概念作品 · 2026', 361, 576, 7.5, 'Sans', MUTED)
    text(f'{page:02d} / 05', W-M-35, 576, 7.5, 'Arial', MUTED)


def next_page():
    c.showPage()


# 01 — A quiet editorial cover, with the actual project hero visual.
box(0, 0, W, H, PAPER)
image(ASSETS['hero'], 405, 0, W-405, H, 'cover')
text('DESIGN × FRONTEND', 42, 35, 9, 'Arial', CLAY, 1)
text('MORROW', 38, 108, 62, 'Georgia')
text('日常之间', 43, 190, 26, 'Song')
line(44, 244, 346, 244)
text('把日常的美好，', 42, 276, 25, 'Song')
text('做成可以体验的作品。', 42, 315, 25, 'Song')
paragraph('家居生活方式品牌\n商城、系统 UI 与活动视觉的一体化设计。', 44, 373, 308, 10.5, 20)
for x, y, code, title in [
    (44,451,'01','商城网站'), (211,451,'02','系统 UI'),
    (44,483,'03','线下海报'), (211,483,'04','编辑维护'),
]:
    text(code, x, y+1, 8.5, 'Arial', CLAY)
    text(title, x+23, y, 10, 'Sans')
text('应聘作品集  /  独立概念项目  /  2026.09', 44, 552, 8, 'Sans', MUTED)
box(650, 28, 157, 30, PAPER)
text('A SLOWER EVERYDAY', 666, 38, 8, 'Arial', GREEN, .3)
next_page()


# 02 — Desktop hierarchy and a real narrow-screen layout.
base(2, '01 / COMMERCE DESIGN', '从看到喜欢，到完成一次购物。',
     '天然材质与克制留白建立品牌气质；清楚的商品信息和反馈，让浏览自然进入购物。')
browser_frame(ASSETS['desktop'], 42, 126, 524, 372, 'MORROW 商城首页 · 桌面实际页面')
box(625, 123, 147, 373, GREEN, radius=13)
box(629, 127, 139, 365, WHITE, radius=10)
image(ASSETS['mobile'], 632, 134, 133, 350, 'cover', 'top')
text('390 px / 移动布局', 647, 503, 8.5, 'Sans', MUTED)
for x, title, body in [
    (44, '信息有层次', '场景首屏、服务提示与开放式商品陈列。'),
    (298, '购物有反馈', '分类搜索、详情、购物袋、演示订单。'),
    (554, '窄屏有取舍', '主视觉上下重排，商品保持两列。'),
]:
    text(title, x, 521, 10.5, 'SansBold')
    text(body, x, 540, 8.3, 'Sans', MUTED)
next_page()


# 03 — Operator UI as a stateful workflow, rather than a static mockup.
base(3, '02 / OPERATIONS UI', '让内容维护，成为一条完整工作流。',
     '面向日常编辑：寻找商品、修改内容、检查反馈，再回到商城查看变化。')
browser_frame(ASSETS['admin'], 42, 126, 531, 382, 'MORROW STUDIO · 商品管理实际页面')
for y, number, title, description in [
    (142, '01', '商品管理', '新增与编辑商品、价格和库存。\n上下架后，商城展示同步变化。'),
    (256, '02', '首页内容', '维护活动公告、主标题与说明。\n保存有反馈，修改可持久保留。'),
    (370, '03', '订单与导出', '查看演示订单，导出商品 CSV。\n数据可以检查，也可以复核。'),
]:
    text(number, 604, y, 9, 'Arial', CLAY)
    text(title, 630, y-3, 13, 'SansBold')
    paragraph(description, 604, y+30, 188, 10, 18)
for x, label in [(43, '编辑商品'), (296, '保存到浏览器'), (570, '商城同步更新')]:
    box(x, 524, 208, 28, '#ecece3')
    text(label, x+17, 532, 9, 'Sans')
text('→', 267, 531, 13, 'Sans', CLAY)
text('→', 532, 531, 13, 'Sans', CLAY)
next_page()


# 04 — Real poster previews and genuine editable-source boundaries.
base(4, '03 / CAMPAIGN DESIGN', '让线上与线下，说同一种视觉语言。',
     '「秋日生活节」概念活动 · 10.01—10.07 · 让日常，慢下来。')
box(44, 125, 239, 338, '#e7e4da')
image(ASSETS['poster'], 42, 122, 239, 338, 'contain')
image(ASSETS['social'], 319, 122, 479, 269.4375, 'contain')
text('A3 主海报 / 清楚呈现主题与日期', 43, 477, 9, 'Sans')
text('社媒横版 / 重新组织画面与阅读顺序', 320, 407, 11, 'SansBold')
paragraph('同一组字体、摄影与色彩，适配不同的信息场景。\n排版与文字独立编辑，保留主视觉的完整原图。', 320, 436, 463, 10, 18)
line(319, 483, 798, 483)
text('PSD  /  SVG  /  PNG  /  PDF', 320, 497, 10, 'Arial', CLAY)
text('竖版 19 层 · 14 个文字层    横版 13 层 · 9 个文字层', 320, 519, 9, 'Sans')
text('A3 裁切 297 × 420 mm，含 3 mm 出血。', 43, 510, 8.5, 'Sans', MUTED)
text('RGB 打样稿；量产前需高分辨率素材与印厂校色。', 43, 530, 8.1, 'Sans', MUTED)
next_page()


# 05 — Reproducible delivery, test coverage, and a short interview route.
base(5, '04 / DESIGN SYSTEM & DELIVERY', '把设计，交付成可以打开的体验。')
for x, color, label, hexcode in [
    (43, PAPER, '暖纸', '#F7F5F0'), (149, GREEN, '森林绿', '#263D34'),
    (255, CLAY, '陶土', '#AC664B'),
]:
    box(x, 116, 88, 46, color, stroke=LINE if color==PAPER else None)
    text(label, x, 173, 9, 'Sans')
    text(hexcode, x, 190, 8, 'Arial', MUTED)
text('让日常，慢下来。', 42, 234, 25, 'Song')
paragraph('展示字保留温度，操作字保证清楚。\n间距、按钮、线性图标与状态反馈沿用同一套规则。', 43, 277, 317, 9.5, 18)
box(42, 334, 331, 138, GREEN)
text('一份可以继续修改的交付', 60, 350, 13, 'Song', PAPER)
for y, title, detail in [
    (383, '离线入口', '双击打开作品，保留完整 dist 文件夹'),
    (405, '前端源码', 'React + Vite · HTML / CSS / JS'),
    (427, '设计源稿', '分层 PSD、SVG 与制作说明'),
    (449, '演示文档', '操作路径、测试记录与面试讲解稿'),
]:
    text(title, 60, y, 8.5, 'Sans', '#c9d4c8')
    text(detail, 116, y, 8.5, 'Sans', PAPER)

text('3 分钟演示路线', 421, 119, 21, 'Song')
line(429, 193, 429, 419, '#c6cabe', 1)
for top, time, title, desc in [
    (174, '00:00', '商城与购物', '浏览首页 → 搜索与详情 → 加入购物袋\n生成一笔演示订单，查看回执。'),
    (272, '01:00', '运营与同步', '进入后台 → 修改商品或上下架\n返回商城，核对展示变化。'),
    (370, '02:00', '海报与源文件', '说明两版构图与印前边界\n打开编辑源稿，展示交付结构。'),
]:
    fill(CLAY);c.circle(429, H-top-11, 3.5, fill=1, stroke=0)
    text(time, 448, top, 10, 'Georgia', CLAY)
    text(title, 504, top-2, 12, 'SansBold')
    paragraph(desc, 448, top+31, 335, 9.5, 18)

line(43, 492, 797, 492)
text('实际验证', 43, 504, 9, 'SansBold')
text('Edge 152.0.4191.66 / IAB + Playwright；320、390、768、1440 px 无页面横溢出。', 103, 504, 8.5, 'Sans', MUTED)
text('购物整单、后台同步、真实 file:// 离线零外部请求通过。Firefox / Safari / Photoshop 未做实机验收。', 43, 526, 8.5, 'Sans', MUTED)
text('品牌、商品与订单均为概念演示；图片由 AI 辅助生成，不代表真实商业经历。', 43, 544, 7.5, 'Sans', MUTED)
next_page()

c.save()

# Structural validation is separate from the required visual render review.
reader = PdfReader(str(OUT))
assert len(reader.pages) == 5, 'Expected exactly five pages'
expected = ['MORROW', '完成一次购物', '完整工作流', '同一种视觉语言', '可以打开的体验']
for i, (page, token) in enumerate(zip(reader.pages, expected), 1):
    body = page.extract_text()
    assert token in body, f'Page {i} missing expected text'
    assert abs(float(page.mediabox.width)-W)<.01 and abs(float(page.mediabox.height)-H)<.01
for item in layout_checks:
    assert item['right'] < W-20, f'Text leaves page at {item}'
    assert item['bottom'] < H-4, f'Text leaves page at {item}'
report = {
    'output': str(OUT), 'pages': len(reader.pages), 'bytes': OUT.stat().st_size,
    'built_at': datetime.now().isoformat(),
    'sources': {key: {'path': str(p), 'mtime': datetime.fromtimestamp(p.stat().st_mtime).isoformat()} for key,p in ASSETS.items()},
    'structural_checks': 'PASS: 5 pages; expected Chinese text; A4 landscape; text within page bounds',
    'visual_review': 'Render all five pages with Poppler and inspect after final screenshot refresh.',
}
(QA/'build-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'pages': report['pages'], 'bytes': report['bytes'], 'report': str(QA/'build-report.json')},ensure_ascii=False))
