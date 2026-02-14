/**
 * Linear regression model predictor for D1 baseball scores.
 *
 * Loads trained coefficients and predicts:
 * - Runs scored (offense model)
 * - Runs allowed (defense model)
 *
 * Uses these predictions to derive win probabilities and betting edges.
 */

// Type definitions for model coefficients
interface ScalerParams {
  mean: number;
  std: number;
}

interface ModelCoefficients {
  intercept: number;
  features: Record<string, number>;
  scaler_means: Record<string, number>;
  scaler_stds: Record<string, number>;
}

interface TeamModels {
  offense?: ModelCoefficients;
  defense?: ModelCoefficients;
}

interface CoefficientsData {
  generated_at: string;
  model_info: {
    total_models: number;
    teams_with_models: number;
    offense_features: string[];
    defense_features: string[];
  };
  global: TeamModels;
  teams: Record<string, TeamModels>;
}

// Feature input for predictions
export interface GameFeatures {
  // Team identifiers
  team: string;
  opponent: string;

  // Game context
  dayOfWeek: number; // 0-6 (Mon-Sun)
  isHome: boolean;
  isNeutral: boolean;

  // Team batting stats
  teamBa?: number;
  teamSlg?: number;
  teamOps?: number;
  teamObp?: number;

  // Team pitching stats
  teamEra?: number;
  teamWhip?: number;

  // Opponent batting stats
  oppBa?: number;
  oppSlg?: number;
  oppOps?: number;

  // Opponent pitching stats
  oppEra?: number;
  oppWhip?: number;

  // Recent performance (rolling averages)
  recentRunsScoredAvg?: number;
  recentRunsAllowedAvg?: number;
  oppRecentRunsScoredAvg?: number;
  oppRecentRunsAllowedAvg?: number;

  // Win rates
  recentWinRate?: number;
  oppRecentWinRate?: number;
}

export interface ScorePrediction {
  team: string;
  predictedRunsScored: number;
  predictedRunsAllowed: number;
  usedGlobalModel: boolean;
}

export interface GamePrediction {
  teamA: ScorePrediction;
  teamB: ScorePrediction;
  teamAWinProb: number;
  teamBWinProb: number;
  expectedTotalRuns: number;
  spreadA: number; // Expected margin for team A (negative means B favored)
}

// Default stats for when data is missing
const DEFAULT_STATS = {
  ba: 0.265,
  slg: 0.390,
  ops: 0.730,
  obp: 0.340,
  era: 4.50,
  whip: 1.35,
  runsScored: 5.5,
  runsAllowed: 5.5,
  winRate: 0.500,
};

let coefficientsData: CoefficientsData | null = null;

/**
 * Load coefficients from JSON file.
 * Call this once at app startup.
 */
export async function loadCoefficients(path?: string): Promise<void> {
  try {
    // In Next.js, we can import JSON directly
    // For runtime loading, use fetch
    if (typeof window === 'undefined') {
      // Server-side: use dynamic import
      const fs = await import('fs');
      const filePath = path || './model/training/coefficients/coefficients.json';
      const data = fs.readFileSync(filePath, 'utf-8');
      coefficientsData = JSON.parse(data);
    } else {
      // Client-side: fetch from public path
      const response = await fetch(path || '/api/model-coefficients');
      coefficientsData = await response.json();
    }
    console.log(
      `Loaded model coefficients: ${coefficientsData?.model_info.teams_with_models} teams`
    );
  } catch (error) {
    console.warn('Failed to load model coefficients, using global fallback:', error);
    coefficientsData = null;
  }
}

/**
 * Set coefficients directly (for testing or preloading).
 */
export function setCoefficients(data: CoefficientsData): void {
  coefficientsData = data;
}

/**
 * Normalize team name for coefficient lookup.
 */
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Get model coefficients for a team.
 * Falls back to global model if team-specific not available.
 */
function getModelCoefficients(
  team: string,
  modelType: 'offense' | 'defense'
): { coefficients: ModelCoefficients; isGlobal: boolean } {
  if (!coefficientsData) {
    throw new Error('Coefficients not loaded. Call loadCoefficients() first.');
  }

  const normalizedTeam = normalizeTeamName(team);
  const teamModels = coefficientsData.teams[normalizedTeam];

  if (teamModels && teamModels[modelType]) {
    return { coefficients: teamModels[modelType]!, isGlobal: false };
  }

  // Fallback to global model
  const globalModel = coefficientsData.global[modelType];
  if (!globalModel) {
    throw new Error(`No ${modelType} model available for ${team} or global`);
  }

  return { coefficients: globalModel, isGlobal: true };
}

/**
 * Apply linear regression prediction with scaling.
 */
function predict(coefficients: ModelCoefficients, features: Record<string, number>): number {
  let prediction = coefficients.intercept;

  for (const [featureName, featureValue] of Object.entries(features)) {
    const coef = coefficients.features[featureName];
    if (coef === undefined) continue;

    const mean = coefficients.scaler_means[featureName] || 0;
    const std = coefficients.scaler_stds[featureName] || 1;

    // Scale the feature value
    const scaledValue = std > 0 ? (featureValue - mean) / std : 0;
    prediction += coef * scaledValue;
  }

  // Ensure non-negative runs prediction
  return Math.max(0, prediction);
}

/**
 * Build feature vector for offense model.
 */
function buildOffenseFeatures(input: GameFeatures): Record<string, number> {
  return {
    day_of_week: input.dayOfWeek,
    is_home: input.isHome ? 1 : 0,
    is_neutral: input.isNeutral ? 1 : 0,
    team_ba: input.teamBa ?? DEFAULT_STATS.ba,
    team_slg: input.teamSlg ?? DEFAULT_STATS.slg,
    team_ops: input.teamOps ?? DEFAULT_STATS.ops,
    team_obp: input.teamObp ?? DEFAULT_STATS.obp,
    opp_era: input.oppEra ?? DEFAULT_STATS.era,
    opp_whip: input.oppWhip ?? DEFAULT_STATS.whip,
    recent_runs_scored_avg: input.recentRunsScoredAvg ?? DEFAULT_STATS.runsScored,
    recent_runs_allowed_avg: input.recentRunsAllowedAvg ?? DEFAULT_STATS.runsAllowed,
    opp_recent_runs_allowed_avg: input.oppRecentRunsAllowedAvg ?? DEFAULT_STATS.runsAllowed,
    recent_win_rate: input.recentWinRate ?? DEFAULT_STATS.winRate,
  };
}

/**
 * Build feature vector for defense model.
 */
function buildDefenseFeatures(input: GameFeatures): Record<string, number> {
  return {
    day_of_week: input.dayOfWeek,
    is_home: input.isHome ? 1 : 0,
    is_neutral: input.isNeutral ? 1 : 0,
    team_era: input.teamEra ?? DEFAULT_STATS.era,
    team_whip: input.teamWhip ?? DEFAULT_STATS.whip,
    opp_ba: input.oppBa ?? DEFAULT_STATS.ba,
    opp_slg: input.oppSlg ?? DEFAULT_STATS.slg,
    opp_ops: input.oppOps ?? DEFAULT_STATS.ops,
    recent_runs_scored_avg: input.recentRunsScoredAvg ?? DEFAULT_STATS.runsScored,
    recent_runs_allowed_avg: input.recentRunsAllowedAvg ?? DEFAULT_STATS.runsAllowed,
    opp_recent_runs_scored_avg: input.oppRecentRunsScoredAvg ?? DEFAULT_STATS.runsScored,
    recent_win_rate: input.recentWinRate ?? DEFAULT_STATS.winRate,
  };
}

/**
 * Predict runs scored and allowed for a single team.
 */
export function predictTeamScore(features: GameFeatures): ScorePrediction {
  // Get offense model (predicts runs scored)
  const { coefficients: offenseCoeffs, isGlobal: offenseGlobal } = getModelCoefficients(
    features.team,
    'offense'
  );

  // Get defense model (predicts runs allowed)
  const { coefficients: defenseCoeffs, isGlobal: defenseGlobal } = getModelCoefficients(
    features.team,
    'defense'
  );

  const offenseFeatures = buildOffenseFeatures(features);
  const defenseFeatures = buildDefenseFeatures(features);

  const predictedRunsScored = predict(offenseCoeffs, offenseFeatures);
  const predictedRunsAllowed = predict(defenseCoeffs, defenseFeatures);

  return {
    team: features.team,
    predictedRunsScored: Math.round(predictedRunsScored * 10) / 10,
    predictedRunsAllowed: Math.round(predictedRunsAllowed * 10) / 10,
    usedGlobalModel: offenseGlobal || defenseGlobal,
  };
}

/**
 * Calculate win probability using predicted runs.
 *
 * Uses a simple model based on expected run differential and
 * assumes runs follow a Poisson-like distribution.
 */
function calculateWinProbability(
  teamAExpectedRuns: number,
  teamBExpectedRuns: number
): number {
  // Simple approach: use logistic function on run differential
  // More sophisticated would use Poisson simulation

  const runDiff = teamAExpectedRuns - teamBExpectedRuns;

  // Logistic function: P(A wins) = 1 / (1 + e^(-k * runDiff))
  // k calibrated so that 1 run advantage ≈ 60% win prob
  const k = 0.35;
  const prob = 1 / (1 + Math.exp(-k * runDiff));

  return Math.max(0.01, Math.min(0.99, prob));
}

/**
 * Predict full game outcome for both teams.
 */
export function predictGame(
  teamAFeatures: GameFeatures,
  teamBFeatures: GameFeatures
): GamePrediction {
  const teamAPrediction = predictTeamScore(teamAFeatures);
  const teamBPrediction = predictTeamScore(teamBFeatures);

  // Expected runs for each team considers both their offense and opponent's defense
  // Average the predictions from different perspectives
  const teamAExpectedRuns =
    (teamAPrediction.predictedRunsScored + teamBPrediction.predictedRunsAllowed) / 2;
  const teamBExpectedRuns =
    (teamBPrediction.predictedRunsScored + teamAPrediction.predictedRunsAllowed) / 2;

  const teamAWinProb = calculateWinProbability(teamAExpectedRuns, teamBExpectedRuns);

  return {
    teamA: {
      ...teamAPrediction,
      predictedRunsScored: Math.round(teamAExpectedRuns * 10) / 10,
    },
    teamB: {
      ...teamBPrediction,
      predictedRunsScored: Math.round(teamBExpectedRuns * 10) / 10,
    },
    teamAWinProb: Math.round(teamAWinProb * 1000) / 1000,
    teamBWinProb: Math.round((1 - teamAWinProb) * 1000) / 1000,
    expectedTotalRuns: Math.round((teamAExpectedRuns + teamBExpectedRuns) * 10) / 10,
    spreadA: Math.round((teamAExpectedRuns - teamBExpectedRuns) * 10) / 10,
  };
}

/**
 * Convert model win probability to implied moneyline odds.
 */
export function probToMoneyline(prob: number): number {
  if (prob >= 0.5) {
    // Favorite: negative odds
    return Math.round((-100 * prob) / (1 - prob));
  } else {
    // Underdog: positive odds
    return Math.round((100 * (1 - prob)) / prob);
  }
}

/**
 * Calculate betting edge given model probability and market odds.
 */
export function calculateEdge(modelProb: number, marketMoneyline: number): number {
  // Convert market odds to implied probability
  let impliedProb: number;
  if (marketMoneyline > 0) {
    impliedProb = 100 / (marketMoneyline + 100);
  } else {
    impliedProb = Math.abs(marketMoneyline) / (Math.abs(marketMoneyline) + 100);
  }

  // Edge = Model probability - Implied probability
  return modelProb - impliedProb;
}

/**
 * Check if coefficients are loaded.
 */
export function isModelLoaded(): boolean {
  return coefficientsData !== null;
}

/**
 * Get model info for debugging/display.
 */
export function getModelInfo(): {
  loaded: boolean;
  teamsWithModels: number;
  generatedAt: string | null;
} {
  if (!coefficientsData) {
    return {
      loaded: false,
      teamsWithModels: 0,
      generatedAt: null,
    };
  }

  return {
    loaded: true,
    teamsWithModels: coefficientsData.model_info.teams_with_models,
    generatedAt: coefficientsData.generated_at,
  };
}
