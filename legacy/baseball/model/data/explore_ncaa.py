#!/usr/bin/env python3
"""
Explore NCAA stats API to discover what data is actually available.
"""
import requests
from bs4 import BeautifulSoup
import json
import re
import time

NCAA_BASE = "https://stats.ncaa.org"

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
})

def explore_team_page(team_id: int, team_name: str):
    """Explore a team's page to see what data is available."""
    print(f"\n{'='*60}")
    print(f"Exploring: {team_name} (ID: {team_id})")
    print(f"{'='*60}")

    # Try the team page
    url = f"{NCAA_BASE}/teams/{team_id}"
    print(f"\nFetching: {url}")

    try:
        response = session.get(url, timeout=30)
        print(f"Status: {response.status_code}")

        if response.status_code != 200:
            print(f"Failed to fetch team page")
            return None

        soup = BeautifulSoup(response.text, 'html.parser')

        # Look for team info
        print("\n--- Team Info ---")

        # Find title/name
        title = soup.find('title')
        if title:
            print(f"Page title: {title.get_text(strip=True)}")

        # Look for division info
        division_patterns = ['Division I', 'Division II', 'Division III', 'D1', 'D2', 'D3', 'DI', 'DII', 'DIII']
        page_text = soup.get_text()
        for pattern in division_patterns:
            if pattern in page_text:
                print(f"Found division indicator: {pattern}")
                break

        # Look for conference
        conf_header = soup.find(string=re.compile(r'Conference', re.I))
        if conf_header:
            parent = conf_header.find_parent()
            if parent:
                print(f"Conference area: {parent.get_text(strip=True)[:100]}")

        # Find all links to understand structure
        print("\n--- Available Links ---")
        nav_links = soup.find_all('a', href=re.compile(r'/teams/\d+'))
        seen = set()
        for link in nav_links[:20]:
            href = link.get('href', '')
            text = link.get_text(strip=True)
            if text and text not in seen:
                seen.add(text)
                print(f"  {text}: {href}")

        # Find tables
        print("\n--- Tables Found ---")
        tables = soup.find_all('table')
        print(f"Found {len(tables)} tables")

        for i, table in enumerate(tables[:3]):
            headers = table.find_all('th')
            if headers:
                header_text = [h.get_text(strip=True) for h in headers[:10]]
                print(f"  Table {i+1} headers: {header_text}")

        # Find schedule/results
        print("\n--- Looking for Schedule/Results ---")
        schedule_link = soup.find('a', string=re.compile(r'Schedule|Results', re.I))
        if schedule_link:
            print(f"Found schedule link: {schedule_link.get('href')}")

        # Look for season dropdown
        print("\n--- Season Selection ---")
        selects = soup.find_all('select')
        for sel in selects:
            options = sel.find_all('option')
            if options:
                opt_values = [(o.get('value'), o.get_text(strip=True)) for o in options[:5]]
                print(f"  Select options: {opt_values}")

        return soup

    except Exception as e:
        print(f"Error: {e}")
        return None


def explore_rankings_page():
    """Explore rankings page to find all teams with division info."""
    print(f"\n{'='*60}")
    print("Exploring Rankings/Teams Lists")
    print(f"{'='*60}")

    # Try different endpoints
    endpoints = [
        "/rankings/national_ranking",
        "/rankings/change_sport_year_div",
        "/teams",
        "/game_upload/team_search",
    ]

    for endpoint in endpoints:
        url = f"{NCAA_BASE}{endpoint}"
        print(f"\nTrying: {url}")

        try:
            response = session.get(url, timeout=30)
            print(f"  Status: {response.status_code}")

            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')

                # Look for team list
                team_links = soup.find_all('a', href=re.compile(r'/teams/\d+'))
                print(f"  Found {len(team_links)} team links")

                # Check for division info
                divisions = soup.find_all(string=re.compile(r'Division [I]+'))
                print(f"  Division mentions: {len(divisions)}")

                # Sample some teams
                if team_links:
                    for link in team_links[:3]:
                        print(f"    Sample: {link.get_text(strip=True)} -> {link.get('href')}")

        except Exception as e:
            print(f"  Error: {e}")

        time.sleep(0.5)


def explore_team_stats_page(team_id: int):
    """Explore team stats page structure."""
    print(f"\n{'='*60}")
    print(f"Exploring Stats Page for Team {team_id}")
    print(f"{'='*60}")

    url = f"{NCAA_BASE}/teams/{team_id}/stats"
    print(f"Fetching: {url}")

    try:
        response = session.get(url, timeout=30)
        print(f"Status: {response.status_code}")

        if response.status_code != 200:
            return

        soup = BeautifulSoup(response.text, 'html.parser')

        # Look for stat categories
        print("\n--- Stat Categories ---")
        for link in soup.find_all('a'):
            href = link.get('href', '')
            if 'stat' in href.lower() or 'category' in href.lower():
                print(f"  {link.get_text(strip=True)}: {href}")

        # Find tables with stats
        print("\n--- Stats Tables ---")
        tables = soup.find_all('table')
        for i, table in enumerate(tables):
            rows = table.find_all('tr')
            if rows:
                print(f"\nTable {i+1}: {len(rows)} rows")
                # Print headers
                headers = table.find_all('th')
                if headers:
                    print(f"  Headers: {[h.get_text(strip=True) for h in headers[:15]]}")
                # Print first data row
                first_row = table.find('tr', class_=lambda x: x and 'heading' not in str(x))
                if first_row:
                    cells = first_row.find_all('td')
                    print(f"  Sample row: {[c.get_text(strip=True) for c in cells[:15]]}")

    except Exception as e:
        print(f"Error: {e}")


def explore_game_page(team_id: int):
    """Try to find game-by-game results."""
    print(f"\n{'='*60}")
    print(f"Exploring Game Results for Team {team_id}")
    print(f"{'='*60}")

    # Try different URL patterns for game logs
    patterns = [
        f"{NCAA_BASE}/teams/{team_id}",
        f"{NCAA_BASE}/player/game_by_game?org_id={team_id}&sport_year_ctl_id=16460",  # 2024 season
        f"{NCAA_BASE}/teams/{team_id}/schedule",
    ]

    for url in patterns:
        print(f"\nTrying: {url}")
        try:
            response = session.get(url, timeout=30)
            print(f"  Status: {response.status_code}")

            if response.status_code != 200:
                continue

            soup = BeautifulSoup(response.text, 'html.parser')

            # Look for game results pattern (W/L with scores)
            text = soup.get_text()
            game_results = re.findall(r'[WL]\s*\d+-\d+', text)
            if game_results:
                print(f"  Found {len(game_results)} game results")
                print(f"  Samples: {game_results[:5]}")

            # Look for date patterns
            dates = re.findall(r'\d{1,2}/\d{1,2}(?:/\d{2,4})?', text)
            if dates:
                print(f"  Found {len(dates)} date patterns")
                print(f"  Samples: {dates[:5]}")

            # Look for tables with game data
            for table in soup.find_all('table'):
                rows = table.find_all('tr')
                for row in rows[:5]:
                    cells = row.find_all(['td', 'th'])
                    cell_text = [c.get_text(strip=True) for c in cells]
                    # Check if this looks like a game row
                    if any(re.match(r'[WL]\s*\d+-\d+', c) for c in cell_text):
                        print(f"  Game row: {cell_text}")
                        break

        except Exception as e:
            print(f"  Error: {e}")

        time.sleep(0.5)


def main():
    print("NCAA Stats API Explorer")
    print("="*60)

    # Test with a known team (LSU - team_id 365)
    test_teams = [
        (365, "LSU"),
        (8, "Alabama"),
        (99, "Florida"),
    ]

    for team_id, team_name in test_teams[:1]:  # Start with just one
        explore_team_page(team_id, team_name)
        time.sleep(1)
        explore_team_stats_page(team_id)
        time.sleep(1)
        explore_game_page(team_id)
        time.sleep(1)

    # Explore rankings/team lists
    explore_rankings_page()

    print("\n" + "="*60)
    print("Exploration complete!")
    print("="*60)


if __name__ == "__main__":
    main()
