#!/usr/bin/env python3
"""
Direct NCAA stats API wrapper.

Fetches D1 baseball data directly from stats.ncaa.org without external dependencies.
"""
import requests
import time
from typing import List, Dict, Optional, Any
from bs4 import BeautifulSoup
import json
import re

# NCAA Stats base URL
NCAA_BASE_URL = "https://stats.ncaa.org"

# Season IDs mapping (NCAA uses internal IDs, not years)
# These need to be discovered for each year
SEASON_IDS = {
    2025: 16820,  # Approximate - may need adjustment
    2024: 16460,
    2023: 15860,
    2022: 15580,
    2021: 15320,
    2020: 15200,
}

# Division 1 baseball sport code
D1_BASEBALL = 1


class NCAAApi:
    """Simple NCAA stats API wrapper."""

    def __init__(self, rate_limit_seconds: float = 1.0):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        })
        self.rate_limit = rate_limit_seconds
        self.last_request = 0

    def _rate_limit_wait(self):
        """Enforce rate limiting."""
        now = time.time()
        elapsed = now - self.last_request
        if elapsed < self.rate_limit:
            time.sleep(self.rate_limit - elapsed)
        self.last_request = time.time()

    def _get(self, url: str, params: Dict = None) -> Optional[requests.Response]:
        """Make a GET request with rate limiting."""
        self._rate_limit_wait()
        try:
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response
        except requests.RequestException as e:
            print(f"Request failed: {e}")
            return None

    def get_season_id(self, year: int) -> Optional[int]:
        """Get NCAA internal season ID for a year."""
        return SEASON_IDS.get(year)

    def get_teams(self, year: int) -> List[Dict]:
        """
        Get list of D1 baseball teams for a season.

        Returns list of {team_id, name, conference}
        """
        season_id = self.get_season_id(year)
        if not season_id:
            print(f"Unknown season ID for year {year}")
            return []

        # Try the team rankings page to get team list
        url = f"{NCAA_BASE_URL}/rankings/change_sport_year_div"
        params = {
            'academic_year': year,
            'division': D1_BASEBALL,
            'sport_code': 'MBA',  # Men's Baseball
        }

        response = self._get(url, params)
        if not response:
            return self._get_fallback_teams()

        # Parse HTML to extract teams
        soup = BeautifulSoup(response.text, 'html.parser')
        teams = []

        # Look for team links
        for link in soup.find_all('a', href=re.compile(r'/teams/\d+')):
            href = link.get('href', '')
            match = re.search(r'/teams/(\d+)', href)
            if match:
                teams.append({
                    'team_id': int(match.group(1)),
                    'name': link.get_text(strip=True),
                    'conference': 'Unknown',
                })

        if not teams:
            return self._get_fallback_teams()

        return teams

    def _get_fallback_teams(self) -> List[Dict]:
        """Fallback list of major D1 baseball teams with known IDs."""
        return [
            {'team_id': 8, 'name': 'Alabama', 'conference': 'SEC'},
            {'team_id': 31, 'name': 'Arkansas', 'conference': 'SEC'},
            {'team_id': 99, 'name': 'Florida', 'conference': 'SEC'},
            {'team_id': 107, 'name': 'Georgia', 'conference': 'SEC'},
            {'team_id': 365, 'name': 'LSU', 'conference': 'SEC'},
            {'team_id': 587, 'name': 'Texas A&M', 'conference': 'SEC'},
            {'team_id': 545, 'name': 'Tennessee', 'conference': 'SEC'},
            {'team_id': 467, 'name': 'Ole Miss', 'conference': 'SEC'},
            {'team_id': 238, 'name': 'Vanderbilt', 'conference': 'SEC'},
            {'team_id': 703, 'name': 'Texas', 'conference': 'Big 12'},
            {'team_id': 147, 'name': 'Miami (FL)', 'conference': 'ACC'},
            {'team_id': 234, 'name': 'Florida State', 'conference': 'ACC'},
            {'team_id': 193, 'name': 'Clemson', 'conference': 'ACC'},
            {'team_id': 512, 'name': 'NC State', 'conference': 'ACC'},
            {'team_id': 746, 'name': 'Virginia', 'conference': 'ACC'},
            {'team_id': 749, 'name': 'Wake Forest', 'conference': 'ACC'},
            {'team_id': 674, 'name': 'Stanford', 'conference': 'Pac-12'},
            {'team_id': 28, 'name': 'Arizona State', 'conference': 'Pac-12'},
            {'team_id': 29, 'name': 'Arizona', 'conference': 'Pac-12'},
            {'team_id': 657, 'name': 'UCLA', 'conference': 'Pac-12'},
            {'team_id': 519, 'name': 'Oregon State', 'conference': 'Pac-12'},
            {'team_id': 670, 'name': 'USC', 'conference': 'Pac-12'},
            {'team_id': 518, 'name': 'Oklahoma State', 'conference': 'Big 12'},
            {'team_id': 698, 'name': 'TCU', 'conference': 'Big 12'},
            {'team_id': 704, 'name': 'Texas Tech', 'conference': 'Big 12'},
            {'team_id': 458, 'name': 'Notre Dame', 'conference': 'ACC'},
            {'team_id': 367, 'name': 'Louisville', 'conference': 'ACC'},
            {'team_id': 279, 'name': 'Kentucky', 'conference': 'SEC'},
            {'team_id': 33, 'name': 'Auburn', 'conference': 'SEC'},
            {'team_id': 470, 'name': 'Mississippi State', 'conference': 'SEC'},
        ]

    def get_team_schedule(self, team_id: int, year: int) -> List[Dict]:
        """
        Get game results for a team in a season.

        Returns list of game dictionaries with scores.
        """
        season_id = self.get_season_id(year)
        if not season_id:
            return []

        # Team schedule URL
        url = f"{NCAA_BASE_URL}/teams/{team_id}"
        params = {'sport_year_ctl_id': season_id}

        response = self._get(url, params)
        if not response:
            return []

        # Parse game schedule from HTML
        games = self._parse_schedule_html(response.text, team_id, year)
        return games

    def _parse_schedule_html(self, html: str, team_id: int, year: int) -> List[Dict]:
        """Parse schedule/results table from team page."""
        soup = BeautifulSoup(html, 'html.parser')
        games = []

        # Find the schedule table (usually has game results)
        tables = soup.find_all('table')

        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all('td')
                if len(cells) < 3:
                    continue

                # Try to parse as a game row
                game = self._parse_game_row(cells, team_id, year)
                if game:
                    games.append(game)

        return games

    def _parse_game_row(self, cells: List, team_id: int, year: int) -> Optional[Dict]:
        """Parse a single game row from schedule table."""
        try:
            # Cell structure varies, but typically:
            # [Date, Opponent, Result/Score, ...]
            date_text = cells[0].get_text(strip=True) if len(cells) > 0 else ''
            opp_text = cells[1].get_text(strip=True) if len(cells) > 1 else ''
            result_text = cells[2].get_text(strip=True) if len(cells) > 2 else ''

            # Skip header rows or empty rows
            if not date_text or 'date' in date_text.lower():
                return None

            # Parse result (e.g., "W 8-5" or "L 3-7")
            result_match = re.search(r'([WL])\s*(\d+)-(\d+)', result_text)
            if not result_match:
                return None

            result = result_match.group(1)
            score1 = int(result_match.group(2))
            score2 = int(result_match.group(3))

            # Determine runs scored/allowed based on W/L
            if result == 'W':
                runs_scored = max(score1, score2)
                runs_allowed = min(score1, score2)
            else:
                runs_scored = min(score1, score2)
                runs_allowed = max(score1, score2)

            # Parse location (@, vs, or neutral)
            location = 'home'
            if opp_text.startswith('@') or 'at ' in opp_text.lower():
                location = 'away'
                opp_text = opp_text.lstrip('@').strip()
            elif opp_text.startswith('vs'):
                opp_text = opp_text[2:].strip()

            # Clean opponent name
            opp_name = re.sub(r'\s*\(\d+-\d+\)\s*$', '', opp_text)  # Remove record
            opp_name = re.sub(r'\s*#\d+\s*', '', opp_name)  # Remove ranking

            # Parse date
            date_parsed = self._parse_date(date_text, year)

            return {
                'date': date_parsed,
                'opponent': opp_name.strip(),
                'location': location,
                'runs_scored': runs_scored,
                'runs_allowed': runs_allowed,
                'result': result,
            }

        except Exception as e:
            return None

    def _parse_date(self, date_str: str, year: int) -> str:
        """Parse date string to YYYY-MM-DD format."""
        # Try various date formats
        import datetime

        # Clean the date string
        date_str = date_str.strip()

        # Common formats: "03/15", "3/15/24", "Mar 15"
        formats = [
            '%m/%d/%Y',
            '%m/%d/%y',
            '%m/%d',
            '%b %d',
            '%B %d',
        ]

        for fmt in formats:
            try:
                dt = datetime.datetime.strptime(date_str, fmt)
                # If no year, use the provided year
                if dt.year == 1900:
                    dt = dt.replace(year=year)
                return dt.strftime('%Y-%m-%d')
            except ValueError:
                continue

        return f"{year}-01-01"  # Fallback

    def get_team_batting_stats(self, team_id: int, year: int) -> Optional[Dict]:
        """Get team batting statistics."""
        season_id = self.get_season_id(year)
        if not season_id:
            return None

        url = f"{NCAA_BASE_URL}/teams/{team_id}/stats"
        params = {
            'sport_year_ctl_id': season_id,
            'id': team_id,
        }

        response = self._get(url, params)
        if not response:
            return None

        return self._parse_batting_stats(response.text)

    def _parse_batting_stats(self, html: str) -> Optional[Dict]:
        """Parse batting statistics from team stats page."""
        soup = BeautifulSoup(html, 'html.parser')

        # Look for totals row
        totals_row = soup.find('tr', {'class': 'grey_heading'})
        if not totals_row:
            # Try finding "Totals" text
            for tr in soup.find_all('tr'):
                if 'Total' in tr.get_text():
                    totals_row = tr
                    break

        if not totals_row:
            return None

        cells = totals_row.find_all('td')
        if len(cells) < 10:
            return None

        # Parse numeric values (positions vary by table)
        stats = {}
        for i, cell in enumerate(cells):
            text = cell.get_text(strip=True)
            try:
                # Try to parse as number
                if '.' in text:
                    stats[f'col_{i}'] = float(text)
                else:
                    stats[f'col_{i}'] = int(text)
            except ValueError:
                stats[f'col_{i}'] = text

        return stats

    def get_team_pitching_stats(self, team_id: int, year: int) -> Optional[Dict]:
        """Get team pitching statistics."""
        season_id = self.get_season_id(year)
        if not season_id:
            return None

        url = f"{NCAA_BASE_URL}/teams/{team_id}/stats"
        params = {
            'sport_year_ctl_id': season_id,
            'id': team_id,
            'year_stat_category_id': 14841,  # Pitching category (may vary)
        }

        response = self._get(url, params)
        if not response:
            return None

        return self._parse_pitching_stats(response.text)

    def _parse_pitching_stats(self, html: str) -> Optional[Dict]:
        """Parse pitching statistics from team stats page."""
        # Similar to batting stats parsing
        soup = BeautifulSoup(html, 'html.parser')

        totals_row = None
        for tr in soup.find_all('tr'):
            if 'Total' in tr.get_text():
                totals_row = tr
                break

        if not totals_row:
            return None

        cells = totals_row.find_all('td')
        stats = {}
        for i, cell in enumerate(cells):
            text = cell.get_text(strip=True)
            try:
                if '.' in text:
                    stats[f'col_{i}'] = float(text)
                else:
                    stats[f'col_{i}'] = int(text)
            except ValueError:
                stats[f'col_{i}'] = text

        return stats


# Singleton instance
_api = None


def get_api() -> NCAAApi:
    """Get singleton API instance."""
    global _api
    if _api is None:
        _api = NCAAApi()
    return _api
