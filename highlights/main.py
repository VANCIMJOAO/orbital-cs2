#!/usr/bin/env python3
"""
ORBITAL ROXA - CS2 Highlight System
CLI unificado para extrair, gravar e pós-processar highlights de demos CS2.

Uso:
  python main.py extract <demo.dem> [--top 3]          # Extrair highlights
  python main.py record <demo.dem> [--top 3]            # Extrair + gravar clips via CSDM
  python main.py process [--json FILE] [--clips DIR]    # Pós-processar clips com efeitos
  python main.py full <demo.dem> [--top 3]              # Pipeline completo (extract + record + process)
"""
import sys
import os
import argparse

# Adicionar o diretório atual ao path para imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from orbital_highlights.extractor import find_highlights, generate_json, generate_hlae_cfg
from orbital_highlights.recorder import record_clips
from orbital_highlights.postprocess import postprocess
from orbital_highlights.config import OUTPUT_DIR


def cmd_extract(args):
    """Extrair highlights de uma demo."""
    demo_filename = os.path.basename(args.demo)
    json_path = os.path.join(args.output, "highlights.json")
    cfg_path = os.path.join(args.output, "auto_highlights.cfg")

    os.makedirs(args.output, exist_ok=True)

    highlights, tick_rate = find_highlights(args.demo, args.top)

    if not highlights:
        print("\nNenhum highlight encontrado na demo!")
        sys.exit(1)

    generate_json(highlights, tick_rate, json_path)
    generate_hlae_cfg(highlights, tick_rate, demo_filename, cfg_path)

    print(f"\n{'='*60}")
    print(f"  Arquivos gerados em: {args.output}")
    print(f"  - highlights.json     (dados para o site)")
    print(f"  - auto_highlights.cfg (script para HLAE manual)")
    print(f"{'='*60}")


def cmd_record(args):
    """Extrair highlights + gravar clips via CSDM."""
    json_path = os.path.join(args.output, "highlights.json")

    os.makedirs(args.output, exist_ok=True)

    highlights, tick_rate = find_highlights(args.demo, args.top)

    if not highlights:
        print("\nNenhum highlight encontrado na demo!")
        sys.exit(1)

    generate_json(highlights, tick_rate, json_path)
    record_clips(highlights, args.demo, args.output)


def cmd_process(args):
    """Pós-processar clips com efeitos visuais."""
    postprocess(args.json, args.clips, args.process_output)


def cmd_full(args):
    """Pipeline completo: extract → record → process."""
    clips_dir = args.output
    json_path = os.path.join(clips_dir, "highlights.json")
    processed_dir = os.path.join(clips_dir, "processed")

    os.makedirs(clips_dir, exist_ok=True)

    # 1. Extract
    print("\n" + "="*60)
    print("  FASE 1: EXTRAÇÃO DE HIGHLIGHTS")
    print("="*60)
    highlights, tick_rate = find_highlights(args.demo, args.top)

    if not highlights:
        print("\nNenhum highlight encontrado na demo!")
        sys.exit(1)

    generate_json(highlights, tick_rate, json_path)

    # 2. Record
    print("\n" + "="*60)
    print("  FASE 2: GRAVAÇÃO DE CLIPS (CS2 + HLAE)")
    print("="*60)
    record_clips(highlights, args.demo, clips_dir)

    # 3. Process
    print("\n" + "="*60)
    print("  FASE 3: PÓS-PROCESSAMENTO")
    print("="*60)
    postprocess(json_path, clips_dir, processed_dir)

    print("\n" + "="*60)
    print("  PIPELINE COMPLETO!")
    print(f"  Video final: {os.path.join(processed_dir, 'ORBITAL_ROXA_HIGHLIGHTS.mp4')}")
    print("="*60)


def main():
    parser = argparse.ArgumentParser(
        description="ORBITAL ROXA - CS2 Highlight System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  python main.py extract "C:/path/demo.dem" --top 5
  python main.py record "C:/path/demo.dem" --top 3
  python main.py process --json output/highlights.json --clips output/
  python main.py full "C:/path/demo.dem" --top 3
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="Comando a executar")

    # extract
    p_extract = subparsers.add_parser("extract", help="Extrair highlights de uma demo")
    p_extract.add_argument("demo", help="Caminho do arquivo .dem")
    p_extract.add_argument("--top", type=int, default=3, help="Número de highlights (default: 3)")
    p_extract.add_argument("--output", default=OUTPUT_DIR, help="Pasta de output")

    # record
    p_record = subparsers.add_parser("record", help="Extrair + gravar clips via CSDM")
    p_record.add_argument("demo", help="Caminho do arquivo .dem")
    p_record.add_argument("--top", type=int, default=3, help="Número de highlights (default: 3)")
    p_record.add_argument("--output", default=OUTPUT_DIR, help="Pasta de output")

    # process
    p_process = subparsers.add_parser("process", help="Pós-processar clips com efeitos")
    p_process.add_argument("--json", default=os.path.join(OUTPUT_DIR, "highlights.json"), help="Arquivo highlights.json")
    p_process.add_argument("--clips", default=OUTPUT_DIR, help="Pasta com clips do CSDM")
    p_process.add_argument("--process-output", default=None, help="Pasta de output processado")

    # full
    p_full = subparsers.add_parser("full", help="Pipeline completo (extract + record + process)")
    p_full.add_argument("demo", help="Caminho do arquivo .dem")
    p_full.add_argument("--top", type=int, default=3, help="Número de highlights (default: 3)")
    p_full.add_argument("--output", default=OUTPUT_DIR, help="Pasta de output")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    commands = {
        "extract": cmd_extract,
        "record": cmd_record,
        "process": cmd_process,
        "full": cmd_full,
    }

    commands[args.command](args)


if __name__ == "__main__":
    main()
