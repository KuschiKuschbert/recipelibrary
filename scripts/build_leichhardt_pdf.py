#!/usr/bin/env python3
"""Build the one-page trial sheet from the same source as the Leichhardt page."""
import html
import json
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parents[1]
PAGE_W, PAGE_H = A4
MARGIN, GAP = 22, 16
COL_W = (PAGE_W - 2 * MARGIN - GAP) / 2


def text(value):
    return html.escape(str(value).replace('–', '-').replace('—', '-'))


def para(c, value, x, y, width, size=7.5, bold=False, gap=2):
    style = ParagraphStyle('trial', fontName='Helvetica-Bold' if bold else 'Helvetica',
                           fontSize=size, leading=size * 1.16, spaceAfter=0)
    p = Paragraph(text(value), style)
    _, height = p.wrap(width, PAGE_H)
    if c:
        p.drawOn(c, x, y - height)
    return y - height - gap


def component(c, group, x, y, width, size):
    y = para(c, group['name'], x, y, width, size + .2, bold=True, gap=3)
    qty_width = 38 if width < 150 else 69
    for ingredient, qty in group['ingredients']:
        a = para(c, ingredient, x, y, width - qty_width - 6, size, gap=1)
        b = para(c, qty, x + width - qty_width, y, qty_width, size, gap=1)
        y = min(a, b)
    return y - 5


def recipe_body(c, recipe, x, y, size, split):
    y = para(c, 'Ingredients (1 serve)', x, y, COL_W, 9, bold=True, gap=5)
    groups = recipe['components']
    if split:
        half = (COL_W - 10) / 2
        left_y = right_y = y
        for group in groups[:3]:
            left_y = component(c, group, x, left_y, half, size)
        for group in groups[3:]:
            right_y = component(c, group, x + half + 10, right_y, half, size)
        y = min(left_y, right_y)
    else:
        for group in groups:
            y = component(c, group, x, y, COL_W, size)
    y = para(c, 'Method', x, y - 3, COL_W, 9, bold=True, gap=4)
    for i, step in enumerate(recipe['method'], 1):
        y = para(c, f'{i}. {step}', x, y, COL_W, size, gap=3)
    y = para(c, 'Key points', x, y - 4, COL_W, 9, bold=True, gap=4)
    return para(c, ' '.join(recipe['key_points']), x, y, COL_W, size)


def main():
    data = json.loads((ROOT / 'leichhardt_data/cook_off.json').read_text())
    output = ROOT / data['pdf']
    body_top = 547
    size = 7.6
    while size >= 6.8:
        bottoms = [recipe_body(None, r, 0, body_top, size, i == 1) for i, r in enumerate(data['recipes'])]
        if min(bottoms) >= 26:
            break
        size = round(size - .1, 1)
    else:
        raise ValueError('Recipe content no longer fits one page; revise the layout.')
    c = canvas.Canvas(str(output), pagesize=A4, pageCompression=1)
    c.setTitle('Leichhardt Hotel - Trial Dishes')
    c.setAuthor('Daniel Kuschmierz')
    c.setSubject('Cook Off: barramundi and eye fillet with fried onion slices')
    para(c, 'Leichhardt Hotel - Trial Dishes', MARGIN, PAGE_H - 20, 430, 17, bold=True)
    para(c, 'Daniel Kuschmierz', PAGE_W - 119, PAGE_H - 22, 100, 8)
    para(c, '06/09/2026', PAGE_W - 119, PAGE_H - 34, 100, 8)
    c.setStrokeColorRGB(.5, .5, .5)
    c.setLineWidth(.4)
    c.line(MARGIN, PAGE_H - 53, PAGE_W - MARGIN, PAGE_H - 53)
    c.line(PAGE_W / 2, PAGE_H - 53, PAGE_W / 2, 22)
    for i, recipe in enumerate(data['recipes']):
        x = MARGIN + i * (COL_W + GAP)
        y = para(c, f'Dish {i + 1} - {recipe["name"]}', x, PAGE_H - 61, COL_W, 12, bold=True, gap=3)
        y = para(c, recipe['subtitle'], x, y, COL_W, 9, bold=True, gap=4)
        para(c, recipe['description'], x, y, COL_W, 8)
        vx, vy, vw, vh = map(float, recipe['plating_viewbox'].split())
        picture_h = 158
        scale = picture_h / vh
        picture_w = vw * scale
        picture_x, picture_top = x + (COL_W - picture_w) / 2, 724
        c.saveState()
        clip = c.beginPath()
        clip.rect(picture_x, picture_top - picture_h, picture_w, picture_h)
        c.clipPath(clip, stroke=0, fill=0)
        c.drawImage(str(ROOT / data['plating_sheet']), picture_x - vx * scale,
                    picture_top + vy * scale - 1536 * scale, width=1024 * scale, height=1536 * scale)
        c.restoreState()
        if recipe.get('plating_note'):
            para(c, recipe['plating_note'], x, 563, COL_W, 6.8)
        recipe_body(c, recipe, x, body_top, size, i == 1)
    c.showPage()
    c.save()
    print(f'Built {output.name}: 1 page, {size:g} pt ingredients/method, minimum bottom {min(bottoms):.1f} pt')


if __name__ == '__main__':
    main()
