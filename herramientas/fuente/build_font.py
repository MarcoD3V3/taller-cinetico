# Construye «Taller Pixel», la fuente pixel art de Taller Cinético (TTF + WOFF).
# Cada glifo es una cuadrícula de píxeles: filas de arriba abajo, «#» = píxel. yoff = fila de abajo respecto
# a la línea base (0 = apoya en la base, -2 = baja dos píxeles). Mayúsculas de 7 px, minúsculas de 5 px.
import sys, os
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

P = 100            # tamaño de un píxel en unidades de la fuente
UPM = 1000         # 1 em = 10 píxeles: a 10 px, 20 px… se ve nítida
ASC, DESC = 10, 2  # 10 píxeles por encima (tildes de las mayúsculas) y 2 por debajo

G = {}
def g(ch, rows, yoff=0, adv=None):
    rows = [r for r in rows.split()] if isinstance(rows, str) else rows
    G[ch] = (rows, yoff, adv)

# ---------- Mayúsculas ----------
g('A', '.###. #...# #...# ##### #...# #...# #...#')
g('B', '####. #...# #...# ####. #...# #...# ####.')
g('C', '.###. #...# #.... #.... #.... #...# .###.')
g('D', '####. #...# #...# #...# #...# #...# ####.')
g('E', '##### #.... #.... ####. #.... #.... #####')
g('F', '##### #.... #.... ####. #.... #.... #....')
g('G', '.###. #...# #.... #.### #...# #...# .####')
g('H', '#...# #...# #...# ##### #...# #...# #...#')
g('I', '### .#. .#. .#. .#. .#. ###')
g('J', '..### ...#. ...#. ...#. #..#. #..#. .##..')
g('K', '#...# #..#. #.#.. ##... #.#.. #..#. #...#')
g('L', '#.... #.... #.... #.... #.... #.... #####')
g('M', '#...# ##.## #.#.# #.#.# #...# #...# #...#')
g('N', '#...# ##..# #.#.# #..## #...# #...# #...#')
g('O', '.###. #...# #...# #...# #...# #...# .###.')
g('P', '####. #...# #...# ####. #.... #.... #....')
g('Q', '.###. #...# #...# #...# #.#.# #..#. .##.#')
g('R', '####. #...# #...# ####. #.#.. #..#. #...#')
g('S', '.#### #.... #.... .###. ....# ....# ####.')
g('T', '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..')
g('U', '#...# #...# #...# #...# #...# #...# .###.')
g('V', '#...# #...# #...# #...# #...# .#.#. ..#..')
g('W', '#...# #...# #...# #.#.# #.#.# #.#.# .#.#.')
g('X', '#...# #...# .#.#. ..#.. .#.#. #...# #...#')
g('Y', '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..')
g('Z', '##### ....# ...#. ..#.. .#... #.... #####')
# ---------- Minúsculas ----------
g('a', '.###. ....# .#### #...# .####')
g('b', '#.... #.... ####. #...# #...# #...# ####.')
g('c', '.###. #.... #.... #.... .###.')
g('d', '....# ....# .#### #...# #...# #...# .####')
g('e', '.###. #...# ##### #.... .###.')
g('f', '..## .#.. #### .#.. .#.. .#.. .#..')
g('g', '.#### #...# #...# #...# .#### ....# .###.', -2)
g('h', '#.... #.... ####. #...# #...# #...# #...#')
g('i', '# . # # # # #')
g('j', '..# ... ..# ..# ..# ..# ..# ..# ##.', -2)
g('k', '#... #... #..# #.#. ##.. #.#. #..#')
g('l', '#. #. #. #. #. #. .#')
g('m', '##.#. #.#.# #.#.# #.#.# #.#.#')
g('n', '####. #...# #...# #...# #...#')
g('o', '.###. #...# #...# #...# .###.')
g('p', '####. #...# #...# #...# ####. #.... #....', -2)
g('q', '.#### #...# #...# #...# .#### ....# ....#', -2)
g('r', '#.##. ##..# #.... #.... #....')
g('s', '.#### #.... .###. ....# ####.')
g('t', '.#.. .#.. #### .#.. .#.. .#.. ..##')
g('u', '#...# #...# #...# #...# .####')
g('v', '#...# #...# #...# .#.#. ..#..')
g('w', '#...# #...# #.#.# #.#.# .#.#.')
g('x', '#...# .#.#. ..#.. .#.#. #...#')
g('y', '#...# #...# #...# #...# .#### ....# .###.', -2)
g('z', '##### ...#. ..#.. .#... #####')
# ---------- Números ----------
g('0', '.###. #...# #..## #.#.# ##..# #...# .###.')
g('1', '..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.')
g('2', '.###. #...# ....# ...#. ..#.. .#... #####')
g('3', '####. ....# ....# .###. ....# ....# ####.')
g('4', '...#. ..##. .#.#. #..#. ##### ...#. ...#.')
g('5', '##### #.... ####. ....# ....# #...# .###.')
g('6', '.###. #.... #.... ####. #...# #...# .###.')
g('7', '##### ....# ...#. ..#.. .#... .#... .#...')
g('8', '.###. #...# #...# .###. #...# #...# .###.')
g('9', '.###. #...# #...# .#### ....# ....# .###.')
# ---------- Signos ----------
g('!', '# # # # # . #')
g('¡', '# . # # # # #', -2)
g('?', '.###. #...# ....# ...#. ..#.. ..... ..#..')
g('¿', '..#.. ..... ..#.. .#... #.... #...# .###.', -2)
g('.', '#')
g(',', '.# #.', -1)
g(':', '# . . #')
g(';', '.# .. .. .# #.', -1)
g("'", '# #', 5)
g('"', '#.# #.#', 5)
g('‘', '.# #.', 5); g('’', '.# #.', 5); g('“', '.#.# #.#.', 5); g('”', '.#.# #.#.', 5)
g('-', '###', 3)
g('–', '####', 3)
g('—', '######', 3)
g('_', '#####', -1)
g('(', '.# #. #. #. #. #. #. .#', -1)
g(')', '#. .# .# .# .# .# .# #.', -1)
g('[', '## #. #. #. #. #. #. ##', -1)
g(']', '## .# .# .# .# .# .# ##', -1)
g('{', '.## .#. .#. #.. .#. .#. .#. .##', -1)
g('}', '##. .#. .#. ..# .#. .#. .#. ##.', -1)
g('/', '..# ..# .#. .#. .#. #.. #..')
g('\\', '#.. #.. .#. .#. .#. ..# ..#')
g('|', '# # # # # # # #', -1)
g('+', '..#.. ..#.. ##### ..#.. ..#..', 1)
g('=', '#### .... ####', 2)
g('*', '#.# .#. #.#', 3)
g('<', '..# .#. #.. .#. ..#', 1)
g('>', '#.. .#. ..# .#. #..', 1)
g('%', '##... ##..# ...#. ..#.. .#... #..## ...##')
g('&', '.##.. #..#. #.#.. .#... #.#.# #..#. .##.#')
g('#', '.#.#. ##### .#.#. .#.#. ##### .#.#.')
g('$', '..#.. .#### #.#.. .###. ..#.# ####. ..#..')
g('@', '.###. #...# #.### #.#.# #.### #.... .####')
g('^', '.#. #.#', 5)
g('~', '.#.# #.#.', 3)
g('`', '#. .#', 5)
g('°', '.#. #.# .#.', 4)
g('º', '.#. #.# .#. ...  ###', 2); g('ª', '.##. #.#. .##. .... ###.', 2)
g('·', '#', 3)
g('×', '#.# .#. #.#', 1)
g('÷', '..#.. ..... ##### ..... ..#..', 1)
g('…', '#.#.#')
g('«', '..#.# .#.#. #.#.. .#.#. ..#.#')
g('»', '#.#.. .#.#. ..#.# .#.#. #.#..')
g('€', '..### .#... ####. .#... ####. .#... ..###')
g('²', '##. ..# .#. ###', 3)
g('³', '### .## ..# ###', 3)
g('½', '#...# #..#. #.#.. .#.## #...# ...#. ..###')
g('•', '.#. ### .#.', 2)
g('←', '..#.. .#... ##### .#... ..#..', 1)
g('→', '..#.. ...#. ##### ...#. ..#..', 1)
g('↑', '..#.. .###. #.#.# ..#.. ..#..', 1)
g('↓', '..#.. ..#.. #.#.# .###. ..#..', 1)
g('✓', '....# ...#. #.#.. .#...', 1)
g('✔', '....# ...## #.##. ###.. .#...', 1)
g('✕', '#...# .#.#. ..#.. .#.#. #...#', 1)
g('★', '..#.. ..#.. ##### .###. .#.#. #...#', 0)
g('♥', '.#.#. ##### ##### .###. ..#..', 0)
g('▸', '#. ## #.', 1); g('▾', '### .#.', 2)

# ---------- Letras con tilde, diéresis y virgulilla ----------
def accent(base, kind):
    rows, yoff, adv = G[base]; w = len(rows[0]); upper = base.isupper() or base in 'I'
    c = w // 2
    if kind == 'acute': acc = ['.' * (c + 1) + '#' + '.' * (w - c - 2), '.' * c + '#' + '.' * (w - c - 1)] if w >= 3 else ['.#', '#.']
    elif kind == 'grave': acc = ['.' * (c - 1) + '#' + '.' * (w - c), '.' * c + '#' + '.' * (w - c - 1)] if w >= 3 else ['#.', '.#']
    elif kind == 'diaer': acc = ['.#.#.'] if w == 5 else ['#.#']
    elif kind == 'tilde': acc = ['.##.#', '#.##.']
    elif kind == 'circ': acc = ['.' * (c) + '#' + '.' * (w - c - 1), '.' * (c - 1) + '#.#' + '.' * (w - c - 2)]
    # minúsculas: la i pierde su punto; las de 1 px se ensanchan para que quepa la tilde
    if base == 'i': rows = ['#', '#', '#', '#', '#']; w = 1
    aw = max(len(a) for a in acc); W = max(w, aw)
    pad = lambda r, n: (r + '.' * n)[:n]
    rows2 = [pad(a, W) for a in acc] + ['.' * W] + [pad(r, W) for r in rows]
    return rows2, yoff
for ch, base, kind in [('á', 'a', 'acute'), ('é', 'e', 'acute'), ('í', 'i', 'acute'), ('ó', 'o', 'acute'), ('ú', 'u', 'acute'),
                       ('Á', 'A', 'acute'), ('É', 'E', 'acute'), ('Í', 'I', 'acute'), ('Ó', 'O', 'acute'), ('Ú', 'U', 'acute'),
                       ('à', 'a', 'grave'), ('è', 'e', 'grave'), ('ò', 'o', 'grave'), ('À', 'A', 'grave'),
                       ('ü', 'u', 'diaer'), ('Ü', 'U', 'diaer'), ('ö', 'o', 'diaer'), ('ä', 'a', 'diaer'), ('ï', 'i', 'diaer'),
                       ('ñ', 'n', 'tilde'), ('Ñ', 'N', 'tilde'), ('ã', 'a', 'tilde'), ('õ', 'o', 'tilde'),
                       ('â', 'a', 'circ'), ('ê', 'e', 'circ'), ('ô', 'o', 'circ')]:
    if kind == 'diaer' and base == 'i': rows, yoff = ['#.#', '...', '.#.', '.#.', '.#.', '.#.', '.#.'], 0
    else: rows, yoff = accent(base, kind)
    g(ch, rows, yoff)
g('ç', G['c'][0] + ['..#..', '.##..'], -2)
g('Ç', G['C'][0] + ['..#..', '.##..'], -2)

# ---------- Construir ----------
def glyph_name(ch):
    return 'space' if ch == ' ' else ('uni%04X' % ord(ch))
order = ['.notdef', 'space', 'nbsp'] + [glyph_name(c) for c in G]
cmap = {32: 'space', 0xA0: 'nbsp'}; cmap.update({ord(c): glyph_name(c) for c in G})
glyphs, metrics = {}, {}
def draw(rows, yoff):
    pen = TTGlyphPen(None); H = len(rows)
    for i, r in enumerate(rows):
        y = (yoff + H - 1 - i) * P; x = 0
        while x < len(r):  # tramos horizontales seguidos = un rectángulo
            if r[x] == '#':
                s = x
                while x < len(r) and r[x] == '#': x += 1
                x0, x1 = (s + 0.5) * P, (x + 0.5) * P  # medio píxel de margen a la izquierda
                pen.moveTo((x0, y)); pen.lineTo((x0, y + P)); pen.lineTo((x1, y + P)); pen.lineTo((x1, y)); pen.closePath()
            else: x += 1
    return pen.glyph()
# .notdef: caja hueca
pen = TTGlyphPen(None)
for (a, b, c, d) in [(50, 0, 450, 100), (50, 600, 450, 700), (50, 0, 150, 700), (350, 0, 450, 700)]:
    pen.moveTo((a, b)); pen.lineTo((a, d)); pen.lineTo((c, d)); pen.lineTo((c, b)); pen.closePath()
glyphs['.notdef'] = pen.glyph(); metrics['.notdef'] = (500, 50)
empty = TTGlyphPen(None).glyph()
glyphs['space'] = empty; metrics['space'] = (400, 0)
glyphs['nbsp'] = TTGlyphPen(None).glyph(); metrics['nbsp'] = (400, 0)
for ch, (rows, yoff, adv) in G.items():
    n = glyph_name(ch); w = max(len(r) for r in rows)
    glyphs[n] = draw(rows, yoff); metrics[n] = ((adv or (w + 1)) * P, 50 if w else 0)

fb = FontBuilder(UPM, isTTF=True)
fb.setupGlyphOrder(order); fb.setupCharacterMap(cmap); fb.setupGlyf(glyphs)
fb.setupHorizontalMetrics({n: metrics[n] for n in order})
fb.setupHorizontalHeader(ascent=ASC * P, descent=-DESC * P)
fb.setupNameTable({'familyName': 'Taller Pixel', 'styleName': 'Regular', 'uniqueFontIdentifier': 'TallerPixel-Regular', 'fullName': 'Taller Pixel', 'psName': 'TallerPixel-Regular', 'version': 'Version 1.0', 'copyright': 'Taller Cinético', 'licenseDescription': 'Fuente del juego Taller Cinético'})
fb.setupOS2(sTypoAscender=ASC * P, sTypoDescender=-DESC * P, sTypoLineGap=0, usWinAscent=ASC * P, usWinDescent=DESC * P, sxHeight=5 * P, sCapHeight=7 * P, fsType=0, achVendID='TCIN')
fb.setupPost(); fb.setupDummyDSIG() if hasattr(fb, 'setupDummyDSIG') else None
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
fb.save(os.path.join(out, 'taller-pixel.ttf'))
fb.font.flavor = 'woff'; fb.font.save(os.path.join(out, 'taller-pixel.woff'))
print('glifos:', len(G) + 2)
