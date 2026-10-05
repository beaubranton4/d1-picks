#!/usr/bin/env python3
"""
Scrape RPI data from Warren Nolan.

Warren Nolan provides:
- RPI ranking
- SOS (Strength of Schedule)
- Record breakdowns (home/road/neutral)
- Quadrant records (Q1-Q4)
- Non-conference metrics

Usage:
    python warren_nolan_rpi.py --year 2024
    python warren_nolan_rpi.py --year 2025 --output raw/rpi_2025.json
"""
import argparse
import requests
from bs4 import BeautifulSoup
import json
import os
import re
from datetime import datetime
from typing import List, Dict, Optional

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
})


def parse_record(record_str: str) -> Dict:
    """Parse record string like '15-3' into wins/losses."""
    if not record_str or record_str == '-':
        return {'wins': 0, 'losses': 0}

    match = re.match(r'(\d+)-(\d+)', record_str.strip())
    if match:
        return {'wins': int(match.group(1)), 'losses': int(match.group(2))}
    return {'wins': 0, 'losses': 0}


def parse_float(value: str) -> Optional[float]:
    """Parse float from string, handling empty/invalid values."""
    if not value or value in ['-', '', 'N/A']:
        return None
    try:
        return float(value.strip())
    except ValueError:
        return None


def parse_int(value: str) -> Optional[int]:
    """Parse int from string."""
    if not value or value in ['-', '', 'N/A']:
        return None
    try:
        return int(value.strip())
    except ValueError:
        return None


def scrape_rpi(year: int) -> List[Dict]:
    """
    Scrape RPI rankings from Warren Nolan.

    Returns list of team RPI data.
    """
    url = f"https://www.warrennolan.com/baseball/{year}/rpi"
    print(f"Fetching RPI from: {url}")

    try:
        response = session.get(url, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"Error fetching RPI: {e}")
        return []

    soup = BeautifulSoup(response.text, 'html.parser')

    # Find the RPI table
    tables = soup.find_all('table')
    print(f"Found {len(tables)} tables")

    rpi_data = []

    for table in tables:
        # Look for table with RPI headers
        headers = table.find_all('th')
        header_text = [h.get_text(strip=True) for h in headers]

        if 'RPI' not in header_text:
            continue

        print(f"Found RPI table with headers: {header_text}")

        # Map header positions
        header_map = {h: i for i, h in enumerate(header_text)}

        # Parse data rows
        rows = table.find_all('tr')
        for row in rows[1:]:  # Skip header row
            cells = row.find_all(['td', 'th'])
            if len(cells) < 5:
                continue

            cell_values = [c.get_text(strip=True) for c in cells]

            # Extract team name (might be in a link)
            team_cell = cells[header_map.get('Team', 1)]
            team_link = team_cell.find('a')
            team_name = team_link.get_text(strip=True) if team_link else cell_values[header_map.get('Team', 1)]

            # Skip empty rows
            if not team_name or team_name.lower() == 'team':
                continue

            # Build team data
            team_data = {
                'team': team_name,
                'year': year,
            }

            # Extract RPI rank
            rpi_idx = header_map.get('RPI', 0)
            team_data['rpi_rank'] = parse_int(cell_values[rpi_idx]) if rpi_idx < len(cell_values) else None

            # Extract record
            record_idx = header_map.get('Record', 2)
            if record_idx < len(cell_values):
                record = parse_record(cell_values[record_idx])
                team_data['wins'] = record['wins']
                team_data['losses'] = record['losses']

            # Extract SOS (Strength of Schedule)
            sos_idx = header_map.get('SOS', None)
            if sos_idx and sos_idx < len(cell_values):
                team_data['sos_rank'] = parse_int(cell_values[sos_idx])

            # Extract Non-Conference metrics
            ncrec_idx = header_map.get('NCRec', None)
            if ncrec_idx and ncrec_idx < len(cell_values):
                nc_record = parse_record(cell_values[ncrec_idx])
                team_data['nc_wins'] = nc_record['wins']
                team_data['nc_losses'] = nc_record['losses']

            ncrpi_idx = header_map.get('NCRPI', None)
            if ncrpi_idx and ncrpi_idx < len(cell_values):
                team_data['nc_rpi_rank'] = parse_int(cell_values[ncrpi_idx])

            ncsos_idx = header_map.get('NCSOS', None)
            if ncsos_idx and ncsos_idx < len(cell_values):
                team_data['nc_sos_rank'] = parse_int(cell_values[ncsos_idx])

            # Extract Home/Road/Neutral records
            for field, key in [('H', 'home'), ('R', 'road'), ('N', 'neutral')]:
                idx = header_map.get(field, None)
                if idx and idx < len(cell_values):
                    record = parse_record(cell_values[idx])
                    team_data[f'{key}_wins'] = record['wins']
                    team_data[f'{key}_losses'] = record['losses']

            # Extract Quadrant records (Q1-Q4)
            for q in ['Q1', 'Q2', 'Q3', 'Q4']:
                idx = header_map.get(q, None)
                if idx and idx < len(cell_values):
                    record = parse_record(cell_values[idx])
                    team_data[f'{q.lower()}_wins'] = record['wins']
                    team_data[f'{q.lower()}_losses'] = record['losses']

            # Extract RPI Delta (change)
            delta_idx = header_map.get('RPIDelta', None)
            if delta_idx and delta_idx < len(cell_values):
                team_data['rpi_delta'] = parse_int(cell_values[delta_idx])

            rpi_data.append(team_data)

        # Found the RPI table, no need to check others
        break

    print(f"Parsed {len(rpi_data)} teams")
    return rpi_data


def save_rpi(data: List[Dict], output_file: str):
    """Save RPI data to JSON."""
    os.makedirs(os.path.dirname(output_file) or '.', exist_ok=True)

    with open(output_file, 'w') as f:
        json.dump({
            'generated_at': datetime.now().isoformat(),
            'source': 'Warren Nolan',
            'count': len(data),
            'data': data
        }, f, indent=2)

    print(f"Saved {len(data)} teams to {output_file}")


def main():
    parser = argparse.ArgumentParser(description='Scrape Warren Nolan RPI data')
    parser.add_argument(
        '--year',
        type=int,
        default=2025,
        help='Year to scrape (e.g., 2024, 2025)'
    )
    parser.add_argument(
        '--output',
        type=str,
        default=None,
        help='Output JSON file'
    )

    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"Warren Nolan RPI Scraper")
    print(f"{'='*60}")
    print(f"Year: {args.year}")

    # Scrape RPI
    rpi_data = scrape_rpi(args.year)

    if not rpi_data:
        print("No RPI data found")
        return

    # Output file
    output_file = args.output or f"raw/rpi_{args.year}.json"
    output_path = os.path.join(os.path.dirname(__file__), output_file)

    # Save
    save_rpi(rpi_data, output_path)

    # Summary
    print(f"\n{'='*60}")
    print("Sample Data (Top 10)")
    print(f"{'='*60}")

    for team in rpi_data[:10]:
        q1 = f"{team.get('q1_wins', 0)}-{team.get('q1_losses', 0)}"
        print(f"  #{team.get('rpi_rank', '?'):3} {team['team'][:25]:25} "
              f"({team.get('wins', 0)}-{team.get('losses', 0)}) "
              f"SOS: {team.get('sos_rank', 'N/A')} Q1: {q1}")


if __name__ == "__main__":
    main()
