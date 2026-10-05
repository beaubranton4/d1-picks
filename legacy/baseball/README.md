# D1 Baseball Picks

Daily +EV college baseball betting picks.

## Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure API key
cp .env.example .env
# Edit .env and add your The Odds API key from https://the-odds-api.com
```

## Usage

```bash
# Generate picks for a specific date
python generate_picks.py --date 2024-03-15

# Output will be in: output/2024-03-15.html
```

## Daily Workflow

1. Run script the night before games (8-10 PM)
2. Review generated HTML locally
3. Push to GitHub or deploy to Netlify/Vercel
4. Share on TikTok
