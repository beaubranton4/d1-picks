#!/usr/bin/env python3
"""
Explore ESPN API for D1 baseball data.
ESPN's API is generally more accessible than NCAA's.
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


def pretty_print(data: dict, indent: int = 2):
    """Pretty print JSON data."""
    print(json.dumps(data, indent=indent, default=str)[:2000])


def explore_college_baseball_scoreboard():
    """Get today's college baseball scoreboard."""
    print("\n" + "="*60)
    print("ESPN College Baseball Scoreboard")
    print("="*60)

    url = f"{ESPN_BASE}/sports/baseball/college-baseball/scoreboard"

    try:
        response = session.get(url, timeout=15)
        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()

            # Print structure
            print(f"\nTop-level keys: {list(data.keys())}")

            # Events (games)
            events = data.get('events', [])
            print(f"\nGames found: {len(events)}")

            for event in events[:3]:  # Show first 3
                print(f"\n--- Game ---")
                print(f"ID: {event.get('id')}")
                print(f"Name: {event.get('name')}")
                print(f"Date: {event.get('date')}")
                print(f"Status: {event.get('status', {}).get('type', {}).get('name')}")

                # Competitions
                competitions = event.get('competitions', [])
                if competitions:
                    comp = competitions[0]
                    print(f"Venue: {comp.get('venue', {}).get('fullName')}")

                    # Competitors (teams)
                    competitors = comp.get('competitors', [])
                    for team in competitors:
                        team_info = team.get('team', {})
                        print(f"  Team: {team_info.get('displayName')} ({team_info.get('abbreviation')})")
                        print(f"    ID: {team_info.get('id')}")
                        print(f"    Home/Away: {'Home' if team.get('homeAway') == 'home' else 'Away'}")
                        print(f"    Score: {team.get('score')}")
                        print(f"    Record: {team.get('records', [{}])[0].get('summary') if team.get('records') else 'N/A'}")

            return data

    except Exception as e:
        print(f"Error: {e}")
        return None


def explore_teams_list():
    """Get list of all college baseball teams."""
    print("\n" + "="*60)
    print("ESPN College Baseball Teams")
    print("="*60)

    url = f"{ESPN_BASE}/sports/baseball/college-baseball/teams"

    try:
        response = session.get(url, timeout=15)
        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()

            print(f"\nTop-level keys: {list(data.keys())}")

            # Sports/leagues
            sports = data.get('sports', [])
            for sport in sports:
                print(f"\nSport: {sport.get('name')}")
                leagues = sport.get('leagues', [])
                for league in leagues:
                    print(f"  League: {league.get('name')} ({league.get('abbreviation')})")
                    print(f"  League ID: {league.get('id')}")

                    # Teams
                    teams = league.get('teams', [])
                    print(f"  Teams count: {len(teams)}")

                    # Show first few teams with all available data
                    for team_wrapper in teams[:5]:
                        team = team_wrapper.get('team', {})
                        print(f"\n    --- Team ---")
                        print(f"    Name: {team.get('displayName')}")
                        print(f"    Abbreviation: {team.get('abbreviation')}")
                        print(f"    ID: {team.get('id')}")
                        print(f"    Location: {team.get('location')}")
                        print(f"    Color: {team.get('color')}")
                        print(f"    Logo: {team.get('logos', [{}])[0].get('href', 'N/A')[:60]}...")

                        # Check for links to more data
                        links = team.get('links', [])
                        if links:
                            print(f"    Links: {[l.get('text') for l in links]}")

            return data

    except Exception as e:
        print(f"Error: {e}")
        return None


def explore_team_detail(team_id: str):
    """Get detailed info for a specific team."""
    print("\n" + "="*60)
    print(f"ESPN Team Detail: {team_id}")
    print("="*60)

    endpoints = [
        f"{ESPN_BASE}/sports/baseball/college-baseball/teams/{team_id}",
        f"{ESPN_BASE}/sports/baseball/college-baseball/teams/{team_id}/schedule",
        f"{ESPN_BASE}/sports/baseball/college-baseball/teams/{team_id}/roster",
        f"{ESPN_BASE}/sports/baseball/college-baseball/teams/{team_id}/statistics",
    ]

    for url in endpoints:
        print(f"\n--- {url.split('/')[-1] or 'team info'} ---")
        print(f"URL: {url}")

        try:
            response = session.get(url, timeout=15)
            print(f"Status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                print(f"Keys: {list(data.keys())}")

                # Show relevant data based on endpoint
                if 'team' in data:
                    team = data['team']
                    print(f"Team: {team.get('displayName')}")
                    print(f"Nickname: {team.get('nickname')}")
                    print(f"Record: {team.get('record', {}).get('items', [{}])[0].get('summary', 'N/A')}")

                    # Stats
                    if 'statistics' in team:
                        print(f"Stats categories: {len(team['statistics'])}")

                if 'events' in data:
                    events = data['events']
                    print(f"Schedule events: {len(events)}")
                    for event in events[:3]:
                        print(f"  {event.get('date')}: {event.get('name')}")

                if 'athletes' in data:
                    athletes = data['athletes']
                    print(f"Roster players: {len(athletes)}")
                    for player in athletes[:3]:
                        print(f"  {player.get('displayName')} - {player.get('position', {}).get('abbreviation')}")

                if 'splits' in data:
                    print(f"Statistics splits: {list(data['splits'].keys()) if isinstance(data['splits'], dict) else len(data['splits'])}")

        except Exception as e:
            print(f"Error: {e}")

        time.sleep(0.3)


def explore_schedule_by_date(date_str: str):
    """Get games for a specific date."""
    print("\n" + "="*60)
    print(f"ESPN College Baseball - Games on {date_str}")
    print("="*60)

    # Format: YYYYMMDD
    date_formatted = date_str.replace('-', '')
    url = f"{ESPN_BASE}/sports/baseball/college-baseball/scoreboard?dates={date_formatted}"

    try:
        response = session.get(url, timeout=15)
        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()

            events = data.get('events', [])
            print(f"\nGames found: {len(events)}")

            all_games = []
            for event in events:
                game = {
                    'id': event.get('id'),
                    'name': event.get('name'),
                    'date': event.get('date'),
                    'status': event.get('status', {}).get('type', {}).get('name'),
                }

                competitions = event.get('competitions', [])
                if competitions:
                    comp = competitions[0]
                    game['venue'] = comp.get('venue', {}).get('fullName')
                    game['neutral_site'] = comp.get('neutralSite', False)

                    # Teams
                    for team in comp.get('competitors', []):
                        team_info = team.get('team', {})
                        prefix = 'home_' if team.get('homeAway') == 'home' else 'away_'
                        game[f'{prefix}team'] = team_info.get('displayName')
                        game[f'{prefix}team_id'] = team_info.get('id')
                        game[f'{prefix}abbreviation'] = team_info.get('abbreviation')
                        game[f'{prefix}score'] = team.get('score')
                        records = team.get('records', [])
                        if records:
                            game[f'{prefix}record'] = records[0].get('summary')

                all_games.append(game)

            # Print sample games
            for game in all_games[:5]:
                print(f"\n{game.get('away_team')} @ {game.get('home_team')}")
                print(f"  Game ID: {game.get('id')}")
                print(f"  Status: {game.get('status')}")
                print(f"  Score: {game.get('away_score', '-')} - {game.get('home_score', '-')}")
                print(f"  Records: {game.get('away_record', 'N/A')} vs {game.get('home_record', 'N/A')}")
                print(f"  Venue: {game.get('venue')}")
                print(f"  Neutral: {game.get('neutral_site')}")

            return all_games

    except Exception as e:
        print(f"Error: {e}")
        return []


def explore_conferences():
    """Explore conference structure."""
    print("\n" + "="*60)
    print("ESPN College Baseball Conferences")
    print("="*60)

    url = f"{ESPN_BASE}/sports/baseball/college-baseball/standings"

    try:
        response = session.get(url, timeout=15)
        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"Keys: {list(data.keys())}")

            # Children usually contains conferences
            children = data.get('children', [])
            print(f"\nConferences/Groups: {len(children)}")

            for conf in children[:10]:
                print(f"\n  Conference: {conf.get('name')}")
                print(f"  Abbreviation: {conf.get('abbreviation')}")
                print(f"  ID: {conf.get('id')}")

                standings = conf.get('standings', {}).get('entries', [])
                print(f"  Teams in standings: {len(standings)}")

                for team in standings[:3]:
                    t = team.get('team', {})
                    print(f"    - {t.get('displayName')} ({t.get('id')})")

    except Exception as e:
        print(f"Error: {e}")


def main():
    print("ESPN API Explorer for College Baseball")
    print("="*60)

    # 1. Today's scoreboard
    explore_college_baseball_scoreboard()
    time.sleep(0.5)

    # 2. Teams list
    teams_data = explore_teams_list()
    time.sleep(0.5)

    # 3. Pick a team to explore in detail
    if teams_data:
        sports = teams_data.get('sports', [])
        if sports:
            leagues = sports[0].get('leagues', [])
            if leagues:
                teams = leagues[0].get('teams', [])
                if teams:
                    first_team_id = teams[0].get('team', {}).get('id')
                    if first_team_id:
                        explore_team_detail(first_team_id)
                        time.sleep(0.5)

    # 4. Yesterday's games (more likely to have completed games)
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    explore_schedule_by_date(yesterday)
    time.sleep(0.5)

    # 5. Conference standings
    explore_conferences()

    print("\n" + "="*60)
    print("ESPN exploration complete!")
    print("="*60)


if __name__ == "__main__":
    main()
