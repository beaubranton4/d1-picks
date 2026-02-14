#!/usr/bin/env python3
"""
Build feature dataset for linear regression model training.

For each historical game, computes:
- Rolling season stats up to that game date
- Last N games performance
- Opposing team stats at time of game
- Starting pitcher stats (when available)

Creates two targets per game:
- runs_scored: For offense model
- runs_allowed: For defense model

Usage:
    python build_features.py
    python build_features.py --rolling-window 10 --min-games 5
"""
import argparse
import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from collections import defaultdict

try:
    import pandas as pd
    import numpy as np
except ImportError:
    print("Missing dependencies. Run: pip install pandas numpy")
    exit(1)


def load_json(filepath: str) -> Dict:
    """Load JSON file."""
    with open(filepath, 'r') as f:
        return json.load(f)


def load_data(data_dir: str) -> Tuple[List[Dict], List[Dict], List[Dict], List[Dict]]:
    """Load all raw data files."""
    games_file = os.path.join(data_dir, 'games.json')
    batting_file = os.path.join(data_dir, 'batting_stats.json')
    pitching_file = os.path.join(data_dir, 'pitching_stats.json')
    pitchers_file = os.path.join(data_dir, 'pitcher_details.json')

    games = load_json(games_file).get('games', [])
    batting = load_json(batting_file).get('data', []) if os.path.exists(batting_file) else []
    pitching = load_json(pitching_file).get('data', []) if os.path.exists(pitching_file) else []
    pitchers = load_json(pitchers_file).get('data', []) if os.path.exists(pitchers_file) else []

    return games, batting, pitching, pitchers


def build_season_stats_lookup(batting: List[Dict], pitching: List[Dict]) -> Dict:
    """
    Build lookup: (team_name, season) -> {batting_stats, pitching_stats}
    """
    lookup = {}

    for stat in batting:
        key = (stat['team_name'], stat['season'])
        if key not in lookup:
            lookup[key] = {}
        lookup[key]['batting'] = stat

    for stat in pitching:
        key = (stat['team_name'], stat['season'])
        if key not in lookup:
            lookup[key] = {}
        lookup[key]['pitching'] = stat

    return lookup


def build_team_games_history(games: List[Dict]) -> Dict:
    """
    Build lookup: team_name -> list of (date, runs_scored, runs_allowed, opponent)

    Sorted by date for rolling calculations.
    """
    history = defaultdict(list)

    for game in games:
        game_date = game['date']

        # Team A perspective
        history[game['team_a']].append({
            'date': game_date,
            'runs_scored': game['team_a_runs'],
            'runs_allowed': game['team_b_runs'],
            'opponent': game['team_b'],
            'is_home': game['venue'] == 'home_a',
        })

        # Team B perspective
        history[game['team_b']].append({
            'date': game_date,
            'runs_scored': game['team_b_runs'],
            'runs_allowed': game['team_a_runs'],
            'opponent': game['team_a'],
            'is_home': game['venue'] == 'home_b',
        })

    # Sort each team's history by date
    for team in history:
        history[team].sort(key=lambda x: x['date'])

    return dict(history)


def get_rolling_stats(team_history: List[Dict], current_date: str, window: int) -> Dict:
    """
    Calculate rolling stats for a team up to (but not including) current_date.

    Args:
        team_history: List of game dicts for this team
        current_date: Game date (YYYY-MM-DD) - don't include this game
        window: Number of recent games to consider

    Returns:
        Dict with rolling averages
    """
    # Filter to games before current date
    prior_games = [g for g in team_history if g['date'] < current_date]

    if not prior_games:
        return None

    # Get last N games
    recent_games = prior_games[-window:] if len(prior_games) >= window else prior_games

    # Calculate rolling averages
    runs_scored = [g['runs_scored'] for g in recent_games]
    runs_allowed = [g['runs_allowed'] for g in recent_games]

    # Season-to-date averages
    season_runs_scored = [g['runs_scored'] for g in prior_games]
    season_runs_allowed = [g['runs_allowed'] for g in prior_games]

    return {
        'games_played': len(prior_games),
        'recent_games_count': len(recent_games),

        # Rolling averages (last N games)
        'recent_runs_scored_avg': np.mean(runs_scored),
        'recent_runs_allowed_avg': np.mean(runs_allowed),
        'recent_runs_scored_std': np.std(runs_scored) if len(runs_scored) > 1 else 0,
        'recent_runs_allowed_std': np.std(runs_allowed) if len(runs_allowed) > 1 else 0,

        # Season-to-date averages
        'season_runs_scored_avg': np.mean(season_runs_scored),
        'season_runs_allowed_avg': np.mean(season_runs_allowed),

        # Win rate
        'recent_wins': sum(1 for g in recent_games if g['runs_scored'] > g['runs_allowed']),
        'season_wins': sum(1 for g in prior_games if g['runs_scored'] > g['runs_allowed']),
    }


def get_day_of_week(date_str: str) -> int:
    """Convert date string to day of week (0=Monday, 6=Sunday)."""
    try:
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        return dt.weekday()
    except (ValueError, TypeError):
        return 0  # Default to Monday if parse fails


def build_features_for_game(
    game: Dict,
    team: str,
    is_offense: bool,
    team_games_history: Dict,
    season_stats: Dict,
    rolling_window: int,
    min_games: int
) -> Optional[Dict]:
    """
    Build feature vector for one team in one game.

    Args:
        game: Game dictionary
        team: Team name (team_a or team_b)
        is_offense: If True, predict runs scored; if False, predict runs allowed
        team_games_history: All teams' game history
        season_stats: Season stats lookup
        rolling_window: Rolling average window size
        min_games: Minimum games required for valid features

    Returns:
        Feature dictionary or None if insufficient data
    """
    # Determine perspective
    if team == game['team_a']:
        opponent = game['team_b']
        runs_scored = game['team_a_runs']
        runs_allowed = game['team_b_runs']
        is_home = game['venue'] == 'home_a'
    else:
        opponent = game['team_a']
        runs_scored = game['team_b_runs']
        runs_allowed = game['team_a_runs']
        is_home = game['venue'] == 'home_b'

    # Get team's rolling stats
    team_history = team_games_history.get(team, [])
    team_rolling = get_rolling_stats(team_history, game['date'], rolling_window)

    if team_rolling is None or team_rolling['games_played'] < min_games:
        return None

    # Get opponent's rolling stats
    opp_history = team_games_history.get(opponent, [])
    opp_rolling = get_rolling_stats(opp_history, game['date'], rolling_window)

    if opp_rolling is None or opp_rolling['games_played'] < min_games:
        return None

    # Get season stats
    season = game['season']
    team_season = season_stats.get((team, season), {})
    opp_season = season_stats.get((opponent, season), {})

    team_batting = team_season.get('batting', {})
    team_pitching = team_season.get('pitching', {})
    opp_batting = opp_season.get('batting', {})
    opp_pitching = opp_season.get('pitching', {})

    # Determine target variable
    if is_offense:
        target = runs_scored
        target_name = 'runs_scored'
    else:
        target = runs_allowed
        target_name = 'runs_allowed'

    # Build feature vector
    features = {
        # Identifiers (not features, but useful for tracking)
        '_game_key': game['game_key'],
        '_team': team,
        '_opponent': opponent,
        '_date': game['date'],
        '_season': season,
        '_model_type': 'offense' if is_offense else 'defense',

        # Target
        'target': target,

        # -- FEATURES --

        # Day of week (0-6)
        'day_of_week': get_day_of_week(game['date']),

        # Home/away (1=home, 0=away)
        'is_home': 1 if is_home else 0,

        # Neutral site
        'is_neutral': 1 if game['venue'] == 'neutral' else 0,

        # Team batting stats (for offense model)
        'team_ba': team_batting.get('ba', 0.250),
        'team_slg': team_batting.get('slg', 0.350),
        'team_ops': team_batting.get('ops', 0.700),
        'team_obp': team_batting.get('obp', 0.320),

        # Team pitching stats (for defense model)
        'team_era': team_pitching.get('era', 4.50),
        'team_whip': team_pitching.get('whip', 1.30),

        # Opponent batting stats (for defense model)
        'opp_ba': opp_batting.get('ba', 0.250),
        'opp_slg': opp_batting.get('slg', 0.350),
        'opp_ops': opp_batting.get('ops', 0.700),

        # Opponent pitching stats (for offense model)
        'opp_era': opp_pitching.get('era', 4.50),
        'opp_whip': opp_pitching.get('whip', 1.30),

        # Rolling performance (last N games)
        'recent_runs_scored_avg': team_rolling['recent_runs_scored_avg'],
        'recent_runs_allowed_avg': team_rolling['recent_runs_allowed_avg'],
        'opp_recent_runs_scored_avg': opp_rolling['recent_runs_scored_avg'],
        'opp_recent_runs_allowed_avg': opp_rolling['recent_runs_allowed_avg'],

        # Consistency (std dev)
        'recent_runs_scored_std': team_rolling['recent_runs_scored_std'],
        'recent_runs_allowed_std': team_rolling['recent_runs_allowed_std'],

        # Form (win rate last N games)
        'recent_win_rate': team_rolling['recent_wins'] / team_rolling['recent_games_count'],
        'opp_recent_win_rate': opp_rolling['recent_wins'] / opp_rolling['recent_games_count'],

        # Games played (for weighting or filtering)
        'games_played': team_rolling['games_played'],
        'opp_games_played': opp_rolling['games_played'],
    }

    return features


def build_training_dataset(
    games: List[Dict],
    batting: List[Dict],
    pitching: List[Dict],
    rolling_window: int = 10,
    min_games: int = 5
) -> pd.DataFrame:
    """
    Build complete training dataset from raw data.

    Creates two rows per team per game:
    - One for offense model (predicting runs scored)
    - One for defense model (predicting runs allowed)
    """
    print("Building training dataset...")

    # Build lookups
    season_stats = build_season_stats_lookup(batting, pitching)
    team_games_history = build_team_games_history(games)

    print(f"  {len(season_stats)} team-season stat records")
    print(f"  {len(team_games_history)} teams with game history")

    all_features = []

    for i, game in enumerate(games):
        if (i + 1) % 1000 == 0:
            print(f"  Processed {i + 1}/{len(games)} games...")

        # Build features for team_a
        for team in [game['team_a'], game['team_b']]:
            # Offense model features
            offense_features = build_features_for_game(
                game, team, is_offense=True,
                team_games_history=team_games_history,
                season_stats=season_stats,
                rolling_window=rolling_window,
                min_games=min_games
            )
            if offense_features:
                all_features.append(offense_features)

            # Defense model features
            defense_features = build_features_for_game(
                game, team, is_offense=False,
                team_games_history=team_games_history,
                season_stats=season_stats,
                rolling_window=rolling_window,
                min_games=min_games
            )
            if defense_features:
                all_features.append(defense_features)

    df = pd.DataFrame(all_features)
    print(f"  Created {len(df)} training samples")

    return df


def split_offense_defense(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Split dataset into offense and defense training sets."""
    offense_df = df[df['_model_type'] == 'offense'].copy()
    defense_df = df[df['_model_type'] == 'defense'].copy()

    return offense_df, defense_df


def get_feature_columns(model_type: str) -> List[str]:
    """
    Get feature column names for a model type.

    Returns columns that should be used as input features (excludes identifiers and target).
    """
    common_features = [
        'day_of_week',
        'is_home',
        'is_neutral',
        'recent_runs_scored_avg',
        'recent_runs_allowed_avg',
        'recent_runs_scored_std',
        'recent_runs_allowed_std',
        'recent_win_rate',
    ]

    if model_type == 'offense':
        # Features for predicting runs scored
        return common_features + [
            'team_ba',
            'team_slg',
            'team_ops',
            'team_obp',
            'opp_era',
            'opp_whip',
            'opp_recent_runs_allowed_avg',
        ]
    else:
        # Features for predicting runs allowed
        return common_features + [
            'team_era',
            'team_whip',
            'opp_ba',
            'opp_slg',
            'opp_ops',
            'opp_recent_runs_scored_avg',
        ]


def main():
    parser = argparse.ArgumentParser(description='Build feature dataset for model training')
    parser.add_argument(
        '--data-dir',
        type=str,
        default='../data/raw',
        help='Directory containing raw data files'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='training_data.csv',
        help='Output CSV file'
    )
    parser.add_argument(
        '--rolling-window',
        type=int,
        default=10,
        help='Rolling window size for recent performance'
    )
    parser.add_argument(
        '--min-games',
        type=int,
        default=5,
        help='Minimum games played before including in training'
    )

    args = parser.parse_args()

    print(f"\n{'='*60}")
    print("D1 Baseball Feature Engineering")
    print(f"{'='*60}")
    print(f"Rolling window: {args.rolling_window} games")
    print(f"Min games required: {args.min_games}")

    # Load data
    data_dir = os.path.join(os.path.dirname(__file__), args.data_dir)
    games, batting, pitching, pitchers = load_data(data_dir)

    print(f"\nLoaded data:")
    print(f"  Games: {len(games)}")
    print(f"  Batting stats: {len(batting)}")
    print(f"  Pitching stats: {len(pitching)}")
    print(f"  Pitchers: {len(pitchers)}")

    if not games:
        print("\nNo games found. Run collect_games.py first.")
        return

    # Build training dataset
    df = build_training_dataset(
        games, batting, pitching,
        rolling_window=args.rolling_window,
        min_games=args.min_games
    )

    # Save full dataset
    output_path = os.path.join(os.path.dirname(__file__), args.output)
    df.to_csv(output_path, index=False)
    print(f"\nSaved training data to {output_path}")

    # Split and save offense/defense separately
    offense_df, defense_df = split_offense_defense(df)

    offense_path = output_path.replace('.csv', '_offense.csv')
    defense_path = output_path.replace('.csv', '_defense.csv')

    offense_df.to_csv(offense_path, index=False)
    defense_df.to_csv(defense_path, index=False)

    print(f"Saved {len(offense_df)} offense samples to {offense_path}")
    print(f"Saved {len(defense_df)} defense samples to {defense_path}")

    # Summary statistics
    print(f"\n{'='*60}")
    print("Summary")
    print(f"{'='*60}")

    print("\nOffense model features:")
    for col in get_feature_columns('offense'):
        if col in offense_df.columns:
            print(f"  {col}: mean={offense_df[col].mean():.3f}, std={offense_df[col].std():.3f}")

    print("\nDefense model features:")
    for col in get_feature_columns('defense'):
        if col in defense_df.columns:
            print(f"  {col}: mean={defense_df[col].mean():.3f}, std={defense_df[col].std():.3f}")

    print(f"\nTarget (runs) distribution:")
    print(f"  Mean: {df['target'].mean():.2f}")
    print(f"  Std: {df['target'].std():.2f}")
    print(f"  Min: {df['target'].min()}")
    print(f"  Max: {df['target'].max()}")

    print(f"\nNext step: Run train_models.py to train linear regression models")


if __name__ == "__main__":
    main()
