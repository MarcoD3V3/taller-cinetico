# Ajusta un objeto de suelo al estilo del juego: tamaño real (en píxeles del juego), sin mezclar colores,
# contorno con sombra de su propio color (no negro) y colores algo apagados como los tiles.
import colorsys
from PIL import Image
lum = lambda c: 0.3*c[0] + 0.59*c[1] + 0.11*c[2]
def shrink(im, N):
    im = im.convert('RGBA'); im = im.crop(im.getbbox()); w, h = im.size; k = N / max(w, h)
    if k < 1:
        nw, nh = max(1, round(w*k)), max(1, round(h*k)); px = im.load(); out = Image.new('RGBA', (nw, nh), (0,0,0,0)); op = out.load()
        for y in range(nh):
            for x in range(nw):
                x0, x1, y0, y1 = int(x/k), max(int(x/k)+1, int((x+1)/k)), int(y/k), max(int(y/k)+1, int((y+1)/k))
                cs = [px[i, j] for i in range(x0, min(w, x1)) for j in range(y0, min(h, y1))]; op_ = [c for c in cs if c[3] >= 128]
                if len(op_) * 2 < len(cs) * 0.8: continue
                inner = [c for c in op_ if lum(c) >= 45] or op_; op[x, y] = max(set(inner), key=inner.count)
        im = out
    pad = Image.new('RGBA', (im.width + 2, im.height + 2), (0,0,0,0)); pad.paste(im, (1, 1)); pp = pad.load(); out = pad.copy(); po = out.load(); W, H = pad.size
    for y in range(H):
        for x in range(W):
            c = pp[x, y]
            if c[3] and lum(c) >= 45: continue
            nb = [pp[x+dx, y+dy] for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)) if 0 <= x+dx < W and 0 <= y+dy < H and pp[x+dx, y+dy][3] and lum(pp[x+dx, y+dy]) >= 45]
            if nb: b = max(nb, key=lum); po[x, y] = (int(b[0]*0.5), int(b[1]*0.5), int(b[2]*0.55), 255)
            elif c[3]: po[x, y] = (0,0,0,0)
    out = out.crop(out.getbbox()); p = out.load()
    for y in range(out.height):
        for x in range(out.width):
            c = p[x, y]
            if not c[3]: continue
            hh, s, v = colorsys.rgb_to_hsv(c[0]/255, c[1]/255, c[2]/255); r, g, b = [int(t*255) for t in colorsys.hsv_to_rgb(hh, s*0.82, 0.08 + v*0.9)]; p[x, y] = (r, g, b, 255)
    return out
