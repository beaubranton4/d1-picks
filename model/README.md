# D1 Baseball Linear Regression Model

Score prediction model for D1 baseball games using linear regression.

## Quick Start

```bash
# Install dependencies
pip install -r ../requirements.txt

# Run full pipeline (fetches data, trains models)
python run_pipeline.py

# Quick test with sample data (5 teams, recent seasons)
python run_pipeline.py --seasons 2024,2025 --sample 5
```

## Architecture

```
model/
├── data/
│   ├── collect_games.py     # Fetch game results from NCAA
│   ├── collect_stats.py     # Fetch team/player stats
│   └── raw/                  # Raw JSON data
├── features/
│   ├── build_features.py    # Feature engineering
│   └── training_data*.csv   # Training datasets
├── training/
│   ├── train_models.py      # Model training
│   └── coefficients/        # Exported model coefficients
└── run_pipeline.py          # Master pipeline script
```

## Models

Each team has two linear regression models:

### Offense Model (predicts runs scored)
- Team batting stats (BA, SLG, OPS, OBP)
- Opponent pitching stats (ERA, WHIP)
- Recent performance (rolling averages)
- Home/away advantage

### Defense Model (predicts runs allowed)
- Team pitching stats (ERA, WHIP)
- Opponent batting stats (BA, SLG, OPS)
- Recent performance (rolling averages)
- Home/away advantage

## Data Source

Fetches data directly from NCAA stats (stats.ncaa.org) using the custom `ncaa_api.py` module. Falls back to a curated list of major D1 teams if the API is unavailable.

## Integration

Coefficients are exported to `training/coefficients/coefficients.json` and loaded by:
- `src/lib/model-predictor.ts` (TypeScript predictor)
- `src/app/api/model-coefficients/route.ts` (API endpoint)

## Usage in TypeScript

```typescript
import { loadCoefficients, predictGame } from '@/lib/model-predictor';

// Load coefficients on app startup
await loadCoefficients();

// Predict a game
const prediction = predictGame(teamAFeatures, teamBFeatures);
console.log(prediction.teamAWinProb);  // 0.65
console.log(prediction.expectedTotalRuns);  // 11.2
```
