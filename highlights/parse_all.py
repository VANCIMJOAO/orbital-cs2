#!/usr/bin/env python3
"""
ORBITAL ROXA - Parse all demos (extração apenas, sem gravação)
Parseia cada demo, identifica top 3 highlights e salva JSONs + atualiza DB.
"""
import os
import sys
import json
import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from worker_config import G5API_URL, HIGHLIGHTS_API_KEY
from orbital_highlights.extractor import find_highlights, generate_json

HEADERS = {"X-Highlights-Key": HIGHLIGHTS_API_KEY}
DEMOS_DIR = r"C:\Users\vancimj\Downloads\demos"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "parsed_highlights")
TOP_N = 3

# Mapeamento: arquivo demo → (match_id, map_number)
DEMO_MAP = [
    ("2026-03-15_11-55-11_31_de_inferno_ORBITAL_ROXA_vs_016 (1).dem", 31, 0),
    ("2026-03-15_13-14-26_32_de_dust2_MIDWEST_vs_NOTAG (1).dem", 32, 0),
    ("2026-03-15_14-47-18_33_de_inferno_PERAAEPARCERO_vs_F05-N35.dem", 33, 0),
    ("2026-03-15_16-10-19_34_de_dust2_CHOPPADAS_vs_DoKuRosa.dem", 34, 0),
    ("2026-03-15_17-14-39_35_de_inferno_016_vs_MIDWEST.dem", 35, 0),
    ("2026-03-15_18-22-54_36_de_anubis_PERAAEPARCERO_vs_CHOPPADAS.dem", 36, 0),
    ("2026-03-15_19-18-40_37_de_anubis_ORBITAL_ROXA_vs_NOTAG.dem", 37, 0),
    ("2026-03-15_20-18-28_38_de_inferno_MIDWEST_vs_NOTAG.dem", 38, 0),
    ("2026-03-15_21-40-32_39_de_dust2_F05-N35_vs_DoKuRosa.dem", 39, 0),
    ("2026-03-15_22-46-53_40_de_inferno_ORBITAL_ROXA_vs_DoKuRosa.dem", 40, 0),
    ("2026-03-15_23-54-16_41_de_dust2_CHOPPADAS_vs_F05-N35.dem", 41, 0),
    ("2026-03-16_00-46-24_42_de_dust2_MIDWEST_vs_CHOPPADAS.dem", 42, 0),
    ("2026-03-16_01-45-42_43_de_anubis_CHOPPADAS_vs_ORBITAL_ROXA.dem", 43, 0),
    ("2026-03-16_02-53-18_44_de_mirage_DoKuRosa_vs_CHOPPADAS.dem", 44, 0),
    ("2026-03-16_03-49-09_44_de_inferno_DoKuRosa_vs_CHOPPADAS.dem", 44, 1),
]


def update_status(match_id, map_number, rank, status, error_message=None, **metadata):
    """Atualiza status de um clip no G5API."""
    body = {
        "matchId": match_id,
        "mapNumber": map_number,
        "rank": rank,
        "status": status,
        "errorMessage": error_message,
    }
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
            print(f"    AVISO: status update falhou ({r.status_code}): {r.text}")
    except Exception as e:
        print(f"    AVISO: status update erro: {e}")


def parse_demo_entry(filename, match_id, map_number):
    """Parseia uma demo e salva JSON."""
    dem_path = os.path.join(DEMOS_DIR, filename)

    if not os.path.exists(dem_path):
        print(f"\n  SKIP: {filename} não encontrado")
        return False

    print(f"\n{'='*70}")
    print(f"  Match {match_id} Map {map_number}: {filename}")
    print(f"{'='*70}")

    try:
        highlights, tick_rate = find_highlights(dem_path, TOP_N)
    except Exception as e:
        print(f"  ERRO: {e}")
        for rank in range(1, TOP_N + 1):
            update_status(match_id, map_number, rank, "error", f"Parse error: {str(e)[:200]}")
        return False

    if not highlights:
        print("  Nenhum highlight encontrado")
        return False

    # Salvar JSON local
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    json_path = os.path.join(OUTPUT_DIR, f"match_{match_id}_map_{map_number}.json")
    generate_json(highlights, tick_rate, json_path)

    # Atualizar DB com metadata (status = extracting = parsed mas não gravado)
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

    print(f"\n  TOP {len(highlights)} highlights salvos em: {json_path}")
    for i, h in enumerate(highlights, 1):
        print(f"    #{i} [{h['score']}pts] {h['description']}")

    return True


if __name__ == "__main__":
    print("=" * 70)
    print("  ORBITAL ROXA - Batch Demo Parser")
    print(f"  Demos: {DEMOS_DIR}")
    print(f"  Output: {OUTPUT_DIR}")
    print(f"  Total: {len(DEMO_MAP)} demos")
    print("=" * 70)

    success = 0
    failed = 0

    for filename, match_id, map_number in DEMO_MAP:
        ok = parse_demo_entry(filename, match_id, map_number)
        if ok:
            success += 1
        else:
            failed += 1

    print(f"\n{'='*70}")
    print(f"  RESULTADO: {success} OK / {failed} falhas / {len(DEMO_MAP)} total")
    print(f"  JSONs salvos em: {OUTPUT_DIR}")
    print(f"{'='*70}")
