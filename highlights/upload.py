#!/usr/bin/env python3
"""
ORBITAL ROXA - Upload highlights para G5API
Uso:
  python upload.py <match_id> <map_number>           # upload todos os highlights do match
  python upload.py <match_id> <map_number> --rank 1  # upload highlight específico
"""
import os
import sys
import json
import argparse
import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from worker_config import G5API_URL, HIGHLIGHTS_API_KEY

FINAL_DIR = os.path.join(os.path.dirname(__file__), "final_videos")
PARSED_DIR = os.path.join(os.path.dirname(__file__), "parsed_highlights")
HEADERS = {"X-Highlights-Key": HIGHLIGHTS_API_KEY}


def ensure_db_rows(match_id, map_number):
    """Garante que existem rows no DB para os 3 highlights (sem resetar existentes)."""
    # Verificar se já existem rows
    try:
        r = requests.get(f"{G5API_URL}/highlights/{match_id}", timeout=10)
        if r.status_code == 200:
            clips = r.json().get("clips", [])
            map_clips = [c for c in clips if c.get("map_number") == map_number]
            if len(map_clips) >= 3:
                print(f"  DB: {len(map_clips)} rows já existem")
                return
    except:
        pass

    print(f"  Criando rows pendentes no DB...")
    r = requests.post(f"{G5API_URL}/highlights/trigger",
                      json={"matchId": match_id, "mapNumber": map_number},
                      headers=HEADERS, timeout=10)
    if r.status_code == 200:
        print(f"    {r.json().get('message', 'OK')}")
    else:
        print(f"    Aviso: {r.status_code} {r.text[:200]}")


def upload_highlight(match_id, map_number, rank, video_path, highlight_data):
    """Upload de um vídeo para o G5API."""
    size_mb = os.path.getsize(video_path) / (1024 * 1024)
    print(f"\n  Uploading rank #{rank}: {os.path.basename(video_path)} ({size_mb:.1f}MB)")

    hs_count = sum(1 for k in highlight_data.get("kills", []) if k.get("headshot"))

    metadata = {
        "playerName": highlight_data["player"],
        "steamId": highlight_data["steamid"],
        "killsCount": highlight_data["kills_count"],
        "score": highlight_data["score"],
        "description": highlight_data["description"],
        "roundNumber": highlight_data["round"],
        "tickStart": highlight_data["tick_start"],
        "tickEnd": highlight_data["tick_end"],
        "durationS": highlight_data["duration_s"],
    }

    with open(video_path, "rb") as f:
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

    try:
        r = requests.post(f"{G5API_URL}/highlights/upload",
                          data=data, headers=headers, timeout=300)
        if r.status_code == 200:
            print(f"    OK: {r.json().get('file', '')}")
            return True
        else:
            print(f"    ERRO ({r.status_code}): {r.text[:200]}")
            return False
    except Exception as e:
        print(f"    ERRO: {e}")
        return False


def upload_match(match_id, map_number, rank_filter=None):
    # Carregar highlights parseados
    json_path = os.path.join(PARSED_DIR, f"match_{match_id}_map_{map_number}.json")
    if not os.path.exists(json_path):
        print(f"ERRO: {json_path} não encontrado")
        return

    with open(json_path) as f:
        data = json.load(f)

    highlights = data["highlights"]
    if rank_filter:
        highlights = [h for h in highlights if h["rank"] == rank_filter]

    # Encontrar vídeos finais
    final_dir = os.path.join(FINAL_DIR, f"match_{match_id}_map_{map_number}")
    if not os.path.exists(final_dir):
        print(f"ERRO: Pasta não encontrada: {final_dir}")
        return

    videos = sorted([f for f in os.listdir(final_dir) if f.endswith(".mp4")])
    print(f"\n{'='*60}")
    print(f"  Upload Match {match_id} Map {map_number}")
    print(f"  Highlights: {len(highlights)} | Vídeos: {len(videos)}")
    print(f"{'='*60}")

    # Garantir rows no DB
    ensure_db_rows(match_id, map_number)

    # Upload cada highlight
    uploaded = 0
    for h in highlights:
        rank = h["rank"]
        # Encontrar vídeo correspondente
        video_file = None
        for v in videos:
            if f"_r{rank}_" in v:
                video_file = os.path.join(final_dir, v)
                break

        if not video_file:
            print(f"\n  Vídeo para rank #{rank} não encontrado")
            continue

        if upload_highlight(match_id, map_number, rank, video_file, h):
            uploaded += 1

    print(f"\n{'='*60}")
    print(f"  {uploaded}/{len(highlights)} uploads concluídos")
    print(f"{'='*60}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ORBITAL ROXA - Upload Highlights")
    parser.add_argument("match_id", type=int)
    parser.add_argument("map_number", type=int, default=0, nargs="?")
    parser.add_argument("--rank", type=int, help="Upload rank específico")
    args = parser.parse_args()

    upload_match(args.match_id, args.map_number, args.rank)
