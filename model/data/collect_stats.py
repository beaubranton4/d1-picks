#!/usr/bin/env python3
"""
Collect D1 baseball team statistics derived from game results.

Since detailed stats parsing from NCAA HTML is unreliable, this module
derives team statistics from game results data:
- Runs scored/allowed per game
- Win/loss record
- Home/away performance

Usage:
    python collect_stats.py --seasons 2022,2023,2024,2025
"""
import argparse
import json
import os
from datetime import datetime
from typing import List, Dict, Optional
from collections import defaultdict


def load_games(games_file: str) -> List[Dict]:
    """Load games from JSON file."""
    with open(games_file, 'r') as f:
        data = json.load(f)
    return data.get('games', [])


def calculate_team_stats(games: List[Dict]) -> Dict[str, Dict]:
    """
    Calculate team statistics from game results.

    Returns dict keyed by (team_name, season) with stats.
    """
    # Aggregate stats per team per season
    team_season_stats = defaultdict(lambda: {
        'games': 0,
        'wins': 0,
        'losses': 0,
        'runs_scored': 0,
        'runs_allowed': 0,
        'home_games': 0,
        'home_wins': 0,
        'away_games': 0,
        'away_wins': 0,
    })

    for game in games:
        season = game['season']

        # Team A stats
        team_a = game['team_a']
        team_a_runs = game['team_a_runs']
        team_b_runs = game['team_b_runs']
        team_a_home = game['venue'] == 'home_a'

        key_a = (team_a, season)
        team_season_stats[key_a]['games'] += 1
        team_season_stats[key_a]['runs_scored'] += team_a_runs
        team_season_stats[key_a]['runs_allowed'] += team_b_runs

        if team_a_runs > team_b_runs:
            team_season_stats[key_a]['wins'] += 1
        else:
            team_season_stats[key_a]['losses'] += 1

        if team_a_home:
            team_season_stats[key_a]['home_games'] += 1
            if team_a_runs > team_b_runs:
                team_season_stats[key_a]['home_wins'] += 1
        else:
            team_season_stats[key_a]['away_games'] += 1
            if team_a_runs > team_b_runs:
                team_season_stats[key_a]['away_wins'] += 1

        # Team B stats
        team_b = game['team_b']
        key_b = (team_b, season)
        team_season_stats[key_b]['games'] += 1
        team_season_stats[key_b]['runs_scored'] += team_b_runs
        team_season_stats[key_b]['runs_allowed'] += team_a_runs

        if team_b_runs > team_a_runs:
            team_season_stats[key_b]['wins'] += 1
        else:
            team_season_stats[key_b]['losses'] += 1

        if not team_a_home and game['venue'] != 'neutral':
            team_season_stats[key_b]['home_games'] += 1
            if team_b_runs > team_a_runs:
                team_season_stats[key_b]['home_wins'] += 1
        else:
            team_season_stats[key_b]['away_games'] += 1
            if team_b_runs > team_a_runs:
                team_season_stats[key_b]['away_wins'] += 1

    return dict(team_season_stats)


def build_stats_records(team_season_stats: Dict) -> Dict[str, List[Dict]]:
    """
    Build batting and pitching stat records from aggregated data.

    Since we don't have actual BA/ERA etc., we estimate based on runs.
    """
    batting_stats = []
    pitching_stats = []

    for (team_name, season), stats in team_season_stats.items():
        games = stats['games']
        if games == 0:
            continue

        runs_per_game = stats['runs_scored'] / games
        runs_allowed_per_game = stats['runs_allowed'] / games
        win_rate = stats['wins'] / games if games > 0 else 0.5

        # Estimate batting stats based on runs scored
        # D1 average is roughly 5.5 runs/game with .265 BA
        # Higher scoring teams tend to have higher BA
        estimated_ba = 0.250 + (runs_per_game - 5.5) * 0.01
        estimated_ba = max(0.200, min(0.350, estimated_ba))

        # SLG is typically BA * 1.5 for D1
        estimated_slg = estimated_ba * 1.5
        estimated_obp = estimated_ba + 0.080  # OBP typically ~80 points higher
        estimated_ops = estimated_obp + estimated_slg

        batting_stats.append({
            'team_name': team_name,
            'season': season,
            'games': games,
            'runs': stats['runs_scored'],
            'runs_per_game': round(runs_per_game, 2),
            'ba': round(estimated_ba, 3),
            'slg': round(estimated_slg, 3),
            'obp': round(estimated_obp, 3),
            'ops': round(estimated_ops, 3),
        })

        # Estimate pitching stats based on runs allowed
        # D1 average ERA is roughly 4.5-5.0
        estimated_era = runs_allowed_per_game * 0.85  # Earned runs ~ 85% of runs
        estimated_whip = 1.20 + (runs_allowed_per_game - 5.5) * 0.05
        estimated_whip = max(0.90, min(1.80, estimated_whip))

        pitching_stats.append({
            'team_name': team_name,
            'season': season,
            'games': games,
            'runs_allowed': stats['runs_allowed'],
            'runs_allowed_per_game': round(runs_allowed_per_game, 2),
            'era': round(estimated_era, 2),
            'whip': round(estimated_whip, 2),
        })

    return {
        'batting_stats': batting_stats,
        'pitching_stats': pitching_stats,
        'pitcher_details': [],  # Not available without detailed HTML parsing
    }


def save_stats(stats: Dict, output_dir: str):
    """Save stats to JSON files."""
    os.makedirs(output_dir, exist_ok=True)

    for stat_type, data in stats.items():
        output_file = os.path.join(output_dir, f'{stat_type}.json')
        with open(output_file, 'w') as f:
            json.dump({
                'generated_at': datetime.now().isoformat(),
                'count': len(data),
                'data': data
            }, f, indent=2)
        print(f"Saved {len(data)} {stat_type} records to {output_file}")


def main():
    parser = argparse.ArgumentParser(description='Collect D1 baseball team stats')
    parser.add_argument(
        '--games-file',
        type=str,
        default='raw/games.json',
        help='Path to games.json'
    )
    parser.add_argument(
        '--output-dir',
        type=str,
        default='raw',
        help='Output directory for stats files'
    )

    args = parser.parse_args()

    print(f"\n{'='*60}")
    print("D1 Baseball Stats Calculator")
    print(f"{'='*60}")

    # Load games
    games_path = os.path.join(os.path.dirname(__file__), args.games_file)
    if not os.path.exists(games_path):
        print(f"Games file not found: {games_path}")
        print("Run collect_games.py first")
        return

    games = load_games(games_path)
    print(f"Loaded {len(games)} games from {args.games_file}")

    # Calculate stats
    print("\nCalculating team statistics from game results...")
    team_season_stats = calculate_team_stats(games)
    print(f"  Calculated stats for {len(team_season_stats)} team-seasons")

    # Build records
    stats = build_stats_records(team_season_stats)

    # Save to JSON
    output_dir = os.path.join(os.path.dirname(__file__), args.output_dir)
    save_stats(stats, output_dir)

    # Summary
    print(f"\n{'='*60}")
    print("Summary")
    print(f"{'='*60}")
    print(f"Team batting stats: {len(stats['batting_stats'])}")
    print(f"Team pitching stats: {len(stats['pitching_stats'])}")
    print(f"\nNote: Stats are estimated from game results data")
    print(f"For more accurate stats, integrate with a dedicated stats API")
    print(f"\nNext step: Run build_features.py to create training dataset")


if __name__ == "__main__":
    main()
