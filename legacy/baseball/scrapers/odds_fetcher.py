"""
The Odds API fetcher for college baseball moneyline odds.
"""
import os
import requests
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv()


def fetch_odds() -> List[Dict]:
    """
    Fetch college baseball odds from The Odds API.

    Returns:
        List of odds dictionaries for all upcoming games
    """
    api_key = os.getenv('ODDS_API_KEY')

    if not api_key or api_key == 'your_api_key_here':
        print("   ❌ ERROR: ODDS_API_KEY not set in .env file")
        print("   💡 Get a free API key from https://the-odds-api.com")
        return []

    url = "https://api.the-odds-api.com/v4/sports/baseball_ncaa/odds/"
    params = {
        'apiKey': api_key,
        'regions': 'us',
        'markets': 'h2h',  # head-to-head moneyline
        'oddsFormat': 'american',
        'bookmakers': 'draftkings,fanduel,betmgm'
    }

    print(f"   Fetching from The Odds API...")

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        # Check remaining quota
        remaining = response.headers.get('x-requests-remaining')
        if remaining:
            print(f"   API quota remaining: {remaining}")

        data = response.json()

        if not data:
            print("   ⚠️  No games found in The Odds API")
            return []

        # Parse odds data
        all_odds = []

        for game in data:
            game_id = game.get('id')
            home_team = game.get('home_team', '')
            away_team = game.get('away_team', '')
            commence_time = game.get('commence_time', '')

            bookmakers = game.get('bookmakers', [])

            for bookmaker in bookmakers:
                sportsbook = bookmaker.get('key', '')
                markets = bookmaker.get('markets', [])

                for market in markets:
                    if market.get('key') != 'h2h':
                        continue

                    outcomes = market.get('outcomes', [])

                    for outcome in outcomes:
                        team = outcome.get('name', '')
                        moneyline = outcome.get('price')

                        if moneyline:
                            odds_entry = {
                                'game_id': game_id,
                                'home_team': home_team,
                                'away_team': away_team,
                                'commence_time': commence_time,
                                'sportsbook': sportsbook,
                                'team': team,
                                'moneyline': int(moneyline)
                            }
                            all_odds.append(odds_entry)

        print(f"   Found odds for {len(data)} games from {len(set(o['sportsbook'] for o in all_odds))} books")

        return all_odds

    except requests.RequestException as e:
        print(f"   ❌ Error fetching odds: {e}")
        return []
    except Exception as e:
        print(f"   ❌ Error parsing odds: {e}")
        return []


if __name__ == "__main__":
    # Test odds fetcher
    print("Testing The Odds API fetcher...")
    odds = fetch_odds()
    print(f"\nFound {len(odds)} total odds entries")

    if odds:
        print("\nSample odds:")
        for odd in odds[:5]:
            print(f"  {odd['team']}: {odd['moneyline']:+d} ({odd['sportsbook']})")
