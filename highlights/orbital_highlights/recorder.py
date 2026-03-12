"""
Módulo de gravação de clips via CSDM CLI (CS Demo Manager).
Abre CS2, reproduz a demo nos ticks especificados e grava em MP4.
"""
import os
import subprocess
from .config import CSDM


def record_clips(highlights, demo_path, output_dir="output"):
    """Gera videos dos highlights usando csdm video (CS Demo Manager CLI)."""
    os.makedirs(output_dir, exist_ok=True)
    demo_abs = os.path.abspath(demo_path)

    # Analisar a demo no banco do CSDM
    print("\n[CSDM] Analisando demo no banco de dados...")
    analyze_cmd = [CSDM, "analyze", demo_abs, "--source", "valve", "--force"]
    result = subprocess.run(analyze_cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        print(f"  AVISO: analyze retornou erro (pode já estar no banco): {result.stderr}")
    else:
        print("  Demo analisada com sucesso.")

    # Gerar video para cada highlight
    for i, h in enumerate(highlights, 1):
        clip_name = f"highlight_{i}_r{h['round']+1}_{h['player'].replace(' ', '_')}"
        clip_output = os.path.join(output_dir, clip_name)
        os.makedirs(clip_output, exist_ok=True)

        print(f"\n[CSDM] Gerando video #{i}: {h['description']}")
        print(f"  Ticks: {h['tick_start']} -> {h['tick_end']}")
        print(f"  Focus: {h['player']} ({h['steamid']})")

        cmd = [
            CSDM, "video", demo_abs,
            str(h["tick_start"]), str(h["tick_end"]),
            "--recording-system", "HLAE",
            "--encoder-software", "FFmpeg",
            "--framerate", "60",
            "--width", "1920", "--height", "1080",
            "--ffmpeg-video-container", "mp4",
            "--ffmpeg-video-codec", "libx264",
            "--ffmpeg-audio-codec", "aac",
            "--no-show-x-ray",
            "--focus-player", h["steamid"],
            "--output", clip_output,
            "--close-game-after-recording",
            "--verbose",
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            if result.returncode == 0:
                print(f"  Video gerado em: {clip_output}")
            else:
                print(f"  ERRO: {result.stderr}")
        except subprocess.TimeoutExpired:
            print(f"  TIMEOUT: gravação demorou mais de 10 minutos")

    print(f"\n[CSDM] Todos os videos gerados em: {output_dir}")
