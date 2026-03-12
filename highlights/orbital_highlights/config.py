"""
Configurações centralizadas do sistema de highlights.
Ajuste os paths conforme seu ambiente.
"""
import os

# ============================================================
# PATHS
# ============================================================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")

# FFmpeg / FFprobe
FFMPEG = os.environ.get(
    "FFMPEG_PATH",
    r"C:\Users\vancimj\.csdm\ffmpeg-n8.0-latest-win64-gpl-8.0\bin\ffmpeg.exe"
)
FFPROBE = os.environ.get(
    "FFPROBE_PATH",
    r"C:\Users\vancimj\.csdm\ffmpeg-n8.0-latest-win64-gpl-8.0\bin\ffprobe.exe"
)

# CSDM CLI
CSDM = os.environ.get(
    "CSDM_PATH",
    r"C:\Users\vancimj\AppData\Local\Programs\cs-demo-manager\csdm.cmd"
)

# Assets
INTRO_VIDEO = os.path.join(ASSETS_DIR, "orbital_intro.mp4")
LOGO_WHITE = os.path.join(ASSETS_DIR, "orbital_roxa_logo_white.png")
LOGO_ICON = os.path.join(ASSETS_DIR, "Logo_Orbital_1.png")

# Fontes (Windows)
FONT_BOLD = "C\\:/Windows/Fonts/impact.ttf"
FONT_LIGHT = "C\\:/Windows/Fonts/segoeui.ttf"
FONT_MONO = "C\\:/Windows/Fonts/consolab.ttf"

# ============================================================
# VIDEO
# ============================================================
WIDTH = 1920
HEIGHT = 1080
FRAMERATE = 60
CRF = 18
PRESET = "fast"

# ============================================================
# CLIP TIMING
# ============================================================
CLIP_PRE_SECONDS = 5      # segundos antes da primeira kill
CLIP_POST_SECONDS = 3     # segundos depois da última kill
FADE_DURATION = 0.5       # fade in/out dos clips
OUTRO_DURATION = 2.0      # duração do outro

# ============================================================
# SCORING - Pesos para ranquear highlights
# ============================================================
SCORES = {
    "kill": 10,
    "headshot": 5,
    "wallbang": 8,
    "noscope": 12,
    "smoke_kill": 10,
    "blind_kill": 10,
    "knife_kill": 25,
    "2k": 25,
    "3k": 50,
    "4k": 80,
    "ace": 150,
    "rapid_kill": 15,   # <3s entre kills
}

# ============================================================
# CORES - Tema ORBITAL ROXA
# ============================================================
COLOR_ACCENT = "A855F7"
COLOR_ACCENT_LIGHT = "C084FC"
COLOR_BG = "0A0A0A"
COLOR_WHITE = "FFFFFF"

# ============================================================
# HUD OVERLAY
# ============================================================
HUD_CARD_WIDTH = 750
HUD_CARD_HEIGHT = 170
HUD_CARD_Y = 860
HUD_SHOW_AT = 0.5         # quando o HUD aparece (segundos)
HUD_ANIM_IN = 0.6         # duração do fade in
HUD_ANIM_OUT = 0.5        # duração do fade out
HUD_HOLD = 3.5            # tempo que fica visível
