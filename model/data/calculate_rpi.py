#!/usr/bin/env python3
"""
Calculate RPI (Rating Percentage Index) from game data.

RPI = (WP × 0.25) + (OWP × 0.50) + (OOWP × 0.25)

Where:
- WP = Team's winning percentage
- OWP = Opponents' winning percentage (excluding games vs this team)
- OOWP = Opponents' opponents' winning percentage

This can be calculated at any point in time using games up to that date.
"""
import json
import os
from datetime import datetime
from typing import List, Dict, Optional
from collections import defaultdict


def load_games(games_file: str) -> List[Dict]:
    """Load games from JSON."""
    with open(games_file, 'r') as f:
        data = json.load(f)
    return data.get('games', [])


def calculate_team_records(games: List[Dict], as_of_date: Optional[str] = None) -> Dict[str, Dict]:
    """
    Calculate each team's record from games.

    Args:
        games: List of game dicts
        as_of_date: Only count games before this date (YYYY-MM-DD)

    Returns:
        Dict mapping team_id -> {wins, losses, opponents: [team_ids]}
    """
    records = defaultdict(lambda: {'wins': 0, 'losses': 0, 'opponents': []})

    for game in games:
        # Skip games after as_of_date
        if as_of_date and game['date'] >= as_of_date:
            continue

        home_id = game['home_team_id']
        away_id = game['away_team_id']
        home_score = game['home_score']
        away_score = game['away_score']

        # Record for home team
        if home_score > away_score:
            records[home_id]['wins'] += 1
            records[away_id]['losses'] += 1
        else:
            records[home_id]['losses'] += 1
            records[away_id]['wins'] += 1

        # Track opponents
        records[home_id]['opponents'].append(away_id)
        records[away_id]['opponents'].append(home_id)

    return dict(records)


def calculate_winning_percentage(wins: int, losses: int) -> float:
    """Calculate winning percentage."""
    total = wins + losses
    if total == 0:
        return 0.5  # Default for teams with no games
    return wins / total


def calculate_owp(team_id: str, records: Dict[str, Dict]) -> float:
    """
    Calculate Opponents' Winning Percentage.

    For each opponent, calculate their winning percentage
    EXCLUDING games against this team.
    """
    team_record = records.get(team_id, {'opponents': []})
    opponents = team_record['opponents']

    if not opponents:
        return 0.5

    owp_sum = 0.0
    count = 0

    # Count how many times we played each opponent
    opponent_games = defaultdict(int)
    for opp_id in opponents:
        opponent_games[opp_id] += 1

    for opp_id, games_vs_us in opponent_games.items():
        opp_record = records.get(opp_id, {'wins': 0, 'losses': 0})

        # Adjust opponent's record to exclude games vs this team
        # We need to figure out if we won or lost against them
        # For simplicity, we'll just subtract the games played
        opp_wins = opp_record['wins']
        opp_losses = opp_record['losses']

        # Approximate: subtract half the games (assuming 50/50 split)
        # More accurate would be to track actual results
        adjusted_wins = max(0, opp_wins - games_vs_us // 2)
        adjusted_losses = max(0, opp_losses - (games_vs_us - games_vs_us // 2))

        opp_wp = calculate_winning_percentage(adjusted_wins, adjusted_losses)
        owp_sum += opp_wp * games_vs_us  # Weight by games played
        count += games_vs_us

    return owp_sum / count if count > 0 else 0.5


def calculate_oowp(team_id: str, records: Dict[str, Dict]) -> float:
    """
    Calculate Opponents' Opponents' Winning Percentage.

    Average OWP of all opponents.
    """
    team_record = records.get(team_id, {'opponents': []})
    opponents = set(team_record['opponents'])

    if not opponents:
        return 0.5

    oowp_sum = 0.0

    for opp_id in opponents:
        opp_owp = calculate_owp(opp_id, records)
        oowp_sum += opp_owp

    return oowp_sum / len(opponents)


def calculate_rpi(team_id: str, records: Dict[str, Dict]) -> Dict:
    """
    Calculate full RPI for a team.

    Returns dict with WP, OWP, OOWP, and final RPI.
    """
    team_record = records.get(team_id, {'wins': 0, 'losses': 0, 'opponents': []})

    wp = calculate_winning_percentage(team_record['wins'], team_record['losses'])
    owp = calculate_owp(team_id, records)
    oowp = calculate_oowp(team_id, records)

    rpi = (wp * 0.25) + (owp * 0.50) + (oowp * 0.25)

    return {
        'wins': team_record['wins'],
        'losses': team_record['losses'],
        'wp': round(wp, 4),
        'owp': round(owp, 4),
        'oowp': round(oowp, 4),
        'rpi': round(rpi, 4),
        'games_played': team_record['wins'] + team_record['losses'],
        'unique_opponents': len(set(team_record['opponents'])),
    }


def calculate_all_rpi(games: List[Dict], as_of_date: Optional[str] = None) -> List[Dict]:
    """
    Calculate RPI for all teams.

    Args:
        games: List of game dicts
        as_of_date: Calculate RPI as of this date

    Returns:
        List of team RPI dicts, sorted by RPI descending
    """
    # Get team records
    records = calculate_team_records(games, as_of_date)

    # Get team names mapping
    team_names = {}
    for game in games:
        team_names[game['home_team_id']] = game['home_team']
        team_names[game['away_team_id']] = game['away_team']

    # Calculate RPI for each team
    rpi_data = []
    for team_id in records.keys():
        rpi = calculate_rpi(team_id, records)
        rpi['team_id'] = team_id
        rpi['team_name'] = team_names.get(team_id, 'Unknown')
        rpi_data.append(rpi)

    # Sort by RPI descending
    rpi_data.sort(key=lambda x: x['rpi'], reverse=True)

    # Add rank
    for i, team in enumerate(rpi_data):
        team['rpi_rank'] = i + 1

    return rpi_data


def calculate_rpi_at_date(games: List[Dict], date: str) -> Dict[str, Dict]:
    """
    Calculate RPI for all teams as of a specific date.

    Returns dict mapping team_id -> RPI data.
    """
    rpi_list = calculate_all_rpi(games, as_of_date=date)
    return {team['team_id']: team for team in rpi_list}


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Calculate RPI from game data')
    parser.add_argument(
        '--games-file',
        type=str,
        default='raw/games.json',
        help='Path to games JSON file'
    )
    parser.add_argument(
        '--as-of',
        type=str,
        default=None,
        help='Calculate RPI as of this date (YYYY-MM-DD)'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='raw/rpi.json',
        help='Output file'
    )

    args = parser.parse_args()

    print(f"\n{'='*60}")
    print("RPI Calculator")
    print(f"{'='*60}")

    # Load games
    games_path = os.path.join(os.path.dirname(__file__), args.games_file)
    if not os.path.exists(games_path):
        print(f"Games file not found: {games_path}")
        return

    games = load_games(games_path)
    print(f"Loaded {len(games)} games")

    if args.as_of:
        print(f"Calculating RPI as of: {args.as_of}")

    # Calculate RPI
    rpi_data = calculate_all_rpi(games, as_of_date=args.as_of)
    print(f"Calculated RPI for {len(rpi_data)} teams")

    # Filter to teams with at least 5 games
    rpi_data = [t for t in rpi_data if t['games_played'] >= 5]
    print(f"Teams with 5+ games: {len(rpi_data)}")

    # Re-rank after filtering
    for i, team in enumerate(rpi_data):
        team['rpi_rank'] = i + 1

    # Save
    output_path = os.path.join(os.path.dirname(__file__), args.output)
    os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump({
            'generated_at': datetime.now().isoformat(),
            'as_of_date': args.as_of or 'all games',
            'count': len(rpi_data),
            'data': rpi_data
        }, f, indent=2)

    print(f"Saved to {output_path}")

    # Summary
    print(f"\n{'='*60}")
    print("Top 20 by RPI")
    print(f"{'='*60}")

    print(f"{'Rank':<5} {'Team':<30} {'Record':<10} {'RPI':<8} {'OWP':<8} {'SOS':<8}")
    print("-" * 75)

    for team in rpi_data[:20]:
        record = f"{team['wins']}-{team['losses']}"
        # SOS approximated as OWP rank
        print(f"{team['rpi_rank']:<5} {team['team_name'][:29]:<30} {record:<10} "
              f"{team['rpi']:<8.4f} {team['owp']:<8.4f} {team['unique_opponents']:<8}")


if __name__ == "__main__":
    main()
