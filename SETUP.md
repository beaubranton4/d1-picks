# Quick Setup Guide

## ✅ Already Done
- [x] Virtual environment created
- [x] Dependencies installed
- [x] Git initialized
- [x] Logo added to template
- [x] Vercel config created

## 🔑 Next: Get API Key

1. Visit https://the-odds-api.com
2. Sign up for free (500 requests/month)
3. Copy your API key
4. Edit `.env` file:
   ```bash
   nano .env
   # Replace "your_api_key_here" with your actual key
   ```

## 🎯 Generate Tomorrow's Picks (Feb 13, 2026)

```bash
# Activate virtual environment
source venv/bin/activate

# Generate picks for tomorrow
python generate_picks.py --date 2026-02-13

# Review the output
open output/2026-02-13.html
```

## 📤 Deploy to Vercel

### Option 1: Vercel CLI (Fastest)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy (first time will prompt for setup)
vercel --prod

# Follow prompts:
# - Link to GitHub? Yes (recommended)
# - Project name: d1-baseball-picks
# - Deploy? Yes
```

### Option 2: GitHub + Vercel Dashboard
```bash
# Push to GitHub
gh repo create d1-baseball-picks --public --source=. --remote=origin --push

# Then:
# 1. Go to vercel.com
# 2. Click "Add New Project"
# 3. Import your GitHub repo
# 4. Deploy!
```

## 📅 Daily Workflow

Every night before games:
```bash
source venv/bin/activate
python generate_picks.py --date YYYY-MM-DD
# Review: open output/YYYY-MM-DD.html
git add output/
git commit -m "Picks for YYYY-MM-DD"
git push
# Vercel auto-deploys!
```

## 🔗 Share Your Picks

After Vercel deployment, your URL will be:
- https://d1-baseball-picks.vercel.app/output/2026-02-13.html

Or with custom domain:
- https://yourdomain.com/output/2026-02-13.html

Share this link on TikTok! 🎉
