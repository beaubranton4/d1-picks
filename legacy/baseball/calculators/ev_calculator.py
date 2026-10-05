"""
Expected Value (EV) calculation for betting edges.
"""
from typing import List, Dict


def moneyline_to_prob(moneyline: int) -> float:
    """
    Convert American moneyline odds to implied probability.

    Args:
        moneyline: American odds (e.g., -150, +200)

    Returns:
        Implied probability as decimal (0.0 to 1.0)
    """
    if moneyline > 0:
        return 100 / (moneyline + 100)
    else:
        return abs(moneyline) / (abs(moneyline) + 100)


def calculate_edges(game: Dict) -> List[Dict]:
    """
    Calculate EV edges for a game.

    Args:
        game: Game dictionary with odds and probabilities

    Returns:
        List of edge dictionaries (one per team)
    """
    edges = []

    for team in [game['team_a_normalized'], game['team_b_normalized']]:
        team_odds = game['odds'].get(team, [])

        if not team_odds:
            # No odds available for this team
            continue

        # Find best odds (highest moneyline = best payout)
        best_odd = max(team_odds, key=lambda x: x['moneyline'])
        best_moneyline = best_odd['moneyline']
        best_sportsbook = best_odd['sportsbook']

        # Calculate implied probability
        implied_prob = moneyline_to_prob(best_moneyline)

        # Get model probability
        if team == game['team_a_normalized']:
            model_prob = game['model_prob_a']
            is_home = game['team_a_home']
        else:
            model_prob = game['model_prob_b']
            is_home = game['team_b_home']

        # Calculate raw edge
        raw_edge = model_prob - implied_prob

        # Apply modifiers
        modifier = 0.0
        modifier_reason = None

        if is_home:
            modifier = 0.005  # +0.5% for home team
            modifier_reason = "home: +0.5%"
        elif game['venue_type'] == 'neutral':
            modifier = 0.0025  # +0.25% for neutral site
            modifier_reason = "neutral: +0.25%"

        adjusted_edge = raw_edge + modifier

        edge = {
            'team': team,
            'model_prob': model_prob,
            'best_odds': best_moneyline,
            'best_sportsbook': best_sportsbook,
            'implied_prob': implied_prob,
            'raw_edge': raw_edge,
            'adjusted_edge': adjusted_edge,
            'modifier_reason': modifier_reason
        }

        edges.append(edge)

    return edges


if __name__ == "__main__":
    # Test EV calculator
    test_game = {
        'team_a_normalized': 'alabama',
        'team_b_normalized': 'lsu',
        'team_a_home': False,
        'team_b_home': True,
        'venue_type': 'home_b',
        'model_prob_a': 0.38,
        'model_prob_b': 0.62,
        'odds': {
            'alabama': [{'moneyline': 130, 'sportsbook': 'fanduel'}],
            'lsu': [{'moneyline': -150, 'sportsbook': 'draftkings'}]
        }
    }

    print("Testing EV calculator:")
    edges = calculate_edges(test_game)

    for edge in edges:
        print(f"\n{edge['team'].upper()}:")
        print(f"  Model probability: {edge['model_prob']:.1%}")
        print(f"  Best odds: {edge['best_odds']:+d} ({edge['best_sportsbook']})")
        print(f"  Implied probability: {edge['implied_prob']:.1%}")
        print(f"  Raw edge: {edge['raw_edge']:.2%}")
        print(f"  Adjusted edge: {edge['adjusted_edge']:.2%}")
        if edge['modifier_reason']:
            print(f"  Modifier: {edge['modifier_reason']}")
