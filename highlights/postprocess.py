#!/usr/bin/env python3
"""
ORBITAL ROXA - Pós-processamento de highlight
Uso:
  python postprocess.py <match_id> <map_number> [rank]   # processa highlight específico
  python postprocess.py <match_id> <map_number> --all     # processa todos os 3
  python postprocess.py --batch                            # processa todos gravados

Pipeline: intro → clip com HUD animado (frame-by-frame) → fade out
"""
import os
import sys
import json
import subprocess
import shutil
import math
import random
import re
import argparse
import requests

from PIL import Image, ImageDraw, ImageFont, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from orbital_highlights.config import FFMPEG, FFPROBE

# ═══ PATHS ═══
ASSETS = os.path.join(os.path.dirname(__file__), "assets")
INTRO_PATH = os.path.join(ASSETS, "intronova.mp4")
OUTRO_PATH = os.path.join(ASSETS, "final.mp4")
HUD_IMG_PATH = os.path.join(ASSETS, "novofundodestats.png")
ORBITRON_BLACK = os.path.join(ASSETS, "Orbitron-Black.ttf")
ORBITRON_BOLD = os.path.join(ASSETS, "Orbitron-Bold.ttf")
PARSED_DIR = os.path.join(os.path.dirname(__file__), "parsed_highlights")
RECORDINGS_DIR = os.path.join(os.path.dirname(__file__), "recordings")
FINAL_DIR = os.path.join(os.path.dirname(__file__), "final_videos")

G5API_URL = "https://g5api-production-998f.up.railway.app"

W, H = 1920, 1080
FPS = 60

# HUD timing
HUD_APPEAR = 2.0
HUD_VISIBLE_DUR = 8.0
HUD_SLIDE_DUR = 0.7
AVATAR_START = 0.3
AVATAR_DUR = 0.5
LOGO_START = 0.4
LOGO_DUR = 0.5
NAME_START = 0.9
NAME_CHAR_DELAY = 0.07
STATS_START = 2.0
STATS_DUR = 0.8
STATS_INTERVAL = 0.25
GLOW_START = 2.0
FADEOUT_DUR = 1.0

WHITE = (245, 245, 220)
PURPLE = (168, 85, 247)

# Escala global do HUD (1.0 = tamanho original)
HUD_SCALE = 0.55


# ═══ HELPERS ═══
def ease_out_cubic(t):
    return 1 - (1 - min(1, max(0, t))) ** 3

def ease_out_back(t):
    t = min(1, max(0, t))
    c1 = 1.70158; c3 = c1 + 1
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2

def lerp(a, b, t):
    return a + (b - a) * t

def apply_alpha(img, alpha):
    if alpha >= 255: return img
    if alpha <= 0: return Image.new("RGBA", img.size, (0, 0, 0, 0))
    r, g, b, a = img.split()
    a = a.point(lambda x: int(x * alpha / 255))
    return Image.merge("RGBA", (r, g, b, a))

def download_file(url, path):
    try:
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            with open(path, "wb") as f:
                f.write(r.content)
            return True
    except: pass
    return False

def download_avatar(steamid, path):
    try:
        r = requests.get(f"https://steamcommunity.com/profiles/{steamid}?xml=1", timeout=10)
        m = re.search(r'<avatarFull><!\[CDATA\[(.*?)\]\]></avatarFull>', r.text)
        if m:
            return download_file(m.group(1), path)
    except: pass
    return False

def get_duration(path):
    result = subprocess.run(
        [FFPROBE, "-v", "quiet", "-print_format", "json", "-show_format", path],
        capture_output=True, text=True)
    return float(json.loads(result.stdout)["format"]["duration"])

def find_player_team(steamid):
    """Busca nome do time e logo de um jogador via G5API."""
    try:
        r = requests.get(f"{G5API_URL}/teams", timeout=10)
        teams = r.json() if isinstance(r.json(), list) else r.json().get("teams", [])
        for t in teams:
            an = t.get("auth_name", {})
            if steamid in an or str(steamid) in an:
                return t.get("name", ""), t.get("logo", "")
    except: pass
    return "", ""

def get_highlight_stats(highlight):
    """Extrai kills, assists (0 — não temos), headshots do highlight."""
    kills = highlight["kills_count"]
    hs = sum(1 for k in highlight.get("kills", []) if k.get("headshot"))
    assists = 0  # demos não têm assists por highlight
    return kills, assists, hs


# ═══ HUD FRAME GENERATOR ═══
def generate_hud_frame(t, hud_img_orig, avatar_img_orig, team_logo_img_orig, font_name, font_stat, particles, data):
    frame = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    S = HUD_SCALE
    # Pre-scale HUD image
    orig_w, orig_h = hud_img_orig.size
    hud_w = int(orig_w * S)
    hud_h = int(orig_h * S)
    hud_img = hud_img_orig.resize((hud_w, hud_h), Image.LANCZOS)

    # Pre-scale avatar and logo
    avatar_img = avatar_img_orig.resize((int(240 * S), int(240 * S)), Image.LANCZOS) if avatar_img_orig else None
    team_logo_img = team_logo_img_orig.resize((int(110 * S), int(110 * S)), Image.LANCZOS) if team_logo_img_orig else None

    avatar_size_base = int(240 * S)
    logo_size_base = int(110 * S)

    hud_x = (W - hud_w) // 2
    hud_y_final = H - hud_h + int(180 * S)
    hud_y_start = hud_y_final + int(80 * S)

    fadeout_start = HUD_VISIBLE_DUR - FADEOUT_DUR
    fadeout_alpha = max(0, 1.0 - ease_out_cubic((t - fadeout_start) / FADEOUT_DUR)) if t >= fadeout_start else 1.0
    if fadeout_alpha <= 0: return frame

    # Particles
    if t > 0.5:
        p_alpha = min(1.0, (t - 0.5) / 0.5)
        pdraw = ImageDraw.Draw(frame)
        for p in particles:
            py = H - ((t * p["speed"] * 10 + p["phase"] * 100) % (H + 100))
            px = p["x"] + math.sin(t * 1.5 + p["phase"]) * p["drift"] * 5
            pa = int(p["alpha_base"] * p_alpha * (0.5 + 0.5 * math.sin(t * 3 + p["phase"])))
            s = p["size"]
            pdraw.ellipse([px - s, py - s, px + s, py + s], fill=(*PURPLE, max(0, min(255, pa))))

    # HUD slide + scale
    if t < HUD_SLIDE_DUR:
        p = t / HUD_SLIDE_DUR
        hud_y = int(lerp(hud_y_start, hud_y_final, ease_out_cubic(p)))
        hud_scale = lerp(0.85, 1.0, ease_out_back(p))
        hud_alpha = int(255 * ease_out_cubic(p))
    else:
        hud_y, hud_scale, hud_alpha = hud_y_final, 1.0, 255

    glow_intensity = int(25 * math.sin((t - GLOW_START) * 3.5) * max(0, 1 - (t - GLOW_START) / 3)) if t > GLOW_START else 0

    if abs(hud_scale - 1.0) > 0.01:
        nw, nh = int(hud_w * hud_scale), int(hud_h * hud_scale)
        hud_scaled = hud_img.resize((nw, nh), Image.LANCZOS)
        hx, hy = hud_x + (hud_w - nw) // 2, hud_y + (hud_h - nh) // 2
    else:
        hud_scaled = hud_img; hx, hy = hud_x, hud_y

    if glow_intensity > 0:
        nw2, nh2 = hud_scaled.size
        gl = Image.new("RGBA", (nw2 + 20, nh2 + 20), (0, 0, 0, 0))
        gl.paste(hud_scaled, (10, 10), hud_scaled)
        r, g, b, a = gl.split()
        r = r.point(lambda x: min(255, x + glow_intensity))
        b = b.point(lambda x: min(255, x + glow_intensity * 2))
        gl = Image.merge("RGBA", (r, g, b, a)).filter(ImageFilter.GaussianBlur(8))
        gl = apply_alpha(gl, int(abs(glow_intensity) * 3))
        frame.paste(gl, (hx - 10, hy - 10), gl)

    frame.paste(apply_alpha(hud_scaled, hud_alpha), (hx, hy), apply_alpha(hud_scaled, hud_alpha))
    draw = ImageDraw.Draw(frame)

    # Avatar
    if avatar_img:
        av_cx, av_cy = hud_x + int(230 * S), hud_y + int(382 * S)
        if t >= AVATAR_START:
            p = min(1, (t - AVATAR_START) / AVATAR_DUR)
            av_scale, av_alpha = ease_out_back(p), int(255 * ease_out_cubic(p))
            if t >= AVATAR_START + AVATAR_DUR: av_scale, av_alpha = 1.0, 255
            av_size = max(1, int(avatar_size_base * av_scale))
            av = avatar_img.resize((av_size, av_size), Image.LANCZOS)
            av = apply_alpha(av, av_alpha)
            m = Image.new("L", (av_size, av_size), 0)
            ImageDraw.Draw(m).ellipse([0, 0, av_size - 1, av_size - 1], fill=255)
            m = m.point(lambda x: int(x * av_alpha / 255))
            frame.paste(av, (av_cx - av_size // 2, av_cy - av_size // 2), m)
            if t > AVATAR_START + AVATAR_DUR:
                ring_a = int(60 * (0.5 + 0.5 * math.sin(t * 4)))
                ring_r = av_size // 2 + int(8 * S)
                draw.ellipse([av_cx - ring_r, av_cy - ring_r, av_cx + ring_r, av_cy + ring_r],
                             outline=(*PURPLE, ring_a), width=3)

    # Team logo
    if team_logo_img:
        tl_cx, tl_cy = hud_x + int(1230 * S), hud_y + int(320 * S)
        if t >= LOGO_START:
            p = min(1, (t - LOGO_START) / LOGO_DUR)
            tl_scale, tl_alpha = ease_out_back(p), int(255 * ease_out_cubic(p))
            if t >= LOGO_START + LOGO_DUR: tl_scale, tl_alpha = 1.0, 255
            tl_size = max(1, int(logo_size_base * tl_scale))
            tl = team_logo_img.resize((tl_size, tl_size), Image.LANCZOS)
            tl = apply_alpha(tl, tl_alpha)
            tlm = Image.new("L", (tl_size, tl_size), 0)
            ImageDraw.Draw(tlm).ellipse([0, 0, tl_size - 1, tl_size - 1], fill=255)
            tlm = tlm.point(lambda x: int(x * tl_alpha / 255))
            frame.paste(tl, (tl_cx - tl_size // 2, tl_cy - tl_size // 2), tlm)

    # Name typewriter
    name = data["player"]
    name_font = ImageFont.truetype(ORBITRON_BLACK, max(10, int(36 * S)))
    if t >= NAME_START:
        chars = min(len(name), int((t - NAME_START) / NAME_CHAR_DELAY) + 1)
        text = name[:chars]
        draw.text((hud_x + int(750 * S), hud_y + int(290 * S)), text, font=name_font, fill=(*WHITE, 255), anchor="mt")
        name_end = NAME_START + len(name) * NAME_CHAR_DELAY
        if chars < len(name) or (t < name_end + 0.5 and int(t * 6) % 2 == 0):
            bbox = name_font.getbbox(text)
            if bbox:
                full_w = name_font.getbbox(name)[2] - name_font.getbbox(name)[0]
                vis_w = bbox[2] - bbox[0]
                cx = hud_x + int(750 * S) - full_w // 2 + vis_w + 4
                cy = hud_y + int(292 * S)
                draw.rectangle([cx, cy, cx + 3, cy + int(30 * S)], fill=(*PURPLE, 200))

    # Stats — aparecem junto com o HUD, sem delay
    stat_font_size = max(10, int(42 * S))
    stat_font = ImageFont.truetype(ORBITRON_BLACK, stat_font_size)
    stats = [
        (hud_x + int(530 * S), hud_y + int(465 * S), str(data["kills"])),
        (hud_x + int(840 * S), hud_y + int(465 * S), str(data["assists"])),
        (hud_x + int(1140 * S), hud_y + int(465 * S), str(data["headshots"])),
    ]
    if hud_alpha > 0:
        for sx, sy, val in stats:
            draw.text((sx, sy), val, font=stat_font, fill=(*WHITE, hud_alpha), anchor="mm")

    if fadeout_alpha < 1.0:
        frame = apply_alpha(frame, int(255 * fadeout_alpha))
    return frame


# ═══ MAIN PIPELINE ═══
def process_highlight(match_id, map_number, rank, highlight):
    """Processa um highlight: clip + HUD animado + intro → vídeo final."""
    kills, assists, headshots = get_highlight_stats(highlight)
    player = highlight["player"]
    steamid = highlight["steamid"]

    print(f"\n  [{player}] {highlight['description']}")
    print(f"  Kills: {kills} | Assists: {assists} | HS: {headshots}")

    # Encontrar clip gravado
    rec_dir = os.path.join(RECORDINGS_DIR, f"match_{match_id}_map_{map_number}")
    tick_pattern = f"tick-{highlight['tick_start']}-to-{highlight['tick_end']}"
    clip_path = None
    for root, dirs, files in os.walk(rec_dir):
        for f in files:
            if f.endswith(".mp4") and tick_pattern in f:
                clip_path = os.path.join(root, f)
    if not clip_path:
        # Fallback: procurar por rank no nome da pasta
        for root, dirs, files in os.walk(rec_dir):
            for f in files:
                if f.endswith(".mp4") and f"highlight_{rank}" in root:
                    clip_path = os.path.join(root, f)

    if not clip_path:
        print(f"  ERRO: Clip não encontrado em {rec_dir}")
        return None

    clip_duration = get_duration(clip_path)
    print(f"  Clip: {clip_path} ({clip_duration:.1f}s)")

    # Buscar team info
    team_name, team_logo_url = find_player_team(steamid)
    print(f"  Time: {team_name or 'N/A'}")

    # Preparar output
    out_dir = os.path.join(FINAL_DIR, f"match_{match_id}_map_{map_number}")
    os.makedirs(out_dir, exist_ok=True)
    work_dir = os.path.join(out_dir, f"_work_rank{rank}")
    frames_dir = os.path.join(work_dir, "hud_frames")
    os.makedirs(frames_dir, exist_ok=True)

    # Download assets
    avatar_path = os.path.join(work_dir, "avatar.jpg")
    logo_path = os.path.join(work_dir, "logo.jpg")
    avatar_ok = download_avatar(steamid, avatar_path)
    logo_ok = download_file(team_logo_url, logo_path) if team_logo_url else False

    # Load images
    hud_img = Image.open(HUD_IMG_PATH).convert("RGBA")
    font_name = ImageFont.truetype(ORBITRON_BLACK, 36)
    font_stat = ImageFont.truetype(ORBITRON_BLACK, 42)
    avatar_img = Image.open(avatar_path).convert("RGBA").resize((240, 240), Image.LANCZOS) if avatar_ok else None
    team_logo_img = Image.open(logo_path).convert("RGBA").resize((110, 110), Image.LANCZOS) if logo_ok else None

    random.seed(match_id * 100 + map_number * 10 + rank)
    particles = [{"x": random.randint(200, 1720), "speed": random.uniform(15, 40),
                   "size": random.randint(1, 3), "phase": random.uniform(0, math.pi * 2),
                   "drift": random.uniform(-8, 8), "alpha_base": random.randint(80, 200)}
                  for _ in range(25)]

    hud_data = {"player": player, "kills": kills, "assists": assists, "headshots": headshots}

    # Gerar HUD como PNG sequence (apenas frames onde HUD aparece)
    hud_total_frames = int(HUD_VISIBLE_DUR * FPS)
    print(f"  Gerando {hud_total_frames} frames de HUD...")

    for i in range(hud_total_frames):
        hud_t = i / FPS
        hud_frame = generate_hud_frame(hud_t, hud_img, avatar_img, team_logo_img,
                                        font_name, font_stat, particles, hud_data)
        hud_frame.save(os.path.join(frames_dir, f"hud_{i:04d}.png"))
        if (i + 1) % 120 == 0:
            print(f"    {i+1}/{hud_total_frames} ({(i+1)/hud_total_frames*100:.0f}%)")

    # Encode: overlay HUD sobre clip original (mantém áudio em sync)
    print(f"  Encodando vídeo com overlay...")
    clip_hud = os.path.join(work_dir, "clip_hud.mp4")

    # HUD como input com itsoffset para alinhar ao momento certo
    fade_out_start = max(0, clip_duration - 0.5)
    cmd = [
        FFMPEG, "-y",
        "-i", clip_path,
        "-itsoffset", str(HUD_APPEAR),
        "-framerate", str(FPS),
        "-i", os.path.join(frames_dir, "hud_%04d.png"),
        "-filter_complex",
        f"[0:v]eq=contrast=1.08:brightness=0.02:saturation=1.15,"
        f"unsharp=5:5:0.5:5:5:0,vignette=PI/5[base];"
        f"[1:v]format=rgba[hud];"
        f"[base][hud]overlay=0:0:eof_action=pass:shortest=0,"
        f"fade=t=in:st=0:d=0.5,"
        f"fade=t=out:st={fade_out_start}:d=0.5[vout]",
        "-map", "[vout]", "-map", "0:a",
        "-af", f"afade=t=in:st=0:d=0.5,afade=t=out:st={fade_out_start}:d=0.5",
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-shortest",
        clip_hud
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        print(f"  ERRO encode: {result.stderr[-500:]}")

    # Normalize intro (mesmo formato que clip: 1080p60, 44100Hz, libx264/aac)
    intro_norm = os.path.join(work_dir, "intro.mp4")
    cmd = [FFMPEG, "-y", "-i", INTRO_PATH,
           "-vf", f"scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:black,fps={FPS}",
           "-ar", "44100",
           "-c:v", "libx264", "-preset", "fast", "-crf", "18",
           "-c:a", "aac", "-b:a", "192k",
           "-pix_fmt", "yuv420p",
           "-video_track_timescale", "15360",
           intro_norm]
    subprocess.run(cmd, capture_output=True, text=True, timeout=120)

    # Normalize outro (mesmo formato)
    outro_norm = os.path.join(work_dir, "outro.mp4")
    if os.path.exists(OUTRO_PATH):
        cmd = [FFMPEG, "-y", "-i", OUTRO_PATH,
               "-vf", f"scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:black,fps={FPS}",
               "-ar", "44100",
               "-c:v", "libx264", "-preset", "fast", "-crf", "18",
               "-c:a", "aac", "-b:a", "192k",
               "-pix_fmt", "yuv420p",
               "-video_track_timescale", "15360",
               outro_norm]
        subprocess.run(cmd, capture_output=True, text=True, timeout=120)

    # Concat intro + clip + outro
    safe_name = player.replace(" ", "_").replace("/", "_")
    final_name = f"highlight_m{match_id}_map{map_number}_r{rank}_{safe_name}.mp4"
    final_path = os.path.join(out_dir, final_name)

    concat_list = os.path.join(work_dir, "concat.txt")
    with open(concat_list, "w") as f:
        if os.path.exists(intro_norm):
            f.write(f"file '{os.path.abspath(intro_norm).replace(chr(92), '/')}'\n")
        f.write(f"file '{os.path.abspath(clip_hud).replace(chr(92), '/')}'\n")
        if os.path.exists(outro_norm):
            f.write(f"file '{os.path.abspath(outro_norm).replace(chr(92), '/')}'\n")

    cmd = [FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", concat_list,
           "-c", "copy",
           "-movflags", "+faststart",
           final_path]
    subprocess.run(cmd, capture_output=True, text=True, timeout=120)

    # Cleanup work dir
    shutil.rmtree(work_dir, ignore_errors=True)

    if os.path.exists(final_path):
        size = os.path.getsize(final_path) / (1024 * 1024)
        dur = get_duration(final_path)
        print(f"  PRONTO: {final_name} ({dur:.1f}s, {size:.1f}MB)")
        return final_path
    return None


def process_match(match_id, map_number, rank=None):
    json_path = os.path.join(PARSED_DIR, f"match_{match_id}_map_{map_number}.json")
    if not os.path.exists(json_path):
        print(f"ERRO: {json_path} não encontrado")
        return

    with open(json_path) as f:
        data = json.load(f)

    highlights = data["highlights"]
    if rank:
        highlights = [h for h in highlights if h["rank"] == rank]

    print(f"\n{'='*60}")
    print(f"  ORBITAL ROXA - Post-Processing")
    print(f"  Match {match_id} Map {map_number} — {len(highlights)} highlight(s)")
    print(f"{'='*60}")

    results = []
    for h in highlights:
        path = process_highlight(match_id, map_number, h["rank"], h)
        if path:
            results.append(path)

    print(f"\n{'='*60}")
    print(f"  {len(results)}/{len(highlights)} vídeos gerados")
    for r in results:
        print(f"    {os.path.basename(r)}")
    print(f"{'='*60}")


def batch_process():
    rec_dirs = sorted([d for d in os.listdir(RECORDINGS_DIR) if d.startswith("match_")])
    print(f"Batch: {len(rec_dirs)} mapas com gravações")
    for d in rec_dirs:
        parts = d.replace("match_", "").split("_map_")
        process_match(int(parts[0]), int(parts[1]))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ORBITAL ROXA - Post-Process Highlights")
    parser.add_argument("match_id", nargs="?", type=int)
    parser.add_argument("map_number", nargs="?", type=int, default=0)
    parser.add_argument("--rank", type=int, help="Rank específico")
    parser.add_argument("--all", action="store_true", help="Processar todos os 3")
    parser.add_argument("--batch", action="store_true", help="Processar tudo")
    args = parser.parse_args()

    if args.batch:
        batch_process()
    elif args.match_id:
        rank = None if args.all else (args.rank or 1)
        process_match(args.match_id, args.map_number, rank)
    else:
        parser.print_help()
        print("\nExemplos:")
        print("  python postprocess.py 38 0              # highlight #1 do match 38")
        print("  python postprocess.py 38 0 --rank 2     # highlight #2")
        print("  python postprocess.py 38 0 --all        # todos os 3")
        print("  python postprocess.py --batch            # processa TUDO gravado")
