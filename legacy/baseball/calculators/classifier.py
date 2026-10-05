"""
Bet classification based on EV edge.
"""


def classify_bet(adjusted_edge: float) -> str:
    """
    Classify bet based on adjusted edge.

    Args:
        adjusted_edge: Adjusted EV edge as decimal (e.g., 0.075 for 7.5%)

    Returns:
        Classification: 'STRONG_BET', 'BET', 'LEAN', or 'PASS'
    """
    if adjusted_edge >= 0.07:
        return 'STRONG_BET'
    elif adjusted_edge >= 0.05:
        return 'BET'
    elif adjusted_edge >= 0.03:
        return 'LEAN'
    else:
        return 'PASS'


if __name__ == "__main__":
    # Test classifier
    test_edges = [0.08, 0.06, 0.04, 0.02, -0.01]

    print("Testing bet classifier:")
    for edge in test_edges:
        classification = classify_bet(edge)
        print(f"  {edge:+.2%} -> {classification}")
