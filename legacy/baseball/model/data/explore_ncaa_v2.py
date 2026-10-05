#!/usr/bin/env python3
"""
Explore NCAA stats API - deeper dive into raw HTML.
"""
import requests
from bs4 import BeautifulSoup
import json
import re
import time

NCAA_BASE = "https://stats.ncaa.org"

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
})


def dump_page_structure(url: str, label: str):
    """Dump the raw structure of a page."""
    print(f"\n{'='*60}")
    print(f"{label}")
    print(f"URL: {url}")
    print(f"{'='*60}")

    try:
        response = session.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type', 'unknown')}")
        print(f"Content-Length: {len(response.text)} chars")

        soup = BeautifulSoup(response.text, 'html.parser')

        # Title
        title = soup.find('title')
        print(f"Title: {title.get_text(strip=True) if title else 'None'}")

        # Check for redirects or login pages
        if 'login' in response.text.lower() or 'sign in' in response.text.lower():
            print("WARNING: Appears to be a login page")

        # Meta tags
        print("\nMeta tags:")
        for meta in soup.find_all('meta')[:5]:
            print(f"  {meta}")

        # All links (first 20)
        print("\nAll links (first 20):")
        for link in soup.find_all('a')[:20]:
            href = link.get('href', '')
            text = link.get_text(strip=True)[:50]
            print(f"  {text}: {href}")

        # All divs with id or class
        print("\nMain structural elements:")
        for elem in soup.find_all(['div', 'section', 'main', 'article'])[:15]:
            elem_id = elem.get('id', '')
            elem_class = ' '.join(elem.get('class', []))[:30]
            if elem_id or elem_class:
                print(f"  <{elem.name} id='{elem_id}' class='{elem_class}'>")

        # Forms
        print("\nForms:")
        for form in soup.find_all('form'):
            print(f"  Action: {form.get('action', 'none')}")
            print(f"  Method: {form.get('method', 'GET')}")

        # Scripts that might reveal API endpoints
        print("\nScript tags (looking for API hints):")
        for script in soup.find_all('script'):
            src = script.get('src', '')
            if src:
                print(f"  External: {src}")
            else:
                text = script.get_text()[:200]
                if 'api' in text.lower() or 'fetch' in text.lower() or 'ajax' in text.lower():
                    print(f"  Inline (API hint): {text[:100]}...")

        # Raw text sample
        print("\nPage text sample (first 500 chars):")
        text = soup.get_text(separator=' ', strip=True)
        print(text[:500])

        return soup, response.text

    except Exception as e:
        print(f"Error: {e}")
        return None, None


def try_direct_api():
    """Try to find if there's a JSON API."""
    print(f"\n{'='*60}")
    print("Testing for JSON APIs")
    print(f"{'='*60}")

    api_endpoints = [
        "/api/teams",
        "/api/v1/teams",
        "/teams.json",
        "/api/games",
        "/game_upload/team_search.json",
        "/rankings.json",
    ]

    for endpoint in api_endpoints:
        url = f"{NCAA_BASE}{endpoint}"
        print(f"\nTrying: {url}")
        try:
            response = session.get(url, timeout=10)
            print(f"  Status: {response.status_code}")
            content_type = response.headers.get('Content-Type', '')
            print(f"  Content-Type: {content_type}")
            if 'json' in content_type:
                print(f"  JSON Response: {response.text[:200]}")
        except Exception as e:
            print(f"  Error: {e}")


def explore_with_sport_code():
    """Try URLs with sport codes for baseball."""
    print(f"\n{'='*60}")
    print("Testing with Sport Codes")
    print(f"{'='*60}")

    # NCAA sport codes: MBA = Men's Baseball
    # Division codes: d1 = Division I
    endpoints = [
        "/rankings?sport_code=MBA&academic_year=2025",
        "/rankings/national_ranking?sport_code=MBA&academic_year=2024",
        "/selection_rankings?sport_code=MBA",
        "/team/inst_team_list?sport_code=MBA&division=1",
        "/stats/org_team_stats?game_sport_year_ctl_id=16460",  # 2024 baseball
    ]

    for endpoint in endpoints:
        url = f"{NCAA_BASE}{endpoint}"
        print(f"\nTrying: {url}")
        try:
            response = session.get(url, timeout=15, allow_redirects=True)
            print(f"  Final URL: {response.url}")
            print(f"  Status: {response.status_code}")
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                # Check for content
                tables = soup.find_all('table')
                links = soup.find_all('a', href=re.compile(r'/teams/\d+'))
                print(f"  Tables: {len(tables)}, Team links: {len(links)}")

                # Sample team links
                for link in links[:3]:
                    print(f"    {link.get_text(strip=True)}: {link.get('href')}")

        except Exception as e:
            print(f"  Error: {e}")

        time.sleep(0.5)


def explore_specific_team_endpoints(team_id=365):
    """Test various endpoints for a specific team."""
    print(f"\n{'='*60}")
    print(f"Testing Team {team_id} Endpoints")
    print(f"{'='*60}")

    # Various season IDs to try
    season_ids = [16820, 16460, 15860, 15580]  # Recent years

    endpoints = []
    for sid in season_ids:
        endpoints.extend([
            f"/teams/{team_id}?sport_year_ctl_id={sid}",
            f"/teams/{team_id}/roster/{sid}",
            f"/teams/{team_id}/stats?sport_year_ctl_id={sid}",
            f"/player/game_by_game?org_id={team_id}&sport_year_ctl_id={sid}&stats_player_seq=-100",
        ])

    for endpoint in endpoints:
        url = f"{NCAA_BASE}{endpoint}"
        print(f"\nTrying: {url}")
        try:
            response = session.get(url, timeout=15)
            print(f"  Status: {response.status_code}")
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                tables = soup.find_all('table')
                print(f"  Tables found: {len(tables)}")

                # Check for game data
                text = soup.get_text()
                games = re.findall(r'[WL]\s*\d+-\d+', text)
                if games:
                    print(f"  Game results found: {len(games)}")
                    print(f"  Samples: {games[:3]}")

                # Check for player names
                player_links = soup.find_all('a', href=re.compile(r'/players/\d+'))
                if player_links:
                    print(f"  Player links: {len(player_links)}")

                # Look at first table
                if tables:
                    headers = tables[0].find_all('th')
                    if headers:
                        print(f"  First table headers: {[h.get_text(strip=True) for h in headers[:10]]}")

        except Exception as e:
            print(f"  Error: {e}")

        time.sleep(0.3)


def main():
    print("NCAA Stats Deep Exploration")
    print("="*60)

    # First, look at the main page structure
    dump_page_structure(f"{NCAA_BASE}/teams/365", "LSU Team Page")

    # Try JSON APIs
    try_direct_api()

    # Try with sport codes
    explore_with_sport_code()

    # Explore team-specific endpoints
    explore_specific_team_endpoints(365)

    print("\n" + "="*60)
    print("Deep exploration complete!")
    print("="*60)


if __name__ == "__main__":
    main()
