import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share2, Eye, Play, Users, Target, RotateCcw, ArrowLeft, Shield } from "lucide-react";
import { ScoringInterface } from "./ScoringInterface";
import { LiveViewer } from "./LiveViewer";
import { MatchSummary } from "./MatchSummary";
import { Scorecard } from "./Scorecard";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { triggerConfetti } from "@/utils/confetti";
import { processDelivery, type DeliveryInput } from "@/lib/cricketEngine";

const appId = (window as any).__app_id || 'default-app-id';

type View = 'dashboard' | 'scoring' | 'viewing' | 'scorecard' | 'summary' |
  'player_selection' | 'new_batsman_selection' | 'new_bowler_selection' |
  'innings_break' | 'match_end';

interface MatchDashboardProps {
  matchData: any;
  onBackToCreate: () => void;
}

export const MatchDashboard = ({ matchData, onBackToCreate }: MatchDashboardProps) => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMatchStarted, setIsMatchStarted] = useState(matchData.isMatchStarted || false);
  const [umpireKeyInput, setUmpireKeyInput] = useState("");
  const [umpireAuthenticated, setUmpireAuthenticated] = useState(false);
  const [umpireAuthError, setUmpireAuthError] = useState<string | null>(null);

  const [score, setScore] = useState(matchData.score || { runs: 0, wickets: 0, overs: 0, balls: 0 });
  const [recentBalls, setRecentBalls] = useState<string[]>(matchData.recentBalls || []);
  const [ballHistory, setBallHistory] = useState<any[]>(matchData.ballHistory || []);
  const [currentInnings, setCurrentInnings] = useState(matchData.currentInnings || 1);
  const [innings1Score, setInnings1Score] = useState<number | null>(matchData.innings1Score ?? null);
  const [matchResult, setMatchResult] = useState<string | null>(matchData.matchResult || null);

  const [striker, setStriker] = useState<any>(matchData.striker || null);
  const [nonStriker, setNonStriker] = useState<any>(matchData.nonStriker || null);
  const [currentBowler, setCurrentBowler] = useState<any>(matchData.currentBowler || null);
  const [battingTeam, setBattingTeam] = useState<string>(matchData.battingTeam || "");
  const [bowlingTeam, setBowlingTeam] = useState<string>(matchData.bowlingTeam || "");

  const [totalDotBalls, setTotalDotBalls] = useState(matchData.totalDotBalls || 0);
  const [totalFours, setTotalFours] = useState(matchData.totalFours || 0);
  const [totalSixes, setTotalSixes] = useState(matchData.totalSixes || 0);
  const [allPlayers, setAllPlayers] = useState<any[]>(matchData.allPlayers || []);
  const [bowlerOvers, setBowlerOvers] = useState<{ [key: string]: number }>(matchData.bowlerOvers || {});
  const [lastBowler, setLastBowler] = useState<any>(null);
  const [currentOverRuns, setCurrentOverRuns] = useState(matchData.currentOverRuns || 0);
  const [currentOverBalls, setCurrentOverBalls] = useState(matchData.currentOverBalls || 0);
  const [newBatsman, setNewBatsman] = useState<any>(null);
  const [newBowler, setNewBowler] = useState<any>(null);
  const [isFreeHit, setIsFreeHit] = useState<boolean>(matchData.isFreeHit || false);
  const [partnershipStartScore, setPartnershipStartScore] = useState(matchData.partnershipStartScore || { runs: 0, balls: 0 });
  // DRS features removed
  const [stateHistory, setStateHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('liveCricketMatchHistory');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('liveCricketMatchHistory', JSON.stringify(stateHistory));
  }, [stateHistory]);

  // Use refs to avoid stale closures in scoring functions
  const scoreRef = useRef(score);
  const strikerRef = useRef(striker);
  const nonStrikerRef = useRef(nonStriker);
  const currentBowlerRef = useRef(currentBowler);
  const battingTeamRef = useRef(battingTeam);
  const bowlingTeamRef = useRef(bowlingTeam);
  const currentInningsRef = useRef(currentInnings);
  const innings1ScoreRef = useRef(innings1Score);
  const allPlayersRef = useRef(allPlayers);
  const bowlerOversRef = useRef(bowlerOvers);
  const currentOverRunsRef = useRef(currentOverRuns);
  const currentOverBallsRef = useRef(currentOverBalls);
  const lastBowlerRef = useRef(lastBowler);
  const isFreeHitRef = useRef(isFreeHit);

  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { strikerRef.current = striker; }, [striker]);
  useEffect(() => { nonStrikerRef.current = nonStriker; }, [nonStriker]);
  useEffect(() => { currentBowlerRef.current = currentBowler; }, [currentBowler]);
  useEffect(() => { battingTeamRef.current = battingTeam; }, [battingTeam]);
  useEffect(() => { bowlingTeamRef.current = bowlingTeam; }, [bowlingTeam]);
  useEffect(() => { currentInningsRef.current = currentInnings; }, [currentInnings]);
  useEffect(() => { innings1ScoreRef.current = innings1Score; }, [innings1Score]);
  useEffect(() => { allPlayersRef.current = allPlayers; }, [allPlayers]);
  useEffect(() => { bowlerOversRef.current = bowlerOvers; }, [bowlerOvers]);
  useEffect(() => { currentOverRunsRef.current = currentOverRuns; }, [currentOverRuns]);
  useEffect(() => { currentOverBallsRef.current = currentOverBalls; }, [currentOverBalls]);
  useEffect(() => { lastBowlerRef.current = lastBowler; }, [lastBowler]);
  useEffect(() => { isFreeHitRef.current = isFreeHit; }, [isFreeHit]);

  // Debounced Firestore sync — only fires 2s after last change, not on every keystroke
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncToFirestore = useCallback((updates: any) => {
    const code = matchData.publicCode || matchData.id || matchData.matchCode;
    if (!code) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        const path = `artifacts/${appId}/public/data/matches/${code}`;
        await setDoc(doc(db, path), updates, { merge: true });
      } catch (e) {
        console.warn("Firestore sync failed:", e);
      }
      try {
        const saved = localStorage.getItem('liveCricketMatch');
        const current = saved ? JSON.parse(saved) : matchData;
        localStorage.setItem('liveCricketMatch', JSON.stringify({ ...current, ...updates }));
      } catch (e) { /* ignore */ }
    }, 2000);
  }, [matchData]);

  // Single sync effect — only runs when score/ballHistory change (the meaningful updates)
  useEffect(() => {
    if (!isMatchStarted) return;
    syncToFirestore({
      score, currentInnings, battingTeam, bowlingTeam, ballHistory,
      allPlayers, striker, nonStriker, currentBowler, bowlerOvers,
      totalDotBalls, totalFours, totalSixes, matchResult, innings1Score,
      currentOverRuns, currentOverBalls, isFreeHit
    });
  }, [score, ballHistory, matchResult]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize players with stats
  useEffect(() => {
    if (matchData.teamAPlayers.length > 0 && matchData.teamBPlayers.length > 0 && allPlayers.length === 0) {
      const init = [...matchData.teamAPlayers, ...matchData.teamBPlayers].map((p: any) => ({
        ...p,
        oversBowled: p.oversBowled || 0,
        runsScored: p.runsScored || 0,
        ballsFaced: p.ballsFaced || 0,
        fours: p.fours || 0,
        sixes: p.sixes || 0,
        maidens: p.maidens || 0,
        runsConceded: p.runsConceded || 0,
        wicketsTaken: p.wicketsTaken || 0,
        dotBalls: p.dotBalls || 0,
        isOut: p.isOut || false,
        outType: p.outType || null,
        outBowler: p.outBowler || null,
        outFielder: p.outFielder || null,
        hasBatted: p.hasBatted || false,
      }));
      setAllPlayers(init);
    }
  }, [matchData.teamAPlayers, matchData.teamBPlayers, allPlayers.length]);

  // Determine batting/bowling teams from toss
  useEffect(() => {
    if (matchData.tossWinner && matchData.tossDecision && !battingTeam) {
      const won = matchData.tossWinner;
      const dec = matchData.tossDecision;
      const bat = dec === "bat" ? won : (won === matchData.teamA ? matchData.teamB : matchData.teamA);
      const bowl = dec === "bat" ? (won === matchData.teamA ? matchData.teamB : matchData.teamA) : won;
      setBattingTeam(bat);
      setBowlingTeam(bowl);
    }
  }, [matchData.tossWinner, matchData.tossDecision, matchData.teamA, matchData.teamB, battingTeam]);

  const getMaxOversPerBowler = () => {
    if (matchData.maxOversPerBowler) return matchData.maxOversPerBowler;
    const teamSize = matchData.teamSize || 11;
    return Math.ceil(matchData.overs / Math.max(1, teamSize - 1));
  };

  // ─── Strike rotation ───────────────────────────────────────────────────────
  const rotateStrike = (runs: number, isEndOfOver: boolean) => {
    if (isEndOfOver) {
      // End of over: new bowler at non-striker end. Swap only if even runs.
      if (runs % 2 === 0) {
        const s = strikerRef.current;
        const ns = nonStrikerRef.current;
        setStriker(ns);
        setNonStriker(s);
      }
    } else {
      // Mid-over: swap on odd runs
      if (runs % 2 !== 0) {
        const s = strikerRef.current;
        const ns = nonStrikerRef.current;
        setStriker(ns);
        setNonStriker(s);
      }
    }
  };

  // ─── End of over handling ──────────────────────────────────────────────────
  const handleEndOfOver = (newBalls: number) => {
    const bowler = currentBowlerRef.current;
    if (!bowler) return;
    setBowlerOvers(prev => ({ ...prev, [bowler.name]: (prev[bowler.name] || 0) + 1 }));
    setAllPlayers(prev => prev.map(p => {
      if (p.name !== bowler.name) return p;
      const maiden = currentOverRunsRef.current === 0;
      return { ...p, oversBowled: (p.oversBowled || 0) + 1, maidens: (p.maidens || 0) + (maiden ? 1 : 0) };
    }));
    setLastBowler(bowler);
    setCurrentBowler(null);
    setCurrentOverRuns(0);
    setCurrentOverBalls(0);
    setCurrentView('new_bowler_selection');
  };

  // ─── Innings end check (called OUTSIDE setScore) ───────────────────────────
  const checkInningsEnd = (newWickets: number, newBalls: number, newRuns: number, isWicketCall: boolean) => {
    const newOvers = Math.floor(newBalls / 6) + (newBalls % 6) / 10;
    const teamSize = matchData.teamSize || 11;
    const batting = battingTeamRef.current;
    const bowling = bowlingTeamRef.current;
    const innings = currentInningsRef.current;
    const i1 = innings1ScoreRef.current;
    const players = allPlayersRef.current;

    const battingPlayers = players.filter(p =>
      batting === matchData.teamA
        ? matchData.teamAPlayers.some((tp: any) => tp.name === p.name)
        : matchData.teamBPlayers.some((tp: any) => tp.name === p.name)
    );
    const playersRemaining = battingPlayers.filter(p => !p.isOut).length;
    const allOut = newWickets >= teamSize - 1 || playersRemaining <= 1;
    const oversUp = newOvers >= matchData.overs;

    // Innings 2: check if chasing team has already won
    if (innings === 2 && i1 !== null && newRuns >= i1 + 1) {
      const wicketsRemaining = (teamSize - 1) - newWickets;
      const totalBalls = matchData.overs * 6;
      const ballsPlayed = Math.floor(newOvers) * 6 + Math.round((newOvers % 1) * 10);
      const ballsRemaining = Math.max(0, totalBalls - ballsPlayed);
      const result = `${batting} won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''} with ${ballsRemaining} ball${ballsRemaining !== 1 ? 's' : ''} remaining.`;
      setMatchResult(result);
      triggerConfetti('win');
      setCurrentView('match_end');
      return true;
    }

    if (allOut || oversUp) {
      if (innings === 1) {
        setInnings1Score(newRuns);
        setCurrentView('innings_break');
      } else {
        const i1safe = i1 ?? 0;
        let result = "";
        if (newRuns >= i1safe + 1) {
          const wr = (teamSize - 1) - newWickets;
          result = `${batting} won by ${wr} wicket${wr !== 1 ? 's' : ''}!`;
        } else if (newRuns === i1safe) {
          result = `Match Tied! Scores level at ${i1safe}.`;
        } else {
          result = `${bowling} won by ${i1safe - newRuns} run${i1safe - newRuns !== 1 ? 's' : ''}!`;
        }
        triggerConfetti('win');
        setMatchResult(result);
        setCurrentView('match_end');
      }
      return true;
    }

    if (isWicketCall && !allOut) {
      setCurrentView('new_batsman_selection');
      return true;
    }
    return false;
  };

  // ─── Unified Score Handler using Centralized Engine ────────────────────────
  const handleDelivery = (deliveryInput: DeliveryInput) => {
    // 1. Snapshot current state before update to push onto history stack
    const currentState = {
      score,
      recentBalls,
      ballHistory,
      currentInnings,
      innings1Score,
      matchResult,
      striker,
      nonStriker,
      currentBowler,
      battingTeam,
      bowlingTeam,
      totalDotBalls,
      totalFours,
      totalSixes,
      allPlayers,
      bowlerOvers,
      lastBowler,
      currentOverRuns,
      currentOverBalls,
      isFreeHit,
      partnershipStartScore,
    };

    // Push to history stack
    setStateHistory(prev => [...prev, currentState]);

    // 2. Call Centralized Cricket Engine
    const currentMatchState: MatchData = {
      ...matchData,
      ...currentState
    };

    const { updatedState, statusChange } = processDelivery(currentMatchState, deliveryInput);

    // 3. Update all states
    setScore(updatedState.score);
    setRecentBalls(updatedState.recentBalls);
    setBallHistory(updatedState.ballHistory);
    setCurrentInnings(updatedState.currentInnings);
    setInnings1Score(updatedState.innings1Score);
    setMatchResult(updatedState.matchResult);
    setStriker(updatedState.striker);
    setNonStriker(updatedState.nonStriker);
    setCurrentBowler(updatedState.currentBowler);
    setBattingTeam(updatedState.battingTeam);
    setBowlingTeam(updatedState.bowlingTeam);
    setTotalDotBalls(updatedState.totalDotBalls);
    setTotalFours(updatedState.totalFours);
    setTotalSixes(updatedState.totalSixes);
    setAllPlayers(updatedState.allPlayers);
    setBowlerOvers(updatedState.bowlerOvers);
    setLastBowler(updatedState.lastBowler);
    setCurrentOverRuns(updatedState.currentOverRuns);
    setCurrentOverBalls(updatedState.currentOverBalls);
    setIsFreeHit(updatedState.isFreeHit);
    setPartnershipStartScore(updatedState.partnershipStartScore);

    // Handle confetti triggers for boundaries and wickets
    if (deliveryInput.isWicket) {
      triggerConfetti('wicket');
    } else {
      if (deliveryInput.batRuns === 4 || deliveryInput.batRuns === 6) {
        triggerConfetti('boundary');
      }
      if (statusChange === 'match_end' && updatedState.matchResult && updatedState.matchResult.includes(updatedState.battingTeam)) {
        triggerConfetti('win');
      }
    }

    // 4. Update Navigation/View
    if (statusChange === 'match_end') {
      setCurrentView('match_end');
    } else if (statusChange === 'innings_break') {
      setCurrentView('innings_break');
    } else if (statusChange === 'new_batsman') {
      setNewBatsman(null);
      setCurrentView('new_batsman_selection');
    } else if (statusChange === 'new_bowler') {
      setNewBowler(null);
      setCurrentView('new_bowler_selection');
    } else {
      setCurrentView('scoring');
    }
  };

  const addRuns = (runs: number) => {
    handleDelivery({
      deliveryType: 'legal',
      batRuns: runs,
      extraRuns: 0,
      isWicket: false
    });
  };

  const addWicket = (
    wicketType: any,
    fielder: string | null = null,
    roRuns: number = 0,
    outBatsman: any = null,
    isNoBallWicket: boolean = false,
    crossed: boolean = false,
    deliveryType: DeliveryType = 'legal'
  ) => {
    let dtype: DeliveryType = deliveryType;
    if (dtype === 'legal') {
      if (isNoBallWicket || isFreeHit) {
        dtype = 'no_ball';
      }
    }
    handleDelivery({
      deliveryType: dtype,
      batRuns: wicketType === 'run_out' ? roRuns : 0,
      extraRuns: dtype === 'wide' ? 1 : 0,
      isWicket: true,
      dismissalType: wicketType,
      dismissedPlayerName: outBatsman?.name || striker?.name,
      fielderName: fielder,
      roRuns: roRuns,
      crossed: crossed,
      isNoBallWicket: isNoBallWicket
    });
  };

  const addExtra = (type: string, runs: number = 1, runsOffBat: number = 0) => {
    let deliveryType: DeliveryType = 'legal';
    if (type === 'wd') deliveryType = 'wide';
    else if (type === 'nb') deliveryType = 'no_ball';
    else if (type === 'b') deliveryType = 'bye';
    else if (type === 'lb') deliveryType = 'leg_bye';

    handleDelivery({
      deliveryType,
      batRuns: runsOffBat,
      extraRuns: runs,
      isWicket: false
    });
  };

  const undoLastBall = () => {
    if (stateHistory.length === 0) return;
    const previousState = stateHistory[stateHistory.length - 1];
    setStateHistory(prev => prev.slice(0, -1));

    setScore(previousState.score);
    setRecentBalls(previousState.recentBalls);
    setBallHistory(previousState.ballHistory);
    setCurrentInnings(previousState.currentInnings);
    setInnings1Score(previousState.innings1Score);
    setMatchResult(previousState.matchResult);
    setStriker(previousState.striker);
    setNonStriker(previousState.nonStriker);
    setCurrentBowler(previousState.currentBowler);
    setBattingTeam(previousState.battingTeam);
    setBowlingTeam(previousState.bowlingTeam);
    setTotalDotBalls(previousState.totalDotBalls);
    setTotalFours(previousState.totalFours);
    setTotalSixes(previousState.totalSixes);
    setAllPlayers(previousState.allPlayers);
    setBowlerOvers(previousState.bowlerOvers);
    setLastBowler(previousState.lastBowler);
    setCurrentOverRuns(previousState.currentOverRuns);
    setCurrentOverBalls(previousState.currentOverBalls);
    setIsFreeHit(previousState.isFreeHit);
    setPartnershipStartScore(previousState.partnershipStartScore);

    setCurrentView('scoring');
  };

  // DRS features removed

  const shareMatch = async () => {
    const code = matchData.publicCode || matchData.matchCode || "";
    const text = `🏏 ${matchData.teamA} vs ${matchData.teamB} | Code: ${code}\n${window.location.origin}/live/${code}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${matchData.teamA} vs ${matchData.teamB}`, text, url: `${window.location.origin}/live/${code}` }); }
      catch { navigator.clipboard.writeText(text); }
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  // ─── Player Selection View ─────────────────────────────────────────────────
  if (currentView === 'player_selection') {
    const batTeamPlayers = battingTeam === matchData.teamA ? matchData.teamAPlayers : matchData.teamBPlayers;
    const bowlTeamPlayers = (bowlingTeam === matchData.teamA ? matchData.teamAPlayers : matchData.teamBPlayers).filter((p: any) => !p.isWicketKeeper);
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-md mx-auto">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="w-5 h-5 text-orange-400" /> Select Players
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Select Opening Batsmen ({battingTeam})</label>
                <select className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
                  value={striker?.name || ''}
                  onChange={e => setStriker(batTeamPlayers.find((p: any) => p.name === e.target.value) || null)}>
                  <option value="">Select Striker</option>
                  {batTeamPlayers.map((p: any) => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
                <select className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
                  value={nonStriker?.name || ''}
                  onChange={e => setNonStriker(batTeamPlayers.find((p: any) => p.name === e.target.value) || null)}
                  disabled={!striker}>
                  <option value="">Select Non-Striker</option>
                  {batTeamPlayers.filter((p: any) => p.name !== striker?.name).map((p: any) => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Select Opening Bowler ({bowlingTeam})</label>
                <select className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
                  value={currentBowler?.name || ''}
                  onChange={e => setCurrentBowler(bowlTeamPlayers.find((p: any) => p.name === e.target.value) || null)}>
                  <option value="">Select Bowler</option>
                  {bowlTeamPlayers.map((p: any) => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <Button
                onClick={() => {
                  if (!striker || !nonStriker || !currentBowler) return;
                  // Mark opening batsmen as hasBatted
                  setAllPlayers(prev => prev.map(p =>
                    p.name === striker.name || p.name === nonStriker.name
                      ? { ...p, hasBatted: true }
                      : p
                  ));
                  setIsMatchStarted(true);
                  setCurrentView('scoring');
                }}
                disabled={!striker || !nonStriker || !currentBowler || striker?.name === nonStriker?.name}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                Start Scoring
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── New Batsman Selection ─────────────────────────────────────────────────
  if (currentView === 'new_batsman_selection') {
    const available = allPlayers.filter(p => {
      const inBatTeam = battingTeam === matchData.teamA
        ? matchData.teamAPlayers.some((tp: any) => tp.name === p.name)
        : matchData.teamBPlayers.some((tp: any) => tp.name === p.name);
      return inBatTeam && !p.isOut && p.name !== striker?.name && p.name !== nonStriker?.name && !p.hasBatted;
    });
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-md mx-auto">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><Users className="w-5 h-5 text-orange-400" /> New Batsman</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <label className="text-sm text-gray-300">Choose New Batsman ({battingTeam})</label>
              <select className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
                value={newBatsman?.name || ''}
                onChange={e => setNewBatsman(available.find(p => p.name === e.target.value) || null)}>
                <option value="">Select Batsman</option>
                {available.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
              <Button disabled={!newBatsman} className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  if (!newBatsman) return;
                  if (!striker) setStriker(newBatsman);
                  else setNonStriker(newBatsman);
                  setAllPlayers(prev => prev.map(p => p.name === newBatsman.name ? { ...p, hasBatted: true } : p));
                  setNewBatsman(null);
                  setCurrentView(!currentBowler ? 'new_bowler_selection' : 'scoring');
                }}>
                Confirm
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── New Bowler Selection ──────────────────────────────────────────────────
  if (currentView === 'new_bowler_selection') {
    const max = getMaxOversPerBowler();
    const candidates = allPlayers.filter(p => {
      const inBowlTeam = bowlingTeam === matchData.teamA
        ? matchData.teamAPlayers.some((tp: any) => tp.name === p.name)
        : matchData.teamBPlayers.some((tp: any) => tp.name === p.name);
      return inBowlTeam && !p.isWicketKeeper && (bowlerOvers[p.name] || 0) < max;
    });
    const available = candidates.filter(p => p.name !== lastBowler?.name);
    const bowlers = available.length > 0 ? available : candidates;
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-md mx-auto">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><Target className="w-5 h-5 text-orange-400" /> New Bowler</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <label className="text-sm text-gray-300">Choose Bowler ({bowlingTeam})</label>
              <select className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
                value={newBowler?.name || ''}
                onChange={e => setNewBowler(bowlers.find(p => p.name === e.target.value) || null)}>
                <option value="">Select Bowler</option>
                {bowlers.map(p => <option key={p.name} value={p.name}>{p.name} ({bowlerOvers[p.name] || 0}/{max} ov)</option>)}
              </select>
              <Button disabled={!newBowler} className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => { if (newBowler) { setCurrentBowler(newBowler); setNewBowler(null); setCurrentView('scoring'); } }}>
                Confirm
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Innings Break ─────────────────────────────────────────────────────────
  if (currentView === 'innings_break') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-md mx-auto">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><RotateCcw className="w-5 h-5 text-orange-400" /> Innings Break</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-gray-700 rounded-lg">
                <p className="text-lg font-bold text-white">{battingTeam}</p>
                <p className="text-3xl font-bold text-orange-400">{score.runs}/{score.wickets}</p>
                <p className="text-gray-400">in {score.overs.toFixed(1)} overs</p>
              </div>
              <div className="text-center p-3 bg-orange-900/30 border border-orange-500/50 rounded-lg">
                <p className="text-orange-400 font-semibold">Target for {bowlingTeam}</p>
                <p className="text-3xl font-bold text-white">{score.runs + 1}</p>
              </div>
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                onClick={() => {
                  setCurrentInnings(2);
                  const newBat = bowlingTeam;
                  const newBowl = battingTeam;
                  setBattingTeam(newBat);
                  setBowlingTeam(newBowl);
                  setAllPlayers(prev => prev.map(p => {
                    const inNewBat = newBat === matchData.teamA
                      ? matchData.teamAPlayers.some((tp: any) => tp.name === p.name)
                      : matchData.teamBPlayers.some((tp: any) => tp.name === p.name);
                    return inNewBat ? { ...p, isOut: false, hasBatted: false } : p;
                  }));
                  setScore({ runs: 0, wickets: 0, overs: 0, balls: 0 });
                  setRecentBalls([]);
                  setBowlerOvers({});
                  setCurrentOverRuns(0);
                  setCurrentOverBalls(0);
                  setStriker(null);
                  setNonStriker(null);
                  setCurrentBowler(null);
                  setPartnershipStartScore({ runs: 0, balls: 0 });
                  setCurrentView('player_selection');
                }}>
                Start 2nd Innings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Match End ─────────────────────────────────────────────────────────────
  if (currentView === 'match_end') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-md mx-auto">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><Target className="w-5 h-5 text-yellow-400" /> Match Result</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-6 bg-gradient-to-r from-green-900/40 to-blue-900/40 rounded-lg border border-green-500/30">
                <p className="text-2xl font-bold text-white">🏆 {matchResult}</p>
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold" onClick={() => setCurrentView('summary')}>View Match Summary</Button>
              <Button variant="outline" className="w-full border-gray-600 text-white hover:bg-gray-700" onClick={onBackToCreate}>Back to Home</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Scoring / Viewing / Scorecard / Summary Views ─────────────────────────
  if (currentView === 'scoring') {
    const batPlayers = allPlayers.filter(p => battingTeam === matchData.teamA ? matchData.teamAPlayers.some((tp: any) => tp.name === p.name) : matchData.teamBPlayers.some((tp: any) => tp.name === p.name));
    const bowlPlayers = allPlayers.filter(p => {
      const inBowlTeam = bowlingTeam === matchData.teamA ? matchData.teamAPlayers.some((tp: any) => tp.name === p.name) : matchData.teamBPlayers.some((tp: any) => tp.name === p.name);
      return inBowlTeam && !p.isWicketKeeper && (bowlerOvers[p.name] || 0) < getMaxOversPerBowler();
    });
    return (
      <ScoringInterface
        matchData={matchData} onBack={() => setCurrentView('dashboard')} onViewScorecard={() => setCurrentView('scorecard')}
        score={score} recentBalls={recentBalls} addRuns={addRuns} addWicket={addWicket} addExtra={addExtra} undoLastBall={undoLastBall}
        striker={striker} nonStriker={nonStriker} currentBowler={currentBowler}
        setStriker={setStriker} setNonStriker={setNonStriker} setCurrentBowler={setCurrentBowler}
        allPlayers={allPlayers} battingTeam={battingTeam} bowlingTeam={bowlingTeam}
        bowlerOvers={bowlerOvers} currentOverRuns={currentOverRuns} currentOverBalls={currentOverBalls}
        currentInnings={currentInnings} battingPlayers={batPlayers} bowlingPlayers={bowlPlayers}
        innings1Score={innings1Score} matchResult={matchResult} isFreeHit={isFreeHit}
        partnershipStartScore={partnershipStartScore}
      />
    );
  }

  if (currentView === 'viewing') {
    return <LiveViewer matchData={matchData} onBack={() => setCurrentView('dashboard')} score={score} striker={striker} nonStriker={nonStriker} currentBowler={currentBowler} battingTeam={battingTeam} bowlingTeam={bowlingTeam} bowlerOvers={bowlerOvers} allPlayers={allPlayers} totalDotBalls={totalDotBalls} totalFours={totalFours} totalSixes={totalSixes} ballHistory={ballHistory} currentOverRuns={currentOverRuns} currentOverBalls={currentOverBalls} currentInnings={currentInnings} innings1Score={innings1Score} matchResult={matchResult} />;
  }

  if (currentView === 'scorecard') {
    return <Scorecard matchData={matchData} allPlayers={allPlayers} battingTeam={battingTeam} score={score} onBackToUpdate={() => setCurrentView('scoring')} currentBowler={currentBowler} bowlerOvers={bowlerOvers} currentOverBalls={currentOverBalls} ballHistory={ballHistory} striker={striker} nonStriker={nonStriker} />;
  }

  if (currentView === 'summary') {
    return <MatchSummary matchData={matchData} allPlayers={allPlayers} ballHistory={ballHistory} innings1Score={innings1Score} matchResult={matchResult} totalFours={totalFours} totalSixes={totalSixes} totalDotBalls={totalDotBalls} onBackToCreate={onBackToCreate} />;
  }

  // ─── Default Dashboard View ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">
            Match Center
          </h1>
          <Button onClick={onBackToCreate} variant="outline" className="border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white text-sm">
            New Match
          </Button>
        </div>

        {/* Umpire Auth */}
        {!umpireAuthenticated && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Shield className="w-5 h-5 text-orange-400" /> Umpire Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-400">Enter your Umpire Key to access the scoring console.</p>
              <Input type="password" placeholder="Enter Umpire Key"
                value={umpireKeyInput}
                onChange={e => setUmpireKeyInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && umpireKeyInput) {
                    if (umpireKeyInput === matchData.umpireKey) {
                      setUmpireAuthenticated(true);
                      setUmpireAuthError(null);
                      setCurrentView('player_selection');
                    } else {
                      setUmpireAuthError("Invalid umpire key. Please try again.");
                    }
                  }
                }}
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500" />
              {umpireAuthError && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{umpireAuthError}</AlertDescription>
                </Alert>
              )}
              <Button
                onClick={() => {
                  if (umpireKeyInput === matchData.umpireKey) {
                    setUmpireAuthenticated(true);
                    setUmpireAuthError(null);
                    setCurrentView('player_selection');
                  } else {
                    setUmpireAuthError("Invalid umpire key. Please try again.");
                  }
                }}
                disabled={!umpireKeyInput}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold"
              >
                Authenticate as Umpire
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Match Info + Controls */}
        {umpireAuthenticated && (
          <>
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white">
                  <span className="text-lg">{matchData.teamA} vs {matchData.teamB}</span>
                  <Badge className="bg-orange-600 text-white">{matchData.overs} Overs</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Toss Winner</p>
                    <p className="font-semibold text-white text-sm">{matchData.tossWinner}</p>
                  </div>
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Decision</p>
                    <p className="font-semibold text-white capitalize text-sm">{matchData.tossDecision}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setCurrentView('player_selection')} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold">
                    <Play className="w-4 h-4 mr-2" /> Start Scoring
                  </Button>
                  <Button onClick={() => setCurrentView('viewing')} variant="outline" className="flex-1 border-gray-600 text-white hover:bg-gray-700">
                    <Eye className="w-4 h-4 mr-2" /> Live View
                  </Button>
                </div>
                <Button onClick={shareMatch} variant="ghost" className="w-full text-gray-400 hover:text-white hover:bg-gray-700">
                  <Share2 className="w-4 h-4 mr-2" /> Share Match
                </Button>
              </CardContent>
            </Card>

            {isMatchStarted && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader><CardTitle className="text-white text-sm">Live Score</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{score.runs}/{score.wickets}</p>
                    <p className="text-gray-400 text-sm">Overs: {score.overs.toFixed(1)}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};
