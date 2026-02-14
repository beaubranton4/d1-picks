/**
 * Types for D1 Picks - mirrored from src/lib/types.ts
 * These are the types needed for video generation
 */

export type PickLabel = 'D1 PICK' | 'SMART BET' | 'LEAN' | 'PASS';

export interface ManualPick {
  id: string;
  team: string;
  opponent: string;
  moneyline: number;
  sportsbook: string;
  pickLabel: PickLabel;
  units: number;
  analysis: string;
}

export interface DailyPicks {
  date: string;
  picks: ManualPick[];
}
