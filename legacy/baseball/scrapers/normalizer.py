"""
Team name normalization to match games with odds.
"""
import json
import re
from typing import List, Dict, Optional
from fuzzywuzzy import fuzz


def load_team_mappings() -> Dict:
    """Load team name mappings from JSON file."""
    with open('data/team_mappings.json', 'r') as f:
        return json.load(f)


def clean_team_name(name: str) -> str:
    """Clean and normalize team name."""
    # Convert to lowercase
    name = name.lower()
    # Remove rankings
    name = re.sub(r'#\d+\s*', '', name)
    # Remove records
    name = re.sub(r'\(\d+-\d+\)', '', name)
    # Normalize whitespace
    name = re.sub(r'\s+', ' ', name).strip()
    return name


def normalize_team_name(input_name: str, mappings: Dict) -> str:
    """
    Normalize team name using mapping dictionary and fuzzy matching.

    Args:
        input_name: Raw team name from source
        mappings: Team mapping dictionary

    Returns:
        Canonical team name (lowercase, normalized)
    """
    cleaned = clean_team_name(input_name)

    # Direct match in variations
    for canonical, variations in mappings.items():
        if cleaned in variations:
            return canonical

    # Fuzzy match
    best_match = None
    best_score = 0

    for canonical, variations in mappings.items():
        for variation in variations:
            score = fuzz.ratio(cleaned, variation)
            if score > best_score and score >= 85:
                best_score = score
                best_match = canonical

    if best_match:
        return best_match

    # No match found - return cleaned name
    return cleaned


def match_games_to_odds(games: List[Dict], odds: List[Dict]) -> List[Dict]:
    """
    Match games from predictions to odds by normalizing team names.

    Args:
        games: List of game dictionaries from Warren Nolan
        odds: List of odds dictionaries from The Odds API

    Returns:
        List of matched games with odds attached
    """
    mappings = load_team_mappings()
    matched_games = []
    unmatched_teams = set()

    for game in games:
        # Normalize game team names
        game_team_a_norm = normalize_team_name(game['team_a'], mappings)
        game_team_b_norm = normalize_team_name(game['team_b'], mappings)

        # Find odds for this game
        game_odds = {game_team_a_norm: [], game_team_b_norm: []}

        for odd in odds:
            odds_team_norm = normalize_team_name(odd['team'], mappings)

            # Check if this odd matches either team
            if odds_team_norm == game_team_a_norm:
                game_odds[game_team_a_norm].append(odd)
            elif odds_team_norm == game_team_b_norm:
                game_odds[game_team_b_norm].append(odd)

        # Check if we found odds for at least one team
        if game_odds[game_team_a_norm] or game_odds[game_team_b_norm]:
            game['odds'] = game_odds
            game['team_a_normalized'] = game_team_a_norm
            game['team_b_normalized'] = game_team_b_norm
            matched_games.append(game)
        else:
            # Track unmatched teams
            unmatched_teams.add(game['team_a'])
            unmatched_teams.add(game['team_b'])

    if unmatched_teams:
        print(f"   ⚠️  Unmatched teams (no odds found): {', '.join(sorted(unmatched_teams))}")
        print(f"   💡 Add these to data/team_mappings.json if needed")

    return matched_games


if __name__ == "__main__":
    # Test normalizer
    mappings = load_team_mappings()

    test_names = [
        "LSU Tigers",
        "#1 Alabama (15-3)",
        "Texas A&M",
        "Oregon State Beavers",
        "Ole Miss"
    ]

    print("Testing team name normalization:")
    for name in test_names:
        normalized = normalize_team_name(name, mappings)
        print(f"  {name:30} -> {normalized}")
