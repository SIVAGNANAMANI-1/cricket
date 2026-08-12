// ============================================================
// CRICKET ENGINE — The Third Umpire
// Centralized cricket logic. No UI. No state. Pure functions.
// ============================================================

import type { Delivery, DismissalType, DeliveryType, InningsPhase, Player, MatchData, DRSReview } from '@/types/cricket';

// ─── Over / Ball formatting ───────────────────────────────────────────────────

/** Convert total legal balls to overs string: e.g. 7 → "1.1" */
export const ballsToOvers = (balls: number): string => {
  const o = Math.floor(balls / 6);
  const b = balls % 6;
  return b === 0 ? `${o}.0` : `${o}.${b}`;
};

/** Convert total legal balls to numeric overs: e.g. 7 → 1.1 */
export const ballsToOversNum = (balls: number): number => {
  return Math.floor(balls / 6) + (balls % 6) / 10;
};

/** Convert overs string "1.4" to total balls */
export const oversToBalls = (overs: number): number => {
  return Math.floor(overs) * 6 + Math.round((overs % 1) * 10);
};

// ─── Current Run Rate ─────────────────────────────────────────────────────────

export const currentRunRate = (runs: number, balls: number): number => {
  if (balls === 0) return 0;
  return (runs / balls) * 6;
};

// ─── Required Run Rate ───────────────────────────────────────────────────────

export const requiredRunRate = (
  runsNeeded: number,
  ballsRemaining: number
): number => {
  if (ballsRemaining <= 0) return 999;
  return (runsNeeded / ballsRemaining) * 6;
};

// ─── Projected Score ──────────────────────────────────────────────────────────

export const projectedScore = (runs: number, balls: number, totalBalls: number): number => {
  if (balls === 0) return 0;
  return Math.round((runs / balls) * totalBalls);
};

// ─── Innings Phase ────────────────────────────────────────────────────────────

export const getInningsPhase = (
  balls: number,
  format: string,
  totalOvers: number
): InningsPhase => {
  const over = Math.floor(balls / 6);
  if (format === 'T20') {
    if (over < 6) return 'powerplay';
    if (over < 15) return 'middle';
    return 'death';
  }
  if (format === 'ODI') {
    if (over < 10) return 'powerplay';
    if (over < 40) return 'middle';
    return 'death';
  }
  const pp = Math.floor(totalOvers * 0.2);
  const death = Math.floor(totalOvers * 0.8);
  if (over < pp) return 'powerplay';
  if (over < death) return 'middle';
  return 'death';
};

// ─── Strike Rotation ─────────────────────────────────────────────────────────
export const shouldSwapStrike = (
  runs: number,
  isLegalBall: boolean,
  isEndOfOver: boolean
): boolean => {
  if (isEndOfOver) return runs % 2 === 0;
  if (isLegalBall) return runs % 2 !== 0;
  return runs % 2 !== 0;
};

// ─── Run Out Strike Logic ─────────────────────────────────────────────────────
export const runOutStrikeAfter = (
  completedRuns: number,
  dismissedWasStriker: boolean,
  isEndOfOver: boolean
): 'new_batter_faces' | 'survivor_faces' => {
  const crossed = completedRuns % 2 !== 0;
  let survivorAtStrikerEnd: boolean;

  if (dismissedWasStriker) {
    survivorAtStrikerEnd = crossed;
  } else {
    survivorAtStrikerEnd = !crossed;
  }

  if (isEndOfOver) survivorAtStrikerEnd = !survivorAtStrikerEnd;
  return survivorAtStrikerEnd ? 'survivor_faces' : 'new_batter_faces';
};

// ─── Caught: Did they cross? ──────────────────────────────────────────────────
export const caughtStrikeAfter = (
  crossed: boolean,
  isEndOfOver: boolean
): 'non_striker_faces' | 'new_batter_faces' => {
  let nonStrikerAtStrikerEnd = crossed;
  if (isEndOfOver) nonStrikerAtStrikerEnd = !nonStrikerAtStrikerEnd;
  return nonStrikerAtStrikerEnd ? 'non_striker_faces' : 'new_batter_faces';
};

// ─── Commentary Generator ─────────────────────────────────────────────────────

export const generateCommentary = (delivery: Omit<Delivery, 'commentary' | 'id' | 'timestamp' | 'scoreAfter'>): string => {
  const { bowler, striker, deliveryType, runs, batRuns, isWicket, dismissalType, fielder, isFreeHit } = delivery;

  const freeHitPrefix = isFreeHit ? '🔒 FREE HIT! ' : '';

  if (isWicket) {
    switch (dismissalType) {
      case 'bowled':
        return `${freeHitPrefix}OUT! ${bowler} bowls ${striker} — timber! The stumps are shattered!`;
      case 'caught':
        return `${freeHitPrefix}OUT! Caught${fielder ? ` by ${fielder}` : ''} off ${bowler}! ${striker} departs.`;
      case 'lbw':
        return `${freeHitPrefix}OUT! LBW! ${bowler} traps ${striker} in front — plumb!`;
      case 'run_out':
        return `RUN OUT! ${striker} is run out${fielder ? ` — brilliant fielding by ${fielder}` : ''}! ${runs > 0 ? `${runs} run${runs > 1 ? 's' : ''} completed.` : 'No runs.'}`;
      case 'stumped':
        return `${freeHitPrefix}OUT! Stumped! ${striker} is out of the crease, the keeper does the rest off ${bowler}.`;
      case 'hit_wicket':
        return `OUT! Hit wicket! ${striker} disturbs the stumps — unfortunate dismissal!`;
      case 'retired_hurt':
        return `${striker} retires hurt. We hope for a speedy recovery.`;
      case 'retired_out':
        return `${striker} retires out. Tactical decision by the team.`;
      case 'timed_out':
        return `${striker} is timed out. Failed to reach the crease within the official time limit.`;
      default:
        return `OUT! ${striker} is dismissed — ${dismissalType?.replace('_', ' ')}.`;
    }
  }

  if (deliveryType === 'wide') {
    return `Wide ball from ${bowler}. ${runs > 1 ? `${runs - 1} extra run${runs - 1 > 1 ? 's' : ''} completed.` : 'One extra added.'}`;
  }

  if (deliveryType === 'no_ball') {
    return `No Ball from ${bowler}! ${batRuns > 0 ? `${striker} hits it for ${batRuns}.` : 'One extra.'}${runs > 1 ? ` ${runs} total.` : ''} FREE HIT next ball!`;
  }

  if (deliveryType === 'bye') {
    return `Byes! ${runs} bye${runs > 1 ? 's' : ''} — the ball sneaks past everyone.`;
  }

  if (deliveryType === 'leg_bye') {
    return `Leg bye! ${runs} leg bye${runs > 1 ? 's' : ''} off ${bowler}.`;
  }

  if (runs === 0) return `Dot ball. ${bowler} to ${striker} — well bowled, no run.`;
  if (runs === 1) return `${freeHitPrefix}Single. ${striker} rotates the strike off ${bowler}.`;
  if (runs === 2) return `${freeHitPrefix}Two! Good running between the wickets from ${striker}.`;
  if (runs === 3) return `${freeHitPrefix}Three runs! Excellent placement by ${striker} off ${bowler}.`;
  if (runs === 4) return `${freeHitPrefix}FOUR! 🏏 ${striker} finds the gap and races to the boundary off ${bowler}!`;
  if (runs === 5) return `${freeHitPrefix}Five! Penalty runs added.`;
  if (runs === 6) return `${freeHitPrefix}SIX! 🚀 ${striker} sends ${bowler} into the stands — massive hit!`;
  return `${striker} scores ${runs} off ${bowler}.`;
};

// ─── Max Overs Per Bowler ─────────────────────────────────────────────────────

export const maxOversPerBowler = (totalOvers: number, teamSize: number): number => {
  const eligibleBowlers = Math.max(1, teamSize - 1); // exclude WK
  return Math.ceil(totalOvers / eligibleBowlers);
};

// ─── Win Probability (Duckworth-Lewis inspired) ───────────────────────

export const winProbability = (
  runsNeeded: number,
  ballsRemaining: number,
  wicketsRemaining: number
): number => {
  if (runsNeeded <= 0) return 100;
  if (ballsRemaining <= 0 || wicketsRemaining <= 0) return 0;

  const rrr = (runsNeeded / ballsRemaining) * 6;
  const resource = (wicketsRemaining / 10) * (ballsRemaining / (ballsRemaining + 5));

  const factor = resource / (rrr / 6 + 0.01);
  const prob = Math.min(95, Math.max(5, factor * 50));
  return Math.round(prob);
};

// ─── Partnership Stats ────────────────────────────────────────────────────────

export const calculatePartnership = (
  ballHistory: any[],
  partnershipStartBall: number
): { runs: number; balls: number; fours: number; sixes: number } => {
  const relevant = ballHistory.slice(partnershipStartBall);
  let runs = 0, balls = 0, fours = 0, sixes = 0;
  for (const ball of relevant) {
    runs += ball.runs || 0;
    if (ball.type !== 'extra' || (ball.extraType !== 'wd' && ball.extraType !== 'nb')) balls++;
    if (ball.runs === 4 && ball.type === 'runs') fours++;
    if (ball.runs === 6 && ball.type === 'runs') sixes++;
  }
  return { runs, balls, fours, sixes };
};

// ─── Extras breakdown from ball history ──────────────────────────────────────

export const calculateExtras = (ballHistory: any[]): {
  wides: number; noBalls: number; byes: number; legByes: number; total: number;
} => {
  let wides = 0, noBalls = 0, byes = 0, legByes = 0;
  for (const ball of ballHistory) {
    if (ball.type !== 'extra') continue;
    if (ball.extraType === 'wd') wides += ball.runs;
    if (ball.extraType === 'nb') noBalls += ball.runs;
    if (ball.extraType === 'b') byes += ball.runs;
    if (ball.extraType === 'lb') legByes += ball.runs;
  }
  return { wides, noBalls, byes, legByes, total: wides + noBalls + byes + legByes };
};

// ─── Centralized Cricket State Engine (Pure Function) ────────────────────────

export interface DeliveryInput {
  deliveryType: DeliveryType;
  batRuns: number;          // runs scored off bat
  extraRuns: number;        // runs scored via extras (wides, noballs, byes, legbyes)
  isWicket: boolean;
  dismissalType?: DismissalType | null;
  dismissedPlayerName?: string | null;
  fielderName?: string | null;
  roRuns?: number;          // completed runs for runout
  crossed?: boolean;        // caught crossed?
  isNoBallWicket?: boolean; // run out on no ball
}

export const processDelivery = (
  state: MatchData,
  input: DeliveryInput
): { updatedState: MatchData; statusChange: 'none' | 'new_batsman' | 'new_bowler' | 'innings_break' | 'match_end' } => {
  // Deep clone state to ensure pure state transition
  const match = JSON.parse(JSON.stringify(state)) as MatchData;

  const strikerName = match.striker?.name;
  const nonStrikerName = match.nonStriker?.name;
  const bowlerName = match.currentBowler?.name;

  if (!strikerName || !nonStrikerName || !bowlerName) {
    return { updatedState: match, statusChange: 'none' };
  }

  const prevScore = { ...match.score };
  const prevIsFreeHit = match.isFreeHit;

  const isLegal = input.deliveryType !== 'wide' && input.deliveryType !== 'no_ball';
  const isWicket = input.isWicket;
  const isRunOut = isWicket && input.dismissalType === 'run_out';

  // 1. Calculate Score Increments
  let ballRuns = 0;
  let batRuns = 0;
  let extraRuns = 0;
  let isWide = input.deliveryType === 'wide';
  let isNoBall = input.deliveryType === 'no_ball';

  if (isRunOut) {
    const completed = input.roRuns || 0;
    if (isWide) {
      extraRuns = 1 + completed;
      ballRuns = extraRuns;
    } else if (isNoBall) {
      extraRuns = 1;
      batRuns = input.batRuns || 0;
      ballRuns = extraRuns + batRuns;
    } else if (input.deliveryType === 'bye' || input.deliveryType === 'leg_bye') {
      extraRuns = completed;
      ballRuns = extraRuns;
    } else {
      batRuns = completed;
      ballRuns = batRuns;
    }
  } else if (isWicket) {
    if (isWide) {
      extraRuns = 1;
      ballRuns = 1;
    } else if (isNoBall) {
      extraRuns = 1;
      ballRuns = 1;
    } else {
      ballRuns = 0;
    }
  } else {
    // Normal / Extras
    if (isWide) {
      extraRuns = input.extraRuns;
      ballRuns = extraRuns;
    } else if (isNoBall) {
      extraRuns = 1;
      batRuns = input.batRuns;
      ballRuns = extraRuns + batRuns;
    } else if (input.deliveryType === 'bye' || input.deliveryType === 'leg_bye') {
      extraRuns = input.extraRuns;
      ballRuns = extraRuns;
    } else {
      // Legal normal runs
      batRuns = input.batRuns;
      ballRuns = batRuns;
    }
  }

  // Update Score runs & wickets
  const newRuns = prevScore.runs + ballRuns;
  const newWickets = prevScore.wickets + (isWicket ? 1 : 0);
  const newBalls = prevScore.balls + (isLegal ? 1 : 0);
  const newOvers = Math.floor(newBalls / 6) + (newBalls % 6) / 10;

  match.score = { runs: newRuns, wickets: newWickets, balls: newBalls, overs: newOvers };

  // 2. Set Free Hit State
  if (isNoBall) {
    match.isFreeHit = true;
  } else if (isLegal) {
    match.isFreeHit = false;
  }

  // 3. Update Player Statistics (allPlayers array)
  match.allPlayers = match.allPlayers.map((p) => {
    const updated = { ...p };
    // Striker Batting Stats
    if (p.name === strikerName) {
      updated.ballsFaced = (p.ballsFaced || 0) + 1;
      if (input.deliveryType === 'legal' || (isNoBall && !isRunOut)) {
        updated.runsScored = (p.runsScored || 0) + batRuns;
        if (batRuns === 4) {
          updated.fours = (p.fours || 0) + 1;
          match.totalFours = (match.totalFours || 0) + 1;
        } else if (batRuns === 6) {
          updated.sixes = (p.sixes || 0) + 1;
          match.totalSixes = (match.totalSixes || 0) + 1;
        }
      }
      if (isRunOut && input.dismissedPlayerName === strikerName) {
        updated.runsScored = (p.runsScored || 0) + batRuns;
        if (batRuns === 4) updated.fours = (p.fours || 0) + 1;
        else if (batRuns === 6) updated.sixes = (p.sixes || 0) + 1;
      }
      updated.hasBatted = true;
    }

    // Non Striker Batting Stats (in case they got out in runout)
    if (p.name === nonStrikerName) {
      updated.hasBatted = true;
    }

    // Bowler Bowling Stats
    if (p.name === bowlerName) {
      // Concede runs (wides + noballs + bat runs; byes/leg-byes do NOT count against bowler)
      if (input.deliveryType !== 'bye' && input.deliveryType !== 'leg_bye') {
        updated.runsConceded = (p.runsConceded || 0) + ballRuns;
      }
      if (ballRuns === 0) {
        updated.dotBalls = (p.dotBalls || 0) + 1;
        match.totalDotBalls = (match.totalDotBalls || 0) + 1;
      }
      // Wicket details
      if (isWicket && !isRunOut && input.dismissalType !== 'retired_hurt' && input.dismissalType !== 'retired_out') {
        updated.wicketsTaken = (p.wicketsTaken || 0) + 1;
      }
    }

    // Dismissal Details
    if (isWicket) {
      if (p.name === input.dismissedPlayerName) {
        updated.isOut = true;
        updated.outType = input.dismissalType;
        updated.outBowler = !isRunOut ? bowlerName : null;
        updated.outFielder = input.fielderName || null;
        updated.fowRuns = newRuns;
        updated.fowOvers = newOvers;
      }
    }

    return updated;
  });

  // 4. Over Transition (reset counter, maidens, etc.)
  const isEndOfOver = isLegal && (newBalls % 6 === 0);
  match.currentOverRuns = match.currentOverRuns + ballRuns;
  if (isLegal) {
    match.currentOverBalls = match.currentOverBalls + 1;
  }

  // 5. Strike Rotation Logic
  let nextStriker = strikerName;
  let nextNonStriker = nonStrikerName;

  if (isWicket) {
    const victim = input.dismissedPlayerName;
    const isStrikerOut = victim === strikerName;

    // Remaining survivor batter
    const survivor = isStrikerOut ? nonStrikerName : strikerName;

    if (isRunOut) {
      const completed = input.roRuns || 0;
      const crossed = completed % 2 !== 0;

      // If striker got out and crossed -> survivor goes to striker's end
      // If non-striker got out and crossed -> striker remains at striker's end
      const survivorAtStrikerEnd = isStrikerOut ? crossed : !crossed;
      nextStriker = survivorAtStrikerEnd ? survivor : null;
      nextNonStriker = survivorAtStrikerEnd ? null : survivor;
    } else if (input.dismissalType === 'caught') {
      // Caught crossing rule
      const crossed = input.crossed || false;
      nextStriker = crossed ? survivor : null;
      nextNonStriker = crossed ? null : survivor;
    } else {
      // Bowled, LBW, Stumped, etc. -> new batsman occupies striker's end
      nextStriker = null;
      nextNonStriker = survivor;
    }
  } else {
    // Normal strike rotation
    let rotationRuns = 0;
    if (isWide) {
      rotationRuns = ballRuns - 1; // runs completed by batsmen running
    } else if (isNoBall) {
      rotationRuns = batRuns;
    } else if (input.deliveryType === 'bye' || input.deliveryType === 'leg_bye') {
      rotationRuns = extraRuns;
    } else {
      rotationRuns = batRuns;
    }

    const swap = rotationRuns % 2 !== 0;
    if (swap) {
      nextStriker = nonStrikerName;
      nextNonStriker = strikerName;
    }
  }

  // End of Over Swap (flips striker and non-striker for next over)
  if (isEndOfOver) {
    const temp = nextStriker;
    nextStriker = nextNonStriker;
    nextNonStriker = temp;
  }

  // Re-map back to player objects
  match.striker = match.allPlayers.find((p) => p.name === nextStriker) || null;
  match.nonStriker = match.allPlayers.find((p) => p.name === nextNonStriker) || null;

  // 6. Generate Commentary
  const deliveryData: Delivery = {
    id: Math.random().toString(36).substring(2, 8).toUpperCase(),
    overNumber: Math.floor((newBalls - (isLegal ? 1 : 0)) / 6),
    ballInOver: isLegal ? (newBalls % 6 === 0 ? 6 : newBalls % 6) : 0,
    ballNumber: newBalls,
    deliveryType: input.deliveryType,
    runs: ballRuns,
    batRuns: batRuns,
    extraRuns: extraRuns,
    isWicket: isWicket,
    dismissalType: input.dismissalType || null,
    dismissedPlayer: input.dismissedPlayerName || null,
    fielder: input.fielderName || null,
    striker: strikerName,
    nonStriker: nonStrikerName,
    bowler: bowlerName,
    isFreeHit: prevIsFreeHit,
    timestamp: Date.now(),
    battingTeam: match.battingTeam,
    commentary: '',
    scoreAfter: { runs: newRuns, wickets: newWickets, balls: newBalls, overs: newOvers }
  };

  deliveryData.commentary = generateCommentary(deliveryData);
  match.ballHistory.push(deliveryData);

  // Push to recent balls display list
  let ballDisplayStr = '';
  if (isWicket) {
    if (isRunOut) {
      ballDisplayStr = input.roRuns && input.roRuns > 0 ? `${input.roRuns}R/W` : 'W(RO)';
    } else {
      ballDisplayStr = 'W';
    }
  } else if (isWide) {
    ballDisplayStr = ballRuns > 1 ? `Wd+${ballRuns - 1}` : 'Wd';
  } else if (isNoBall) {
    ballDisplayStr = batRuns > 0 ? `NB+${batRuns}` : 'NB';
  } else if (input.deliveryType === 'bye' || input.deliveryType === 'leg_bye') {
    ballDisplayStr = `${ballRuns}${input.deliveryType === 'bye' ? 'b' : 'lb'}`;
  } else {
    ballDisplayStr = ballRuns.toString();
  }

  match.recentBalls.push(ballDisplayStr);
  if (isEndOfOver) {
    match.recentBalls.push('|');
  }
  match.recentBalls = match.recentBalls.slice(-14);

  // 7. Complete Over Logic
  if (isEndOfOver) {
    match.bowlerOvers = {
      ...match.bowlerOvers,
      [bowlerName]: (match.bowlerOvers[bowlerName] || 0) + 1
    };

    match.allPlayers = match.allPlayers.map(p => {
      if (p.name === bowlerName) {
        const isMaiden = match.currentOverRuns === 0;
        return {
          ...p,
          oversBowled: (p.oversBowled || 0) + 1,
          maidens: (p.maidens || 0) + (isMaiden ? 1 : 0)
        };
      }
      return p;
    });

    match.lastBowler = match.currentBowler;
    match.currentBowler = null;
    match.currentOverRuns = 0;
    match.currentOverBalls = 0;
  }

  // 8. Innings & Game Transitions Check
  const teamSize = match.teamSize || 11;
  const battingPlayers = match.allPlayers.filter(p =>
    match.battingTeam === match.teamA
      ? match.teamAPlayers.some((tp: any) => tp.name === p.name)
      : match.teamBPlayers.some((tp: any) => tp.name === p.name)
  );

  const playersRemaining = battingPlayers.filter(p => !p.isOut).length;
  const allOut = newWickets >= teamSize - 1 || playersRemaining <= 1;
  const oversUp = newOvers >= match.overs;

  let statusChange: 'none' | 'new_batsman' | 'new_bowler' | 'innings_break' | 'match_end' = 'none';

  if (match.currentInnings === 2 && match.innings1Score !== null) {
    const target = match.innings1Score + 1;
    if (newRuns >= target) {
      const wicketsRemaining = (teamSize - 1) - newWickets;
      const totalMatchBalls = match.overs * 6;
      const ballsRemaining = Math.max(0, totalMatchBalls - newBalls);
      match.matchResult = `${match.battingTeam} won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''} with ${ballsRemaining} ball${ballsRemaining !== 1 ? 's' : ''} remaining.`;
      match.status = 'completed';
      statusChange = 'match_end';
      return { updatedState: match, statusChange };
    }
  }

  if (allOut || oversUp) {
    if (match.currentInnings === 1) {
      match.innings1Score = newRuns;
      match.status = 'innings_break';
      statusChange = 'innings_break';
    } else {
      const i1 = match.innings1Score || 0;
      if (newRuns > i1) {
        const wr = (teamSize - 1) - newWickets;
        match.matchResult = `${match.battingTeam} won by ${wr} wicket${wr !== 1 ? 's' : ''}!`;
      } else if (newRuns === i1) {
        match.matchResult = `Match Tied! Scores level at ${i1}.`;
      } else {
        match.matchResult = `${match.bowlingTeam} won by ${i1 - newRuns} run${i1 - newRuns !== 1 ? 's' : ''}!`;
      }
      match.status = 'completed';
      statusChange = 'match_end';
    }
  } else {
    // If not end of innings
    if (isWicket) {
      statusChange = 'new_batsman';
    } else if (isEndOfOver) {
      statusChange = 'new_bowler';
    }
  }

  return { updatedState: match, statusChange };
};
