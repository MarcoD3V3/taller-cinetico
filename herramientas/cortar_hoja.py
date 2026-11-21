# Corta una hoja de sprites en piezas enteras (por forma, no por celdas) y las ordena por celda de la cuadrícula.
# Las piezas pequeñas (pétalos, chispas, frutos sueltos) se pegan a la pieza grande más cercana.
from PIL import Image
def pieces(path, cols, rows, min_big=120, alpha=128):
    im = Image.open(path).convert('RGBA'); W, H = im.size; px = im.load(); lab = [[-1]*W for _ in range(H)]; comps = []
    for y in range(H):
        for x in range(W):
            if px[x,y][3] < alpha or lab[y][x] >= 0: continue
            st = [(x,y)]; lab[y][x] = len(comps); pts = []
            while st:
                a, b = st.pop(); pts.append((a,b))
                for dx in (-1,0,1):
                    for dy in (-1,0,1):
                        u, v = a+dx, b+dy
                        if 0 <= u < W and 0 <= v < H and lab[v][u] < 0 and px[u,v][3] >= alpha: lab[v][u] = len(comps); st.append((u,v))
            comps.append(pts)
    bb = lambda c: (min(p[0] for p in c), min(p[1] for p in c), max(p[0] for p in c), max(p[1] for p in c))
    big = [list(c) for c in comps if len(c) >= min_big]; small = [c for c in comps if len(c) < min_big]
    boxes = [bb(g) for g in big]
    for s in small:
        sx0, sy0, sx1, sy1 = bb(s); best, bd = None, 1e9
        for i, (x0, y0, x1, y1) in enumerate(boxes):
            d = max(x0 - sx1, sx0 - x1, 0) + max(y0 - sy1, sy0 - y1, 0)
            if d < bd: bd, best = d, i
        if best is not None and bd <= 6: big[best].extend(s)
    cells = {}
    for g in big:
        x0, y0, x1, y1 = bb(g); cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        i = min(cols - 1, int(cx * cols / W)) + min(rows - 1, int(cy * rows / H)) * cols
        out = Image.new('RGBA', (x1 - x0 + 1, y1 - y0 + 1), (0,0,0,0)); op = out.load()
        for (x, y) in g: op[x - x0, y - y0] = px[x, y]
        if i in cells and cells[i].width * cells[i].height >= out.width * out.height: continue
        cells[i] = out
    return cells

def clusters(path, gap=1, alpha=128, min_px=6):
    """Piezas por cercanía: las islas a <= gap píxeles se juntan (montones de piedritas, hojas sueltas)."""
    im = Image.open(path).convert('RGBA'); W, H = im.size; px = im.load(); seen = [[0]*W for _ in range(H)]; comps = []
    for y in range(H):
        for x in range(W):
            if px[x,y][3] < alpha or seen[y][x]: continue
            st = [(x,y)]; seen[y][x] = 1; pts = []
            while st:
                a, b = st.pop(); pts.append((a,b))
                for dx in (-1,0,1):
                    for dy in (-1,0,1):
                        u, v = a+dx, b+dy
                        if 0 <= u < W and 0 <= v < H and not seen[v][u] and px[u,v][3] >= alpha: seen[v][u] = 1; st.append((u,v))
            comps.append(pts)
    groups = [[c, [min(p[0] for p in c), min(p[1] for p in c), max(p[0] for p in c), max(p[1] for p in c)]] for c in comps]
    again = True
    while again:
        again = False
        for i in range(len(groups)):
            for j in range(i + 1, len(groups)):
                A, B = groups[i][1], groups[j][1]
                if max(A[0], B[0]) - min(A[2], B[2]) - 1 <= gap and max(A[1], B[1]) - min(A[3], B[3]) - 1 <= gap:
                    groups[i][0] += groups[j][0]; groups[i][1] = [min(A[0], B[0]), min(A[1], B[1]), max(A[2], B[2]), max(A[3], B[3])]; groups.pop(j); again = True; break
            if again: break
    out = []
    for pts, (x0, y0, x1, y1) in groups:
        if len(pts) < min_px: continue
        o = Image.new('RGBA', (x1 - x0 + 1, y1 - y0 + 1), (0,0,0,0)); op = o.load()
        for (x, y) in pts: op[x - x0, y - y0] = px[x, y]
        out.append(((y0 + y1) / 2, (x0 + x1) / 2, o))
    # orden de lectura por filas
    out.sort(key=lambda t: t[0]); rows, cur = [], []
    for t in out:
        if cur and t[0] - cur[0][0] > 8: rows.append(cur); cur = []
        cur.append(t)
    if cur: rows.append(cur)
    return [t[2] for r in rows for t in sorted(r, key=lambda t: t[1])]
