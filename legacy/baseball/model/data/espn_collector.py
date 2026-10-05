#!/usr/bin/env python3
"""
ESPN API Data Collector for D1 Baseball.

Collects:
- All teams with IDs, names, abbreviations
- Historical game results with scores
- Home/away, venue, date information

Usage:
    python espn_collector.py --seasons 2024,2025
    python espn_collector.py --seasons 2024,2025 --sample 10
"""
import argparse
import requests
import json
import os
import time
from datetime import datetime
from typing import List, Dict, Optional

ESPN_BASE = "https://site.api.espn.com/apis/site/v2"

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
})


def fetch_conferences() -> Dict[str, str]:
    """Fetch conference name mapping from groups endpoint."""
    url = f"{ESPN_BASE}/sports/baseball/college-baseball/groups"

    try:
        response = session.get(url, timeout=30)
        if response.status_code == 200:
            data = response.json()
            conferences = {}
            for group in data.get('groups', []):
                for conf in group.get('children', []):
                    # We'll need to map group IDs to names later
                    conferences[conf.get('abbreviation', '').lower()] = conf.get('name')
            return conferences
    except:
        pass
    return {}


def parse_conference_from_standing(standing_summary: str) -> Optional[str]:
    """Extract conference name from standing summary like '1st in SEC - West'."""
    if not standing_summary:
        return None

    import re
    # Pattern: "Xth in CONFERENCE" or "Xth in CONFERENCE - Division"
    match = re.search(r'\d+(?:st|nd|rd|th) in (.+)', standing_summary)
    if match:
        conf = match.group(1)
        # Remove division suffix (e.g., " - West")
        conf = re.sub(r'\s*-\s*(East|West|North|South|Atlantic|Coastal)$', '', conf)
        return conf.strip()
    return None


def fetch_team_detail(team_id: str) -> Optional[Dict]:
    """Fetch detailed info for a single team including conference."""
    url = f"{ESPN_BASE}/sports/baseball/college-baseball/teams/{team_id}"

    try:
        response = session.get(url, timeout=15)
        if response.status_code == 200:
            data = response.json()
            team = data.get('team', {})
            groups = team.get('groups', {})
            standing_summary = team.get('standingSummary')

            return {
                'group_id': groups.get('id'),
                'parent_group_id': groups.get('parent', {}).get('id'),
                'is_conference': groups.get('isConference', False),
                'standing_summary': standing_summary,
                'conference': parse_conference_from_standing(standing_summary),
            }
    except:
        pass
    return None


def fetch_all_teams(fetch_conference_details: bool = False) -> List[Dict]:
    """
    Fetch all college baseball teams from ESPN.

    Returns list of team dictionaries with:
    - id, name, abbreviation, location, nickname, color
    - optionally: conference info if fetch_conference_details=True
    """
    print("Fetching all teams...")

    url = f"{ESPN_BASE}/sports/baseball/college-baseball/teams"

    try:
        response = session.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()

        teams = []
        sports = data.get('sports', [])
        for sport in sports:
            for league in sport.get('leagues', []):
                for team_wrapper in league.get('teams', []):
                    team = team_wrapper.get('team', {})
                    teams.append({
                        'espn_id': team.get('id'),
                        'name': team.get('displayName'),
                        'abbreviation': team.get('abbreviation'),
                        'location': team.get('location'),
                        'nickname': team.get('nickname'),
                        'color': team.get('color'),
                        'logo': team.get('logos', [{}])[0].get('href') if team.get('logos') else None,
                        'group_id': None,
                        'conference': None,
                    })

        print(f"  Found {len(teams)} teams")

        # Optionally fetch conference details for each team
        if fetch_conference_details:
            print("  Fetching conference details for each team...")
            for i, team in enumerate(teams):
                if i > 0 and i % 50 == 0:
                    print(f"    Progress: {i}/{len(teams)}")
                time.sleep(0.1)  # Rate limit

                detail = fetch_team_detail(team['espn_id'])
                if detail:
                    team['group_id'] = detail.get('group_id')
                    team['parent_group_id'] = detail.get('parent_group_id')
                    team['standing_summary'] = detail.get('standing_summary')
                    team['conference'] = detail.get('conference')

            # Count teams by conference
            conferences = {}
            for t in teams:
                conf = t.get('conference') or 'Unknown'
                conferences[conf] = conferences.get(conf, 0) + 1

            print(f"\n  Teams by conference:")
            for conf in sorted(conferences.keys(), key=lambda x: conferences[x], reverse=True)[:15]:
                print(f"    {conf}: {conferences[conf]}")

        return teams

    except Exception as e:
        print(f"  Error fetching teams: {e}")
        return []


def fetch_team_schedule(team_id: str, season: int) -> List[Dict]:
    """
    Fetch a team's schedule with results for a season.

    Returns list of game dictionaries.
    """
    url = f"{ESPN_BASE}/sports/baseball/college-baseball/teams/{team_id}/schedule"
    params = {'season': season}

    try:
        response = session.get(url, params=params, timeout=30)
        if response.status_code != 200:
            return []

        data = response.json()
        events = data.get('events', [])

        games = []
        for event in events:
            comp = event.get('competitions', [{}])[0]

            # Only include completed games
            status = comp.get('status', {}).get('type', {})
            if not status.get('completed', False):
                continue

            # Parse competitors
            home_team = None
            away_team = None

            for competitor in comp.get('competitors', []):
                team_info = competitor.get('team', {})
                score_data = competitor.get('score')

                # Handle score format (can be dict or string)
                if isinstance(score_data, dict):
                    score = int(score_data.get('value', 0))
                elif score_data is not None:
                    score = int(score_data)
                else:
                    score = 0

                team_data = {
                    'team_id': team_info.get('id'),
                    'team_name': team_info.get('displayName'),
                    'abbreviation': team_info.get('abbreviation'),
                    'score': score,
                    'winner': competitor.get('winner', False),
                }

                if competitor.get('homeAway') == 'home':
                    home_team = team_data
                else:
                    away_team = team_data

            if not home_team or not away_team:
                continue

            game = {
                'espn_game_id': event.get('id'),
                'date': event.get('date', '')[:10],  # YYYY-MM-DD
                'datetime': event.get('date'),
                'season': season,
                'home_team_id': home_team['team_id'],
                'home_team': home_team['team_name'],
                'home_abbreviation': home_team['abbreviation'],
                'home_score': home_team['score'],
                'away_team_id': away_team['team_id'],
                'away_team': away_team['team_name'],
                'away_abbreviation': away_team['abbreviation'],
                'away_score': away_team['score'],
                'neutral_site': comp.get('neutralSite', False),
                'venue': comp.get('venue', {}).get('fullName'),
                'attendance': comp.get('attendance'),
            }

            games.append(game)

        return games

    except Exception as e:
        return []


def deduplicate_games(all_games: List[Dict]) -> List[Dict]:
    """
    Remove duplicate games (each game appears for both teams).
    Keep one record per game based on ESPN game ID.
    """
    unique = {}
    for game in all_games:
        game_id = game.get('espn_game_id')
        if game_id and game_id not in unique:
            unique[game_id] = game
    return list(unique.values())


def collect_all_games(teams: List[Dict], seasons: List[int], sample: Optional[int] = None) -> List[Dict]:
    """
    Collect game results for all teams across seasons.
    """
    if sample:
        teams = teams[:sample]

    all_games = []
    total = len(teams) * len(seasons)
    current = 0

    for season in seasons:
        print(f"\n{'='*60}")
        print(f"Season: {season}")
        print(f"{'='*60}")

        for team in teams:
            current += 1
            team_id = team['espn_id']
            team_name = team['name']

            # Rate limiting
            time.sleep(0.3)

            games = fetch_team_schedule(team_id, season)

            if games:
                all_games.extend(games)
                print(f"  [{current}/{total}] {team_name}: {len(games)} games")
            else:
                print(f"  [{current}/{total}] {team_name}: 0 games")

    # Deduplicate
    print(f"\nDeduplicating {len(all_games)} raw game records...")
    unique_games = deduplicate_games(all_games)
    print(f"  {len(unique_games)} unique games")

    return unique_games


def calculate_team_stats(games: List[Dict]) -> Dict[str, Dict]:
    """
    Calculate team stats from game results.
    """
    from collections import defaultdict

    stats = defaultdict(lambda: {
        'team_id': None,
        'team_name': None,
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

        # Home team stats
        home_key = (game['home_team_id'], season)
        stats[home_key]['team_id'] = game['home_team_id']
        stats[home_key]['team_name'] = game['home_team']
        stats[home_key]['season'] = season
        stats[home_key]['games'] += 1
        stats[home_key]['runs_scored'] += game['home_score']
        stats[home_key]['runs_allowed'] += game['away_score']
        stats[home_key]['home_games'] += 1

        if game['home_score'] > game['away_score']:
            stats[home_key]['wins'] += 1
            stats[home_key]['home_wins'] += 1
        else:
            stats[home_key]['losses'] += 1

        # Away team stats
        away_key = (game['away_team_id'], season)
        stats[away_key]['team_id'] = game['away_team_id']
        stats[away_key]['team_name'] = game['away_team']
        stats[away_key]['season'] = season
        stats[away_key]['games'] += 1
        stats[away_key]['runs_scored'] += game['away_score']
        stats[away_key]['runs_allowed'] += game['home_score']
        stats[away_key]['away_games'] += 1

        if game['away_score'] > game['home_score']:
            stats[away_key]['wins'] += 1
            stats[away_key]['away_wins'] += 1
        else:
            stats[away_key]['losses'] += 1

    # Calculate averages
    for key, team in stats.items():
        if team['games'] > 0:
            team['runs_per_game'] = round(team['runs_scored'] / team['games'], 2)
            team['runs_allowed_per_game'] = round(team['runs_allowed'] / team['games'], 2)
            team['win_pct'] = round(team['wins'] / team['games'], 3)

    return dict(stats)


def save_data(teams: List[Dict], games: List[Dict], stats: Dict, output_dir: str):
    """Save all collected data to JSON files."""
    os.makedirs(output_dir, exist_ok=True)

    # Save teams
    teams_file = os.path.join(output_dir, 'teams.json')
    with open(teams_file, 'w') as f:
        json.dump({
            'generated_at': datetime.now().isoformat(),
            'source': 'ESPN API',
            'count': len(teams),
            'teams': teams
        }, f, indent=2)
    print(f"Saved {len(teams)} teams to {teams_file}")

    # Save games
    games_file = os.path.join(output_dir, 'games.json')
    with open(games_file, 'w') as f:
        json.dump({
            'generated_at': datetime.now().isoformat(),
            'source': 'ESPN API',
            'count': len(games),
            'games': games
        }, f, indent=2)
    print(f"Saved {len(games)} games to {games_file}")

    # Save stats
    stats_list = list(stats.values())
    stats_file = os.path.join(output_dir, 'team_stats.json')
    with open(stats_file, 'w') as f:
        json.dump({
            'generated_at': datetime.now().isoformat(),
            'source': 'ESPN API (derived from games)',
            'count': len(stats_list),
            'stats': stats_list
        }, f, indent=2)
    print(f"Saved {len(stats_list)} team-season stats to {stats_file}")


def main():
    parser = argparse.ArgumentParser(description='Collect D1 baseball data from ESPN')
    parser.add_argument(
        '--seasons',
        type=str,
        default='2024,2025',
        help='Comma-separated seasons to collect'
    )
    parser.add_argument(
        '--sample',
        type=int,
        default=None,
        help='Only collect this many teams (for testing)'
    )
    parser.add_argument(
        '--output-dir',
        type=str,
        default='raw',
        help='Output directory'
    )
    parser.add_argument(
        '--with-conferences',
        action='store_true',
        help='Fetch conference details for each team (slower)'
    )

    args = parser.parse_args()

    seasons = [int(s.strip()) for s in args.seasons.split(',')]

    print(f"\n{'='*60}")
    print("ESPN D1 Baseball Data Collector")
    print(f"{'='*60}")
    print(f"Seasons: {seasons}")
    print(f"Sample: {args.sample or 'All teams'}")
    print(f"Fetch conferences: {args.with_conferences}")

    # 1. Fetch all teams
    teams = fetch_all_teams(fetch_conference_details=args.with_conferences)

    if not teams:
        print("Failed to fetch teams. Exiting.")
        return

    # 2. Collect games
    games = collect_all_games(teams, seasons, sample=args.sample)

    # 3. Calculate stats
    print("\nCalculating team statistics...")
    stats = calculate_team_stats(games)

    # 4. Save data
    print("\nSaving data...")
    output_dir = os.path.join(os.path.dirname(__file__), args.output_dir)
    save_data(teams, games, stats, output_dir)

    # Summary
    print(f"\n{'='*60}")
    print("Summary")
    print(f"{'='*60}")
    print(f"Teams: {len(teams)}")
    print(f"Games: {len(games)}")
    print(f"Team-seasons: {len(stats)}")

    # Games by season
    by_season = {}
    for game in games:
        s = game['season']
        by_season[s] = by_season.get(s, 0) + 1

    print("\nGames by season:")
    for season in sorted(by_season.keys()):
        print(f"  {season}: {by_season[season]}")

    # Sample game
    if games:
        print(f"\nSample game:")
        g = games[0]
        print(f"  {g['date']}: {g['away_team']} ({g['away_score']}) @ {g['home_team']} ({g['home_score']})")

    print(f"\nData saved to: {output_dir}/")
    print("Next: Run build_features.py to create training dataset")


if __name__ == "__main__":
    main()
