"""
Modulo de gravacao de clips via CSDM CLI (CS Demo Manager).
Abre CS2, reproduz a demo nos ticks especificados e grava em MP4.
"""
import os
import subprocess
from .config import CSDM


def _steamid64_to_accountid(steamid64):
    """Converte SteamID64 para AccountID."""
    return int(steamid64) - 76561197960265728


def record_clips(highlights, demo_path, output_dir="output"):
    """Gera videos dos highlights usando csdm video (CS Demo Manager CLI)."""
    output_dir = os.path.abspath(output_dir)
    os.makedirs(output_dir, exist_ok=True)
    demo_abs = os.path.abspath(demo_path)

    # Analisar a demo no banco do CSDM
    print("\n[CSDM] Analisando demo no banco de dados...")
    analyze_cmd = [CSDM, "analyze", demo_abs, "--source", "valve", "--force"]
    result = subprocess.run(analyze_cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        print(f"  AVISO: analyze retornou erro (pode ja estar no banco): {result.stderr}")
    else:
        print("  Demo analisada com sucesso.")

    total = len(highlights)
    for i, h in enumerate(highlights, 1):
        clip_name = f"highlight_{i}_r{h['round']+1}_{h['player'].replace(' ', '_')}"
        clip_output = os.path.abspath(os.path.join(output_dir, clip_name))
        os.makedirs(clip_output, exist_ok=True)

        print(f"\n[CSDM] Gerando video #{i}/{total}: {h['description']}")
        print(f"  Ticks: {h['tick_start']} -> {h['tick_end']}")
        print(f"  Focus: {h['player']} (steamid={h['steamid']})")

        cmd = [
            CSDM, "video", demo_abs,
            str(h["tick_start"]), str(h["tick_end"]),
            "--focus-player", h["steamid"],
            "--recording-system", "HLAE",
            "--encoder-software", "FFmpeg",
            "--framerate", "60",
            "--width", "1920", "--height", "1080",
            "--ffmpeg-video-container", "mp4",
            "--ffmpeg-video-codec", "libx264",
            "--ffmpeg-audio-codec", "aac",
            "--no-show-x-ray",
            "--output", clip_output,
            "--verbose",
            "--close-game-after-recording",
        ]

        try:
            print(f"  CMD: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            if result.stdout:
                print(f"  STDOUT: {result.stdout}")
            if result.stderr:
                print(f"  STDERR: {result.stderr}")
            if result.returncode == 0:
                mp4_found = False
                for root, dirs, files in os.walk(clip_output):
                    for f in files:
                        if f.endswith(".mp4"):
                            mp4_found = True
                            print(f"  Video gerado: {os.path.join(root, f)}")
                if not mp4_found:
                    print(f"  AVISO: CSDM retornou sucesso mas nenhum MP4 encontrado em {clip_output}")
            else:
                print(f"  ERRO (code {result.returncode})")
        except subprocess.TimeoutExpired:
            print(f"  TIMEOUT: gravacao demorou mais de 10 minutos")

    print(f"\n[CSDM] Todos os videos gerados em: {output_dir}")
