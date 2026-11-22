"""Genera el PDF del informe. Requiere Python y reportlab."""

from html import escape
from pathlib import Path
import re

from reportlab.lib import colors
from reportlab.graphics.shapes import Drawing, Line, Polygon, Rect, String
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    PageBreak, Paragraph, Preformatted, SimpleDocTemplate, Spacer, Table, TableStyle,
)


ROOT = Path(__file__).resolve().parent
INK = colors.HexColor("#182C31")
TEAL = colors.HexColor("#14594F")
PALE = colors.HexColor("#EEF6F3")
BODY = ParagraphStyle("body", fontName="Helvetica", fontSize=10, leading=14,
                      textColor=INK, spaceAfter=8)
CELL = ParagraphStyle("cell", parent=BODY, fontSize=9, leading=12, spaceAfter=0)
TITLE = ParagraphStyle("title", parent=BODY, fontName="Helvetica-Bold",
                       fontSize=42, leading=48, textColor=TEAL, spaceAfter=16)
HEADING = ParagraphStyle("heading", parent=BODY, fontName="Helvetica-Bold",
                         fontSize=18, leading=22, textColor=TEAL, spaceBefore=8, spaceAfter=12)
SUB = ParagraphStyle("sub", parent=HEADING, fontSize=12, leading=15, spaceAfter=5)
CODE = ParagraphStyle("code", parent=BODY, fontName="Courier", fontSize=8.5,
                      leading=11, backColor=PALE, borderPadding=7, spaceBefore=4)


def inline(value):
    value = escape(value.replace("📍", "Pin").replace("−", "-").replace("→", "a"))
    value = re.sub(r"`([^`]+)`", r'<font name="Courier">\1</font>', value)
    return re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", value)


def table(rows):
    fractions = {
        2: (0.74, 0.26) if rows[0][1] == "Página" else (0.24, 0.76),
        3: (0.23, 0.34, 0.43),
        5: (0.36, 0.22, 0.15, 0.08, 0.19),
    }[len(rows[0])]
    cells = [[Paragraph(inline(cell), CELL) for cell in row] for row in rows]
    result = Table(cells, colWidths=[485 * share for share in fractions],
                   repeatRows=1, hAlign="LEFT")
    result.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#D6E9E3")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, 0), 0.6, TEAL),
    ]))
    return result


def integration_diagram():
    diagram = Drawing(473, 96)
    layers = [
        ("Android WebView", "UI y repositorio JS"),
        ("Puente Android", "HTTP local por ADB"),
        ("Express", "Controlador y servicio"),
        ("SQLite", "Repositorio de datos"),
    ]
    for index, (name, detail) in enumerate(layers):
        left = index * 123
        diagram.add(Rect(left, 28, 104, 47, rx=5, ry=5, fillColor=PALE, strokeColor=TEAL))
        diagram.add(String(left + 52, 57, name, fontName="Helvetica-Bold",
                           fontSize=9, fillColor=TEAL, textAnchor="middle"))
        diagram.add(String(left + 52, 41, detail, fontSize=8,
                           fillColor=INK, textAnchor="middle"))
        if index < len(layers) - 1:
            diagram.add(Line(left + 104, 51, left + 119, 51, strokeColor=TEAL))
            diagram.add(Polygon([left + 119, 54, left + 119, 48, left + 123, 51],
                                strokeColor=None, fillColor=TEAL))
    diagram.add(String(0, 10, "Figura 1. Recorrido de una solicitud de Viajes en la demo.",
                       fontSize=8, fillColor=INK))
    return diagram


def flowables(source):
    lines = iter(source.splitlines())
    paragraph, rows = [], []

    def flush():
        if paragraph:
            yield Paragraph("<br/>".join(inline(line) for line in paragraph), BODY)
            paragraph.clear()
        if rows:
            yield table(rows)
            yield Spacer(1, 9)
            rows.clear()

    for line in lines:
        if line.startswith("|"):
            if paragraph:
                yield from flush()
            cells = [cell.strip() for cell in line.strip("|").split("|")]
            if not all(re.fullmatch(r"[-: ]+", cell) for cell in cells):
                rows.append(cells)
        elif line.startswith("```"):
            yield from flush()
            code = []
            for item in lines:
                if item.startswith("```"):
                    break
                code.append(item.replace("📍", "Pin"))
            yield Preformatted("\n".join(code), CODE, maxLineLength=94)
        elif line == "<!-- pagina -->":
            yield from flush()
            yield PageBreak()
        elif line == "<!-- diagrama -->":
            yield from flush()
            yield integration_diagram()
        elif line.startswith("#"):
            yield from flush()
            marker, title = line.split(" ", 1)
            if marker == "#":
                yield Spacer(1, 125)
            yield Paragraph(inline(title), {"#": TITLE, "##": HEADING, "###": SUB}[marker])
        elif line.startswith("- "):
            yield from flush()
            yield Paragraph("• " + inline(line[2:]), BODY)
        elif line.strip():
            if rows:
                yield from flush()
            paragraph.append(line.strip())
        else:
            yield from flush()
    yield from flush()


def decorate(canvas, doc):
    width, height = A4
    canvas.setFillColor(TEAL)
    canvas.rect(0, height - 8, width, 8, fill=1, stroke=0)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(55, height - 33, "WOOLOO  /  INGT1003  /  HITO 3")
    canvas.drawRightString(width - 55, 31, str(doc.page))


def main():
    source = (ROOT / "INFORME-FINAL-HITO-3.md").read_text(encoding="utf-8")
    doc = SimpleDocTemplate(str(ROOT / "INFORME-FINAL-HITO-3.pdf"), pagesize=A4,
                            title="Wooloo | Informe final del Hito 3", author="Francisco Lizama y Victor Vejar",
                            leftMargin=55, rightMargin=55, topMargin=57, bottomMargin=50)
    doc.build(list(flowables(source)), onFirstPage=decorate, onLaterPages=decorate)


if __name__ == "__main__":
    main()
