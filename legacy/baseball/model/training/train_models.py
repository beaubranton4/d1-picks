#!/usr/bin/env python3
"""
Train linear regression models for D1 baseball score prediction.

Trains two models per team:
- Offense model: Predicts runs scored
- Defense model: Predicts runs allowed

Exports coefficients to JSON for use in TypeScript predictor.

Usage:
    python train_models.py
    python train_models.py --validation-season 2025 --min-samples 50
"""
import argparse
import json
import os
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from collections import defaultdict

try:
    import pandas as pd
    import numpy as np
    from sklearn.linear_model import Ridge, LinearRegression
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
except ImportError:
    print("Missing dependencies. Run: pip install pandas numpy scikit-learn")
    exit(1)


# Feature columns for each model type
OFFENSE_FEATURES = [
    'day_of_week',
    'is_home',
    'is_neutral',
    'team_ba',
    'team_slg',
    'team_ops',
    'team_obp',
    'opp_era',
    'opp_whip',
    'recent_runs_scored_avg',
    'recent_runs_allowed_avg',
    'opp_recent_runs_allowed_avg',
    'recent_win_rate',
]

DEFENSE_FEATURES = [
    'day_of_week',
    'is_home',
    'is_neutral',
    'team_era',
    'team_whip',
    'opp_ba',
    'opp_slg',
    'opp_ops',
    'recent_runs_scored_avg',
    'recent_runs_allowed_avg',
    'opp_recent_runs_scored_avg',
    'recent_win_rate',
]


def load_training_data(features_dir: str) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Load offense and defense training datasets."""
    offense_file = os.path.join(features_dir, 'training_data_offense.csv')
    defense_file = os.path.join(features_dir, 'training_data_defense.csv')

    offense_df = pd.read_csv(offense_file)
    defense_df = pd.read_csv(defense_file)

    return offense_df, defense_df


def prepare_features(
    df: pd.DataFrame,
    feature_cols: List[str],
    target_col: str = 'target'
) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """
    Prepare feature matrix and target vector.

    Returns:
        X: Feature matrix
        y: Target vector
        valid_features: List of feature columns actually used
    """
    # Filter to features that exist in the dataframe
    valid_features = [f for f in feature_cols if f in df.columns]

    # Handle missing values
    X = df[valid_features].fillna(0).values
    y = df[target_col].values

    return X, y, valid_features


def train_team_model(
    df: pd.DataFrame,
    team: str,
    model_type: str,
    alpha: float = 1.0
) -> Optional[Dict]:
    """
    Train a linear regression model for a single team.

    Args:
        df: Training dataframe (filtered to this team)
        team: Team name
        model_type: 'offense' or 'defense'
        alpha: Ridge regularization parameter

    Returns:
        Dict with model coefficients and metrics, or None if insufficient data
    """
    feature_cols = OFFENSE_FEATURES if model_type == 'offense' else DEFENSE_FEATURES

    X, y, valid_features = prepare_features(df, feature_cols)

    if len(X) < 10:  # Need minimum samples
        return None

    # Standardize features for more interpretable coefficients
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Train Ridge regression (L2 regularization prevents overfitting)
    model = Ridge(alpha=alpha)
    model.fit(X_scaled, y)

    # Predictions for metrics
    y_pred = model.predict(X_scaled)

    # Calculate metrics
    rmse = np.sqrt(mean_squared_error(y, y_pred))
    mae = mean_absolute_error(y, y_pred)
    r2 = r2_score(y, y_pred)

    # Build coefficient dictionary
    coefficients = {
        'intercept': float(model.intercept_),
        'features': {},
        'scaler_means': {},
        'scaler_stds': {},
    }

    for i, feature in enumerate(valid_features):
        coefficients['features'][feature] = float(model.coef_[i])
        coefficients['scaler_means'][feature] = float(scaler.mean_[i])
        coefficients['scaler_stds'][feature] = float(scaler.scale_[i])

    return {
        'team': team,
        'model_type': model_type,
        'n_samples': len(X),
        'coefficients': coefficients,
        'metrics': {
            'rmse': round(rmse, 3),
            'mae': round(mae, 3),
            'r2': round(r2, 3),
        }
    }


def train_global_model(
    df: pd.DataFrame,
    model_type: str,
    alpha: float = 1.0
) -> Dict:
    """
    Train a global model using all teams' data.

    This serves as a baseline/fallback for teams with insufficient data.
    """
    feature_cols = OFFENSE_FEATURES if model_type == 'offense' else DEFENSE_FEATURES

    X, y, valid_features = prepare_features(df, feature_cols)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = Ridge(alpha=alpha)
    model.fit(X_scaled, y)

    y_pred = model.predict(X_scaled)

    rmse = np.sqrt(mean_squared_error(y, y_pred))
    mae = mean_absolute_error(y, y_pred)
    r2 = r2_score(y, y_pred)

    coefficients = {
        'intercept': float(model.intercept_),
        'features': {},
        'scaler_means': {},
        'scaler_stds': {},
    }

    for i, feature in enumerate(valid_features):
        coefficients['features'][feature] = float(model.coef_[i])
        coefficients['scaler_means'][feature] = float(scaler.mean_[i])
        coefficients['scaler_stds'][feature] = float(scaler.scale_[i])

    return {
        'team': '_global',
        'model_type': model_type,
        'n_samples': len(X),
        'coefficients': coefficients,
        'metrics': {
            'rmse': round(rmse, 3),
            'mae': round(mae, 3),
            'r2': round(r2, 3),
        }
    }


def evaluate_on_holdout(
    models: Dict[str, Dict],
    holdout_df: pd.DataFrame,
    model_type: str
) -> Dict:
    """
    Evaluate models on holdout season.

    Returns overall and per-team metrics.
    """
    feature_cols = OFFENSE_FEATURES if model_type == 'offense' else DEFENSE_FEATURES

    all_predictions = []
    all_actuals = []

    for team in holdout_df['_team'].unique():
        team_df = holdout_df[holdout_df['_team'] == team]

        # Get model (team-specific or global fallback)
        model_key = f"{team}_{model_type}"
        if model_key not in models:
            model_key = f"_global_{model_type}"

        if model_key not in models:
            continue

        model_info = models[model_key]
        coeffs = model_info['coefficients']

        # Predict
        for _, row in team_df.iterrows():
            pred = coeffs['intercept']

            for feature, coef in coeffs['features'].items():
                if feature in row:
                    # Apply scaling
                    mean = coeffs['scaler_means'].get(feature, 0)
                    std = coeffs['scaler_stds'].get(feature, 1)
                    scaled_value = (row[feature] - mean) / std if std > 0 else 0
                    pred += coef * scaled_value

            all_predictions.append(pred)
            all_actuals.append(row['target'])

    if not all_predictions:
        return {'rmse': None, 'mae': None, 'r2': None}

    rmse = np.sqrt(mean_squared_error(all_actuals, all_predictions))
    mae = mean_absolute_error(all_actuals, all_predictions)
    r2 = r2_score(all_actuals, all_predictions)

    return {
        'rmse': round(rmse, 3),
        'mae': round(mae, 3),
        'r2': round(r2, 3),
        'n_predictions': len(all_predictions),
    }


def train_all_models(
    offense_df: pd.DataFrame,
    defense_df: pd.DataFrame,
    validation_season: Optional[int] = None,
    min_samples: int = 20,
    alpha: float = 1.0
) -> Tuple[Dict, Dict]:
    """
    Train all team models and global models.

    Returns:
        models: Dict of all trained models
        validation_metrics: Validation results
    """
    models = {}
    training_stats = {
        'offense': {'trained': 0, 'skipped': 0},
        'defense': {'trained': 0, 'skipped': 0},
    }

    # Split train/validation if validation season specified
    if validation_season:
        train_offense = offense_df[offense_df['_season'] < validation_season]
        train_defense = defense_df[defense_df['_season'] < validation_season]
        val_offense = offense_df[offense_df['_season'] == validation_season]
        val_defense = defense_df[defense_df['_season'] == validation_season]
        print(f"\nValidation split: Training on seasons < {validation_season}")
        print(f"  Training offense samples: {len(train_offense)}")
        print(f"  Training defense samples: {len(train_defense)}")
        print(f"  Validation offense samples: {len(val_offense)}")
        print(f"  Validation defense samples: {len(val_defense)}")
    else:
        train_offense = offense_df
        train_defense = defense_df
        val_offense = None
        val_defense = None

    # Train global models first (used as fallback)
    print("\nTraining global models...")
    global_offense = train_global_model(train_offense, 'offense', alpha)
    global_defense = train_global_model(train_defense, 'defense', alpha)

    models['_global_offense'] = global_offense
    models['_global_defense'] = global_defense

    print(f"  Global offense: RMSE={global_offense['metrics']['rmse']}, R2={global_offense['metrics']['r2']}")
    print(f"  Global defense: RMSE={global_defense['metrics']['rmse']}, R2={global_defense['metrics']['r2']}")

    # Train per-team models
    print("\nTraining per-team models...")

    all_teams = set(train_offense['_team'].unique()) | set(train_defense['_team'].unique())
    print(f"  Total teams: {len(all_teams)}")

    for team in sorted(all_teams):
        # Offense model
        team_offense_df = train_offense[train_offense['_team'] == team]
        if len(team_offense_df) >= min_samples:
            model = train_team_model(team_offense_df, team, 'offense', alpha)
            if model:
                models[f"{team}_offense"] = model
                training_stats['offense']['trained'] += 1
        else:
            training_stats['offense']['skipped'] += 1

        # Defense model
        team_defense_df = train_defense[train_defense['_team'] == team]
        if len(team_defense_df) >= min_samples:
            model = train_team_model(team_defense_df, team, 'defense', alpha)
            if model:
                models[f"{team}_defense"] = model
                training_stats['defense']['trained'] += 1
        else:
            training_stats['defense']['skipped'] += 1

    print(f"\n  Offense models: {training_stats['offense']['trained']} trained, {training_stats['offense']['skipped']} skipped")
    print(f"  Defense models: {training_stats['defense']['trained']} trained, {training_stats['defense']['skipped']} skipped")

    # Validation
    validation_metrics = {}
    if val_offense is not None and val_defense is not None:
        print("\nEvaluating on validation set...")
        val_offense_metrics = evaluate_on_holdout(models, val_offense, 'offense')
        val_defense_metrics = evaluate_on_holdout(models, val_defense, 'defense')

        validation_metrics = {
            'offense': val_offense_metrics,
            'defense': val_defense_metrics,
        }

        print(f"  Offense validation: RMSE={val_offense_metrics['rmse']}, MAE={val_offense_metrics['mae']}")
        print(f"  Defense validation: RMSE={val_defense_metrics['rmse']}, MAE={val_defense_metrics['mae']}")

    return models, validation_metrics


def export_coefficients(models: Dict, output_dir: str):
    """
    Export model coefficients to JSON files.

    Creates:
    - coefficients.json: All models bundled
    - coefficients/<team>.json: Per-team files
    """
    os.makedirs(output_dir, exist_ok=True)

    # Separate global and team-specific models
    global_models = {k: v for k, v in models.items() if k.startswith('_global')}
    team_models = {k: v for k, v in models.items() if not k.startswith('_global')}

    # Group by team
    teams = defaultdict(dict)
    for key, model in team_models.items():
        team, model_type = key.rsplit('_', 1)
        teams[team][model_type] = model['coefficients']

    # Save per-team files
    team_dir = os.path.join(output_dir, 'teams')
    os.makedirs(team_dir, exist_ok=True)

    for team, model_data in teams.items():
        team_file = os.path.join(team_dir, f"{team.replace(' ', '_').lower()}.json")
        with open(team_file, 'w') as f:
            json.dump(model_data, f, indent=2)

    print(f"  Saved {len(teams)} team coefficient files to {team_dir}/")

    # Save global model
    global_file = os.path.join(output_dir, 'global.json')
    global_data = {
        'offense': global_models.get('_global_offense', {}).get('coefficients'),
        'defense': global_models.get('_global_defense', {}).get('coefficients'),
    }
    with open(global_file, 'w') as f:
        json.dump(global_data, f, indent=2)
    print(f"  Saved global model to {global_file}")

    # Save bundled coefficients (for TypeScript import)
    bundled = {
        'generated_at': datetime.now().isoformat(),
        'model_info': {
            'total_models': len(models),
            'teams_with_models': len(teams),
            'offense_features': OFFENSE_FEATURES,
            'defense_features': DEFENSE_FEATURES,
        },
        'global': global_data,
        'teams': teams,
    }

    bundled_file = os.path.join(output_dir, 'coefficients.json')
    with open(bundled_file, 'w') as f:
        json.dump(bundled, f, indent=2)
    print(f"  Saved bundled coefficients to {bundled_file}")


def analyze_feature_importance(models: Dict):
    """Print feature importance analysis."""
    print("\n" + "="*60)
    print("Feature Importance Analysis (Global Models)")
    print("="*60)

    for model_type in ['offense', 'defense']:
        model_key = f"_global_{model_type}"
        if model_key not in models:
            continue

        model = models[model_key]
        coeffs = model['coefficients']['features']

        print(f"\n{model_type.upper()} model:")
        print("-" * 40)

        # Sort by absolute coefficient magnitude
        sorted_coeffs = sorted(coeffs.items(), key=lambda x: abs(x[1]), reverse=True)

        for feature, coef in sorted_coeffs:
            direction = "+" if coef > 0 else "-"
            print(f"  {feature:30s} {direction} {abs(coef):.4f}")


def main():
    parser = argparse.ArgumentParser(description='Train D1 baseball prediction models')
    parser.add_argument(
        '--features-dir',
        type=str,
        default='../features',
        help='Directory containing training data CSVs'
    )
    parser.add_argument(
        '--output-dir',
        type=str,
        default='coefficients',
        help='Output directory for model coefficients'
    )
    parser.add_argument(
        '--validation-season',
        type=int,
        default=None,
        help='Hold out this season for validation (e.g., 2025)'
    )
    parser.add_argument(
        '--min-samples',
        type=int,
        default=20,
        help='Minimum samples required to train team-specific model'
    )
    parser.add_argument(
        '--alpha',
        type=float,
        default=1.0,
        help='Ridge regularization parameter'
    )

    args = parser.parse_args()

    print(f"\n{'='*60}")
    print("D1 Baseball Model Training")
    print(f"{'='*60}")
    print(f"Features dir: {args.features_dir}")
    print(f"Min samples: {args.min_samples}")
    print(f"Alpha (regularization): {args.alpha}")
    if args.validation_season:
        print(f"Validation season: {args.validation_season}")

    # Load training data
    features_dir = os.path.join(os.path.dirname(__file__), args.features_dir)
    offense_df, defense_df = load_training_data(features_dir)

    print(f"\nLoaded training data:")
    print(f"  Offense samples: {len(offense_df)}")
    print(f"  Defense samples: {len(defense_df)}")

    # Train models
    models, validation_metrics = train_all_models(
        offense_df,
        defense_df,
        validation_season=args.validation_season,
        min_samples=args.min_samples,
        alpha=args.alpha
    )

    # Feature importance
    analyze_feature_importance(models)

    # Export coefficients
    print(f"\n{'='*60}")
    print("Exporting Coefficients")
    print(f"{'='*60}")

    output_dir = os.path.join(os.path.dirname(__file__), args.output_dir)
    export_coefficients(models, output_dir)

    # Summary
    print(f"\n{'='*60}")
    print("Summary")
    print(f"{'='*60}")
    print(f"Total models trained: {len(models)}")

    if validation_metrics:
        print(f"\nValidation Results:")
        for model_type, metrics in validation_metrics.items():
            print(f"  {model_type}: RMSE={metrics.get('rmse')}, MAE={metrics.get('mae')}, n={metrics.get('n_predictions')}")

    print(f"\nNext step: Copy coefficients.json to src/lib/ for TypeScript integration")


if __name__ == "__main__":
    main()
