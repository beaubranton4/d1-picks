#!/usr/bin/env python3
"""
Generate daily college baseball EV picks page.

Usage:
    python generate_picks.py --date 2024-03-15
"""
import argparse
import os
from datetime import datetime
from jinja2 import Environment, FileSystemLoader

from scrapers.warren_nolan import scrape_predictions
from scrapers.odds_fetcher import fetch_odds
from scrapers.normalizer import match_games_to_odds
from calculators.ev_calculator import calculate_edges
from calculators.classifier import classify_bet


def main(date_str: str):
    """
    Generate picks page for a specific date.

    Args:
        date_str: Date in YYYY-MM-DD format
    """
    print(f"\n{'='*60}")
    print(f"Generating D1 Baseball Picks for {date_str}")
    print(f"{'='*60}\n")

    # Step 1: Scrape predictions from Warren Nolan
    print("Step 1: Scraping predictions from Warren Nolan...")
    games = scrape_predictions(date_str)

    if not games:
        print("\n❌ No games found. Exiting.")
        return

    print(f"   ✓ Found {len(games)} games with predictions\n")

    # Step 2: Fetch odds from The Odds API
    print("Step 2: Fetching odds from The Odds API...")
    odds = fetch_odds()

    if not odds:
        print("\n⚠️  No odds found. Cannot calculate EV edges.")
        print("   Check your ODDS_API_KEY in .env file")
        return

    print(f"   ✓ Found {len(odds)} odds entries\n")

    # Step 3: Match games to odds
    print("Step 3: Matching games to odds...")
    matched_games = match_games_to_odds(games, odds)
    print(f"   ✓ Matched {len(matched_games)} games\n")

    if not matched_games:
        print("\n⚠️  No games matched between predictions and odds.")
        print("   This could mean:")
        print("   - Team names don't match (check data/team_mappings.json)")
        print("   - Different game dates")
        print("   - Odds not available yet")
        return

    # Step 4: Calculate EV edges
    print("Step 4: Calculating EV edges...")
    for game in matched_games:
        game['edges'] = calculate_edges(game)
    print(f"   ✓ Calculated edges\n")

    # Step 5: Classify bets and filter
    print("Step 5: Classifying bets...")
    for game in matched_games:
        for edge in game['edges']:
            edge['classification'] = classify_bet(edge['adjusted_edge'])

    # Filter out PASS bets
    for game in matched_games:
        game['edges'] = [e for e in game['edges'] if e['classification'] != 'PASS']
        # Sort by edge (highest first)
        game['edges'].sort(key=lambda e: e['adjusted_edge'], reverse=True)

    # Remove games with no valid edges
    matched_games = [g for g in matched_games if len(g['edges']) > 0]

    print(f"   ✓ Found {len(matched_games)} games with +EV opportunities\n")

    if not matched_games:
        print("⚠️  No +EV bets found for this date.")
        print("   Generating page anyway...\n")

    # Sort games by start time
    matched_games.sort(key=lambda g: g['start_time'])

    # Step 6: Generate HTML
    print("Step 6: Generating HTML...")

    env = Environment(loader=FileSystemLoader('templates'))
    template = env.get_template('day.html')

    html = template.render(
        date=date_str,
        generated_at=datetime.now().strftime("%Y-%m-%d %H:%M"),
        games=matched_games
    )

    # Ensure output directory exists
    os.makedirs('output', exist_ok=True)

    # Write to file
    output_file = f"output/{date_str}.html"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"   ✓ Generated: {output_file}\n")

    # Summary
    print(f"{'='*60}")
    print(f"✅ SUCCESS!")
    print(f"{'='*60}")
    print(f"Total games with +EV picks: {len(matched_games)}")

    if matched_games:
        strong_bets = sum(1 for g in matched_games for e in g['edges'] if e['classification'] == 'STRONG_BET')
        bets = sum(1 for g in matched_games for e in g['edges'] if e['classification'] == 'BET')
        leans = sum(1 for g in matched_games for e in g['edges'] if e['classification'] == 'LEAN')

        print(f"\nBreakdown:")
        if strong_bets:
            print(f"  🔥 STRONG BET: {strong_bets}")
        if bets:
            print(f"  ✅ BET: {bets}")
        if leans:
            print(f"  🟡 LEAN: {leans}")

        print(f"\nTop pick:")
        top_game = matched_games[0]
        top_edge = top_game['edges'][0]
        print(f"  {top_edge['team'].upper()}: {top_edge['best_odds']:+d} ({top_edge['adjusted_edge']*100:.2f}% edge)")

    print(f"\nNext steps:")
    print(f"  1. Review: open {output_file}")
    print(f"  2. Verify edge calculations are accurate")
    print(f"  3. Deploy to GitHub Pages / Netlify / Vercel")
    print(f"  4. Share on TikTok!\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description='Generate daily D1 baseball EV picks page',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generate_picks.py --date 2024-03-15
  python generate_picks.py --date $(date -v+1d +%Y-%m-%d)  # Tomorrow
        """
    )
    parser.add_argument(
        '--date',
        required=True,
        help='Date to generate picks for (YYYY-MM-DD)'
    )

    args = parser.parse_args()

    # Validate date format
    try:
        datetime.strptime(args.date, '%Y-%m-%d')
    except ValueError:
        print(f"❌ Invalid date format: {args.date}")
        print("   Use YYYY-MM-DD format (e.g., 2024-03-15)")
        exit(1)

    main(args.date)
