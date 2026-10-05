"""Unit tests for the pipeline. Run: python -m unittest discover -s pipeline/tests -t ."""
from __future__ import annotations

import random
import unittest
from datetime import datetime, timezone

from pipeline import fmt, ledger, model, pages, writer


class ModelTest(unittest.TestCase):
    def test_set_distribution_sums_to_one(self):
        for p in (0.1, 0.37, 0.5, 0.82):
            self.assertAlmostEqual(sum(model.set_distribution(p).values()), 1.0, places=12)

    def test_even_match(self):
        self.assertAlmostEqual(model.match_probability(0.5), 0.5, places=12)

    def test_inverse_match_probability(self):
        for p in (0.2, 0.5, 0.73, 0.97):
            self.assertAlmostEqual(model.match_probability(model.inverse_match_probability(p)), p, places=9)

    def test_calibrate_identity_and_shrink(self):
        self.assertAlmostEqual(model.calibrate(0.8, 1.0), 0.8, places=9)
        self.assertLess(model.calibrate(0.8, 0.6), 0.8)
        self.assertGreater(model.calibrate(0.8, 0.6), 0.5)

    def test_predict_sets_add_up_to_headline(self):
        pr = model.predict(1.2, -0.3, 0.18, 0.63)
        home = sum(v for k, v in pr["sets"].items() if k.startswith("home"))
        self.assertAlmostEqual(home, pr["p_home"], places=9)

    def test_fair_american(self):
        self.assertEqual(model.fair_american(0.5), -100)
        self.assertEqual(model.fair_american(0.8), -400)
        self.assertEqual(model.fair_american(0.2), 400)

    def test_fit_recovers_order(self):
        rng = random.Random(7)
        true = {f"t{i}": (i - 10) / 5 for i in range(20)}
        matches = []
        for _ in range(1500):
            h, a = rng.sample(sorted(true), 2)
            p = model.set_probability(true[h], true[a], 0.2)
            hs = as_ = 0
            while hs < 3 and as_ < 3:
                if rng.random() < p:
                    hs += 1
                else:
                    as_ += 1
            matches.append({"home": h, "away": a, "home_sets": hs, "away_sets": as_})
        fit = model.fit(matches, prior_precision=0.25, home_prior_precision=0.1)
        est = sorted(true, key=fit["ratings"].get)
        rank_true = {t: i for i, t in enumerate(sorted(true, key=true.get))}
        d2 = sum((i - rank_true[t]) ** 2 for i, t in enumerate(est))
        spearman = 1 - 6 * d2 / (20 * (20**2 - 1))
        self.assertGreater(spearman, 0.95)
        self.assertGreater(fit["home"], 0.05)


class LedgerTest(unittest.TestCase):
    def test_deadline_uses_start_when_known(self):
        c = {"start": "2026-10-08T23:00:00Z", "start_known": True, "date": "2026-10-08"}
        self.assertEqual(ledger.lock_deadline(c, "America/New_York"), datetime(2026, 10, 8, 23, tzinfo=timezone.utc))

    def test_deadline_is_local_midnight_when_time_unknown(self):
        c = {"start": "2026-10-08T23:00:00Z", "start_known": False, "date": "2026-10-08"}
        self.assertEqual(ledger.lock_deadline(c, "America/New_York").astimezone(timezone.utc), datetime(2026, 10, 8, 4, tzinfo=timezone.utc))


def facts_fixture() -> dict:
    def team(i, name, rank, rating):
        return {"id": i, "name": name, "conference_name": "Big Ten", "rank": rank, "rating": rating, "match_win_vs_avg": 0.95,
                "wins": 12, "losses": 2, "sets_won": 38, "sets_lost": 11, "last5": "WWLWW", "sos_rank": 14, "avca_rank": 6,
                "d1_matches": 14, "recent": [{"date": "2026-10-01"}]}

    pr = model.predict(1.9, 1.4, 0.18, 0.63)
    return {
        "slug": "penn-st-vs-wisconsin-2026-10-08", "sport": "volleyball", "match_id": "1", "date": "2026-10-08",
        "start": "2026-10-08T23:00:00Z", "start_known": True, "n_teams": 348, "p_home": round(pr["p_home"], 4),
        "sets": {k: round(v, 4) for k, v in pr["sets"].items()}, "fair_home": model.fair_american(pr["p_home"]),
        "fair_away": model.fair_american(1 - pr["p_home"]), "p_home_neutral": 0.6, "h2h": [],
        "home": team("wisconsin", "Wisconsin", 12, 1.9), "away": team("penn-st", "Penn St.", 20, 1.4),
    }


class PagesTest(unittest.TestCase):
    def test_generated_prose_traces_and_passes_copy_rules(self):
        f = facts_fixture()
        d = writer.build_display(f, "America/New_York")
        body = writer.body_for(d, f["match_id"])
        self.assertEqual(pages.trace_problems(body + writer.title_for(d) + writer.description_for(d), d), [])
        self.assertEqual(pages.copy_problems(body), [])
        self.assertNotIn("..", body.replace("...", ""))

    def test_trace_rejects_an_invented_number(self):
        d = writer.build_display(facts_fixture(), "America/New_York")
        self.assertEqual(pages.trace_problems("Their setter hits .312 on the road.", d), ["312"])

    def test_copy_rules(self):
        self.assertTrue(pages.copy_problems("Lock of the night"))
        self.assertTrue(pages.copy_problems("a dash — here"))
        self.assertEqual(pages.copy_problems("A clear favorite."), [])

    def test_ordinal(self):
        self.assertEqual([fmt.ordinal(n) for n in (1, 2, 3, 4, 11, 12, 13, 21, 112)], ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "112th"])


if __name__ == "__main__":
    unittest.main()
