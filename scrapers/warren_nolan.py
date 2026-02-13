"""
Warren Nolan scraper for college baseball predictions.
"""
import re
import requests
from bs4 import BeautifulSoup
from typing import List, Dict


def clean_team_name(name: str) -> str:
    """Clean team name by removing rankings, records, and extra whitespace."""
    # Remove rankings like "#1"
    name = re.sub(r'#\d+\s*', '', name)
    # Remove records like "(15-3)"
    name = re.sub(r'\(\d+-\d+\)', '', name)
    # Remove extra whitespace
    name = re.sub(r'\s+', ' ', name).strip()
    return name


def parse_probability(prob_text: str) -> float:
    """Parse probability from text (handles % format or decimal)."""
    prob_text = prob_text.strip()

    if '%' in prob_text:
        # Handle percentage format like "62%"
        return float(prob_text.strip('%')) / 100
    else:
        # Handle decimal format like "0.62"
        return float(prob_text)


def scrape_predictions(date_str: str) -> List[Dict]:
    """
    Scrape game predictions from Warren Nolan for a specific date.

    Args:
        date_str: Date in YYYY-MM-DD format

    Returns:
        List of game dictionaries with predictions
    """
    url = f"https://www.warrennolan.com/baseball/2024/schedules-date/{date_str}"
    headers = {
        "User-Agent": "D1BaseballPicks/1.0 (Educational Use)"
    }

    print(f"   Fetching from: {url}")

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"   ❌ Error fetching Warren Nolan: {e}")
        return []

    soup = BeautifulSoup(response.text, 'html.parser')
    games = []

    # Warren Nolan typically uses tables for schedule data
    # We need to find the right table - look for game data
    tables = soup.find_all('table')

    print(f"   Found {len(tables)} tables on page")

    # Try to find the schedule table
    # This may need adjustment based on actual HTML structure
    game_rows = []

    for table in tables:
        rows = table.find_all('tr')
        for row in rows:
            cells = row.find_all(['td', 'th'])
            cell_text = ' '.join([c.get_text(strip=True) for c in cells])

            # Look for rows that contain team matchups (@ or vs)
            if '@' in cell_text or ' vs ' in cell_text.lower():
                game_rows.append(row)

    print(f"   Found {len(game_rows)} potential game rows")

    for row in game_rows:
        try:
            cells = row.find_all(['td', 'th'])
            cell_texts = [c.get_text(strip=True) for c in cells]

            # Try to parse the row
            # This is a heuristic approach - may need adjustment
            teams_text = None
            prob_text = None
            time_text = None

            for text in cell_texts:
                # Look for team matchup
                if '@' in text or ' vs ' in text.lower():
                    teams_text = text
                # Look for probability (percentage or decimal between 0 and 1)
                elif '%' in text or (text.replace('.', '').isdigit() and 0 < float(text) < 1):
                    prob_text = text
                # Look for time
                elif ':' in text and any(c.isdigit() for c in text):
                    time_text = text

            if not teams_text:
                continue

            # Parse teams
            if '@' in teams_text:
                parts = teams_text.split('@')
                away_team = clean_team_name(parts[0])
                home_team = clean_team_name(parts[1])
                venue_type = 'home_b'
                team_a, team_b = away_team, home_team
                team_a_home, team_b_home = False, True
            elif ' vs ' in teams_text.lower():
                parts = re.split(r'\s+vs\s+', teams_text, flags=re.IGNORECASE)
                team_a = clean_team_name(parts[0])
                team_b = clean_team_name(parts[1])
                venue_type = 'neutral'
                team_a_home, team_b_home = False, False
            else:
                continue

            # Parse probability if available
            if prob_text:
                try:
                    prob = parse_probability(prob_text)
                    # Assume probability is for the home team or second team
                    model_prob_b = prob
                    model_prob_a = 1 - prob
                except ValueError:
                    # Skip games without valid probability
                    continue
            else:
                # Skip games without probability
                continue

            game_id = f"{date_str}_{team_a}_{team_b}".replace(' ', '_').lower()

            game = {
                'game_id': game_id,
                'date': date_str,
                'start_time': time_text or 'TBD',
                'team_a': team_a,
                'team_b': team_b,
                'team_a_home': team_a_home,
                'team_b_home': team_b_home,
                'venue_type': venue_type,
                'model_prob_a': model_prob_a,
                'model_prob_b': model_prob_b
            }

            games.append(game)
            print(f"   ✓ {team_a} vs {team_b} - {model_prob_a:.1%} / {model_prob_b:.1%}")

        except Exception as e:
            print(f"   ⚠️  Error parsing row: {e}")
            continue

    if not games:
        print("   ⚠️  No games with probabilities found.")
        print("   💡 You may need to manually inspect Warren Nolan HTML and adjust the scraper.")

    return games


if __name__ == "__main__":
    # Test scraper
    import sys
    from datetime import datetime, timedelta

    # Default to tomorrow
    tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
    date = sys.argv[1] if len(sys.argv) > 1 else tomorrow

    print(f"Testing Warren Nolan scraper for {date}...")
    games = scrape_predictions(date)
    print(f"\nFound {len(games)} games total")
