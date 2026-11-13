"""Builds Ponchi — an original low-poly cat-sprite avatar — as a GLB with Idle + Walk animations.

    python scripts/make_ponchi.py public/avatars/ponchi.glb

Pure Python + numpy: every part is a small faceted mesh (flat normals, vertex colours, one matte
material), arranged in a node hierarchy so the limbs, ears, head and tail can be animated.
Front faces +Z, up is +Y, about 2.3 units tall (same scale as Kitty).
"""
import json, math, struct, sys
import numpy as np

# ---------------- colours ----------------
WHITE = (0.93, 0.93, 0.95)
SHADE = (0.84, 0.85, 0.89)       # slightly grey white for tufts / inner bits
BLACK = (0.13, 0.13, 0.16)
ORANGE = (0.95, 0.47, 0.13)
DARK = (0.22, 0.12, 0.08)
IRIS = (0.96, 0.62, 0.18)
HILITE = (1.0, 1.0, 1.0)
NOSE = (0.55, 0.27, 0.18)

# ---------------- geometry helpers (return list of triangles + per-triangle colours) ----------------
def icosphere(sub):
    t = (1 + 5 ** 0.5) / 2
    v = [(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t), (0, -1, -t), (0, 1, -t),
         (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)]
    v = [np.array(p) / np.linalg.norm(p) for p in v]
    f = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8),
         (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)]
    for _ in range(sub):
        cache, nf = {}, []
        def mid(a, b):
            k = (min(a, b), max(a, b))
            if k not in cache:
                m = (v[a] + v[b]) / 2; v.append(m / np.linalg.norm(m)); cache[k] = len(v) - 1
            return cache[k]
        for a, b, c in f:
            ab, bc, ca = mid(a, b), mid(b, c), mid(c, a)
            nf += [(a, ab, ca), (b, bc, ab), (c, ca, bc), (ab, bc, ca)]
        f = nf
    return [np.array([v[a], v[b], v[c]]) for a, b, c in f]

def ellipsoid(center, radii, color, sub=1, color_fn=None):
    tris = [t * np.array(radii) + np.array(center) for t in icosphere(sub)]
    cols = [color_fn(t) if color_fn else color for t in tris]
    return tris, cols

def frustum(p0, p1, r0, r1, n, color, cap0=True, cap1=True):
    """cylinder/cone between points p0 and p1"""
    p0, p1 = np.array(p0, float), np.array(p1, float)
    ax = p1 - p0; ax /= np.linalg.norm(ax)
    ref = np.array([1, 0, 0]) if abs(ax[0]) < 0.9 else np.array([0, 0, 1])
    u = np.cross(ax, ref); u /= np.linalg.norm(u); w = np.cross(ax, u)
    ring = lambda c, r: [c + r * (math.cos(2 * math.pi * i / n) * u + math.sin(2 * math.pi * i / n) * w) for i in range(n)]
    a, b = ring(p0, r0), ring(p1, r1)
    tris = []
    for i in range(n):
        j = (i + 1) % n
        if r1 <= 1e-6: tris.append(np.array([a[i], p1, a[j]]))          # cone side
        else: tris += [np.array([a[i], b[i], a[j]]), np.array([a[j], b[i], b[j]])]
    if cap0 and r0 > 1e-6: tris += [np.array([p0, a[j], a[i]]) for i in range(n) for j in [(i + 1) % n]]
    if cap1 and r1 > 1e-6: tris += [np.array([p1, b[i], b[j]]) for i in range(n) for j in [(i + 1) % n]]
    return tris, [color] * len(tris)

def tube(points, radii, n, colors_fn):
    """tube along a curve that lies in the y-z plane (side vector = +X)"""
    P = [np.array(p, float) for p in points]
    X = np.array([1.0, 0, 0])
    rings = []
    for k, p in enumerate(P):
        t = (P[min(k + 1, len(P) - 1)] - P[max(k - 1, 0)]); t /= np.linalg.norm(t)
        nrm = np.cross(t, X); nrm /= np.linalg.norm(nrm)
        rings.append([p + radii[k] * (math.cos(2 * math.pi * i / n) * X + math.sin(2 * math.pi * i / n) * nrm) for i in range(n)])
    tris, cols = [], []
    for k in range(len(P) - 1):
        c = colors_fn(k / (len(P) - 1))
        for i in range(n):
            j = (i + 1) % n; a, b = rings[k], rings[k + 1]
            tris += [np.array([a[i], b[i], a[j]]), np.array([a[j], b[i], b[j]])]; cols += [c, c]
    # end caps
    for ring, p, c in [(rings[0], P[0], colors_fn(0)), (rings[-1], P[-1], colors_fn(1))]:
        for i in range(n):
            tris.append(np.array([p, ring[i], ring[(i + 1) % n]])); cols.append(c)
    return tris, cols

def path_tube(path, r, n, color):
    """thin tube along any 3D path (for the swirl and smile)"""
    tris, cols = [], []
    for a, b in zip(path[:-1], path[1:]):
        t, c = frustum(a, b, r, r, n, color, cap0=False, cap1=False); tris += t; cols += c
    return tris, cols

def merge(*parts):
    T, C = [], []
    for t, c in parts: T += t; C += c
    return T, C

# ---------------- the character (world coordinates) ----------------
HEAD_C, HEAD_R = np.array([0, 1.58, 0.0]), np.array([0.56, 0.5, 0.48])

def on_head(x, y, out=0.0):
    """point on the front of the head ellipsoid at (x, y), pushed `out` along +z"""
    dx, dy = x / HEAD_R[0], (y - HEAD_C[1]) / HEAD_R[1]
    z = HEAD_R[2] * math.sqrt(max(0.0, 1 - dx * dx - dy * dy))
    return np.array([x, y, z + out])

def build_parts():
    parts = {}
    # --- legs (pivot at hips) ---
    for s, name in [(-1, "LegL"), (1, "LegR")]:
        hip = np.array([0.17 * s, 0.4, 0.0])
        leg = frustum(hip + [0, 0.02, 0], hip + [0, -0.3, 0.02], 0.13, 0.12, 7, WHITE)
        foot = ellipsoid(hip + [0, -0.33, 0.05], (0.14, 0.08, 0.18), WHITE, 1)
        parts[name] = (hip, merge(leg, foot))
    # --- body: torso + poncho (pivot at hips centre) ---
    body_p = np.array([0, 0.4, 0])
    torso = ellipsoid([0, 0.72, 0], (0.36, 0.42, 0.32), WHITE, 1)
    n, rings = 14, [(1.07, 0.21), (1.0, 0.27), (0.93, 0.36), (0.79, 0.5), (0.72, 0.54)]
    ptris, pcols = [], []
    for k in range(len(rings) - 1):
        (y0, r0), (y1, r1) = rings[k], rings[k + 1]
        for i in range(n):
            a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
            dip = lambda a, kk: -0.12 * abs(math.cos(a)) * (kk / (len(rings) - 1))  # pointed at front & back
            P = lambda a, y, r, kk: np.array([r * math.sin(a), y + dip(a, kk), r * math.cos(a)])
            q00, q01 = P(a0, y0, r0, k), P(a1, y0, r0, k)
            q10, q11 = P(a0, y1, r1, k + 1), P(a1, y1, r1, k + 1)
            t1, t2 = np.array([q00, q10, q01]), np.array([q01, q10, q11])
            if k == 1: c1 = c2 = BLACK                         # thin black stripe
            elif k == 2: c1, c2 = (BLACK, ORANGE) if i % 2 == 0 else (ORANGE, BLACK)   # triangle pattern
            else: c1 = c2 = ORANGE
            ptris += [t1, t2]; pcols += [c1, c2]
    # black hem band
    hem = [(0.72, 0.54), (0.68, 0.55)]
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        P = lambda a, y, r: np.array([r * math.sin(a), y - 0.12 * abs(math.cos(a)), r * math.cos(a)])
        q00, q01, q10, q11 = P(a0, *hem[0]), P(a1, *hem[0]), P(a0, *hem[1]), P(a1, *hem[1])
        ptris += [np.array([q00, q10, q01]), np.array([q01, q10, q11])]; pcols += [BLACK, BLACK]
    parts["Body"] = (body_p, merge(torso, (ptris, pcols)))
    # --- arms (pivot at shoulders) ---
    for s, name in [(-1, "ArmL"), (1, "ArmR")]:
        sh = np.array([0.33 * s, 0.98, 0.02])
        arm = frustum(sh, sh + [0.1 * s, -0.32, 0.03], 0.085, 0.075, 6, WHITE, cap1=False)
        hand = ellipsoid(sh + [0.1 * s, -0.34, 0.03], (0.08, 0.08, 0.08), WHITE, 1)
        parts[name] = (sh, merge(arm, hand))
    # --- tail (pivot at the back) ---
    tb = np.array([0, 0.5, -0.28])
    pts = [(0, 0, 0), (0, -0.04, -0.16), (0, -0.02, -0.32), (0, 0.08, -0.46), (0, 0.24, -0.53), (0, 0.4, -0.5),
           (0, 0.5, -0.39), (0, 0.5, -0.27), (0, 0.43, -0.21), (0, 0.35, -0.24), (0, 0.33, -0.32), (0, 0.38, -0.37)]
    pts = [tb + np.array(p) for p in pts]
    radii = [0.075, 0.075, 0.072, 0.07, 0.068, 0.065, 0.062, 0.058, 0.054, 0.05, 0.045, 0.04]
    def tail_col(f):
        if f < 0.22: return WHITE
        if f < 0.36: return BLACK
        if f < 0.45: return WHITE
        return ORANGE
    parts["Tail"] = (tb, tube(pts, radii, 6, tail_col))
    # --- head (pivot at the neck) ---
    neck = np.array([0, 1.08, 0])
    head = ellipsoid(HEAD_C, HEAD_R, WHITE, 2)
    tufts = []
    for x, y, z, dx, dy in [(-0.12, 2.04, 0.05, -0.08, 0.16), (0.02, 2.07, 0.04, 0.0, 0.2), (0.15, 2.04, 0.04, 0.08, 0.16)]:
        tufts.append(frustum([x, y - 0.06, z], [x + dx, y + dy, z], 0.08, 0.0, 5, WHITE, cap1=False))
    for s in (-1, 1):   # cheek fluff
        tufts.append(frustum([0.48 * s, 1.44, 0.12], [0.66 * s, 1.36, 0.12], 0.08, 0.0, 5, WHITE, cap1=False))
        tufts.append(frustum([0.46 * s, 1.36, 0.08], [0.6 * s, 1.24, 0.08], 0.07, 0.0, 5, WHITE, cap1=False))
    face = []
    for s in (-1, 1):   # big curious eyes
        e = on_head(0.19 * s, 1.56, 0.0)
        face.append(ellipsoid(e + [0, 0, -0.025], (0.115, 0.135, 0.05), DARK, 1))
        face.append(ellipsoid(e + [0, 0, 0.005], (0.09, 0.11, 0.035), IRIS, 1))
        face.append(ellipsoid(e + [0, -0.01, 0.025], (0.045, 0.06, 0.02), DARK, 1))
        face.append(ellipsoid(e + [0.03 * s * -1 + 0.02, 0.05, 0.04], (0.028, 0.028, 0.015), HILITE, 1))
    nose = on_head(0, 1.43, 0.0)
    face.append(ellipsoid(nose, (0.035, 0.025, 0.025), NOSE, 1))
    for s in (-1, 1):   # tiny curved smile
        arc = [on_head(0.0 + s * 0.05 * (1 - math.cos(a)) , 1.39 - 0.03 * math.sin(a), 0.005) for a in np.linspace(0, math.pi, 6)]
        face.append(path_tube(arc, 0.011, 4, DARK))
    swirl = []        # orange forehead swirl
    sp = []
    for k in range(28):
        a = k / 27 * 1.75 * 2 * math.pi
        r = 0.015 + 0.075 * k / 27
        sp.append(on_head(r * math.cos(a), 1.83 + r * math.sin(a) * 0.9, 0.012))
    swirl.append(path_tube(sp, 0.018, 4, ORANGE))
    parts["Head"] = (neck, merge(head, *tufts, *face, *swirl))
    # --- ears (pivot at the ear base) ---
    for s, name in [(-1, "EarL"), (1, "EarR")]:
        base = np.array([0.3 * s, 1.92, -0.02])
        tip = base + np.array([0.3 * s, 0.5, -0.02])
        ear = frustum(base, tip, 0.19, 0.0, 6, BLACK, cap1=False)
        inner = frustum(base + [0, 0.04, 0.12], tip + [-0.04 * s, -0.12, 0.08], 0.1, 0.0, 5, SHADE, cap1=False)
        ball = ellipsoid(tip + np.array([0.02 * s, 0.05, 0]), (0.075, 0.075, 0.075), ORANGE, 1)
        parts[name] = (base, merge(ear, inner, ball))
    return parts

HIER = {"Ponchi": ["Body", "LegL", "LegR"], "Body": ["Head", "ArmL", "ArmR", "Tail"], "Head": ["EarL", "EarR"]}

# ---------------- animation (Euler xyz radians per node, keyframes) ----------------
def quat(rx=0.0, ry=0.0, rz=0.0):
    cx, sx = math.cos(rx / 2), math.sin(rx / 2); cy, sy = math.cos(ry / 2), math.sin(ry / 2); cz, sz = math.cos(rz / 2), math.sin(rz / 2)
    # XYZ order
    return [sx * cy * cz + cx * sy * sz, cx * sy * cz - sx * cy * sz, cx * cy * sz + sx * sy * cz, cx * cy * cz - sx * sy * sz]

def anims():
    A = {}
    # Idle: 2.4 s, gentle breathing sway, ear twitch, tail swish, little arm wave
    T = list(np.linspace(0, 2.4, 13)); ph = [2 * math.pi * t / 2.4 for t in T]
    A["Idle"] = {
        "Head": [quat(0.04 * math.sin(p), 0.0, 0.05 * math.sin(p + 1)) for p in ph],
        "EarL": [quat(0, 0, 0.12 * max(0, math.sin(p * 2)) ** 4) for p in ph],
        "EarR": [quat(0, 0, -0.1 * max(0, math.sin(p * 2 + 2)) ** 4) for p in ph],
        "Tail": [quat(0.0, 0.0, 0.25 * math.sin(p)) for p in ph],
        "ArmL": [quat(0.05 * math.sin(p), 0, -0.05 * math.sin(p)) for p in ph],
        "ArmR": [quat(-0.05 * math.sin(p), 0, 0.05 * math.sin(p)) for p in ph],
        "_t": T}
    # Walk: 0.6 s stride
    T = list(np.linspace(0, 0.6, 13)); ph = [2 * math.pi * t / 0.6 for t in T]
    A["Walk"] = {
        "LegL": [quat(0.55 * math.sin(p), 0, 0) for p in ph],
        "LegR": [quat(-0.55 * math.sin(p), 0, 0) for p in ph],
        "ArmL": [quat(-0.6 * math.sin(p), 0, -0.1) for p in ph],
        "ArmR": [quat(0.6 * math.sin(p), 0, 0.1) for p in ph],
        "Head": [quat(0.05 * math.sin(2 * p), 0, 0.06 * math.sin(p)) for p in ph],
        "EarL": [quat(0, 0, 0.12 * math.sin(2 * p)) for p in ph],
        "EarR": [quat(0, 0, -0.12 * math.sin(2 * p)) for p in ph],
        "Tail": [quat(0.1 * math.sin(2 * p), 0, 0.35 * math.sin(p)) for p in ph],
        "Body": [quat(0, 0.08 * math.sin(p), 0) for p in ph],
        "_t": T}
    return A

# ---------------- GLB writer ----------------
def build_glb(path):
    parts = build_parts()
    world = {k: v[0] for k, v in parts.items()}; world["Ponchi"] = np.zeros(3)
    parent = {c: p for p, cs in HIER.items() for c in cs}
    bin_ = bytearray(); views, accs = [], []

    def add(data, comp, typ, target=None, minmax=False):
        nonlocal bin_
        while len(bin_) % 4: bin_ += b"\0"
        raw = data.astype(np.float32).tobytes()
        views.append({"buffer": 0, "byteOffset": len(bin_), "byteLength": len(raw), **({"target": target} if target else {})})
        bin_ += raw
        acc = {"bufferView": len(views) - 1, "componentType": 5126, "count": int(data.shape[0]), "type": typ}
        if minmax: acc["min"] = data.min(0).tolist(); acc["max"] = data.max(0).tolist()
        accs.append(acc); return len(accs) - 1

    names = ["Ponchi", "Body", "Head", "EarL", "EarR", "ArmL", "ArmR", "Tail", "LegL", "LegR"]
    idx = {n: i for i, n in enumerate(names)}
    nodes, meshes, tri_total = [], [], 0
    for n in names:
        node = {"name": n}
        if n in parts:
            pivot, (tris, cols) = parts[n]
            P = np.array(tris).reshape(-1, 3) - pivot
            N = []
            for t in tris:
                nn = np.cross(t[1] - t[0], t[2] - t[0]); l = np.linalg.norm(nn); nn = nn / l if l > 1e-12 else np.array([0, 1, 0])
                N += [nn] * 3
            Ccol = np.repeat(np.array(cols, float), 3, axis=0)
            a_p = add(P, 5126, "VEC3", 34962, True); a_n = add(np.array(N), 5126, "VEC3", 34962); a_c = add(Ccol, 5126, "VEC3", 34962)
            meshes.append({"name": n, "primitives": [{"attributes": {"POSITION": a_p, "NORMAL": a_n, "COLOR_0": a_c}, "material": 0}]})
            node["mesh"] = len(meshes) - 1; tri_total += len(tris)
            rel = pivot - world[parent[n]]
            node["translation"] = rel.tolist()
        if n in HIER: node["children"] = [idx[c] for c in HIER[n]]
        nodes.append(node)

    animations = []
    for aname, chans in anims().items():
        times = np.array(chans["_t"], float).reshape(-1, 1)
        a_t = add(times, 5126, "SCALAR", None, True)
        samplers, channels = [], []
        for nname, qs in chans.items():
            if nname == "_t": continue
            a_q = add(np.array(qs, float), 5126, "VEC4")
            samplers.append({"input": a_t, "output": a_q, "interpolation": "LINEAR"})
            channels.append({"sampler": len(samplers) - 1, "target": {"node": idx[nname], "path": "rotation"}})
        animations.append({"name": aname, "samplers": samplers, "channels": channels})

    gltf = {"asset": {"version": "2.0", "generator": "World of Mikha – make_ponchi.py"},
            "scene": 0, "scenes": [{"name": "Ponchi", "nodes": [0]}], "nodes": nodes, "meshes": meshes,
            "materials": [{"name": "MatteFlat", "doubleSided": True,
                           "pbrMetallicRoughness": {"baseColorFactor": [1, 1, 1, 1], "metallicFactor": 0.0, "roughnessFactor": 1.0}}],
            "animations": animations, "accessors": accs, "bufferViews": views, "buffers": [{"byteLength": len(bin_)}]}
    while len(bin_) % 4: bin_ += b"\0"
    js = json.dumps(gltf, separators=(",", ":")).encode()
    while len(js) % 4: js += b" "
    total = 12 + 8 + len(js) + 8 + len(bin_)
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack("<II", len(bin_), 0x004E4942)); f.write(bin_)
    return parts, tri_total, total

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "ponchi.glb"
    parts, tris, size = build_glb(out)
    print(f"wrote {out}: {tris} triangles, {size/1024:.1f} KB, animations: Idle, Walk")
