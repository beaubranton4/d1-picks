#!/usr/bin/env python3
"""
Explore ESPN API for division and conference data.
"""
import requests
import json
import time

ESPN_BASE = "https://site.api.espn.com/apis/site/v2"

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
})


def explore_groups():
    """Try to find conference/division groupings."""
    print("Exploring Groups/Conferences/Divisions")
    print("="*60)

    endpoints = [
        f"{ESPN_BASE}/sports/baseball/college-baseball/groups",
        f"{ESPN_BASE}/sports/baseball/college-baseball/standings",
        f"{ESPN_BASE}/sports/baseball/college-baseball/scoreboard?groups=1",  # D1?
        f"{ESPN_BASE}/sports/baseball/college-baseball/scoreboard?groups=2",  # D2?
        f"{ESPN_BASE}/sports/baseball/college-baseball/scoreboard?groups=3",  # D3?
        f"{ESPN_BASE}/sports/baseball/college-baseball/teams?groups=1",
        f"{ESPN_BASE}/sports/baseball/college-baseball/teams?groups=50",  # SEC?
        f"{ESPN_BASE}/sports/baseball/college-baseball/teams?limit=500",
    ]

    for url in endpoints:
        print(f"\n{url}")
        try:
            response = session.get(url, timeout=15)
            print(f"  Status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                print(f"  Keys: {list(data.keys())[:10]}")

                # Check for groups/children/divisions
                if 'children' in data:
                    children = data['children']
                    print(f"  Children: {len(children)}")
                    for child in children[:5]:
                        print(f"    - {child.get('name')} ({child.get('abbreviation')})")

                if 'groups' in data:
                    print(f"  Groups: {data['groups']}")

                if 'sports' in data:
                    sports = data['sports']
                    for sport in sports:
                        for league in sport.get('leagues', []):
                            print(f"  League: {league.get('name')} (ID: {league.get('id')})")
                            groups = league.get('groups', [])
                            if groups:
                                print(f"    Groups: {groups}")

        except Exception as e:
            print(f"  Error: {e}")
        time.sleep(0.3)


def explore_team_detail_for_conference(team_id="148"):
    """Check if individual team detail shows conference."""
    print(f"\nTeam Detail for {team_id}")
    print("="*60)

    url = f"{ESPN_BASE}/sports/baseball/college-baseball/teams/{team_id}"

    try:
        response = session.get(url, timeout=15)
        if response.status_code == 200:
            data = response.json()
            team = data.get('team', {})

            print(f"Team: {team.get('displayName')}")
            print(f"\nAll team keys: {list(team.keys())}")

            # Check for groups/conferences
            groups = team.get('groups', {})
            print(f"\nGroups: {groups}")

            # Check links
            links = team.get('links', [])
            if links:
                print(f"\nLinks:")
                for link in links:
                    print(f"  {link.get('text')}: {link.get('href')}")

            # Standings link might show conference
            standingsLink = team.get('standingsLink')
            if standingsLink:
                print(f"\nStandings link: {standingsLink}")

    except Exception as e:
        print(f"Error: {e}")


def try_sec_teams():
    """Try to get SEC teams specifically."""
    print("\nSEC Conference Teams")
    print("="*60)

    # SEC conference ID is often 8 in ESPN's system
    endpoints = [
        f"{ESPN_BASE}/sports/baseball/college-baseball/teams?conference=8",
        f"{ESPN_BASE}/sports/baseball/college-baseball/standings?group=8",
        f"{ESPN_BASE}/sports/baseball/college-baseball/teams?group=8",
    ]

    for url in endpoints:
        print(f"\n{url}")
        try:
            response = session.get(url, timeout=15)
            print(f"  Status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                print(f"  Keys: {list(data.keys())}")

                # Count teams
                if 'sports' in data:
                    for sport in data['sports']:
                        for league in sport.get('leagues', []):
                            teams = league.get('teams', [])
                            print(f"  Teams: {len(teams)}")

        except Exception as e:
            print(f"  Error: {e}")
        time.sleep(0.3)


def explore_specific_divisions():
    """Explore D1, D2, D3 specific endpoints."""
    print("\nDivision-Specific Exploration")
    print("="*60)

    # Try different sport/league combinations
    leagues = [
        "college-baseball",
        "college-baseball-d1",
        "ncaa-baseball",
        "college-baseball/d1",
    ]

    for league in leagues:
        url = f"{ESPN_BASE}/sports/baseball/{league}/teams"
        print(f"\n{url}")
        try:
            response = session.get(url, timeout=15)
            print(f"  Status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                if 'sports' in data:
                    for sport in data['sports']:
                        for lg in sport.get('leagues', []):
                            teams = lg.get('teams', [])
                            print(f"  League: {lg.get('name')}, Teams: {len(teams)}")

        except Exception as e:
            print(f"  Error: {e}")
        time.sleep(0.3)


def check_for_d1_indicator():
    """Check specific known D1 vs non-D1 teams to find differences."""
    print("\nComparing D1 vs Non-D1 Teams")
    print("="*60)

    teams = [
        ("148", "Alabama", "D1"),
        ("99", "Nebraska", "D1"),  # Note: Nebraska football moved, but baseball might be different
        ("365", "LSU", "D1"),  # Actually Hofstra in ESPN numbering
        ("317", "Alabama A&M", "Likely D1 or D2"),  # HBCU
    ]

    for team_id, name, expected in teams:
        url = f"{ESPN_BASE}/sports/baseball/college-baseball/teams/{team_id}"
        print(f"\n{name} ({team_id}) - Expected: {expected}")
        try:
            response = session.get(url, timeout=15)
            if response.status_code == 200:
                data = response.json()
                team = data.get('team', {})
                print(f"  Name: {team.get('displayName')}")
                print(f"  Location: {team.get('location')}")

                # Check for any division indicators
                for key in ['division', 'groups', 'conference', 'group']:
                    if key in team:
                        print(f"  {key}: {team[key]}")

                # Check record structure
                record = team.get('record', {})
                if record:
                    print(f"  Record keys: {list(record.keys())}")

        except Exception as e:
            print(f"  Error: {e}")
        time.sleep(0.3)


def main():
    explore_groups()
    time.sleep(0.5)

    explore_team_detail_for_conference()
    time.sleep(0.5)

    try_sec_teams()
    time.sleep(0.5)

    explore_specific_divisions()
    time.sleep(0.5)

    check_for_d1_indicator()

    print("\n" + "="*60)
    print("Division exploration complete!")
    print("="*60)


if __name__ == "__main__":
    main()
