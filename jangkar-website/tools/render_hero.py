"""Render the cinematic hero video from photos (Ken Burns + crossfades + warm grade).

Usage:  python3 tools/render_hero.py            # renders desktop (16:9) + mobile (9:16) + poster
Edit SHOTS below to change order/photos. Photos live in assets/photos/.
Output: assets/video/hero.mp4, hero-mobile.mp4, hero-poster.jpg, chapters.json
"""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PH = os.path.join(ROOT, "assets", "photos")
OUT = os.path.join(ROOT, "assets", "video")

FPS = 30
SHOT = 4.3     # seconds each shot is on screen (incl. transition)
XF = 1.1       # crossfade length

# (photo, motion, chapter key, focus-x 0..1) — story: arrive → enter → pool → rooms → bath → sunset
# motions: in (push-in), out (pull-back), left, right (lateral glide), up (tilt up)
SHOTS_WIDE = [
    ("exterior.jpg",      "in",    "arrival", .5),
    ("entrance.jpg",      "in",    "arrival", .45),
    ("pool.jpg",          "in",    "pool",    .5),
    ("room-poolview.jpg", "right", "rooms",   .5),
    ("room-villa.jpg",    "in",    "rooms",   .5),
    ("room-double.jpg",   "left",  "rooms",   .5),
    ("bath-shower.jpg",   "up",    "bath",    .5),
    ("details.jpg",       "in",    "bath",    .5),
    ("sunset.jpg",        "right", "sunset",  .5),
]
# vertical cut for phones — uses the portrait photos too
SHOTS_TALL = [
    ("exterior.jpg",      "in",    "arrival", .55),
    ("entrance.jpg",      "in",    "arrival", .42),
    ("terrace.jpg",       "in",    "pool",    .5),
    ("pool.jpg",          "out",   "pool",    .55),
    ("room-poolview.jpg", "in",    "rooms",   .3),
    ("room-villa.jpg",    "in",    "rooms",   .5),
    ("bath-ensuite.jpg",  "up",    "bath",    .5),
    ("details.jpg",       "in",    "bath",    .55),
    ("sunset.jpg",        "left",  "sunset",  .35),
]
SHOTS = SHOTS_WIDE

EASE = "(0.5-0.5*cos(PI*on/{n}))"


def motion(kind, n):
    e = EASE.format(n=n)
    cx, cy = "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"
    if kind == "in":
        return f"1.0+0.14*{e}", cx, cy
    if kind == "out":
        return f"1.14-0.14*{e}", cx, cy
    if kind == "right":
        return "1.12", f"(iw-iw/zoom)*(0.1+0.8*{e})", cy
    if kind == "left":
        return "1.12", f"(iw-iw/zoom)*(0.9-0.8*{e})", cy
    if kind == "up":
        return "1.12", cx, f"(ih-ih/zoom)*(0.9-0.8*{e})"
    raise ValueError(kind)


def render(w, h, out, crf, shots):
    n = int(SHOT * FPS)
    args, chains = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"], []
    for i, (img, mv, _, fx) in enumerate(shots):
        args += ["-i", os.path.join(PH, img)]
        z, x, y = motion(mv, n)
        # cover-fit to 2x the target so the pan has sub-pixel headroom, then animate
        chains.append(
            f"[{i}:v]scale={w*2}:{h*2}:force_original_aspect_ratio=increase:flags=lanczos,"
            f"crop={w*2}:{h*2}:(iw-{w*2})*{fx}:(ih-{h*2})/2,"
            f"zoompan=z='{z}':x='{x}':y='{y}':d={n}:s={w}x{h}:fps={FPS},setsar=1,format=yuv420p[v{i}]"
        )
    prev, offset = "v0", 0.0
    for i in range(1, len(shots)):
        offset += SHOT - XF
        trans = "fade" if i % 3 else "fadeblack"
        chains.append(f"[{prev}][v{i}]xfade=transition={trans}:duration={XF}:offset={offset:.3f}[x{i}]")
        prev = f"x{i}"
    total = offset + SHOT
    # cinematic grade: gentle contrast, warm highlights, vignette, fine grain, fade in/out
    chains.append(
        f"[{prev}]unsharp=5:5:0.6,eq=contrast=1.06:saturation=1.08:gamma=0.98,"
        f"colorbalance=rs=0.02:bs=-0.03:rh=0.04:bh=-0.04,"
        f"vignette=angle=PI/5,noise=alls=4:allf=t,"
        f"fade=t=in:st=0:d=0.8,fade=t=out:st={total-0.8:.2f}:d=0.8,format=yuv420p[out]"
    )
    args += ["-filter_complex", ";".join(chains), "-map", "[out]", "-an",
             "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-profile:v", "high",
             "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-r", str(FPS), out]
    subprocess.run(args, check=True)
    return total


def main():
    os.makedirs(OUT, exist_ok=True)
    total = render(1600, 900, os.path.join(OUT, "hero.mp4"), 24, SHOTS_WIDE)
    print("desktop ok")
    if "--no-mobile" not in sys.argv:
        render(720, 1280, os.path.join(OUT, "hero-mobile.mp4"), 25, SHOTS_TALL)
        print("mobile ok")
    for src, dst in (("hero.mp4", "hero-poster.jpg"), ("hero-mobile.mp4", "hero-mobile-poster.jpg")):
        if os.path.exists(os.path.join(OUT, src)):
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "1.6", "-i", os.path.join(OUT, src),
                            "-frames:v", "1", "-q:v", "3", os.path.join(OUT, dst)], check=True)

    # chapter start times (first occurrence of each key) for the hero chapter UI
    def chapters(shots):
        out, seen = [], set()
        for i, (_, _, key, _) in enumerate(shots):
            if key not in seen:
                seen.add(key)
                out.append({"key": key, "t": round(max(0, i * (SHOT - XF) - (XF / 2 if i else 0)), 2)})
        return {"duration": round((len(shots) - 1) * (SHOT - XF) + SHOT, 2), "chapters": out}

    meta = {"wide": chapters(SHOTS_WIDE), "tall": chapters(SHOTS_TALL)}
    with open(os.path.join(OUT, "chapters.js"), "w") as f:
        f.write("/* generated by tools/render_hero.py */\nwindow.HERO_CHAPTERS = " + json.dumps(meta, indent=2) + ";\n")
    print(json.dumps(meta))


if __name__ == "__main__":
    main()
