"""
Módulo de pós-processamento de highlights.
Aplica efeitos: color grading, HUD cyberpunk, intro, outro, concatenação final.
"""
import os
import json
import subprocess
import shutil
from .config import (
    FFMPEG, FFPROBE, LOGO_WHITE, INTRO_VIDEO,
    FONT_BOLD, FONT_LIGHT, FONT_MONO,
    WIDTH, HEIGHT, FRAMERATE, CRF, PRESET,
    FADE_DURATION, OUTRO_DURATION,
    COLOR_ACCENT, COLOR_ACCENT_LIGHT, COLOR_BG, COLOR_WHITE,
    HUD_CARD_WIDTH, HUD_CARD_HEIGHT, HUD_CARD_Y,
    HUD_SHOW_AT, HUD_ANIM_IN, HUD_ANIM_OUT, HUD_HOLD,
)


def run_ffmpeg(cmd, timeout=300):
    """Executa FFmpeg e retorna sucesso."""
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if result.returncode != 0:
        stderr = result.stderr
        error_lines = [l for l in stderr.split('\n')
                       if any(w in l.lower() for w in ['error', 'failed', 'undefined', 'invalid'])]
        if error_lines:
            print(f"  ERRO: {' | '.join(error_lines[:3])}")
        else:
            print(f"  ERRO FFmpeg (code {result.returncode})")
        return False
    return True


def get_video_duration(video_path):
    """Retorna duração do video em segundos."""
    cmd = [
        FFPROBE, "-v", "quiet",
        "-print_format", "json",
        "-show_format", video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    data = json.loads(result.stdout)
    return float(data["format"]["duration"])


def generate_intro(output_path):
    """Converte o video de intro customizado para 1080p/60fps."""
    if not os.path.exists(INTRO_VIDEO):
        print(f"  AVISO: Intro não encontrada em {INTRO_VIDEO}")
        return False

    cmd = [
        FFMPEG, "-y",
        "-i", INTRO_VIDEO,
        "-vf", f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,"
               f"pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2:black,"
               f"fps={FRAMERATE}",
        "-ar", "44100",
        "-c:v", "libx264", "-preset", PRESET, "-crf", str(CRF),
        "-c:a", "aac", "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        output_path
    ]
    return run_ffmpeg(cmd)


def build_hud_filters(player, multikill, rank, round_num, kills_count, hs_count,
                       weapon_text, score, duration):
    """Gera filtros FFmpeg para o HUD card estilo cyberpunk centralizado."""
    CW = HUD_CARD_WIDTH
    CH = HUD_CARD_HEIGHT
    CX = (WIDTH - CW) // 2
    CY = HUD_CARD_Y

    SHOW_AT = HUD_SHOW_AT
    ANIM_IN = HUD_ANIM_IN
    HOLD = min(HUD_HOLD, duration - 2.0)
    ANIM_OUT_DUR = HUD_ANIM_OUT
    HIDE_AT = SHOW_AT + ANIM_IN + HOLD

    def alpha_expr(delay=0):
        t_in = SHOW_AT + delay
        t_in_end = t_in + ANIM_IN
        t_out = HIDE_AT + delay * 0.5
        t_out_end = t_out + ANIM_OUT_DUR
        return (f"if(lt(t,{t_in}),0,"
                f"if(lt(t,{t_in_end}),(t-{t_in})/{ANIM_IN},"
                f"if(lt(t,{t_out}),1,"
                f"if(lt(t,{t_out_end}),({t_out_end}-t)/{ANIM_OUT_DUR},0))))")

    enable = f"enable='between(t,{SHOW_AT},{HIDE_AT + ANIM_OUT_DUR})'"
    ACCENT = COLOR_ACCENT
    ACCENT_L = COLOR_ACCENT_LIGHT

    parts = []

    # Background
    parts.append(f"drawbox=x={CX}:y={CY}:w={CW}:h={CH}:color=0x{COLOR_BG}@0.9:t=fill:{enable}")

    # Bordas
    parts.append(f"drawbox=x={CX}:y={CY}:w={CW}:h=3:color=0x{ACCENT}@0.9:t=fill:{enable}")
    parts.append(f"drawbox=x={CX}:y={CY+CH-1}:w={CW}:h=1:color=0x{ACCENT}@0.3:t=fill:{enable}")
    parts.append(f"drawbox=x={CX}:y={CY}:w=1:h={CH}:color=0x{ACCENT}@0.3:t=fill:{enable}")
    parts.append(f"drawbox=x={CX+CW-1}:y={CY}:w=1:h={CH}:color=0x{ACCENT}@0.3:t=fill:{enable}")

    # Corner accents
    c, ct = 30, 3
    for cx, cy in [(CX, CY), (CX+CW-c, CY), (CX, CY+CH-ct), (CX+CW-c, CY+CH-ct)]:
        parts.append(f"drawbox=x={cx}:y={cy}:w={c}:h={ct}:color=0x{ACCENT}:t=fill:{enable}")
    for cx, cy in [(CX, CY), (CX+CW-ct, CY), (CX, CY+CH-c), (CX+CW-ct, CY+CH-c)]:
        parts.append(f"drawbox=x={cx}:y={cy}:w={ct}:h={c}:color=0x{ACCENT}:t=fill:{enable}")

    # Indicador lateral
    parts.append(f"drawbox=x={CX}:y={CY+25}:w=5:h=45:color=0x{ACCENT}:t=fill:{enable}")

    # Glow line topo
    parts.append(f"drawbox=x={CX+80}:y={CY+3}:w={CW-160}:h=1:color=0x{ACCENT_L}@0.2:t=fill:{enable}")

    # Separador
    sep_y = CY + 70
    parts.append(f"drawbox=x={CX+20}:y={sep_y}:w={CW-40}:h=1:color=0x{ACCENT}@0.2:t=fill:{enable}")

    # Player name
    parts.append(
        f"drawtext=fontfile='{FONT_BOLD}':"
        f"text='{player}':fontcolor=0x{COLOR_WHITE}:fontsize=50:"
        f"x={CX+25}:y={CY+14}:"
        f"alpha='{alpha_expr(0)}'"
    )

    # Multi-kill badge
    badge_x = CX + 25 + len(player) * 29 + 20
    parts.append(
        f"drawtext=fontfile='{FONT_BOLD}':"
        f"text='{multikill}':fontcolor=0x{ACCENT}:fontsize=50:"
        f"x={badge_x}:y={CY+14}:"
        f"alpha='{alpha_expr(0.05)}'"
    )

    # Rank indicator
    parts.append(
        f"drawtext=fontfile='{FONT_MONO}':"
        f"text='#{rank} HIGHLIGHT':fontcolor=0x{ACCENT}@0.7:fontsize=15:"
        f"x={CX+CW-160}:y={CY+12}:"
        f"alpha='{alpha_expr(0.15)}'"
    )

    # Branding
    parts.append(
        f"drawtext=fontfile='{FONT_MONO}':"
        f"text='ORBITAL ROXA':fontcolor=0x{ACCENT}@0.4:fontsize=12:"
        f"x={CX+CW-140}:y={CY+32}:"
        f"alpha='{alpha_expr(0.2)}'"
    )

    # Stat boxes
    stat_y = sep_y + 12
    stat_h = 55
    gap = 12
    stats = [
        ("ROUND", str(round_num), 120),
        ("KILLS", str(kills_count), 100),
        ("HEADSHOTS", str(hs_count), 140),
        ("WEAPON", weapon_text, 160),
        ("SCORE", str(score), 120),
    ]

    sx = CX + 25
    for i, (label, value, bw) in enumerate(stats):
        delay = 0.08 * i
        parts.append(f"drawbox=x={sx}:y={stat_y}:w={bw}:h={stat_h}:color=0x{ACCENT}@0.06:t=fill:{enable}")
        parts.append(f"drawbox=x={sx}:y={stat_y}:w={bw}:h=1:color=0x{ACCENT}@0.35:t=fill:{enable}")
        parts.append(
            f"drawtext=fontfile='{FONT_MONO}':"
            f"text='{label}':fontcolor=0x{ACCENT}:fontsize=12:"
            f"x={sx+10}:y={stat_y+8}:"
            f"alpha='{alpha_expr(0.1 + delay)}'"
        )
        parts.append(
            f"drawtext=fontfile='{FONT_BOLD}':"
            f"text='{value}':fontcolor=0x{COLOR_WHITE}:fontsize=28:"
            f"x={sx+10}:y={stat_y+24}:"
            f"alpha='{alpha_expr(0.15 + delay)}'"
        )
        sx += bw + gap

    # Scanline decorativa
    parts.append(f"drawbox=x={CX+20}:y={CY-4}:w={CW-40}:h=1:color=0x{ACCENT}@0.1:t=fill:{enable}")

    return ",".join(parts)


def process_clip(input_path, output_path, highlight_info, tick_rate=64):
    """Aplica efeitos: color grading, vignette, HUD overlay, fade."""
    duration = get_video_duration(input_path)

    player = highlight_info["player"]
    kills_count = highlight_info["kills_count"]
    round_num = highlight_info["round"]
    rank = highlight_info.get("rank", 1)
    score = highlight_info.get("score", 0)

    weapons = list(set(k["weapon"] for k in highlight_info["kills"]))
    weapon_text = ", ".join(weapons).upper()
    hs_count = sum(1 for k in highlight_info["kills"] if k.get("headshot"))

    if kills_count >= 5: multikill = "ACE"
    elif kills_count == 4: multikill = "4K"
    elif kills_count == 3: multikill = "3K"
    elif kills_count == 2: multikill = "2K"
    else: multikill = "1K"

    fade_out_start = max(0, duration - FADE_DURATION)

    hud_filter = build_hud_filters(
        player, multikill, rank, round_num, kills_count,
        hs_count, weapon_text, score, duration
    )

    filter_complex = (
        f"[0:v]eq=contrast=1.08:brightness=0.02:saturation=1.15,"
        f"unsharp=5:5:0.5:5:5:0[s1];"
        f"[s1]vignette=PI/5,format=yuv420p[s2];"
        f"[s2]{hud_filter},"
        f"fade=t=in:st=0:d={FADE_DURATION},"
        f"fade=t=out:st={fade_out_start}:d={FADE_DURATION}[vout]"
    )

    audio_filter = (
        f"afade=t=in:st=0:d={FADE_DURATION},"
        f"afade=t=out:st={fade_out_start}:d={FADE_DURATION}"
    )

    cmd = [
        FFMPEG, "-y",
        "-i", input_path,
        "-filter_complex", filter_complex,
        "-af", audio_filter,
        "-map", "[vout]", "-map", "0:a",
        "-c:v", "libx264", "-preset", PRESET, "-crf", str(CRF),
        "-c:a", "aac", "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        output_path
    ]

    print(f"  Processando: {os.path.basename(input_path)}")
    print(f"  Player: {player} | {multikill} | Round {round_num}")
    ok = run_ffmpeg(cmd)
    if ok:
        print(f"  OK: {os.path.basename(output_path)}")
    return ok


def generate_outro(output_path):
    """Gera clip de outro com logo e URL do site."""
    d = OUTRO_DURATION

    filter_complex = (
        f"color=c=black:s={WIDTH}x{HEIGHT}:d={d}:r={FRAMERATE}[bg];"
        f"[1:v]scale=200:-1,format=rgba[logo];"
        f"[bg][logo]overlay=(W-w)/2:(H-h)/2-50:format=auto,"
        f"drawtext=fontfile='{FONT_LIGHT}':"
        f"text='orbitalroxa.com.br':"
        f"fontcolor=0x{COLOR_ACCENT}:fontsize=30:"
        f"x=(w-text_w)/2:y=(h/2)+70:"
        f"alpha='if(lt(t,0.3),t/0.3,if(gt(t,{d-0.5}),({d}-t)/0.5,1))',"
        f"fade=t=in:st=0:d=0.5,fade=t=out:st={d-0.5}:d=0.5"
        f"[vout]"
    )

    cmd = [
        FFMPEG, "-y",
        "-f", "lavfi", "-i", f"color=c=black:s={WIDTH}x{HEIGHT}:d={d}:r={FRAMERATE}",
        "-i", LOGO_WHITE,
        "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=stereo",
        "-filter_complex", filter_complex,
        "-map", "[vout]", "-map", "2:a",
        "-t", str(d),
        "-c:v", "libx264", "-preset", PRESET, "-crf", str(CRF),
        "-c:a", "aac", "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        output_path
    ]
    return run_ffmpeg(cmd)


def concat_clips(clip_paths, output_path):
    """Concatena clips em um video final."""
    list_file = os.path.join(os.path.dirname(output_path), "_concat_list.txt")
    with open(list_file, "w", encoding="utf-8") as f:
        for p in clip_paths:
            abs_path = os.path.abspath(p).replace("\\", "/")
            f.write(f"file '{abs_path}'\n")

    cmd = [
        FFMPEG, "-y",
        "-f", "concat", "-safe", "0",
        "-i", list_file,
        "-c", "copy",
        "-movflags", "+faststart",
        output_path
    ]

    ok = run_ffmpeg(cmd, timeout=600)
    if os.path.exists(list_file):
        os.remove(list_file)
    return ok


def postprocess(highlights_json, clips_dir, output_dir=None):
    """Pipeline principal de pós-processamento."""
    print(f"\n{'='*60}")
    print(f"  ORBITAL ROXA - Post-Processing Pipeline")
    print(f"{'='*60}\n")

    with open(highlights_json, "r", encoding="utf-8") as f:
        data = json.load(f)

    highlights = data["highlights"]
    tick_rate = data["tick_rate"]

    if output_dir is None:
        output_dir = os.path.join(clips_dir, "processed")
    os.makedirs(output_dir, exist_ok=True)

    clip_files = sorted([f for f in os.listdir(clips_dir) if f.endswith(".mp4")])

    if not clip_files:
        print("ERRO: Nenhum clip .mp4 encontrado em", clips_dir)
        return

    print(f"  Clips encontrados: {len(clip_files)}")
    print(f"  Highlights: {len(highlights)}")

    clip_highlight_map = []
    for h in highlights:
        pattern = f"tick-{h['tick_start']}-to-{h['tick_end']}"
        matched = next((cf for cf in clip_files if pattern in cf), None)
        if matched:
            clip_highlight_map.append((matched, h))
        else:
            print(f"  AVISO: Clip não encontrado para {h['description']}")

    if not clip_highlight_map:
        print("ERRO: Nenhum clip mapeado para highlights!")
        return

    # 1. Intro
    print("\n[1/4] Gerando intro...")
    intro_path = os.path.join(output_dir, "_intro.mp4")
    intro_ok = generate_intro(intro_path)
    print(f"  {'OK' if intro_ok else 'Falhou (continuando sem intro)'}")

    # 2. Processar clips (rank reverso = clímax no final)
    print("\n[2/4] Processando clips...")
    processed_clips = []
    clip_highlight_map.sort(key=lambda x: x[1]["rank"], reverse=True)

    for clip_file, h in clip_highlight_map:
        input_path = os.path.join(clips_dir, clip_file)
        out_name = f"processed_{h['rank']}_{h['player'].replace(' ', '_')}_r{h['round']}.mp4"
        out_path = os.path.join(output_dir, out_name)

        if process_clip(input_path, out_path, h, tick_rate):
            processed_clips.append(out_path)

    # 3. Outro
    print("\n[3/4] Gerando outro...")
    outro_path = os.path.join(output_dir, "_outro.mp4")
    outro_ok = generate_outro(outro_path)
    print(f"  {'OK' if outro_ok else 'Falhou (continuando sem outro)'}")

    # 4. Concatenar
    print("\n[4/4] Concatenando video final...")
    final_parts = []
    if intro_ok:
        final_parts.append(intro_path)
    final_parts.extend(processed_clips)
    if outro_ok:
        final_parts.append(outro_path)

    final_output = os.path.join(output_dir, "ORBITAL_ROXA_HIGHLIGHTS.mp4")

    if len(final_parts) > 1:
        if concat_clips(final_parts, final_output):
            final_size = os.path.getsize(final_output) / (1024 * 1024)
            print(f"\n{'='*60}")
            print(f"  VIDEO FINAL: {final_output}")
            print(f"  Tamanho: {final_size:.1f} MB")
            print(f"  Clips: {len(processed_clips)} highlights")
            print(f"{'='*60}")
    elif len(final_parts) == 1:
        shutil.copy2(final_parts[0], final_output)
        print(f"  Video final: {final_output}")

    print(f"\n  Clips individuais em: {output_dir}")
    for pc in processed_clips:
        size_mb = os.path.getsize(pc) / (1024 * 1024)
        print(f"    - {os.path.basename(pc)} ({size_mb:.1f} MB)")
