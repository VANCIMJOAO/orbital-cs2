#!/usr/bin/env python3
"""
ORBITAL ROXA - Highlight Worker
Daemon local que roda no PC com CS2.
Polls G5API por demos pendentes, gera highlights e faz upload dos clips.

Uso:
  python worker.py                  # roda em loop
  python worker.py --once           # processa uma vez e sai
  python worker.py --test demo.dem  # testa pipeline com demo local
"""
import os
import sys
import time
import json
import shutil
import zipfile
import argparse
import subprocess
import requests

# Adicionar diretório atual ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from worker_config import G5API_URL, HIGHLIGHTS_API_KEY, POLL_INTERVAL, TOP_N, DEMOS_DIR, CLIPS_DIR
from orbital_highlights.extractor import find_highlights, generate_json
from orbital_highlights.postprocess import process_clip, get_video_duration
from orbital_highlights.config import FFMPEG


HEADERS = {"X-Highlights-Key": HIGHLIGHTS_API_KEY}


def log(msg):
    """Log com timestamp."""
    ts = time.strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")


def update_status(match_id, map_number, rank, status, error_message=None, **metadata):
    """Atualiza status de um clip no G5API."""
    body = {
        "matchId": match_id,
        "mapNumber": map_number,
        "rank": rank,
        "status": status,
        "errorMessage": error_message,
    }
    # Adicionar metadata opcional
    key_map = {
        "player_name": "playerName",
        "steam_id": "steamId",
        "kills_count": "killsCount",
        "score": "score",
        "description": "description",
        "round_number": "roundNumber",
        "tick_start": "tickStart",
        "tick_end": "tickEnd",
        "duration_s": "durationS",
    }
    for py_key, api_key in key_map.items():
        if py_key in metadata and metadata[py_key] is not None:
            body[api_key] = metadata[py_key]

    try:
        r = requests.post(f"{G5API_URL}/highlights/status", json=body, headers=HEADERS, timeout=10)
        if r.status_code != 200:
            log(f"  AVISO: status update falhou ({r.status_code}): {r.text}")
    except Exception as e:
        log(f"  AVISO: status update erro: {e}")


def upload_clip(match_id, map_number, rank, file_path, metadata):
    """Faz upload de um clip MP4 para o G5API."""
    with open(file_path, "rb") as f:
        data = f.read()

    headers = {
        **HEADERS,
        "Content-Type": "application/octet-stream",
        "X-Match-Id": str(match_id),
        "X-Map-Number": str(map_number),
        "X-Rank": str(rank),
        "X-Metadata": json.dumps(metadata),
        "X-File-Type": "video",
    }

    r = requests.post(f"{G5API_URL}/highlights/upload", data=data, headers=headers, timeout=120)
    if r.status_code == 200:
        log(f"  Upload OK: {r.json().get('file', '')}")
        return True
    else:
        log(f"  Upload ERRO ({r.status_code}): {r.text}")
        return False


def upload_thumbnail(match_id, map_number, rank, file_path):
    """Faz upload de uma thumbnail JPG para o G5API."""
    with open(file_path, "rb") as f:
        data = f.read()

    headers = {
        **HEADERS,
        "Content-Type": "application/octet-stream",
        "X-Match-Id": str(match_id),
        "X-Map-Number": str(map_number),
        "X-Rank": str(rank),
        "X-File-Type": "thumbnail",
    }

    r = requests.post(f"{G5API_URL}/highlights/upload", data=data, headers=headers, timeout=30)
    return r.status_code == 200


def generate_thumbnail(clip_path, thumb_path):
    """Gera thumbnail de um clip usando FFmpeg."""
    cmd = [
        FFMPEG, "-y", "-i", clip_path,
        "-ss", "2", "-vframes", "1",
        "-q:v", "2",
        thumb_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    return result.returncode == 0


def fetch_pending():
    """Busca trabalho pendente no G5API."""
    try:
        r = requests.get(f"{G5API_URL}/highlights/pending", headers=HEADERS, timeout=10)
        if r.status_code == 200:
            return r.json().get("pending", [])
        else:
            log(f"  Erro buscando pending ({r.status_code}): {r.text}")
            return []
    except Exception as e:
        log(f"  Erro de conexão: {e}")
        return []


def download_demo(demo_file):
    """Baixa demo ZIP do G5API e extrai .dem."""
    os.makedirs(DEMOS_DIR, exist_ok=True)

    zip_url = f"{G5API_URL}/demo/{demo_file}"
    zip_path = os.path.join(DEMOS_DIR, demo_file)

    log(f"  Baixando demo: {demo_file}")
    r = requests.get(zip_url, timeout=300)
    if r.status_code != 200:
        log(f"  Erro baixando demo ({r.status_code})")
        return None

    with open(zip_path, "wb") as f:
        f.write(r.content)

    # Extrair .dem do ZIP
    try:
        with zipfile.ZipFile(zip_path, "r") as z:
            dem_files = [f for f in z.namelist() if f.endswith(".dem")]
            if not dem_files:
                log("  Nenhum .dem encontrado no ZIP")
                return None

            dem_name = dem_files[0]
            z.extract(dem_name, DEMOS_DIR)
            dem_path = os.path.join(DEMOS_DIR, dem_name)
            log(f"  Demo extraído: {dem_name}")
            return dem_path
    except Exception as e:
        log(f"  Erro extraindo ZIP: {e}")
        return None


def process_match_map(match_id, map_number, demo_file):
    """Processa uma partida/mapa: extract → record → process → upload."""
    log(f"\n{'='*60}")
    log(f"  Processando: match {match_id} map {map_number}")
    log(f"  Demo: {demo_file}")
    log(f"{'='*60}")

    # 1. Download demo
    dem_path = download_demo(demo_file)
    if not dem_path:
        for rank in range(1, TOP_N + 1):
            update_status(match_id, map_number, rank, "error", "Falha ao baixar/extrair demo")
        return

    # 2. Extract highlights
    for rank in range(1, TOP_N + 1):
        update_status(match_id, map_number, rank, "extracting")

    try:
        highlights, tick_rate = find_highlights(dem_path, TOP_N)
    except Exception as e:
        log(f"  Erro na extração: {e}")
        for rank in range(1, TOP_N + 1):
            update_status(match_id, map_number, rank, "error", f"Erro na extração: {str(e)[:200]}")
        return

    if not highlights:
        log("  Nenhum highlight encontrado")
        for rank in range(1, TOP_N + 1):
            update_status(match_id, map_number, rank, "error", "Nenhum highlight encontrado na demo")
        return

    # Salvar JSON para referência
    json_path = os.path.join(CLIPS_DIR, f"match_{match_id}_map_{map_number}_highlights.json")
    os.makedirs(CLIPS_DIR, exist_ok=True)
    generate_json(highlights, tick_rate, json_path)

    # Atualizar metadata de cada highlight
    for i, h in enumerate(highlights):
        rank = i + 1
        update_status(match_id, map_number, rank, "extracting",
                      player_name=h["player"],
                      steam_id=h["steamid"],
                      kills_count=h["kills_count"],
                      score=h["score"],
                      description=h["description"],
                      round_number=h["round"] + 1,
                      tick_start=h["tick_start"],
                      tick_end=h["tick_end"])

    # 3. Record clips via CSDM
    log("\n[RECORD] Gravando clips via CSDM...")
    for rank in range(1, len(highlights) + 1):
        update_status(match_id, map_number, rank, "recording")

    from orbital_highlights.recorder import record_clips
    clips_output = os.path.join(CLIPS_DIR, f"match_{match_id}_map_{map_number}")
    try:
        record_clips(highlights, dem_path, clips_output)
    except Exception as e:
        log(f"  Erro na gravação: {e}")
        for rank in range(1, len(highlights) + 1):
            update_status(match_id, map_number, rank, "error", f"Erro na gravação: {str(e)[:200]}")
        return

    # 4. Post-process cada clip individualmente
    log("\n[PROCESS] Pós-processando clips...")
    clip_files = sorted([f for f in os.listdir(clips_output) if f.endswith(".mp4")])

    for i, h in enumerate(highlights):
        rank = i + 1
        update_status(match_id, map_number, rank, "processing")

        # Encontrar clip correspondente pelo tick range
        pattern = f"tick-{h['tick_start']}-to-{h['tick_end']}"
        matched = next((cf for cf in clip_files if pattern in cf), None)

        if not matched:
            log(f"  Clip #{rank} não encontrado (pattern: {pattern})")
            update_status(match_id, map_number, rank, "error", "Clip não encontrado após gravação")
            continue

        input_path = os.path.join(clips_output, matched)
        processed_path = os.path.join(clips_output, f"processed_clip_{rank}.mp4")
        thumb_path = os.path.join(clips_output, f"thumb_clip_{rank}.jpg")

        # Dados do highlight para o HUD
        h_info = {
            "player": h["player"],
            "kills_count": h["kills_count"],
            "round": h["round"] + 1,
            "rank": rank,
            "score": h["score"],
            "kills": h["kills"],
        }

        try:
            ok = process_clip(input_path, processed_path, h_info, tick_rate)
            if not ok:
                update_status(match_id, map_number, rank, "error", "Falha no pós-processamento FFmpeg")
                continue
        except Exception as e:
            log(f"  Erro no processamento #{rank}: {e}")
            update_status(match_id, map_number, rank, "error", f"Erro FFmpeg: {str(e)[:200]}")
            continue

        # Gerar thumbnail
        generate_thumbnail(processed_path, thumb_path)

        # 5. Upload
        log(f"  Uploading clip #{rank}...")
        duration = 0
        try:
            duration = get_video_duration(processed_path)
        except Exception:
            pass

        metadata = {
            "playerName": h["player"],
            "steamId": h["steamid"],
            "killsCount": h["kills_count"],
            "score": h["score"],
            "description": h["description"],
            "roundNumber": h["round"] + 1,
            "tickStart": h["tick_start"],
            "tickEnd": h["tick_end"],
            "durationS": round(duration, 2),
        }

        if upload_clip(match_id, map_number, rank, processed_path, metadata):
            log(f"  Clip #{rank} OK!")
            # Upload thumbnail
            if os.path.exists(thumb_path):
                upload_thumbnail(match_id, map_number, rank, thumb_path)
        else:
            update_status(match_id, map_number, rank, "error", "Falha no upload do clip")

    # Cleanup
    log("\n[CLEANUP] Limpando arquivos temporários...")
    try:
        shutil.rmtree(clips_output, ignore_errors=True)
    except Exception:
        pass

    log(f"\nProcessamento concluído para match {match_id} map {map_number}")


def run_loop():
    """Loop principal do worker."""
    log("="*60)
    log("  ORBITAL ROXA - Highlight Worker")
    log(f"  G5API: {G5API_URL}")
    log(f"  Poll interval: {POLL_INTERVAL}s")
    log("="*60)

    while True:
        pending = fetch_pending()

        if pending:
            log(f"\n{len(pending)} mapa(s) pendente(s) encontrado(s)")
            for item in pending:
                process_match_map(
                    item["match_id"],
                    item["map_number"],
                    item["demoFile"]
                )
        else:
            log("Nenhum highlight pendente.")

        log(f"Aguardando {POLL_INTERVAL}s...")
        time.sleep(POLL_INTERVAL)


def run_once():
    """Processa uma vez e sai."""
    log("Modo: processar uma vez")
    pending = fetch_pending()

    if pending:
        log(f"{len(pending)} mapa(s) pendente(s)")
        for item in pending:
            process_match_map(
                item["match_id"],
                item["map_number"],
                item["demoFile"]
            )
    else:
        log("Nenhum highlight pendente.")


def run_test(demo_path):
    """Testa o pipeline com um demo local (sem interação com G5API)."""
    log(f"Modo teste: {demo_path}")

    if not os.path.exists(demo_path):
        log(f"ERRO: Demo não encontrado: {demo_path}")
        sys.exit(1)

    highlights, tick_rate = find_highlights(demo_path, TOP_N)

    if not highlights:
        log("Nenhum highlight encontrado!")
        sys.exit(1)

    os.makedirs(CLIPS_DIR, exist_ok=True)
    generate_json(highlights, tick_rate, os.path.join(CLIPS_DIR, "test_highlights.json"))

    log(f"\n{len(highlights)} highlights encontrados:")
    for i, h in enumerate(highlights, 1):
        log(f"  #{i} [{h['score']}pts] {h['description']}")

    log("\nPara gravar clips, use: python main.py record \"" + demo_path + "\"")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ORBITAL ROXA - Highlight Worker")
    parser.add_argument("--once", action="store_true", help="Processa uma vez e sai")
    parser.add_argument("--test", type=str, help="Testa pipeline com demo local")
    args = parser.parse_args()

    if args.test:
        run_test(args.test)
    elif args.once:
        run_once()
    else:
        run_loop()
