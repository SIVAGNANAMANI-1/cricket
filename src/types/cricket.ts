// ============================================================
// CRICKET TYPES — The Third Umpire
// ============================================================

export type MatchFormat = 'T20' | 'ODI' | 'Test' | 'Custom';
export type PitchType = 'Flat' | 'Green' | 'Dusty' | 'Sticky' | 'Bouncy';
export type DismissalType =
  | 'bowled' | 'caught' | 'lbw' | 'run_out' | 'stumped'
  | 'hit_wicket' | 'retired_hurt' | 'retired_out' | 'timed_out'
  | 'obstructing_field' | 'handled_ball';
export type DeliveryType = 'legal' | 'wide' | 'no_ball' | 'bye' | 'leg_bye' | 'dead_ball';
export type InningsPhase = 'powerplay' | 'middle' | 'death';
export type ReviewDecision = 'out' | 'not_out' | 'umpires_call' | 'pending';

export interface Player {
  id: string;
  name: string;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  isWicketKeeper?: boolean;
  isOut?: boolean;
  hasBatted?: boolean;
  // Batting
  runsScored: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  // Bowling
  oversBowled: number;
  runsConceded: number;
  wicketsTaken: number;
  maidens: number;
  dotBalls: number;
  // Dismissal info
  outType?: DismissalType | null;
  outBowler?: string | null;
  outFielder?: string | null;
  fowRuns?: number;
  fowOvers?: number;
  // Career (optional)
  battingAverage?: number;
  highestScore?: number;
  totalRuns?: number;
  bowlingAverage?: number;
  bestBowling?: string;
}

export interface Partnership {
  batter1: string;
  batter2: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
}

export interface Delivery {
  id: string;
  overNumber: number;       // 0-indexed
  ballInOver: number;       // 1-6 (legal only) or 0 for illegals
  ballNumber: number;       // total legal balls
  deliveryType: DeliveryType;
  runs: number;             // total runs (bat + extras)
  batRuns: number;          // runs off the bat
  extraRuns: number;        // penalty/extras only
  isWicket: boolean;
  dismissalType?: DismissalType | null;
  dismissedPlayer?: string | null;
  fielder?: string | null;
  striker: string;
  nonStriker: string;
  bowler: string;
  isFreeHit: boolean;
  commentary: string;
  timestamp: number;
  battingTeam: string;
  // Score snapshot after this ball
  scoreAfter: { runs: number; wickets: number; balls: number; overs: number };
}

export interface Over {
  overNumber: number;
  bowler: string;
  deliveries: Delivery[];
  runs: number;
  wickets: number;
  maidens: boolean;
}

export interface Innings {
  inningsNumber: 1 | 2;
  battingTeam: string;
  bowlingTeam: string;
  runs: number;
  wickets: number;
  balls: number;
  overs: number;
  extras: { wides: number; noBalls: number; byes: number; legByes: number; penalty: number };
  deliveries: Delivery[];
  partnerships: Partnership[];
  fallOfWickets: { wicket: number; runs: number; overs: number; player: string }[];
  isCompleted: boolean;
  target?: number;
}

export interface DRSReview {
  id: string;
  reviewingTeam: string;
  over: string;
  appealsFor: DismissalType;
  decision: ReviewDecision;
  timestamp: number;
  ultraEdge?: boolean;
  ballTracking?: boolean;
  hotspot?: boolean;
}

export interface MatchData {
  publicCode: string;
  umpireKey: string;
  // Match Info
  matchName?: string;
  tournamentName?: string;
  format: MatchFormat;
  venue?: string;
  city?: string;
  date?: string;
  time?: string;
  pitchType?: PitchType;
  // Teams
  teamA: string;
  teamB: string;
  teamSize: number;
  overs: number;
  maxOversPerBowler: number;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  // Toss
  tossWinner: string;
  tossDecision: 'bat' | 'bowl';
  // Match state
  status: 'pending' | 'live' | 'innings_break' | 'completed';
  currentInnings: 1 | 2;
  battingTeam: string;
  bowlingTeam: string;
  score: { runs: number; wickets: number; balls: number; overs: number };
  innings1Score: number | null;
  matchResult: string | null;
  // Live state
  striker: Player | null;
  nonStriker: Player | null;
  currentBowler: Player | null;
  isFreeHit: boolean;
  allPlayers: Player[];
  ballHistory: Delivery[];
  recentBalls: string[];
  bowlerOvers: Record<string, number>;
  currentOverRuns: number;
  currentOverBalls: number;
  totalDotBalls: number;
  totalFours: number;
  totalSixes: number;
  partnershipStartScore: { runs: number; balls: number };
  reviews: DRSReview[];
  reviewsTeamA: number;
  reviewsTeamB: number;
  activeReview?: {
    id: string;
    reviewingTeam: string;
    over: string;
    appealsFor: DismissalType;
    status: 'pending' | 'ultra_edge' | 'hotspot' | 'ball_tracking' | 'decision';
    ultraEdgeResult?: 'spike' | 'flat';
    hotspotResult?: 'spot' | 'clean';
    ballTrackingResult?: 'hitting' | 'missing' | 'umpires_call';
    onFieldCall: 'out' | 'not_out';
  } | null;
  // Meta
  createdAt: number;
  creatorId: string;
}

export interface ScoreState {
  runs: number;
  wickets: number;
  balls: number;
  overs: number;
}
