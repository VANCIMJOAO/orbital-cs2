#!/usr/bin/env python3
"""
ORBITAL ROXA - Gravar highlight via CSDM
Uso:
  python record.py <match_id> <map_number>              # grava highlight #1
  python record.py <match_id> <map_number> --rank 2     # grava highlight #2
  python record.py <match_id> <map_number> --all        # grava todos os 3
  python record.py --batch                               # grava TUDO

Requer:
  - Demo na pasta de demos
  - JSON parseado em parsed_highlights/
  - Docker container csdm-postgres rodando
"""
import os
import sys
import json
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from orbital_highlights.recorder import record_clips

DEMOS_DIR = r"C:\Users\vancimj\Downloads\demos"
PARSED_DIR = os.path.join(os.path.dirname(__file__), "parsed_highlights")
OUTPUT_BASE = os.path.join(os.path.dirname(__file__), "recordings")

DEMO_MAP = {
    (31, 0): "2026-03-15_11-55-11_31_de_inferno_ORBITAL_ROXA_vs_016 (1).dem",
    (32, 0): "2026-03-15_13-14-26_32_de_dust2_MIDWEST_vs_NOTAG (1).dem",
    (33, 0): "2026-03-15_14-47-18_33_de_inferno_PERAAEPARCERO_vs_F05-N35.dem",
    (34, 0): "2026-03-15_16-10-19_34_de_dust2_CHOPPADAS_vs_DoKuRosa.dem",
    (35, 0): "2026-03-15_17-14-39_35_de_inferno_016_vs_MIDWEST.dem",
    (36, 0): "2026-03-15_18-22-54_36_de_anubis_PERAAEPARCERO_vs_CHOPPADAS.dem",
    (37, 0): "2026-03-15_19-18-40_37_de_anubis_ORBITAL_ROXA_vs_NOTAG.dem",
    (38, 0): "2026-03-15_20-18-28_38_de_inferno_MIDWEST_vs_NOTAG.dem",
    (39, 0): "2026-03-15_21-40-32_39_de_dust2_F05-N35_vs_DoKuRosa.dem",
    (40, 0): "2026-03-15_22-46-53_40_de_inferno_ORBITAL_ROXA_vs_DoKuRosa.dem",
    (41, 0): "2026-03-15_23-54-16_41_de_dust2_CHOPPADAS_vs_F05-N35.dem",
    (42, 0): "2026-03-16_00-46-24_42_de_dust2_MIDWEST_vs_CHOPPADAS.dem",
    (43, 0): "2026-03-16_01-45-42_43_de_anubis_CHOPPADAS_vs_ORBITAL_ROXA.dem",
    (44, 0): "2026-03-16_02-53-18_44_de_mirage_DoKuRosa_vs_CHOPPADAS.dem",
    (44, 1): "2026-03-16_03-49-09_44_de_inferno_DoKuRosa_vs_CHOPPADAS.dem",
}


def get_demo_path(match_id, map_number):
    filename = DEMO_MAP.get((match_id, map_number))
    if not filename:
        print(f"ERRO: Demo não mapeada para match {match_id} map {map_number}")
        return None
    path = os.path.join(DEMOS_DIR, filename)
    if not os.path.exists(path):
        print(f"ERRO: Demo não encontrada: {path}")
        return None
    return path


def get_highlights(match_id, map_number, rank=None):
    json_path = os.path.join(PARSED_DIR, f"match_{match_id}_map_{map_number}.json")
    if not os.path.exists(json_path):
        print(f"ERRO: JSON não encontrado: {json_path}")
        return []
    with open(json_path) as f:
        data = json.load(f)
    highlights = data["highlights"]
    if rank is not None:
        highlights = [h for h in highlights if h["rank"] == rank]
    return highlights


def record_match(match_id, map_number, rank=None):
    demo_path = get_demo_path(match_id, map_number)
    if not demo_path:
        return False

    highlights = get_highlights(match_id, map_number, rank)
    if not highlights:
        print(f"Nenhum highlight para match {match_id} map {map_number}" +
              (f" rank {rank}" if rank else ""))
        return False

    output_dir = os.path.join(OUTPUT_BASE, f"match_{match_id}_map_{map_number}")
    os.makedirs(output_dir, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"  Match {match_id} Map {map_number} — {len(highlights)} highlight(s)")
    print(f"  Demo: {os.path.basename(demo_path)}")
    print(f"{'='*60}")

    record_clips(highlights, demo_path, output_dir)

    clips = []
    for root, dirs, files in os.walk(output_dir):
        for f in files:
            if f.endswith(".mp4"):
                clips.append(os.path.join(root, f))

    print(f"\n  Clips gerados: {len(clips)}")
    for c in clips:
        size = os.path.getsize(c) / (1024 * 1024)
        print(f"    {os.path.basename(c)} ({size:.1f}MB)")

    return len(clips) > 0


def batch_record():
    json_files = sorted([f for f in os.listdir(PARSED_DIR) if f.endswith(".json")])
    print(f"Batch: {len(json_files)} mapas")
    for jf in json_files:
        parts = jf.replace("match_", "").replace(".json", "").split("_map_")
        record_match(int(parts[0]), int(parts[1]))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ORBITAL ROXA - Record Highlights")
    parser.add_argument("match_id", nargs="?", type=int)
    parser.add_argument("map_number", nargs="?", type=int, default=0)
    parser.add_argument("--rank", type=int, help="Rank específico (1, 2 ou 3)")
    parser.add_argument("--all", action="store_true", help="Gravar todos os 3")
    parser.add_argument("--batch", action="store_true", help="Gravar TUDO")
    args = parser.parse_args()

    if args.batch:
        batch_record()
    elif args.match_id:
        rank = None if args.all else (args.rank or 1)
        record_match(args.match_id, args.map_number, rank)
    else:
        parser.print_help()
        print("\nExemplos:")
        print("  python record.py 38 0              # highlight #1 do match 38")
        print("  python record.py 38 0 --rank 2     # highlight #2 do match 38")
        print("  python record.py 38 0 --all        # todos os 3 do match 38")
        print("  python record.py --batch            # grava TUDO")
