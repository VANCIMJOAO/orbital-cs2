#!/usr/bin/env python3
"""
ORBITAL ROXA - Worker Automatizado de Highlights
Monitora partidas finalizadas e processa highlights automaticamente.

Uso:
  python worker.py                    # roda uma vez
  python worker.py --daemon           # roda em loop contínuo
  python worker.py --match 44         # processa match específico
  python worker.py --match 44 --map 1 # processa mapa específico

Fluxo por match/mapa:
  1. Verifica se match tem highlights pendentes
  2. Baixa demo do G5API (ou usa local)
  3. Parseia demo → extrai top 3 highlights
  4. Grava clips via CSDM (abre CS2)
  5. Pós-processa com HUD animado + intro/outro
  6. Upload para G5API

Requer:
  - Docker: csdm-postgres rodando
  - CS2 instalado (para gravação via CSDM)
  - Python deps: demoparser2, Pillow, requests
"""
import os
import sys
import json
import time
import signal
import argparse
import requests
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from worker_config import G5API_URL, HIGHLIGHTS_API_KEY, POLL_INTERVAL, TOP_N, DEMOS_DIR
from orbital_highlights.extractor import find_highlights
from orbital_highlights.config import BASE_DIR

# Directories
PARSED_DIR = os.path.join(BASE_DIR, "parsed_highlights")
RECORDINGS_DIR = os.path.join(BASE_DIR, "recordings")
FINAL_DIR = os.path.join(BASE_DIR, "final_videos")

for d in [DEMOS_DIR, PARSED_DIR, RECORDINGS_DIR, FINAL_DIR]:
    os.makedirs(d, exist_ok=True)

# Graceful shutdown
running = True
def handle_signal(sig, frame):
    global running
    print(f"\n[Worker] Recebido sinal {sig}, finalizando...")
    running = False

signal.signal(signal.SIGINT, handle_signal)
signal.signal(signal.SIGTERM, handle_signal)


def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")


def api_get(endpoint):
    """GET request to G5API."""
    try:
        r = requests.get(f"{G5API_URL}{endpoint}", timeout=15)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        log(f"  API GET {endpoint} erro: {e}")
        return None


def api_get_frontend(endpoint):
    """GET request to frontend API (for highlights)."""
    frontend_url = os.environ.get("FRONTEND_URL", "https://www.orbitalroxa.com.br")
    try:
        r = requests.get(f"{frontend_url}{endpoint}", timeout=15)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        log(f"  Frontend GET {endpoint} erro: {e}")
        return None


def get_finished_matches():
    """Get all finished matches from G5API."""
    data = api_get("/matches")
    if not data:
        return []
    matches = data.get("matches", [])
    return [m for m in matches if m.get("end_time") and not m.get("cancelled")]


def get_match_highlights(match_id):
    """Check if match already has highlights."""
    data = api_get_frontend(f"/api/highlights/{match_id}")
    if not data:
        return []
    return data.get("clips", [])


def get_map_stats(match_id):
    """Get map stats for a match."""
    data = api_get(f"/mapstats/{match_id}")
    if not data:
        return []
    return data.get("mapstats", data.get("mapStats", []))


def download_demo(match_id, map_number, map_stats):
    """Download demo from G5API. Returns path to .dem file or None."""
    if not map_stats or map_number >= len(map_stats):
        log(f"  Sem mapstats para match {match_id} map {map_number}")
        return None

    ms = map_stats[map_number]
    demo_file = ms.get("demoFile")
    if not demo_file:
        log(f"  Sem demo para match {match_id} map {map_number}")
        return None

    # Check if already downloaded
    dem_name = demo_file.replace(".zip", ".dem")
    local_dem = os.path.join(DEMOS_DIR, dem_name)
    if os.path.exists(local_dem):
        log(f"  Demo já existe: {dem_name}")
        return local_dem

    # Download from G5API
    url = f"{G5API_URL}/demo/{demo_file}"
    log(f"  Baixando demo: {demo_file}...")
    try:
        r = requests.get(url, stream=True, timeout=300)
        r.raise_for_status()

        zip_path = os.path.join(DEMOS_DIR, demo_file)
        with open(zip_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)

        # Extract if zip
        if demo_file.endswith(".zip"):
            import zipfile
            with zipfile.ZipFile(zip_path, "r") as zf:
                zf.extractall(DEMOS_DIR)
            os.remove(zip_path)
            if os.path.exists(local_dem):
                return local_dem
            # Find extracted .dem
            for f in os.listdir(DEMOS_DIR):
                if f.endswith(".dem") and str(match_id) in f:
                    return os.path.join(DEMOS_DIR, f)
        else:
            # Already a .dem
            return zip_path

    except Exception as e:
        log(f"  Erro ao baixar demo: {e}")
        return None

    return None


def parse_demo(demo_path, match_id, map_number):
    """Parse demo and extract highlights. Returns list of highlights."""
    json_path = os.path.join(PARSED_DIR, f"match_{match_id}_map_{map_number}.json")

    # Check cache
    if os.path.exists(json_path):
        with open(json_path) as f:
            data = json.load(f)
        log(f"  Parse cache: {len(data.get('highlights', []))} highlights")
        return data.get("highlights", [])

    log(f"  Parseando demo...")
    try:
        highlights = find_highlights(demo_path, top_n=TOP_N)
        # Save cache
        data = {
            "match_id": match_id,
            "map_number": map_number,
            "demo": os.path.basename(demo_path),
            "highlights": highlights,
        }
        with open(json_path, "w") as f:
            json.dump(data, f, indent=2)
        log(f"  {len(highlights)} highlights encontrados")
        return highlights
    except Exception as e:
        log(f"  Erro ao parsear: {e}")
        return []


def record_highlight(highlight, demo_path, output_dir):
    """Record a single highlight clip via CSDM. Returns clip path or None."""
    from orbital_highlights.recorder import record_clips

    rank = highlight.get("rank", 1)
    player = highlight.get("player_name", "unknown")
    sub_dir = os.path.join(output_dir, f"highlight_{rank}_r{highlight.get('round', 0)}_{player}")

    # Check if already recorded
    if os.path.exists(sub_dir):
        for f in os.listdir(sub_dir):
            if f.endswith(".mp4"):
                clip = os.path.join(sub_dir, f)
                log(f"  Clip já gravado: {os.path.basename(clip)}")
                return clip

    log(f"  Gravando clip #{rank} ({player})...")
    try:
        record_clips([highlight], demo_path, output_dir)
        # Find generated clip
        if os.path.exists(sub_dir):
            for f in os.listdir(sub_dir):
                if f.endswith(".mp4"):
                    return os.path.join(sub_dir, f)
    except Exception as e:
        log(f"  Erro ao gravar: {e}")
    return None


def postprocess_highlight(clip_path, highlight, match_id, map_number):
    """Post-process clip with HUD overlay. Returns final video path or None."""
    rank = highlight.get("rank", 1)
    player = highlight.get("player_name", "unknown").replace(" ", "_")
    final_dir = os.path.join(FINAL_DIR, f"match_{match_id}_map_{map_number}")
    os.makedirs(final_dir, exist_ok=True)
    final_path = os.path.join(final_dir, f"highlight_m{match_id}_map{map_number}_r{rank}_{player}.mp4")

    if os.path.exists(final_path):
        log(f"  Final já existe: {os.path.basename(final_path)}")
        return final_path

    log(f"  Pós-processando #{rank}...")
    try:
        # Import postprocess module
        sys.path.insert(0, BASE_DIR)
        from postprocess import postprocess_clip
        result = postprocess_clip(clip_path, highlight, match_id, map_number, rank)
        if result and os.path.exists(result):
            return result
        elif os.path.exists(final_path):
            return final_path
    except Exception as e:
        log(f"  Erro no pós-processamento: {e}")
    return None


def upload_highlight(video_path, highlight, match_id, map_number, rank):
    """Upload final video to G5API. Returns True on success."""
    log(f"  Uploading #{rank}...")
    try:
        sys.path.insert(0, BASE_DIR)
        from upload import upload_single
        success = upload_single(video_path, highlight, match_id, map_number, rank)
        if success:
            log(f"  Upload OK: {os.path.basename(video_path)}")
        return success
    except Exception as e:
        log(f"  Erro no upload: {e}")
        return False


def process_match_map(match_id, map_number, map_stats):
    """Process all highlights for a single match/map."""
    log(f"\n{'='*50}")
    log(f"Match {match_id} Map {map_number}")
    log(f"{'='*50}")

    # 1. Download demo
    demo_path = download_demo(match_id, map_number, map_stats)
    if not demo_path:
        log("  SKIP: demo não disponível")
        return False

    # 2. Parse
    highlights = parse_demo(demo_path, match_id, map_number)
    if not highlights:
        log("  SKIP: nenhum highlight encontrado")
        return False

    # 3. Record + Postprocess + Upload each highlight
    output_dir = os.path.join(RECORDINGS_DIR, f"match_{match_id}_map_{map_number}")
    os.makedirs(output_dir, exist_ok=True)

    success_count = 0
    for hl in highlights:
        rank = hl.get("rank", 1)

        # Record
        clip_path = record_highlight(hl, demo_path, output_dir)
        if not clip_path:
            log(f"  FALHA: gravação #{rank}")
            continue

        # Postprocess
        final_path = postprocess_highlight(clip_path, hl, match_id, map_number)
        if not final_path:
            log(f"  FALHA: pós-processamento #{rank}")
            continue

        # Upload
        if upload_highlight(final_path, hl, match_id, map_number, rank):
            success_count += 1

    log(f"\n  Resultado: {success_count}/{len(highlights)} highlights processados")
    return success_count > 0


def find_pending_matches():
    """Find matches that are finished but don't have all highlights."""
    matches = get_finished_matches()
    pending = []

    for m in matches:
        match_id = m["id"]
        clips = get_match_highlights(match_id)
        ready_clips = [c for c in clips if c.get("status") == "ready" and c.get("video_file")]

        map_stats = get_map_stats(match_id)
        expected_clips = len(map_stats) * TOP_N if map_stats else TOP_N

        if len(ready_clips) < expected_clips:
            pending.append({
                "match_id": match_id,
                "map_stats": map_stats,
                "existing_clips": len(ready_clips),
                "expected_clips": expected_clips,
                "team1": m.get("team1_string", "?"),
                "team2": m.get("team2_string", "?"),
            })

    return pending


def run_once():
    """Run one cycle: find pending matches and process them."""
    log("Buscando partidas pendentes...")
    pending = find_pending_matches()

    if not pending:
        log("Nenhuma partida pendente.")
        return

    log(f"{len(pending)} partida(s) com highlights faltando:")
    for p in pending:
        log(f"  #{p['match_id']} {p['team1']} vs {p['team2']} — {p['existing_clips']}/{p['expected_clips']} clips")

    for p in pending:
        if not running:
            break

        match_id = p["match_id"]
        map_stats = p["map_stats"]

        if not map_stats:
            log(f"\n  Match {match_id}: sem mapstats, pulando")
            continue

        for map_num in range(len(map_stats)):
            if not running:
                break
            process_match_map(match_id, map_num, map_stats)


def daemon_loop():
    """Run continuously, polling for new matches."""
    log("="*60)
    log("  ORBITAL ROXA - Highlights Worker")
    log(f"  Poll interval: {POLL_INTERVAL}s")
    log(f"  G5API: {G5API_URL}")
    log("="*60)

    while running:
        try:
            run_once()
        except Exception as e:
            log(f"ERRO no ciclo: {e}")

        if running:
            log(f"\nAguardando {POLL_INTERVAL}s...")
            for _ in range(POLL_INTERVAL):
                if not running:
                    break
                time.sleep(1)

    log("Worker finalizado.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ORBITAL ROXA - Highlights Worker")
    parser.add_argument("--daemon", action="store_true", help="Rodar em loop contínuo")
    parser.add_argument("--match", type=int, help="Processar match específico")
    parser.add_argument("--map", type=int, default=None, help="Processar mapa específico (com --match)")
    args = parser.parse_args()

    if args.match:
        map_stats = get_map_stats(args.match)
        if args.map is not None:
            process_match_map(args.match, args.map, map_stats)
        else:
            for i in range(len(map_stats)):
                process_match_map(args.match, i, map_stats)
    elif args.daemon:
        daemon_loop()
    else:
        run_once()
