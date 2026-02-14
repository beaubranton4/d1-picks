#!/usr/bin/env python3
"""
Deep exploration of ESPN API - historical data, statistics, etc.
"""
import requests
import json
import time
from datetime import datetime, timedelta

ESPN_BASE = "https://site.api.espn.com/apis/site/v2"
ESPN_CORE = "https://sports.core.api.espn.com/v2"

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
})


def explore_team_schedule_full(team_id: str = "99"):
    """Get full schedule including past results for a team (Florida)."""
    print("\n" + "="*60)
    print(f"Full Schedule for Team {team_id}")
    print("="*60)

    # Try with season parameter
    url = f"{ESPN_BASE}/sports/baseball/college-baseball/teams/{team_id}/schedule"

    params_list = [
        {},
        {'season': 2025},
        {'season': 2024},
        {'seasontype': 2},  # Regular season
    ]

    for params in params_list:
        print(f"\nParams: {params}")
        try:
            response = session.get(url, params=params, timeout=15)
            if response.status_code == 200:
                data = response.json()
                events = data.get('events', [])
                print(f"  Events: {len(events)}")

                # Check for results
                completed = [e for e in events if e.get('competitions', [{}])[0].get('status', {}).get('type', {}).get('completed', False)]
                print(f"  Completed games: {len(completed)}")

                # Show sample completed game
                for event in completed[:2]:
                    comp = event.get('competitions', [{}])[0]
                    print(f"\n  Game: {event.get('name')}")
                    print(f"    Date: {event.get('date')}")
                    for team in comp.get('competitors', []):
                        t = team.get('team', {})
                        print(f"    {t.get('displayName')}: {team.get('score')} ({'Home' if team.get('homeAway') == 'home' else 'Away'})")

        except Exception as e:
            print(f"  Error: {e}")
        time.sleep(0.3)


def explore_game_details(game_id: str = "401852666"):
    """Get detailed info about a specific game."""
    print("\n" + "="*60)
    print(f"Game Details: {game_id}")
    print("="*60)

    endpoints = [
        f"{ESPN_BASE}/sports/baseball/college-baseball/summary?event={game_id}",
        f"{ESPN_BASE}/sports/baseball/college-baseball/scoreboard/{game_id}",
    ]

    for url in endpoints:
        print(f"\nTrying: {url}")
        try:
            response = session.get(url, timeout=15)
            print(f"Status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                print(f"Keys: {list(data.keys())}")

                # Box score
                if 'boxscore' in data:
                    box = data['boxscore']
                    print(f"\nBoxscore keys: {list(box.keys())}")

                    # Teams
                    teams = box.get('teams', [])
                    for team in teams:
                        t = team.get('team', {})
                        print(f"\n  {t.get('displayName')}")

                        # Stats
                        stats = team.get('statistics', [])
                        print(f"    Stats categories: {len(stats)}")
                        for stat in stats[:5]:
                            print(f"      {stat.get('name')}: {stat.get('displayValue')}")

                # Game info
                if 'gameInfo' in data:
                    info = data['gameInfo']
                    print(f"\nGame info: {list(info.keys())}")
                    print(f"  Venue: {info.get('venue', {}).get('fullName')}")
                    print(f"  Attendance: {info.get('attendance')}")

                # Plays/scoring
                if 'plays' in data:
                    print(f"\nPlays available: {len(data['plays'])}")

        except Exception as e:
            print(f"Error: {e}")
        time.sleep(0.3)


def explore_scoreboard_range():
    """Get games from a range of dates to understand historical data."""
    print("\n" + "="*60)
    print("Historical Scoreboard Data")
    print("="*60)

    # Try last 7 days
    for days_ago in [0, 1, 2, 5, 30, 365]:
        date = (datetime.now() - timedelta(days=days_ago)).strftime('%Y%m%d')
        url = f"{ESPN_BASE}/sports/baseball/college-baseball/scoreboard"
        params = {'dates': date}

        print(f"\n{days_ago} days ago ({date}):")
        try:
            response = session.get(url, params=params, timeout=15)
            if response.status_code == 200:
                data = response.json()
                events = data.get('events', [])
                print(f"  Games: {len(events)}")

                # Count completed
                completed = 0
                for event in events:
                    comp = event.get('competitions', [{}])[0]
                    if comp.get('status', {}).get('type', {}).get('completed', False):
                        completed += 1
                print(f"  Completed: {completed}")

        except Exception as e:
            print(f"  Error: {e}")
        time.sleep(0.3)


def explore_statistics_endpoint():
    """Try different statistics endpoints."""
    print("\n" + "="*60)
    print("Statistics Endpoints")
    print("="*60)

    # Core API might have more stats
    endpoints = [
        f"{ESPN_CORE}/sports/baseball/college-baseball/seasons/2024/types/2/teams",
        f"{ESPN_CORE}/sports/baseball/college-baseball/seasons/2025/types/2/teams",
        f"{ESPN_CORE}/sports/baseball/college-baseball/teams/99/statistics",  # Florida
        f"{ESPN_BASE}/sports/baseball/college-baseball/teams/99/statistics?season=2024",
        f"{ESPN_CORE}/sports/baseball/college-baseball/leaders",
    ]

    for url in endpoints:
        print(f"\n{url}")
        try:
            response = session.get(url, timeout=15)
            print(f"  Status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict):
                    print(f"  Keys: {list(data.keys())[:10]}")

                    # Check for items/count
                    count = data.get('count', data.get('total', len(data.get('items', []))))
                    if count:
                        print(f"  Count: {count}")

                    # Sample item
                    items = data.get('items', data.get('categories', data.get('leaders', [])))
                    if items and len(items) > 0:
                        print(f"  Sample item keys: {list(items[0].keys()) if isinstance(items[0], dict) else 'not dict'}")

        except Exception as e:
            print(f"  Error: {e}")
        time.sleep(0.5)


def explore_all_teams_with_data():
    """Get all teams and their available data."""
    print("\n" + "="*60)
    print("All Teams with Available Data")
    print("="*60)

    url = f"{ESPN_BASE}/sports/baseball/college-baseball/teams"

    try:
        response = session.get(url, timeout=15)
        if response.status_code == 200:
            data = response.json()

            all_teams = []
            sports = data.get('sports', [])
            for sport in sports:
                for league in sport.get('leagues', []):
                    for team_wrapper in league.get('teams', []):
                        team = team_wrapper.get('team', {})
                        all_teams.append({
                            'id': team.get('id'),
                            'name': team.get('displayName'),
                            'abbreviation': team.get('abbreviation'),
                            'location': team.get('location'),
                            'nickname': team.get('nickname'),
                            'color': team.get('color'),
                        })

            print(f"Total teams: {len(all_teams)}")

            # Now get schedule for a few to see game data
            print("\nSample teams with schedule data:")
            sample_ids = ['148', '99', '365', '127', '333']  # Alabama, Florida, LSU, Michigan, Duke

            for tid in sample_ids:
                team = next((t for t in all_teams if t['id'] == tid), None)
                if not team:
                    continue

                schedule_url = f"{ESPN_BASE}/sports/baseball/college-baseball/teams/{tid}/schedule"
                try:
                    resp = session.get(schedule_url, timeout=15)
                    if resp.status_code == 200:
                        sched = resp.json()
                        events = sched.get('events', [])
                        completed = [e for e in events if e.get('competitions', [{}])[0].get('status', {}).get('type', {}).get('completed', False)]
                        print(f"\n  {team['name']} ({tid})")
                        print(f"    Total scheduled: {len(events)}")
                        print(f"    Completed: {len(completed)}")

                        # Show sample game with scores
                        for event in completed[:1]:
                            comp = event.get('competitions', [{}])[0]
                            scores = []
                            for c in comp.get('competitors', []):
                                scores.append(f"{c.get('team', {}).get('abbreviation')}: {c.get('score')}")
                            print(f"    Sample: {event.get('date')[:10]} - {', '.join(scores)}")

                except Exception as e:
                    print(f"    Error: {e}")
                time.sleep(0.3)

            return all_teams

    except Exception as e:
        print(f"Error: {e}")
        return []


def main():
    print("ESPN API Deep Exploration")
    print("="*60)

    # Historical scoreboard
    explore_scoreboard_range()

    # Team schedule with results
    explore_team_schedule_full("148")  # Alabama
    time.sleep(0.5)

    # Game details
    explore_game_details("401852666")  # A recent game
    time.sleep(0.5)

    # Statistics
    explore_statistics_endpoint()
    time.sleep(0.5)

    # All teams
    explore_all_teams_with_data()

    print("\n" + "="*60)
    print("Deep exploration complete!")
    print("="*60)


if __name__ == "__main__":
    main()
