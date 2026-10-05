"""Volleyball rating model: Bradley-Terry on sets, with home court.

Every team i has a rating r_i. In a match where home team h hosts away team a,
the chance the home team wins any single set is

    p = 1 / (1 + exp(-(r_h - r_a + H)))

where H is one league-wide home-court term. A match is best of five, and the
model treats sets as independent, so the set-score distribution follows from p
(see set_distribution). The ratings are fit to every completed D1-vs-D1 match
this season by maximizing

    sum over matches [ S_h log p + S_a log(1 - p) ]  -  (lambda / 2) sum r_i^2  -  (lambda_H / 2) H^2

S_h and S_a are the sets each side won. Because the stopping rule (first to
three) depends only on the set results, this is the correct likelihood for p
even though matches stop early. The Gaussian prior (ridge penalty lambda)
pulls every team toward 0, the average D1 team, which keeps a team with few
matches from getting an extreme rating. It is solved with Newton's method.
"""
from __future__ import annotations

import math

import numpy as np


def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -40, 40)))


def fit(matches: list[dict], prior_precision: float, home_prior_precision: float, teams: list[str] | None = None,
        max_iter: int = 100, tol: float = 1e-10) -> dict:
    """Fit ratings. `matches` rows need home, away, home_sets, away_sets.

    Returns {"ratings": {team: r}, "home": H, "iterations": n, "matches": m}.
    """
    if teams is None:
        teams = sorted({c["home"] for c in matches} | {c["away"] for c in matches})
    idx = {t: i for i, t in enumerate(teams)}
    n = len(teams)
    hi = np.array([idx[c["home"]] for c in matches], dtype=int)
    ai = np.array([idx[c["away"]] for c in matches], dtype=int)
    sh = np.array([c["home_sets"] for c in matches], dtype=float)
    sa = np.array([c["away_sets"] for c in matches], dtype=float)
    tot = sh + sa
    r = np.zeros(n)
    home = 0.0
    it = 0
    for it in range(1, max_iter + 1):
        x = r[hi] - r[ai] + home
        p = sigmoid(x)
        resid = sh - tot * p  # d loglik / dx
        w = tot * p * (1 - p)  # -d2 loglik / dx2
        g = np.zeros(n + 1)
        np.add.at(g, hi, resid)
        np.add.at(g, ai, -resid)
        g[n] = resid.sum()
        g[:n] -= prior_precision * r
        g[n] -= home_prior_precision * home
        H = np.zeros((n + 1, n + 1))
        np.add.at(H, (hi, hi), w)
        np.add.at(H, (ai, ai), w)
        np.add.at(H, (hi, ai), -w)
        np.add.at(H, (ai, hi), -w)
        np.add.at(H, (hi, np.full_like(hi, n)), w)
        np.add.at(H, (np.full_like(hi, n), hi), w)
        np.add.at(H, (ai, np.full_like(ai, n)), -w)
        np.add.at(H, (np.full_like(ai, n), ai), -w)
        H[n, n] += w.sum()
        H[np.arange(n), np.arange(n)] += prior_precision
        H[n, n] += home_prior_precision
        step = np.linalg.solve(H, g)
        r += step[:n]
        home += step[n]
        if np.max(np.abs(step)) < tol:
            break
    return {"ratings": {t: float(r[idx[t]]) for t in teams}, "home": float(home), "iterations": it, "matches": len(matches)}


def set_probability(r_home: float, r_away: float, home: float, neutral: bool = False) -> float:
    x = max(min(r_home - r_away + (0.0 if neutral else home), 40.0), -40.0)
    return 1.0 / (1.0 + math.exp(-x))


def set_distribution(p: float) -> dict:
    """Best-of-five set scores, sets independent with home set-win probability p."""
    q = 1.0 - p
    return {
        "home_3_0": p**3,
        "home_3_1": 3 * p**3 * q,
        "home_3_2": 6 * p**3 * q**2,
        "away_3_0": q**3,
        "away_3_1": 3 * q**3 * p,
        "away_3_2": 6 * q**3 * p**2,
    }


def match_probability(p_set: float) -> float:
    d = set_distribution(p_set)
    return d["home_3_0"] + d["home_3_1"] + d["home_3_2"]


def logit(p: float) -> float:
    p = min(max(p, 1e-12), 1 - 1e-12)
    return math.log(p / (1 - p))


def inverse_match_probability(p_match: float) -> float:
    """The set-win probability whose best-of-five match probability is p_match (bisection)."""
    lo, hi = 0.0, 1.0
    for _ in range(80):
        mid = (lo + hi) / 2
        if match_probability(mid) < p_match:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def calibrate(p_match_raw: float, scale: float) -> float:
    """Shrink an overconfident match probability toward 50%: sigma(scale * logit(p))."""
    z = max(min(scale * logit(min(max(p_match_raw, 1e-6), 1 - 1e-6)), 40.0), -40.0)
    return 1.0 / (1.0 + math.exp(-z))


def fit_scale(rows: list[dict], min_rows: int = 200) -> float:
    """Calibration scale k maximizing the log likelihood of outcomes given sigma(k * logit(p_home)).

    rows need p_home (uncalibrated match probability) and home_won. Below
    min_rows there is too little evidence, so k stays 1 (no adjustment).
    """
    if len(rows) < min_rows:
        return 1.0
    # Clip to 1-in-a-million so one near-certain raw probability cannot dominate.
    x = np.array([logit(min(max(r["p_home"], 1e-6), 1 - 1e-6)) for r in rows])
    y = np.array([1.0 if r["home_won"] else 0.0 for r in rows])
    k = 1.0
    for _ in range(100):
        p = sigmoid(k * x)
        g = float(np.sum((y - p) * x))
        h = float(np.sum(p * (1 - p) * x * x))
        if h <= 0:
            break
        step = g / h
        k += step
        if abs(step) < 1e-10:
            break
    return k


def predict(r_home: float, r_away: float, home: float, scale: float, neutral: bool = False) -> dict:
    """Everything the site shows for one match, from two ratings, home court and the calibration scale.

    The calibrated match probability is the headline number. The set-score
    distribution uses the effective set probability that reproduces it, so
    the six set scores always add up to the headline.
    """
    p_set_raw = set_probability(r_home, r_away, home, neutral)
    p_match = calibrate(match_probability(p_set_raw), scale)
    p_set = inverse_match_probability(p_match)
    return {"p_home": p_match, "p_set_home": p_set, "p_set_home_raw": p_set_raw, "sets": set_distribution(p_set)}


def fair_american(p: float) -> int:
    """No-vig American odds for probability p (what the model's number is worth as a price)."""
    p = min(max(p, 1e-6), 1 - 1e-6)
    if p >= 0.5:
        return -round(100 * p / (1 - p))
    return round(100 * (1 - p) / p)


def log_loss(p_outcome: float) -> float:
    return -math.log(min(max(p_outcome, 1e-12), 1.0))


def brier(p_home: float, home_won: bool) -> float:
    return (p_home - (1.0 if home_won else 0.0)) ** 2
