"""
Módulo de extração de highlights de demos CS2.
Parseia .dem, agrupa kills por jogador/round, calcula scores e ranqueia.
"""
import json
from demoparser2 import DemoParser
from .config import SCORES, CLIP_PRE_SECONDS, CLIP_POST_SECONDS


def detect_tick_rate(parser):
    """Detecta o tick rate da demo via header."""
    header = parser.parse_header()
    tick_rate = getattr(header, "playback_ticks", None)
    duration = getattr(header, "playback_time", None)
    if tick_rate and duration and duration > 0:
        rate = round(tick_rate / duration)
        return 128 if rate >= 100 else 64
    return 64


def parse_demo(demo_path):
    """Parseia a demo e retorna kills, round ends e parser."""
    parser = DemoParser(demo_path)
    header = parser.parse_header()
    print(f"  Header: {header}")

    deaths = parser.parse_event("player_death", other=["total_rounds_played"])
    round_ends = parser.parse_event("round_end")

    return deaths, round_ends, parser


def group_kills(deaths):
    """Agrupa kills por jogador + round."""
    groups = {}

    for _, row in deaths.iterrows():
        attacker_sid = row.get("attacker_steamid")
        if not attacker_sid or attacker_sid == 0:
            continue

        try:
            attacker_sid = int(attacker_sid)
        except (ValueError, TypeError):
            continue

        round_num = int(row.get("total_rounds_played", 0))
        key = f"{round_num}_{attacker_sid}"

        if key not in groups:
            groups[key] = {
                "round": round_num,
                "player": str(row.get("attacker_name", "Unknown")),
                "steamid": str(attacker_sid),
                "kills": []
            }

        groups[key]["kills"].append({
            "tick": int(row["tick"]),
            "victim": str(row.get("user_name", "Unknown")),
            "weapon": str(row.get("weapon", "")),
            "headshot": bool(row.get("headshot", False)),
            "noscope": bool(row.get("noscope", False)),
            "thrusmoke": bool(row.get("thrusmoke", False)),
            "attackerblind": bool(row.get("attackerblind", False)),
            "penetrated": bool(row.get("penetrated", False)),
        })

    return groups


def score_highlight(kills, tick_rate):
    """Calcula score de um highlight."""
    score = 0
    n = len(kills)

    for k in kills:
        score += SCORES["kill"]
        if k["headshot"]:
            score += SCORES["headshot"]
        if k["noscope"]:
            score += SCORES["noscope"]
        if k["thrusmoke"]:
            score += SCORES["smoke_kill"]
        if k["attackerblind"]:
            score += SCORES["blind_kill"]
        if k["penetrated"]:
            score += SCORES["wallbang"]
        if k["weapon"] in ("knife", "knife_t", "bayonet"):
            score += SCORES["knife_kill"]

    if n == 2: score += SCORES["2k"]
    elif n == 3: score += SCORES["3k"]
    elif n == 4: score += SCORES["4k"]
    elif n >= 5: score += SCORES["ace"]

    sorted_kills = sorted(kills, key=lambda k: k["tick"])
    for i in range(1, len(sorted_kills)):
        delta = (sorted_kills[i]["tick"] - sorted_kills[i - 1]["tick"]) / tick_rate
        if delta < 3.0:
            score += SCORES["rapid_kill"]

    return score


def build_description(player, kills, round_num):
    """Gera descrição legível do highlight."""
    n = len(kills)
    parts = []

    if n >= 5: parts.append("ACE")
    elif n == 4: parts.append("4K")
    elif n == 3: parts.append("3K")
    elif n == 2: parts.append("2K")
    else: parts.append("1K")

    hs = sum(1 for k in kills if k["headshot"])
    if hs == n and n >= 2:
        parts.append("all HS")
    elif hs > 0:
        parts.append(f"{hs} HS")

    for attr, label in [("noscope", "noscope"), ("thrusmoke", "thru smoke"),
                         ("attackerblind", "blind kill"), ("penetrated", "wallbang")]:
        count = sum(1 for k in kills if k[attr])
        if count > 0:
            parts.append(f"{count} {label}")

    weapons = list(set(k["weapon"] for k in kills))
    parts.append(f"com {', '.join(weapons)}")

    return f"{player}: {' | '.join(parts)} (Round {round_num + 1})"


def find_highlights(demo_path, top_n=3):
    """Pipeline principal: parse → group → score → rank → top N."""
    print(f"\n{'='*60}")
    print(f"  ORBITAL ROXA - Highlight Extractor")
    print(f"  Demo: {demo_path}")
    print(f"{'='*60}\n")

    print("[1/4] Parseando demo...")
    deaths, round_ends, parser = parse_demo(demo_path)
    print(f"  Total de kills: {len(deaths)}")
    print(f"  Total de rounds: {len(round_ends)}")

    tick_rate = detect_tick_rate(parser)
    print(f"  Tick rate detectado: {tick_rate}")

    print("\n[2/4] Agrupando kills por jogador/round...")
    groups = group_kills(deaths)
    print(f"  Grupos encontrados: {len(groups)}")

    print("\n[3/4] Calculando scores...")
    highlights = []

    for key, g in groups.items():
        kills = g["kills"]

        if len(kills) < 2:
            k = kills[0]
            if not (k["noscope"] or k["attackerblind"] or k["thrusmoke"]
                    or k["penetrated"] or k["weapon"] in ("knife", "knife_t", "bayonet")):
                continue

        sorted_kills = sorted(kills, key=lambda k: k["tick"])
        score = score_highlight(sorted_kills, tick_rate)

        tick_start = sorted_kills[0]["tick"] - (CLIP_PRE_SECONDS * tick_rate)
        tick_end = sorted_kills[-1]["tick"] + (CLIP_POST_SECONDS * tick_rate)

        highlights.append({
            "player": g["player"],
            "steamid": g["steamid"],
            "round": g["round"],
            "kills_count": len(kills),
            "score": score,
            "tick_start": max(0, int(tick_start)),
            "tick_end": int(tick_end),
            "time_start_s": max(0, tick_start) / tick_rate,
            "time_end_s": tick_end / tick_rate,
            "description": build_description(g["player"], sorted_kills, g["round"]),
            "kills": sorted_kills,
        })

    highlights.sort(key=lambda h: h["score"], reverse=True)
    top = highlights[:top_n]

    print(f"\n[4/4] TOP {top_n} HIGHLIGHTS:\n")
    print(f"{'='*60}")
    for i, h in enumerate(top, 1):
        duration = h["time_end_s"] - h["time_start_s"]
        print(f"  #{i} [Score: {h['score']}]")
        print(f"     {h['description']}")
        print(f"     Kills: {h['kills_count']} | Round {h['round'] + 1}")
        print(f"     Ticks: {h['tick_start']} -> {h['tick_end']}")
        print(f"     Tempo: {h['time_start_s']:.1f}s -> {h['time_end_s']:.1f}s ({duration:.1f}s)")
        print(f"     Victims: {', '.join(k['victim'] for k in h['kills'])}")
        print(f"{'='*60}")

    return top, tick_rate


def generate_json(highlights, tick_rate, output_path="highlights.json"):
    """Salva highlights como JSON."""
    output = {
        "tick_rate": tick_rate,
        "highlights_count": len(highlights),
        "highlights": []
    }
    for i, h in enumerate(highlights, 1):
        output["highlights"].append({
            "rank": i,
            "player": h["player"],
            "steamid": h["steamid"],
            "round": h["round"] + 1,
            "kills_count": h["kills_count"],
            "score": h["score"],
            "description": h["description"],
            "tick_start": h["tick_start"],
            "tick_end": h["tick_end"],
            "time_start_s": round(h["time_start_s"], 2),
            "time_end_s": round(h["time_end_s"], 2),
            "duration_s": round(h["time_end_s"] - h["time_start_s"], 2),
            "kills": h["kills"],
        })

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"[JSON] Highlights salvos: {output_path}")
    return output_path


def generate_hlae_cfg(highlights, tick_rate, demo_filename, output_path="auto_highlights.cfg"):
    """Gera arquivo .cfg para HLAE CS2 renderizar automaticamente."""
    spec_pre_ticks = int(2 * tick_rate)

    lines = [
        "// ============================================",
        "// AUTO-GENERATED BY ORBITAL ROXA",
        "// Highlight Clips - HLAE CS2 Recording Script",
        "// ============================================",
        "",
        "mirv_streams record screen enabled 1",
        "mirv_streams record fps 60",
        "mirv_streams record startMovieWav 1",
        "mirv_streams settings edit afxDefault settings afxFfmpeg",
        "",
        "mirv_cmd clear",
        "",
        f'playdemo "{demo_filename}"',
        "",
    ]

    for i, h in enumerate(highlights, 1):
        clip_name = f"highlight_{i}_r{h['round']+1}_{h['player'].replace(' ', '_')}"
        spec_tick = max(0, h["tick_start"] - spec_pre_ticks)

        lines.append(f"// Highlight #{i}: {h['description']}")
        lines.append(f"// Score: {h['score']} | {h['kills_count']} kills")
        lines.append(f'mirv_cmd addAtTick {spec_tick} "spec_player {h["player"]}"')
        lines.append(f'mirv_cmd addAtTick {spec_tick} "spec_mode 1"')
        lines.append(f'mirv_cmd addAtTick {h["tick_start"]} "mirv_streams record name {clip_name}"')
        lines.append(f'mirv_cmd addAtTick {h["tick_start"]} "mirv_streams record start"')
        lines.append(f'mirv_cmd addAtTick {h["tick_end"]} "mirv_streams record end"')
        lines.append("")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"[HLAE] Config gerado: {output_path}")
    return output_path
