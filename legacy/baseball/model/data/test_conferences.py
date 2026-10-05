#!/usr/bin/env python3
"""Quick test of conference fetching."""
from espn_collector import fetch_all_teams, fetch_team_detail
import time

# Test a few known teams
test_teams = [
    ("148", "Alabama"),
    ("365", "Hofstra"),  # Or LSU?
    ("99", "Nebraska"),
    ("66", "UCLA"),
    ("126", "Texas"),
]

print("Testing team conference lookup")
print("="*60)

for team_id, name in test_teams:
    print(f"\n{name} ({team_id}):")
    detail = fetch_team_detail(team_id)
    if detail:
        print(f"  Group ID: {detail.get('group_id')}")
        print(f"  Parent Group: {detail.get('parent_group_id')}")
        print(f"  Is Conference: {detail.get('is_conference')}")
        print(f"  Standing Summary: {detail.get('standing_summary')}")
    time.sleep(0.3)

print("\n\nFetching all teams with conference details (first 20)...")
teams = fetch_all_teams(fetch_conference_details=False)

# Now fetch details for first 20
print("\nFetching details for first 20 teams:")
for team in teams[:20]:
    detail = fetch_team_detail(team['espn_id'])
    if detail:
        print(f"  {team['name']}: group={detail.get('group_id')}, parent={detail.get('parent_group_id')}, standing={detail.get('standing_summary')}")
    time.sleep(0.2)
