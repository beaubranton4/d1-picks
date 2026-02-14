#!/usr/bin/env python3
"""
Collect historical D1 baseball game results from NCAA stats.

Fetches game-by-game results with scores for all D1 teams across available seasons.
Exports raw data to JSON for feature engineering.

Usage:
    python collect_games.py --seasons 2022,2023,2024,2025
    python collect_games.py --seasons 2024,2025 --sample 5  # Just 5 teams for testing
"""
import argparse
import json
import os
from datetime import datetime
from typing import List, Dict, Optional
import time

try:
    from ncaa_api import get_api, NCAAApi
except ImportError:
    print("Missing ncaa_api.py - ensure it's in the same directory")
    exit(1)


# Top D1 conferences to prioritize (can expand to all teams)
POWER_CONFERENCES = [
    'SEC', 'ACC', 'Big 12', 'Pac-12', 'Big Ten'
]


def get_d1_teams(api: NCAAApi, year: int) -> List[Dict]:
    """
    Get list of all D1 baseball teams.

    Returns:
        List of team dictionaries with team_id, name, conference
    """
    print("Fetching D1 team list...")
    teams = api.get_teams(year)
    print(f"  Found {len(teams)} D1 teams")
    return teams


def fetch_team_schedule(api: NCAAApi, team_id: int, team_name: str, season: int) -> List[Dict]:
    """
    Fetch game results for a single team in a season.

    Args:
        api: NCAA API instance
        team_id: NCAA team ID
        team_name: Team name for logging
        season: Year (e.g., 2024)

    Returns:
        List of game dictionaries with scores
    """
    print(f"    Fetching {team_name} ({season})...")

    try:
        raw_games = api.get_team_schedule(team_id, season)

        if not raw_games:
            print(f"      No games found")
            return []

        games = []
        for raw_game in raw_games:
            game = {
                'team_id': team_id,
                'team_name': team_name,
                'season': season,
                'date': raw_game.get('date', ''),
                'opponent': raw_game.get('opponent', ''),
                'opponent_id': None,  # Not available from HTML scraping
                'location': raw_game.get('location', 'home'),
                'runs_scored': raw_game.get('runs_scored'),
                'runs_allowed': raw_game.get('runs_allowed'),
                'result': raw_game.get('result', ''),
                'game_id': None,
            }

            # Only include completed games with valid scores
            if game['runs_scored'] is not None and game['runs_allowed'] is not None:
                games.append(game)

        print(f"      Found {len(games)} completed games")
        return games

    except Exception as e:
        print(f"      Error: {e}")
        return []


def fetch_all_games(seasons: List[int], sample_teams: Optional[int] = None) -> List[Dict]:
    """
    Fetch game results for all teams across specified seasons.

    Args:
        seasons: List of seasons to fetch (e.g., [2022, 2023, 2024])
        sample_teams: If set, only fetch this many teams (for testing)

    Returns:
        List of all game dictionaries
    """
    api = get_api()

    # Get teams from first season (team list should be similar across seasons)
    teams = get_d1_teams(api, seasons[0])

    if sample_teams:
        teams = teams[:sample_teams]
        print(f"\nSampling {sample_teams} teams for testing")

    all_games = []

    for season in seasons:
        print(f"\n{'='*60}")
        print(f"Season: {season}")
        print(f"{'='*60}")

        for i, team in enumerate(teams):
            games = fetch_team_schedule(
                api=api,
                team_id=team['team_id'],
                team_name=team['name'],
                season=season
            )
            all_games.extend(games)

            # Progress update
            if (i + 1) % 25 == 0:
                print(f"  Progress: {i + 1}/{len(teams)} teams")

    return all_games


def deduplicate_games(games: List[Dict]) -> List[Dict]:
    """
    Remove duplicate games (same game appears for both teams).

    Creates a unique game key and keeps one record per game,
    standardizing to always have the home team as team_a.

    Returns:
        List of unique games
    """
    print("\nDeduplicating games...")

    unique_games = {}

    for game in games:
        # Create unique game key: date + teams (sorted)
        teams = sorted([game['team_name'], game['opponent']])
        game_key = f"{game['date']}_{teams[0]}_{teams[1]}"

        if game_key not in unique_games:
            # Standardize: team_a is home team (or first alphabetically if neutral)
            if game['location'] == 'home':
                unique_games[game_key] = {
                    'game_key': game_key,
                    'date': game['date'],
                    'season': game['season'],
                    'team_a': game['team_name'],
                    'team_a_id': game['team_id'],
                    'team_b': game['opponent'],
                    'team_b_id': game.get('opponent_id'),
                    'team_a_runs': game['runs_scored'],
                    'team_b_runs': game['runs_allowed'],
                    'venue': 'home_a',  # team_a is home
                    'game_id': game.get('game_id'),
                }
            elif game['location'] == 'away':
                unique_games[game_key] = {
                    'game_key': game_key,
                    'date': game['date'],
                    'season': game['season'],
                    'team_a': game['opponent'],
                    'team_a_id': game.get('opponent_id'),
                    'team_b': game['team_name'],
                    'team_b_id': game['team_id'],
                    'team_a_runs': game['runs_allowed'],
                    'team_b_runs': game['runs_scored'],
                    'venue': 'home_a',  # team_a is home
                    'game_id': game.get('game_id'),
                }
            else:
                # Neutral site - use alphabetical ordering
                if game['team_name'] < game['opponent']:
                    unique_games[game_key] = {
                        'game_key': game_key,
                        'date': game['date'],
                        'season': game['season'],
                        'team_a': game['team_name'],
                        'team_a_id': game['team_id'],
                        'team_b': game['opponent'],
                        'team_b_id': game.get('opponent_id'),
                        'team_a_runs': game['runs_scored'],
                        'team_b_runs': game['runs_allowed'],
                        'venue': 'neutral',
                        'game_id': game.get('game_id'),
                    }
                else:
                    unique_games[game_key] = {
                        'game_key': game_key,
                        'date': game['date'],
                        'season': game['season'],
                        'team_a': game['opponent'],
                        'team_a_id': game.get('opponent_id'),
                        'team_b': game['team_name'],
                        'team_b_id': game['team_id'],
                        'team_a_runs': game['runs_allowed'],
                        'team_b_runs': game['runs_scored'],
                        'venue': 'neutral',
                        'game_id': game.get('game_id'),
                    }

    result = list(unique_games.values())
    print(f"  {len(games)} raw records -> {len(result)} unique games")

    return result


def save_games(games: List[Dict], output_file: str):
    """Save games to JSON file."""
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    with open(output_file, 'w') as f:
        json.dump({
            'generated_at': datetime.now().isoformat(),
            'total_games': len(games),
            'games': games
        }, f, indent=2)

    print(f"\nSaved {len(games)} games to {output_file}")


def main():
    parser = argparse.ArgumentParser(description='Collect D1 baseball game results')
    parser.add_argument(
        '--seasons',
        type=str,
        default='2023,2024,2025',
        help='Comma-separated list of seasons (e.g., 2023,2024,2025)'
    )
    parser.add_argument(
        '--sample',
        type=int,
        default=None,
        help='Only fetch this many teams (for testing)'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='raw/games.json',
        help='Output file path'
    )

    args = parser.parse_args()

    seasons = [int(s.strip()) for s in args.seasons.split(',')]

    print(f"\n{'='*60}")
    print("D1 Baseball Game Collector")
    print(f"{'='*60}")
    print(f"Seasons: {seasons}")
    print(f"Sample mode: {args.sample or 'All teams'}")
    print(f"Output: {args.output}")

    # Fetch all games
    all_games = fetch_all_games(seasons, sample_teams=args.sample)

    # Deduplicate (each game appears twice, once per team)
    unique_games = deduplicate_games(all_games)

    # Sort by date
    unique_games.sort(key=lambda g: g['date'])

    # Save to JSON
    output_path = os.path.join(os.path.dirname(__file__), args.output)
    save_games(unique_games, output_path)

    # Summary
    print(f"\n{'='*60}")
    print("Summary")
    print(f"{'='*60}")
    print(f"Total unique games: {len(unique_games)}")

    by_season = {}
    for game in unique_games:
        by_season[game['season']] = by_season.get(game['season'], 0) + 1

    for season in sorted(by_season.keys()):
        print(f"  {season}: {by_season[season]} games")

    print("\nNext step: Run collect_stats.py to fetch team stats")


if __name__ == "__main__":
    main()
