import { Matchup } from "@/types/cricket";

export interface ScheduledMatch {
  matchNumber: number;
  teamA: string;
  teamB: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:MM
  status: "scheduled" | "live" | "completed";
}

export interface SchedulingConfig {
  teams: string[];
  matchesPerTeam: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  maxMatchesPerDay: number;
  allowDoubleHeaders: boolean;
  minRestDays: number;
  firstMatchStartTime: string; // HH:MM
  matchDurationHours: number;
  breakDurationMinutes: number;
  finalDate: string; // YYYY-MM-DD
  playoffs: "league_only" | "league_playoffs" | "league_semis_final";
}

export interface SchedulingResult {
  success: boolean;
  schedule?: ScheduledMatch[];
  error?: string;
  suggestedEndDate?: string;
  stats?: {
    totalFixtures: number;
    requiredDays: number;
    availableDays: number;
  };
}

export const formatDateString = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

export const parseDateString = (str: string): Date => {
  const [year, month, day] = str.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const getDatesInRange = (startDateStr: string, endDateStr: string): string[] => {
  const dates: string[] = [];
  const start = parseDateString(startDateStr);
  const end = parseDateString(endDateStr);
  
  const current = new Date(start);
  while (current <= end) {
    dates.push(formatDateString(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

export const generateMatchups = (teams: string[], matchesPerTeam: number): { teamA: string; teamB: string }[] => {
  const N = teams.length;
  if (N < 2) return [];

  const matchups: { teamA: string; teamB: string }[] = [];

  if (N % 2 === 0) {
    const active = [...teams];
    const factors: { teamA: string; teamB: string }[][] = [];
    
    for (let r = 0; r < N - 1; r++) {
      const factor: { teamA: string; teamB: string }[] = [];
      for (let i = 0; i < N / 2; i++) {
        factor.push({ teamA: active[i], teamB: active[N - 1 - i] });
      }
      factors.push(factor);
      
      const temp = active[N - 1];
      for (let j = N - 1; j > 1; j--) {
        active[j] = active[j - 1];
      }
      active[1] = temp;
    }

    for (let f = 0; f < matchesPerTeam; f++) {
      matchups.push(...factors[f % (N - 1)]);
    }
  } else {
    const cycles: { teamA: string; teamB: string }[][] = [];
    const numCycles = (N - 1) / 2;

    for (let d = 1; d <= numCycles; d++) {
      const cycle: { teamA: string; teamB: string }[] = [];
      for (let i = 0; i < N; i++) {
        cycle.push({ teamA: teams[i], teamB: teams[(i + d) % N] });
      }
      cycles.push(cycle);
    }

    const k = matchesPerTeam / 2;
    for (let c = 0; c < k; c++) {
      matchups.push(...cycles[c % numCycles]);
    }
  }

  return matchups;
};

export const calculateTimeSlots = (
  startTime: string,
  durationHours: number,
  breakMinutes: number,
  limit: number
): string[] => {
  const slots: string[] = [];
  const [startHour, startMin] = startTime.split(":").map(Number);
  
  let currentMinutes = startHour * 60 + startMin;
  const matchLengthMinutes = durationHours * 60;

  for (let i = 0; i < limit; i++) {
    const hours = Math.floor(currentMinutes / 60) % 24;
    const mins = currentMinutes % 60;
    const formattedTime = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    slots.push(formattedTime);
    currentMinutes += matchLengthMinutes + breakMinutes;
  }

  return slots;
};

// Internal solver trying to fit matchups into days and slots
const attemptSchedule = (
  matchups: { teamA: string; teamB: string }[],
  availableDates: string[],
  timeSlots: string[],
  allowDoubleHeaders: boolean,
  minRestDays: number,
  useEvenDistribution: boolean,
  totalFixturesCount: number
): ScheduledMatch[] | null => {
  const lastPlayed: Record<string, string> = {};
  const dailyAppearances: Record<string, Set<string>> = {};
  const schedule: ScheduledMatch[] = [];
  const remaining = [...matchups];

  // Distribute matchups target per day
  const numDays = availableDates.length;
  const baseMatchesPerDay = Math.floor(totalFixturesCount / numDays);
  let extraMatches = totalFixturesCount % numDays;

  const targetDailyMatches: Record<string, number> = {};
  availableDates.forEach((date, idx) => {
    let addExtra = false;
    if (extraMatches > 0) {
      const spacing = numDays / extraMatches;
      if (Math.floor(idx % spacing) === 0) {
        addExtra = true;
        extraMatches--;
      }
    }
    // Limit to max daily time slots
    targetDailyMatches[date] = Math.min(timeSlots.length, baseMatchesPerDay + (addExtra ? 1 : 0));
  });

  let matchNumber = 1;

  for (const date of availableDates) {
    if (remaining.length === 0) break;
    if (!dailyAppearances[date]) dailyAppearances[date] = new Set();

    // Determine target size for this day
    const dayTargetCount = useEvenDistribution ? targetDailyMatches[date] : timeSlots.length;
    const dayTimeSlots = timeSlots.slice(0, dayTargetCount);

    for (const time of dayTimeSlots) {
      if (remaining.length === 0) break;

      let foundIndex = -1;
      for (let i = 0; i < remaining.length; i++) {
        const { teamA, teamB } = remaining[i];

        if (!allowDoubleHeaders) {
          if (dailyAppearances[date].has(teamA) || dailyAppearances[date].has(teamB)) {
            continue;
          }
        }

        if (minRestDays > 0) {
          const lastA = lastPlayed[teamA];
          const lastB = lastPlayed[teamB];

          if (lastA) {
            const daysSinceA = (parseDateString(date).getTime() - parseDateString(lastA).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceA <= minRestDays) continue;
          }
          if (lastB) {
            const daysSinceB = (parseDateString(date).getTime() - parseDateString(lastB).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceB <= minRestDays) continue;
          }
        }

        foundIndex = i;
        break;
      }

      // If rest constraints are too tight, retry without rest constraints for this slot
      if (foundIndex === -1 && minRestDays > 0) {
        for (let i = 0; i < remaining.length; i++) {
          const { teamA, teamB } = remaining[i];
          if (!allowDoubleHeaders) {
            if (dailyAppearances[date].has(teamA) || dailyAppearances[date].has(teamB)) continue;
          }
          foundIndex = i;
          break;
        }
      }

      if (foundIndex !== -1) {
        const [match] = remaining.splice(foundIndex, 1);
        schedule.push({
          matchNumber,
          teamA: match.teamA,
          teamB: match.teamB,
          scheduledDate: date,
          scheduledTime: time,
          status: "scheduled"
        });

        dailyAppearances[date].add(match.teamA);
        dailyAppearances[date].add(match.teamB);
        lastPlayed[match.teamA] = date;
        lastPlayed[match.teamB] = date;
        matchNumber++;
      }
    }
  }

  if (remaining.length > 0) return null;
  return schedule;
};

export const generateTournamentSchedule = (config: SchedulingConfig): SchedulingResult => {
  const {
    teams,
    matchesPerTeam,
    startDate,
    endDate,
    maxMatchesPerDay,
    allowDoubleHeaders,
    minRestDays,
    firstMatchStartTime,
    matchDurationHours,
    breakDurationMinutes,
    finalDate,
    playoffs
  } = config;

  const N = teams.length;
  if (N < 2) return { success: false, error: "At least 2 teams are required." };

  const totalAppearances = N * matchesPerTeam;
  if (totalAppearances % 2 !== 0) {
    return {
      success: false,
      error: `Equal scheduling is not possible with ${N} teams playing exactly ${matchesPerTeam} matches each. Total team appearances (${totalAppearances}) must be an even number. Try changing matches per team to an even number.`
    };
  }

  const totalFixturesCount = totalAppearances / 2;
  const matchups = generateMatchups(teams, matchesPerTeam);

  let availableDates = getDatesInRange(startDate, endDate);
  if (finalDate) {
    availableDates = availableDates.filter(d => d !== finalDate);
  }

  const timeSlots = calculateTimeSlots(firstMatchStartTime, matchDurationHours, breakDurationMinutes, maxMatchesPerDay);

  // Shuffle matchups to distribute them evenly
  const shuffledMatchups = [...matchups].sort(() => Math.random() - 0.5);

  // 1. Try even distribution so the schedule ends properly on the last date
  let schedule = attemptSchedule(
    shuffledMatchups,
    availableDates,
    timeSlots,
    allowDoubleHeaders,
    minRestDays,
    true, // use even distribution
    totalFixturesCount
  );

  // 2. If it fails, fallback to dense/greedy packing (to maximize chance of success)
  if (!schedule) {
    schedule = attemptSchedule(
      shuffledMatchups,
      availableDates,
      timeSlots,
      allowDoubleHeaders,
      minRestDays,
      false, // dense packing fallback
      totalFixturesCount
    );
  }

  // 3. If that still fails, relax rest constraints
  if (!schedule && minRestDays > 0) {
    schedule = attemptSchedule(
      shuffledMatchups,
      availableDates,
      timeSlots,
      allowDoubleHeaders,
      0, // relax rest days
      false,
      totalFixturesCount
    );
  }

  if (!schedule) {
    const requiredDays = Math.ceil(totalFixturesCount / maxMatchesPerDay);
    const availableDays = availableDates.length;
    const suggestedEnd = parseDateString(startDate);
    suggestedEnd.setDate(suggestedEnd.getDate() + requiredDays + (playoffs !== "league_only" ? 2 : 1));

    return {
      success: false,
      error: `Unable to generate a conflict-free schedule within the selected tournament dates. Need at least ${requiredDays} match days, but only ${availableDays} days are available under current daily limit and rest day settings.`,
      suggestedEndDate: formatDateString(suggestedEnd),
      stats: {
        totalFixtures: totalFixturesCount,
        requiredDays,
        availableDays
      }
    };
  }

  return {
    success: true,
    schedule,
    stats: {
      totalFixtures: totalFixturesCount,
      requiredDays: Math.ceil(totalFixturesCount / maxMatchesPerDay),
      availableDays: availableDates.length
    }
  };
};
