#!/usr/bin/env python3
"""
Explore sources for RPI data.
"""
import requests
from bs4 import BeautifulSoup
import json
import time

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
})

ESPN_BASE = "https://site.api.espn.com/apis/site/v2"


def check_espn_rankings():
    """Check if ESPN has RPI/rankings data."""
    print("ESPN Rankings/RPI")
    print("="*60)

    endpoints = [
        f"{ESPN_BASE}/sports/baseball/college-baseball/rankings",
        f"{ESPN_BASE}/sports/baseball/college-baseball/rankings?type=rpi",
        f"{ESPN_BASE}/sports/baseball/college-baseball/teams/148",  # Alabama detail
    ]

    for url in endpoints:
        print(f"\n{url}")
        try:
            response = session.get(url, timeout=15)
            print(f"  Status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                print(f"  Keys: {list(data.keys())}")

                # Check for rankings
                if 'rankings' in data:
                    rankings = data['rankings']
                    print(f"  Rankings: {len(rankings)}")
                    if rankings:
                        print(f"  Sample: {rankings[0]}")

                # Check team detail for RPI
                if 'team' in data:
                    team = data['team']
                    for key in ['rpi', 'ranking', 'rank', 'ratings']:
                        if key in team:
                            print(f"  {key}: {team[key]}")

        except Exception as e:
            print(f"  Error: {e}")
        time.sleep(0.3)


def check_warren_nolan():
    """Check Warren Nolan for RPI data."""
    print("\n\nWarren Nolan RPI")
    print("="*60)

    # Warren Nolan is known for RPI data
    urls = [
        "https://www.warrennolan.com/baseball/2025/rpi",
        "https://www.warrennolan.com/baseball/2024/rpi",
        "https://www.warrennolan.com/baseball/2025/rpi-live",
    ]

    for url in urls:
        print(f"\n{url}")
        try:
            response = session.get(url, timeout=15)
            print(f"  Status: {response.status_code}")

            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')

                # Look for RPI table
                tables = soup.find_all('table')
                print(f"  Tables found: {len(tables)}")

                # Look for RPI values in text
                text = soup.get_text()
                if 'RPI' in text:
                    print("  Contains 'RPI' text")

                # Find headers
                headers = soup.find_all('th')
                header_text = [h.get_text(strip=True) for h in headers[:15]]
                if header_text:
                    print(f"  Headers: {header_text}")

                # Look for team rows with numbers
                for table in tables[:2]:
                    rows = table.find_all('tr')
                    for row in rows[1:4]:  # First few data rows
                        cells = row.find_all(['td', 'th'])
                        cell_text = [c.get_text(strip=True) for c in cells[:8]]
                        if cell_text and any(c.replace('.', '').isdigit() for c in cell_text):
                            print(f"  Sample row: {cell_text}")
                            break

        except Exception as e:
            print(f"  Error: {e}")
        time.sleep(0.5)


def check_ncaa_rpi():
    """Check if NCAA provides RPI directly."""
    print("\n\nNCAA RPI Sources")
    print("="*60)

    urls = [
        "https://www.ncaa.com/rankings/baseball/d1/rpi",
        "https://stats.ncaa.org/selection_rankings/nitty_gritties/31860",  # Baseball nitty gritty
    ]

    for url in urls:
        print(f"\n{url}")
        try:
            response = session.get(url, timeout=15, allow_redirects=True)
            print(f"  Status: {response.status_code}")
            print(f"  Final URL: {response.url}")

            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                title = soup.find('title')
                print(f"  Title: {title.get_text(strip=True) if title else 'None'}")

                # Look for RPI data
                tables = soup.find_all('table')
                print(f"  Tables: {len(tables)}")

        except Exception as e:
            print(f"  Error: {e}")
        time.sleep(0.5)


def check_d1baseball():
    """Check D1Baseball.com for RPI."""
    print("\n\nD1Baseball RPI")
    print("="*60)

    url = "https://d1baseball.com/rpi/"
    print(f"\n{url}")

    try:
        response = session.get(url, timeout=15)
        print(f"  Status: {response.status_code}")

        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')

            # Look for data
            tables = soup.find_all('table')
            print(f"  Tables: {len(tables)}")

            # Check for JSON data in scripts
            scripts = soup.find_all('script')
            for script in scripts:
                text = script.get_text()
                if 'rpi' in text.lower() and '{' in text:
                    print("  Found potential RPI JSON data in script")
                    break

    except Exception as e:
        print(f"  Error: {e}")


def main():
    check_espn_rankings()
    check_warren_nolan()
    check_ncaa_rpi()
    check_d1baseball()

    print("\n" + "="*60)
    print("RPI Exploration Complete")
    print("="*60)


if __name__ == "__main__":
    main()
