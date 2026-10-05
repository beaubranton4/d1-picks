#!/usr/bin/env python3
"""
Generate test picks page with sample data to validate the system.
"""
import os
from datetime import datetime
from jinja2 import Environment, FileSystemLoader


def main():
    """Generate test page with sample data."""
    print("\n" + "="*60)
    print("Generating TEST picks with sample data")
    print("="*60 + "\n")

    # Sample games with realistic data
    sample_games = [
        {
            'game_id': '2026_02_13_lsu_alabama',
            'date': '2026-02-13',
            'start_time': '7:00 PM ET',
            'team_a': 'alabama',
            'team_b': 'lsu',
            'team_a_home': False,
            'team_b_home': True,
            'venue_type': 'home_b',
            'edges': [
                {
                    'team': 'lsu',
                    'model_prob': 0.62,
                    'best_odds': -150,
                    'best_sportsbook': 'draftkings',
                    'implied_prob': 0.60,
                    'raw_edge': 0.02,
                    'adjusted_edge': 0.025,  # +0.5% home modifier
                    'classification': 'LEAN',
                    'modifier_reason': 'home: +0.5%'
                }
            ]
        },
        {
            'game_id': '2026_02_13_vanderbilt_arkansas',
            'date': '2026-02-13',
            'start_time': '6:30 PM CT',
            'team_a': 'vanderbilt',
            'team_b': 'arkansas',
            'team_a_home': False,
            'team_b_home': True,
            'venue_type': 'home_b',
            'edges': [
                {
                    'team': 'arkansas',
                    'model_prob': 0.58,
                    'best_odds': -120,
                    'best_sportsbook': 'fanduel',
                    'implied_prob': 0.545,
                    'raw_edge': 0.035,
                    'adjusted_edge': 0.04,  # +0.5% home modifier
                    'classification': 'LEAN',
                    'modifier_reason': 'home: +0.5%'
                }
            ]
        },
        {
            'game_id': '2026_02_13_texas_tcu',
            'date': '2026-02-13',
            'start_time': '7:00 PM CT',
            'team_a': 'texas',
            'team_b': 'tcu',
            'team_a_home': True,
            'team_b_home': False,
            'venue_type': 'home_a',
            'edges': [
                {
                    'team': 'texas',
                    'model_prob': 0.68,
                    'best_odds': -180,
                    'best_sportsbook': 'draftkings',
                    'implied_prob': 0.643,
                    'raw_edge': 0.037,
                    'adjusted_edge': 0.042,  # +0.5% home modifier
                    'classification': 'LEAN',
                    'modifier_reason': 'home: +0.5%'
                }
            ]
        },
        {
            'game_id': '2026_02_13_florida_ole_miss',
            'date': '2026-02-13',
            'start_time': '8:00 PM ET',
            'team_a': 'florida',
            'team_b': 'ole_miss',
            'team_a_home': False,
            'team_b_home': True,
            'venue_type': 'home_b',
            'edges': [
                {
                    'team': 'ole_miss',
                    'model_prob': 0.72,
                    'best_odds': -200,
                    'best_sportsbook': 'betmgm',
                    'implied_prob': 0.667,
                    'raw_edge': 0.053,
                    'adjusted_edge': 0.058,  # +0.5% home modifier
                    'classification': 'BET',
                    'modifier_reason': 'home: +0.5%'
                }
            ]
        },
        {
            'game_id': '2026_02_13_stanford_oregon_state',
            'date': '2026-02-13',
            'start_time': '9:00 PM PT',
            'team_a': 'stanford',
            'team_b': 'oregon_state',
            'team_a_home': False,
            'team_b_home': True,
            'venue_type': 'home_b',
            'edges': [
                {
                    'team': 'oregon_state',
                    'model_prob': 0.78,
                    'best_odds': -250,
                    'best_sportsbook': 'draftkings',
                    'implied_prob': 0.714,
                    'raw_edge': 0.066,
                    'adjusted_edge': 0.071,  # +0.5% home modifier
                    'classification': 'STRONG_BET',
                    'modifier_reason': 'home: +0.5%'
                }
            ]
        }
    ]

    # Generate HTML
    env = Environment(loader=FileSystemLoader('templates'))
    template = env.get_template('day.html')

    html = template.render(
        date='2026-02-13 (TEST DATA)',
        generated_at=datetime.now().strftime("%Y-%m-%d %H:%M"),
        games=sample_games
    )

    # Ensure output directory exists
    os.makedirs('output', exist_ok=True)

    # Write to file
    output_file = "output/test-2026-02-13.html"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"✅ Generated test page: {output_file}")
    print(f"\nSample data includes:")
    print(f"  🔥 1 STRONG BET")
    print(f"  ✅ 1 BET")
    print(f"  🟡 3 LEANS")
    print(f"\nOpen it to validate:")
    print(f"  open {output_file}\n")


if __name__ == "__main__":
    main()
