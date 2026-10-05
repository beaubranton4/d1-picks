#!/usr/bin/env python3
"""
Explore the groups endpoint to get full conference/division structure.
"""
import requests
import json

ESPN_BASE = "https://site.api.espn.com/apis/site/v2"

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
})


def get_all_groups():
    """Get full groups structure."""
    url = f"{ESPN_BASE}/sports/baseball/college-baseball/groups"

    response = session.get(url, timeout=15)
    if response.status_code == 200:
        return response.json()
    return None


def get_group_teams(group_id):
    """Get teams in a specific group."""
    url = f"{ESPN_BASE}/sports/baseball/college-baseball/teams"
    params = {'groups': group_id, 'limit': 500}

    response = session.get(url, params=params, timeout=15)
    if response.status_code == 200:
        data = response.json()
        teams = []
        for sport in data.get('sports', []):
            for league in sport.get('leagues', []):
                for tw in league.get('teams', []):
                    t = tw.get('team', {})
                    teams.append({
                        'id': t.get('id'),
                        'name': t.get('displayName'),
                        'abbr': t.get('abbreviation'),
                    })
        return teams
    return []


def main():
    print("College Baseball Groups Structure")
    print("="*60)

    data = get_all_groups()
    if not data:
        print("Failed to get groups")
        return

    groups = data.get('groups', [])
    print(f"\nFound {len(groups)} top-level groups")

    for group in groups:
        print(f"\n{'='*60}")
        print(f"Division: {group.get('name')} ({group.get('abbreviation')})")
        print(f"{'='*60}")

        children = group.get('children', [])
        print(f"Conferences: {len(children)}")

        for conf in children:
            print(f"\n  {conf.get('name')} ({conf.get('abbreviation')})")

            # Try to get conference ID and teams
            conf_abbr = conf.get('abbreviation', '').lower()
            # Common conference IDs in ESPN's system for baseball
            conf_ids = {
                'sec': '8',
                'acc': '2',
                'big12': '4',
                'big10': '6',
                'pac12': '9',
            }

            if conf_abbr in conf_ids:
                print(f"    Trying to get teams for group {conf_ids[conf_abbr]}...")

    # Now let's check what groups=1 returns (number of teams)
    print(f"\n{'='*60}")
    print("Testing group IDs")
    print(f"{'='*60}")

    for gid in [1, 50, 51, 100]:
        teams = get_group_teams(str(gid))
        print(f"\nGroup {gid}: {len(teams)} teams")
        if teams and len(teams) < 500:  # If filtered
            for t in teams[:5]:
                print(f"  - {t['name']} ({t['abbr']})")


if __name__ == "__main__":
    main()
