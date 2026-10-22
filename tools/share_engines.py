"""Makes jam games that use the same Godot engine build share one copy of it.

Godot web exports load their engine from GODOT_CONFIG.executable + ".wasm",
".side.wasm", ".audio.worklet.js" and so on, and the page loads executable + ".js".
Games whose engine files are byte-for-byte identical get one shared copy in
games/jam/_engine/<group>/, and their index.html points there. Each game keeps
its own index.pck (the game itself), icons and LICENSE.txt.

Run from the StudyArcade folder:  python3 -I tools/share_engines.py
Safe to run again: games already pointing at a shared engine are skipped.
"""
import hashlib
import json
import os
import re
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JAM = os.path.join(ROOT, "games", "jam")
SHARED = os.path.join(JAM, "_engine")
ENGINE_FILES = ["index.js", "index.wasm", "index.side.wasm", "index.audio.worklet.js", "index.audio.position.worklet.js"]
CONFIG_RE = re.compile(r"const GODOT_CONFIG = (\{.*?\});", re.S)


def digest(game):
    h = hashlib.sha1()
    for name in ENGINE_FILES:
        path = os.path.join(JAM, game, name)
        h.update(name.encode())
        if os.path.exists(path):
            with open(path, "rb") as f:
                for chunk in iter(lambda: f.read(1 << 20), b""):
                    h.update(chunk)
        else:
            h.update(b"<missing>")
    return h.hexdigest()[:10]


def main():
    games = sorted(d for d in os.listdir(JAM) if not d.startswith("_") and os.path.isfile(os.path.join(JAM, d, "index.html")))
    groups = {}
    for g in games:
        html = open(os.path.join(JAM, g, "index.html"), encoding="utf-8").read()
        if "../_engine/" in html:
            continue  # already shared
        if os.path.exists(os.path.join(JAM, g, ".isolate")):
            continue  # threaded games need their engine next to them, where the isolation headers apply
        groups.setdefault(digest(g), []).append(g)

    saved = 0
    for key, members in sorted(groups.items()):
        if len(members) < 2:
            continue
        dest = os.path.join(SHARED, "godot-" + key)
        os.makedirs(dest, exist_ok=True)
        first = os.path.join(JAM, members[0])
        for name in ENGINE_FILES:
            src = os.path.join(first, name)
            if os.path.exists(src) and not os.path.exists(os.path.join(dest, name)):
                shutil.copy2(src, os.path.join(dest, name))
        rel = "../_engine/godot-" + key + "/index"
        for g in members:
            page = os.path.join(JAM, g, "index.html")
            html = open(page, encoding="utf-8").read()
            m = CONFIG_RE.search(html)
            config = json.loads(m.group(1))
            config["executable"] = rel
            config["mainPack"] = "index.pck"  # the game stays in its own folder
            html = html[: m.start(1)] + json.dumps(config, separators=(",", ":")) + html[m.end(1):]
            html = html.replace('<script src="index.js"></script>', '<script src="' + rel + '.js"></script>')
            if rel + ".js" not in html:
                raise SystemExit("could not repoint the engine script in " + g)
            open(page, "w", encoding="utf-8").write(html)
            for name in ENGINE_FILES:
                path = os.path.join(JAM, g, name)
                if os.path.exists(path):
                    saved += os.path.getsize(path)
                    os.remove(path)
        print(f"godot-{key}: {len(members)} games -> {', '.join(members)}")

    if os.path.isdir(SHARED):
        with open(os.path.join(SHARED, "README.txt"), "w") as f:
            f.write("Shared Godot Engine web runtime files used by several jam games.\n"
                    "Godot Engine is MIT licensed: https://godotengine.org/license\n"
                    "Each game folder still has its own index.pck and LICENSE.txt.\n")
    shared_size = sum(os.path.getsize(os.path.join(dp, fn)) for dp, _, fns in os.walk(SHARED) for fn in fns) if os.path.isdir(SHARED) else 0
    print(f"removed {saved / 1048576:.0f} MB of copies; shared engines take {shared_size / 1048576:.0f} MB")


if __name__ == "__main__":
    main()
