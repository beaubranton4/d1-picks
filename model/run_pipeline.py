#!/usr/bin/env python3
"""
Run the complete model training pipeline.

Steps:
1. Collect game data from NCAA
2. Collect team/player stats
3. Build feature dataset
4. Train models and export coefficients

Usage:
    python run_pipeline.py
    python run_pipeline.py --seasons 2024,2025 --sample 10  # Quick test
    python run_pipeline.py --skip-collection  # Use existing raw data
"""
import argparse
import subprocess
import sys
import os
from datetime import datetime


def run_command(cmd: list, description: str) -> bool:
    """Run a command and return success status."""
    print(f"\n{'='*60}")
    print(f"Step: {description}")
    print(f"{'='*60}")
    print(f"Command: {' '.join(cmd)}")
    print()

    try:
        result = subprocess.run(cmd, check=True, cwd=os.path.dirname(__file__))
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error: Command failed with exit code {e.returncode}")
        return False


def main():
    parser = argparse.ArgumentParser(description='Run complete model training pipeline')
    parser.add_argument(
        '--seasons',
        type=str,
        default='2023,2024,2025',
        help='Comma-separated list of seasons'
    )
    parser.add_argument(
        '--sample',
        type=int,
        default=None,
        help='Only fetch this many teams (for testing)'
    )
    parser.add_argument(
        '--skip-collection',
        action='store_true',
        help='Skip data collection (use existing raw data)'
    )
    parser.add_argument(
        '--validation-season',
        type=int,
        default=2025,
        help='Hold out this season for validation'
    )

    args = parser.parse_args()

    start_time = datetime.now()

    print(f"\n{'#'*60}")
    print("# D1 Baseball Model Training Pipeline")
    print(f"{'#'*60}")
    print(f"Seasons: {args.seasons}")
    print(f"Sample: {args.sample or 'All teams'}")
    print(f"Skip collection: {args.skip_collection}")
    print(f"Validation season: {args.validation_season}")
    print(f"Started at: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")

    python = sys.executable

    # Step 1: Collect games
    if not args.skip_collection:
        cmd = [python, 'data/collect_games.py', '--seasons', args.seasons]
        if args.sample:
            cmd.extend(['--sample', str(args.sample)])

        if not run_command(cmd, 'Collect game data'):
            print("\nPipeline failed at: collect_games.py")
            return 1

    # Step 2: Collect stats
    if not args.skip_collection:
        cmd = [python, 'data/collect_stats.py', '--seasons', args.seasons]
        if args.sample:
            cmd.extend(['--sample', str(args.sample)])

        if not run_command(cmd, 'Collect team/player stats'):
            print("\nPipeline failed at: collect_stats.py")
            return 1

    # Step 3: Build features
    cmd = [python, 'features/build_features.py']
    if not run_command(cmd, 'Build feature dataset'):
        print("\nPipeline failed at: build_features.py")
        return 1

    # Step 4: Train models
    cmd = [
        python, 'training/train_models.py',
        '--validation-season', str(args.validation_season)
    ]
    if not run_command(cmd, 'Train models'):
        print("\nPipeline failed at: train_models.py")
        return 1

    # Done
    end_time = datetime.now()
    duration = end_time - start_time

    print(f"\n{'#'*60}")
    print("# Pipeline Complete!")
    print(f"{'#'*60}")
    print(f"Duration: {duration}")
    print(f"\nOutput files:")
    print(f"  - model/data/raw/games.json")
    print(f"  - model/data/raw/batting_stats.json")
    print(f"  - model/data/raw/pitching_stats.json")
    print(f"  - model/features/training_data.csv")
    print(f"  - model/training/coefficients/coefficients.json")
    print(f"\nNext steps:")
    print(f"  1. Verify model metrics look reasonable")
    print(f"  2. Test predictions with: npm run dev")
    print(f"  3. Integrate with existing edge calculation")

    return 0


if __name__ == "__main__":
    sys.exit(main())
