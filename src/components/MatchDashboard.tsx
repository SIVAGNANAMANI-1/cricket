import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share2, Eye, Play, Users, Target, RotateCcw, ArrowLeft } from "lucide-react";
import { ScoringInterface } from "./ScoringInterface";
import { LiveViewer } from "./LiveViewer";
import { MatchSummary } from "./MatchSummary";
import { Scorecard } from "./Scorecard";
import { Input } from "@/components/ui/input"; // New: For umpire key input
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // New: For error messages
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { triggerConfetti } from "@/utils/confetti";


// Get the global App ID provided by the environment
const appId = (window as any).__app_id || 'default-app-id';

interface MatchDashboardProps {
  matchData: any;
  onBackToCreate: () => void;
}

export const MatchDashboard = ({ matchData, onBackToCreate }: MatchDashboardProps) => {
  console.log("Match Data in MatchDashboard:", matchData); // New debug log
  const [currentView, setCurrentView] = useState<'dashboard' | 'scoring' | 'viewing' | 'scorecard' | 'summary' | 'player_selection' | 'new_batsman_selection' | 'new_bowler_selection' | 'innings_break' | 'match_end'>('dashboard');
  const [isMatchStarted, setIsMatchStarted] = useState(matchData.isMatchStarted || false);
  const [umpireKeyInput, setUmpireKeyInput] = useState(""); // New: State for umpire key input
  const [umpireAuthenticated, setUmpireAuthenticated] = useState(false); // New: State for umpire authentication
  const [umpireAuthError, setUmpireAuthError] = useState<string | null>(null); // New: State for umpire authentication error

  // Initialize score from matchData or default
  const [score, setScore] = useState(matchData.score || { runs: 0, wickets: 0, overs: 0, balls: 0 });
  const [recentBalls, setRecentBalls] = useState<string[]>(matchData.recentBalls || []);

  // New state for ball-by-ball history for commentary
  const [ballHistory, setBallHistory] = useState<any[]>(matchData.ballHistory || []);
  const [currentInnings, setCurrentInnings] = useState(matchData.currentInnings || 1); // Track current innings
  const [innings1Score, setInnings1Score] = useState<number | null>(matchData.innings1Score || null); // Store first innings score
  const [matchResult, setMatchResult] = useState<string | null>(matchData.matchResult || null); // New state to store final match result message

  // New state for current players and teams
  const [striker, setStriker] = useState<any>(matchData.striker || null);
  const [nonStriker, setNonStriker] = useState<any>(matchData.nonStriker || null);
  const [currentBowler, setCurrentBowler] = useState<any>(matchData.currentBowler || null);
  const [battingTeam, setBattingTeam] = useState<any>(matchData.battingTeam || null);
  const [bowlingTeam, setBowlingTeam] = useState<any>(matchData.bowlingTeam || null);

  // New state for overall match statistics
  const [totalDotBalls, setTotalDotBalls] = useState(matchData.totalDotBalls || 0);
  const [totalFours, setTotalFours] = useState(matchData.totalFours || 0);
  const [totalSixes, setTotalSixes] = useState(matchData.totalSixes || 0);

  // Keep track of all players for easy updates
  const [allPlayers, setAllPlayers] = useState<any[]>(matchData.allPlayers || []);

  // State for tracking bowler overs
  const [bowlerOvers, setBowlerOvers] = useState<{ [key: string]: number }>(matchData.bowlerOvers || {});
  const [lastBowler, setLastBowler] = useState<any>(null);
  const [isLastBallOfOverBeforeWicket, setIsLastBallOfOverBeforeWicket] = useState<boolean>(false);
  const [currentOverRuns, setCurrentOverRuns] = useState(matchData.currentOverRuns || 0);
  const [currentOverBalls, setCurrentOverBalls] = useState(matchData.currentOverBalls || 0);

  // New state for selecting new batsman and bowler
  const [newBatsman, setNewBatsman] = useState<any>(null);
  const [newBowler, setNewBowler] = useState<any>(null);

  // Free Hit State
  const [isFreeHit, setIsFreeHit] = useState<boolean>(matchData.isFreeHit || false);

  // Partnership State
  const [partnershipStartScore, setPartnershipStartScore] = useState<{ runs: number, balls: number }>(matchData.partnershipStartScore || { runs: 0, balls: 0 });


  // Function to sync state to Firestore
  const syncToFirestore = async (updates: any) => {
    const code = matchData.publicCode || matchData.id || matchData.matchCode;
    if (!code) {
      console.error("MatchDashboard: Cannot sync - Missing match code in matchData", matchData);
      return;
    }

    const firestorePath = `artifacts/${appId}/public/data/matches/${code}`;
    console.log("MatchDashboard: Syncing to Firestore path:", firestorePath);
    console.log("MatchDashboard: Match code being used:", code);

    // 1. Sync to Firestore
    try {
      const matchDocRef = doc(db, firestorePath);
      await setDoc(matchDocRef, updates, { merge: true });
      console.log("MatchDashboard: Successfully synced to Firestore:", code, updates);
    } catch (e) {
      console.error("MatchDashboard: Error syncing to Firestore:", e);
    }

    // 2. Sync to Local Storage (for local viewers/offline support)
    try {
      const saved = localStorage.getItem('liveCricketMatch');
      let currentLocal = saved ? JSON.parse(saved) : matchData;

      // Merge updates
      const updatedLocal = { ...currentLocal, ...updates };
      localStorage.setItem('liveCricketMatch', JSON.stringify(updatedLocal));
      console.log("MatchDashboard: Successfully synced to localStorage");
    } catch (e) {
      console.warn("MatchDashboard: Failed to update local storage", e);
    }
  };

  // Use useEffect to sync critical state changes to Firestore
  useEffect(() => {
    const updates = {
      score,
      currentInnings,
      battingTeam,
      bowlingTeam,
      ballHistory,
      allPlayers,
      striker,
      nonStriker,
      currentBowler,
      bowlerOvers,
      totalDotBalls,
      totalFours,
      totalSixes,
      matchResult,
      innings1Score,
      currentOverRuns,
      currentOverBalls,
      isFreeHit // Sync isFreeHit state
    };

    console.log("MatchDashboard syncing to Firestore:", updates);
    syncToFirestore(updates);
  }, [score, currentInnings, battingTeam, bowlingTeam, ballHistory, allPlayers, striker, nonStriker, currentBowler, bowlerOvers, matchResult, currentOverRuns, currentOverBalls, isFreeHit]);


  // Function to handle strike rotation after each ball
  const handleStrikeRotation = (runsScored: number, isBallLastOfOver: boolean) => {
    if (isBallLastOfOver) {
      // Last ball of over: Ends change.
      // If Odd runs: Batsmen Crossed. New Bowler comes to "Non-Striker" end (where Striker is). So Striker FACES. -> NO SWAP.
      // If Even runs: Batsmen Stay. New Bowler comes to "Non-Striker" end (where Non-Striker is). So Non-Striker FACES. -> SWAP.

      if (runsScored % 2 === 0) { // Even runs on last ball -> Swap strikers
        setStriker(nonStriker);
        setNonStriker(striker);
      }
      // If Odd runs, do nothing (same striker faces next over)
    } else { // Mid-over ball
      if (runsScored % 2 !== 0) { // Odd runs, mid-over swap
        setStriker(nonStriker);
        setNonStriker(striker);
      }
    }
  };

  useEffect(() => {
    if (matchData.teamAPlayers.length > 0 && matchData.teamBPlayers.length > 0 && allPlayers.length === 0) {
      // Initialize all players with 0 overs bowled
      const initialPlayers = [...matchData.teamAPlayers, ...matchData.teamBPlayers].map(player => ({
        ...player,
        oversBowled: player.oversBowled || 0,
        runsScored: player.runsScored || 0,
        ballsFaced: player.ballsFaced || 0,
        fours: player.fours || 0,
        sixes: player.sixes || 0,
        maidens: player.maidens || 0,
        runsConceded: player.runsConceded || 0,
        wicketsTaken: player.wicketsTaken || 0,
        dotBalls: player.dotBalls || 0,
        isOut: player.isOut || false, // Ensure boolean is initialized
        outType: player.outType || null, // e.g., 'bowled', 'caught', 'lbw', 'run_out'
        outBowler: player.outBowler || null, // Name of the bowler who took the wicket
        outFielder: player.outFielder || null, // Name of the fielder involved (for caught, run out)
        hasBatted: player.hasBatted || false // Ensure boolean is initialized
      }));
      setAllPlayers(initialPlayers);
    }
  }, [matchData.teamAPlayers, matchData.teamBPlayers, allPlayers.length]);

  // Determine batting and bowling teams based on toss
  useEffect(() => {
    if (matchData.tossWinner && matchData.tossDecision) {
      const teamWonToss = matchData.tossWinner;
      const decision = matchData.tossDecision;

      let batTeam, bowlTeam;
      if (decision === "bat") {
        batTeam = teamWonToss;
        bowlTeam = (teamWonToss === matchData.teamA) ? matchData.teamB : matchData.teamA;
      } else { // decision === "bowl"
        bowlTeam = teamWonToss;
        batTeam = (teamWonToss === matchData.teamA) ? matchData.teamB : matchData.teamA;
      }
      setBattingTeam(batTeam);
      setBowlingTeam(bowlTeam);
    }
  }, [matchData.tossWinner, matchData.tossDecision, matchData.teamA, matchData.teamB]);

  const addRuns = (runs: number) => {
    // Legal ball -> Free Hit is consumed (reset to false)
    setIsFreeHit(false);

    setScore(prev => {
      // Log score at start of addRuns
      console.log("ADDRUNS_CALLED: Previous score (prev):", prev);
      const newRuns = prev.runs + runs;
      const newBalls = prev.balls + 1;
      const newOvers = Math.floor(newBalls / 6) + (newBalls % 6) / 10;
      const isBallLastOfOver = (newBalls % 6 === 0 && newBalls !== 0);

      handleStrikeRotation(runs, isBallLastOfOver);

      // Update current over stats
      setCurrentOverRuns(prevRuns => prevRuns + runs);
      setCurrentOverBalls(prevBalls => prevBalls + 1);

      // Update striker's personal stats and overall match boundaries
      setAllPlayers(prevPlayers => prevPlayers.map(p => {
        if (p.name === striker.name) {
          const updatedPlayer = { ...p, runsScored: p.runsScored + runs, ballsFaced: p.ballsFaced + 1 };
          if (runs === 4) {
            updatedPlayer.fours++;
            setTotalFours(prev => prev + 1);
            triggerConfetti('boundary');
          } else if (runs === 6) {
            updatedPlayer.sixes++;
            setTotalSixes(prev => prev + 1);
            triggerConfetti('boundary');
          }
          return updatedPlayer;
        }
        // Update bowler's runs conceded and dot balls (only if currentBowler exists)
        if (currentBowler && p.name === currentBowler.name) {
          const updatedBowler = { ...p, runsConceded: p.runsConceded + runs };
          if (runs === 0) {
            updatedBowler.dotBalls++;
          }
          return updatedBowler;
        }
        return p;
      }));

      // Update total dot balls (match level)
      if (runs === 0) {
        setTotalDotBalls(prev => prev + 1);
      }

      // Capture ball history
      setBallHistory(prev => [...prev, {
        over: newOvers,
        ballInOver: (newBalls % 6 === 0 ? 6 : newBalls % 6),
        type: 'runs',
        runs: runs,
        striker: striker,
        nonStriker: nonStriker,
        bowler: currentBowler,
        battingTeam: battingTeam // Add batting team to history
      }]);

      // Handle end of over
      if (isBallLastOfOver) {
        setBowlerOvers(prevBowlerOvers => ({ ...prevBowlerOvers, [currentBowler.name]: (prevBowlerOvers[currentBowler.name] || 0) + 1 }));

        // Update bowler's total overs bowled and maidens in allPlayers
        setAllPlayers(prevPlayers => prevPlayers.map(p => {
          if (p.name === currentBowler.name) {
            const updatedBowler = { ...p, oversBowled: p.oversBowled + 1 };
            if (currentOverRuns === 0) { // If no runs conceded in the over
              updatedBowler.maidens++;
            }
            return updatedBowler;
          }
          return p;
        }));

        setCurrentOverRuns(0); // Reset for next over
        setCurrentOverBalls(0); // Reset for next over

        setLastBowler(currentBowler); // Store last bowler
        setCurrentBowler(null); // Clear current bowler to force selection
        setCurrentView('new_bowler_selection');
      }

      // Log score before handleEndOfInnings from addRuns
      console.log("ADDRUNS_BEFORE_END_INNINGS: Current score before check:", { runs: newRuns, wickets: prev.wickets, balls: newBalls });
      handleEndOfInnings(prev.wickets, newBalls, false, newRuns);

      setRecentBalls(prev => {
        const updated = [...prev, runs.toString()];
        if (isBallLastOfOver) updated.push("|");
        return updated.slice(-12);
      });
      return { runs: newRuns, wickets: prev.wickets, balls: newBalls, overs: newOvers };
    });
  };

  const addWicket = (wicketType: string, fielder: string | null = null, runs: number = 0, outBatsman: any = null, isNoBallWicket: boolean = false) => {
    // 1. Determine Victim
    const isRunOut = wicketType === "run_out";
    const victim = isRunOut && outBatsman ? outBatsman : striker;

    // Legal ball (usually) -> Free Hit is consumed.
    // However, if it's a run-out on a No Ball, the Free Hit should remain TRUE for the next ball
    // because No Ball always triggers a Free Hit
    if (!isNoBallWicket) {
      setIsFreeHit(false);
    }
    // If isNoBallWicket is true, we DON'T reset isFreeHit, keeping it true for the next ball

    // Safety check
    if (!victim) {
      console.error("AddWicket: No victim found. Aborting.");
      return;
    }

    // 2. Pre-calculate Player Stat Updates & Removal Logic
    // We do this OUTSIDE setScore to ensure we use current stable state for 'striker'/'nonStriker'
    let nextStriker = striker;
    let nextNonStriker = nonStriker;

    // Swap Logic (Odd Runs)
    const shouldSwap = isRunOut && (runs % 2 !== 0);
    if (shouldSwap) {
      const temp = nextStriker;
      nextStriker = nextNonStriker;
      nextNonStriker = temp;
    }

    // Victim Removal Logic
    // Using strict name check to avoid reference mismatch
    if (nextStriker && nextStriker.name === victim.name) {
      nextStriker = null;
    } else if (nextNonStriker && nextNonStriker.name === victim.name) {
      nextNonStriker = null;
    } else {
      // FALLBACK: If victim name check failed but we KNOW a wicket fell
      console.warn("AddWicket: Victim name mismatch in removal!", { nextStriker, nextNonStriker, victim });
      // Force removal if name matches partially or just remove striker/nonStriker if ambiguous?
      // Better to trust exact match. If mismatch, UI might duplicate. Logic above is usually robust.
    }

    // End of Over Swap Logic (Pre-calc)
    // We predict the new balls count.
    const currentBalls = score.balls;
    const newBallsPrediction = currentBalls + 1;
    const isBallLastOfOver = (newBallsPrediction % 6 === 0 && newBallsPrediction !== 0);

    if (isBallLastOfOver) {
      const temp = nextStriker;
      nextStriker = nextNonStriker;
      nextNonStriker = temp;
    }

    // 3. APPLY Player State Updates (Synchronous, Batched)
    setStriker(nextStriker);
    setNonStriker(nextNonStriker);

    // 4. Update AllPlayers (Stats)
    setAllPlayers(prevPlayers => prevPlayers.map(p => {
      let player = { ...p };

      // Striker Updates
      if (p.name === striker.name) {
        player.ballsFaced += 1;
        if (isRunOut) player.runsScored += runs;
      }

      // Dismissal
      if (p.name === victim.name) {
        return {
          ...player,
          isOut: true,
          hasBatted: true,
          outType: wicketType,
          outBowler: currentBowler?.name || null,
          outFielder: fielder || null,
          fowRuns: score.runs + runs,
          fowOvers: Math.floor(newBallsPrediction / 6) + (newBallsPrediction % 6) / 10
        };
      }

      // Bowler Updates
      if (currentBowler && p.name === currentBowler.name) {
        const updatedBowler = { ...player };
        // Treat "stumped" as a team wicket (no bowler credit), same as run_out logic requested by user
        const isTeamWicket = isRunOut || wicketType === "stumped";

        if (!isTeamWicket) {
          updatedBowler.wicketsTaken = p.wicketsTaken + 1;
          updatedBowler.dotBalls++;
        } else {
          // Run out OR Stumped (no wicket credit for bowler)
          if (runs > 0) updatedBowler.runsConceded = (updatedBowler.runsConceded || 0) + runs;
          else updatedBowler.dotBalls++;
        }
        if (isBallLastOfOver) updatedBowler.oversBowled = (updatedBowler.oversBowled || 0) + 1;
        return updatedBowler;
      }
      return player;
    }));

    // 5. Update Score (Standard)
    setScore(prev => {
      let newRuns = prev.runs + runs;
      const newWickets = prev.wickets + 1;

      // For No Ball wickets, do NOT increment balls (it's an illegal delivery)
      const newBalls = isNoBallWicket ? prev.balls : prev.balls + 1;
      const newOvers = Math.floor(newBalls / 6) + (newBalls % 6) / 10;

      setCurrentOverRuns(prevRuns => prevRuns + runs);

      // For No Ball wickets, do NOT increment current over balls
      if (!isNoBallWicket) {
        setCurrentOverBalls(prevBalls => prevBalls + 1);
      }
      setIsLastBallOfOverBeforeWicket(isBallLastOfOver);
      setTotalDotBalls(prev => prev + 1);

      setBallHistory(history => [...history, {
        over: newOvers,
        ballInOver: (newBalls % 6 === 0 ? 6 : newBalls % 6),
        type: 'wicket',
        striker: striker, // Old striker snapshot
        nonStriker: nonStriker, // Old nonStriker snapshot
        outBatsman: victim,
        bowler: currentBowler,
        wicketType: wicketType,
        fielder: fielder,
        runs: runs,
        isLastBallOfOver: isBallLastOfOver,
        battingTeam: battingTeam
      }]);

      if (isBallLastOfOver) {
        setBowlerOvers(prevBowlerOvers => ({ ...prevBowlerOvers, [currentBowler.name]: (prevBowlerOvers[currentBowler.name] || 0) + 1 }));
        setLastBowler(currentBowler);
        setCurrentBowler(null);
        setCurrentOverRuns(0);
        setCurrentOverBalls(0);
      }

      console.log("ADDWICKET: Score updated:", { runs: newRuns, wickets: newWickets });
      handleEndOfInnings(newWickets, newBalls, true, newRuns);

      setRecentBalls(prev => {
        let display = "W";
        if (isRunOut) {
          if (runs === 0) display = "W(run-out)";
          else display = `${runs}R/W`;
        }
        const updated = [...prev, display];
        if (isBallLastOfOver) updated.push("|");
        return updated.slice(-12);
      });

      triggerConfetti('wicket');
      setPartnershipStartScore({ runs: newRuns, balls: newBalls });

      return { runs: newRuns, wickets: newWickets, balls: newBalls, overs: newOvers };
    });
  };

  const handleEndOfInnings = (currentWickets: number, currentBalls: number, isWicketCall: boolean, currentRuns?: number) => {
    const runsToCheck = currentRuns !== undefined ? currentRuns : score.runs;
    const newOvers = Math.floor(currentBalls / 6) + (currentBalls % 6) / 10;
    const battingTeamPlayers = allPlayers.filter(p =>
      (battingTeam === matchData.teamA ? matchData.teamAPlayers.some((tp: any) => tp.name === p.name) : matchData.teamBPlayers.some((tp: any) => tp.name === p.name))
    );
    const playersNotOutYet = battingTeamPlayers.filter(p => !p.isOut);

    const inningsEndedByWickets = currentWickets >= ((matchData.teamSize || 11) - 1) || playersNotOutYet.length === 0;
    const inningsEndedByOvers = newOvers >= matchData.overs;

    // Real-time match end check for second innings (Chasing team wins)
    if (currentInnings === 2 && runsToCheck >= (innings1Score !== null ? innings1Score + 1 : 0) && currentWickets < ((matchData.teamSize || 11) - 1) && newOvers < matchData.overs) {
      const target = innings1Score !== null ? innings1Score + 1 : 0;
      const wicketsRemaining = ((matchData.teamSize || 11) - 1) - currentWickets;
      const totalBallsInMatch = matchData.overs * 6;
      const currentBallsInOver = Math.round((newOvers % 1) * 10); // Extract decimal, multiply by 10 for balls
      const ballsPlayed = Math.floor(newOvers) * 6 + currentBallsInOver;
      const ballsRemaining = Math.max(0, totalBallsInMatch - ballsPlayed);

      setMatchResult(`${battingTeam} won by ${wicketsRemaining} wickets with ${ballsRemaining} balls remaining.`);
      setCurrentView('match_end');
      return; // Stop further processing as match has ended
    }

    if (inningsEndedByWickets || inningsEndedByOvers) {
      if (currentInnings === 1) {
        setInnings1Score(prev => prev === null ? runsToCheck : prev); // Store score of first innings only if not set
        setCurrentView('innings_break'); // Go to innings break view - Swap & Reset happens on button click

      } else if (currentInnings === 2) {
        // Second innings over, determine winner
        let winnerMessage = "";
        const target = innings1Score !== null ? innings1Score + 1 : 0;
        const chasingTeam = battingTeam;
        const defendingTeam = bowlingTeam;

        if (runsToCheck >= target) {
          const wicketsRemaining = ((matchData.teamSize || 11) - 1) - currentWickets;
          // Calculate balls remaining more robustly
          const currentBallsInOver = Math.round((newOvers % 1) * 10); // Extract decimal, multiply by 10 for balls
          const ballsPlayed = Math.floor(newOvers) * 6 + currentBallsInOver;
          const totalBallsInMatch = matchData.overs * 6;
          const ballsRemaining = Math.max(0, totalBallsInMatch - ballsPlayed);

          if (wicketsRemaining > 0) {
            winnerMessage = `${chasingTeam} wins by ${wicketsRemaining} wickets!`;
            // Optionally add balls remaining if relevant
            // if (ballsRemaining > 0) { winnerMessage += ` with ${ballsRemaining} balls remaining.`; }
          } else { // Should not happen if score >= target with wickets remaining, but as fallback
            winnerMessage = `${chasingTeam} wins!`;
          }

        } else if (runsToCheck === innings1Score && (inningsEndedByWickets || inningsEndedByOvers)) { // Draw condition
          winnerMessage = `Match Tied! Scores level at ${innings1Score} each.`;
        } else if (inningsEndedByWickets || inningsEndedByOvers) { // All out or overs finished, and not a win by wickets or draw
          const runsNeeded = target - runsToCheck - 1; // Runs Team A won by
          winnerMessage = `${defendingTeam} wins by ${runsNeeded} runs!`;
        }
        if (winnerMessage.includes('wins')) {
          triggerConfetti('win');
        }
        setMatchResult(winnerMessage); // Set the match result state
        setCurrentView('match_end'); // Go to match end view
      }
    } else if (isWicketCall && currentWickets < ((matchData.teamSize || 11) - 1) && playersNotOutYet.length > 0) { // Only prompt for new batsman if a wicket fell
      // Continue with batsman selection if wicket fell but innings not over
      if (isLastBallOfOverBeforeWicket) {
        setCurrentView('new_batsman_selection');
      } else {
        setCurrentView('new_batsman_selection');
      }
    }
  };

  const addExtra = (type: string, runs: number = 1, runsOffBat: number = 0) => {
    setScore(prev => {
      const newRuns = prev.runs + runs;
      let newBalls = prev.balls;
      let newOvers = prev.overs;
      let isBallLastOfOver = false;

      if (type !== "nb" && type !== "wd") { // B, LB count as a ball
        newBalls = prev.balls + 1;
        newOvers = Math.floor((prev.balls + 1) / 6) + ((prev.balls + 1) % 6) / 10;
        isBallLastOfOver = (newBalls % 6 === 0 && newBalls !== 0);
        handleStrikeRotation(runs, isBallLastOfOver);

        // Legal ball (b/lb) -> Free Hit consumed
        setIsFreeHit(false);

        // Increment current over balls for display (0.1, 0.2 etc)
        setCurrentOverBalls(prevBalls => prevBalls + 1);

        if (isBallLastOfOver && currentBowler) {
          // Update bowler overs
          setBowlerOvers(prev => ({ ...prev, [currentBowler.name]: (prev[currentBowler.name] || 0) + 1 }));

          // Update bowler stats in allPlayers
          setAllPlayers(prevPlayers => prevPlayers.map(p =>
            p.name === currentBowler.name ? { ...p, oversBowled: (p.oversBowled || 0) + 1 } : p
          ));

          setLastBowler(currentBowler);
          setCurrentBowler(null);
          setCurrentOverRuns(0);
          setCurrentOverBalls(0);
          setCurrentView('new_bowler_selection');
        }
      }

      // Update bowler's runs conceded for wides and no balls ONLY
      if (currentBowler && (type === "nb" || type === "wd")) {
        setAllPlayers(prevPlayers => prevPlayers.map(p =>
          p.name === currentBowler.name ? { ...p, runsConceded: p.runsConceded + runs } : p
        ));
      }

      // Free Hit Logic
      if (type === 'nb') {
        setIsFreeHit(true); // Next ball is Free Hit
      } else if (type === 'wd') {
        // Explicitly keep it true if it was true, although doing nothing achieves the same.
        // This block handles Wides.
        // If a wide is bowled in a free hit, it continues.
      }
      // Note: 'b' and 'lb' handled in the block above (legal balls reset it)

      // Update Striker Stats for No Ball runs
      if (type === "nb") {
        setAllPlayers(prevPlayers => prevPlayers.map(p => {
          if (p.name === striker.name) {
            const updatedPlayer = { ...p, ballsFaced: (p.ballsFaced || 0) + 1, runsScored: (p.runsScored || 0) + runsOffBat };
            if (runsOffBat === 4) {
              updatedPlayer.fours = (updatedPlayer.fours || 0) + 1;
              setTotalFours(prev => prev + 1);
            } else if (runsOffBat === 6) {
              updatedPlayer.sixes = (updatedPlayer.sixes || 0) + 1;
              setTotalSixes(prev => prev + 1);
            }
            return updatedPlayer;
          }
          return p;
        }));

        // Handle strike rotation for NB runs if odd
        if (runsOffBat % 2 !== 0) {
          setStriker(nonStriker);
          setNonStriker(striker);
        }
      }

      // For Byes (b) and Leg Byes (lb), runs are NOT added to runsConceded of the bowler
      // And they should NOT be counted as dot balls.
      if (type === "b" || type === "lb") {
        setAllPlayers(prevPlayers => prevPlayers.map(p => {
          // Increment balls faced for striker
          if (p.name === striker.name) {
            return { ...p, ballsFaced: (p.ballsFaced || 0) + 1 };
          }
          return p;
        }));
      }

      // Capture ball history
      setBallHistory(prev => [...prev, {
        over: newOvers,
        ballInOver: (newBalls % 6 === 0 ? 6 : newBalls % 6),
        type: 'extra',
        extraType: type,
        runs: runs, // Extras add 1 run to total
        striker: striker,
        nonStriker: nonStriker,
        bowler: currentBowler,
        battingTeam: battingTeam // Add batting team to history
      }]);

      let recentBallDisplay = type.toUpperCase();
      if (type === "b" || type === "lb") {
        recentBallDisplay = `${runs}${type}`;
      } else if (type === "nb") {
        recentBallDisplay = runs > 1 ? `NB+${runs - 1}` : "NB";
      }

      // Log score before handleEndOfInnings from addExtra
      console.log("ADDEXTRA_BEFORE_END_INNINGS: Current score before check:", { runs: newRuns, wickets: prev.wickets, balls: newBalls });
      handleEndOfInnings(prev.wickets, newBalls, false, newRuns);

      setRecentBalls(prev => {
        const updated = [...prev, recentBallDisplay];
        if (isBallLastOfOver) updated.push("|");
        return updated.slice(-12);
      });
      return { runs: newRuns, wickets: prev.wickets, balls: newBalls, overs: newOvers };
    });
  };

  const undoLastBall = () => {
    if (recentBalls.length === 0) return; // Nothing to undo

    const lastEvent = ballHistory[ballHistory.length - 1];
    if (!lastEvent) return; // Should not happen if recentBalls is not empty

    // 1. Revert recentBalls (Display)
    let newRecentBalls = [...recentBalls];
    if (newRecentBalls[newRecentBalls.length - 1] === "|") {
      newRecentBalls.pop(); // Remove pipe
    }
    newRecentBalls.pop(); // Remove actual ball
    setRecentBalls(newRecentBalls);

    // 2. Revert ballHistory
    const newBallHistory = ballHistory.slice(0, -1);
    setBallHistory(newBallHistory);

    // 3. Revert Score and Stats
    setScore(prevScore => {
      let newRuns = prevScore.runs;
      let newWickets = prevScore.wickets;
      let newBalls = prevScore.balls;
      let newOvers = prevScore.overs;

      // Revert overall score and balls
      if (lastEvent.type === "wicket") {
        newWickets = Math.max(0, prevScore.wickets - 1);
        newBalls = Math.max(0, prevScore.balls - 1);

        // If run out with runs, revert those runs
        if (lastEvent.wicketType === "run_out" && lastEvent.runs > 0) {
          newRuns = Math.max(0, prevScore.runs - lastEvent.runs);
        }
      } else if (lastEvent.type === "extra") {
        newRuns = Math.max(0, prevScore.runs - lastEvent.runs);
        if (lastEvent.extraType !== "wd" && lastEvent.extraType !== "nb") { // Only B, LB count as a ball
          newBalls = Math.max(0, prevScore.balls - 1);
        }
      } else if (lastEvent.type === "runs") {
        newRuns = Math.max(0, prevScore.runs - lastEvent.runs);
        newBalls = Math.max(0, prevScore.balls - 1);
      }

      newOvers = Math.floor(newBalls / 6) + (newBalls % 6) / 10;

      // --- Re-calculate Current Over Stats (Runs & Balls) ---
      const currentOverIndex = Math.floor(newBalls / 6);

      const ballsInCurrentOver = newBallHistory.filter(ball => {
        // Calculate which over this ball belongs to
        const isEndOfOver = Math.abs(ball.over % 1) < 0.001;
        const ballOverIndex = isEndOfOver ? Math.floor(ball.over) - 1 : Math.floor(ball.over);
        return ballOverIndex === currentOverIndex;
      });

      const newCurrentOverRuns = ballsInCurrentOver.reduce((sum, ball) => sum + (ball.runs || 0), 0);
      const newCurrentOverBalls = ballsInCurrentOver.filter(ball =>
        !['wd', 'nb'].includes(ball.extraType) // Only legal balls increment currentOverBalls display usually
      ).length;

      setCurrentOverRuns(newCurrentOverRuns);
      setCurrentOverBalls(newCurrentOverBalls);


      // --- Revert individual player stats and overall boundary/dot ball counts ---
      setAllPlayers(prevPlayers => prevPlayers.map(p => {
        const updatedPlayer = { ...p };

        // Revert striker's stats
        if (lastEvent.striker && p.name === lastEvent.striker.name) {
          if (lastEvent.type === "runs") {
            updatedPlayer.runsScored = Math.max(0, p.runsScored - lastEvent.runs);
            updatedPlayer.ballsFaced = Math.max(0, p.ballsFaced - 1);

            if (lastEvent.runs === 4) {
              setTotalFours(prev => Math.max(0, prev - 1));
              updatedPlayer.fours = Math.max(0, (p.fours || 0) - 1);
            }
            if (lastEvent.runs === 6) {
              setTotalSixes(prev => Math.max(0, prev - 1));
              updatedPlayer.sixes = Math.max(0, (p.sixes || 0) - 1);
            }
            // Global dot balls updated separately? No, it's done via setTotalDotBalls usually
            if (lastEvent.runs === 0) setTotalDotBalls(prev => Math.max(0, prev - 1));
          } else if (lastEvent.type === "extra") {
            if (lastEvent.extraType === "b" || lastEvent.extraType === "lb") {
              updatedPlayer.ballsFaced = Math.max(0, p.ballsFaced - 1);
            }
          } else if (lastEvent.type === "wicket") {
            if (lastEvent.wicketType !== "run_out") {
              updatedPlayer.ballsFaced = Math.max(0, p.ballsFaced - 1);
              if (p.isOut) updatedPlayer.isOut = false;
            } else {
              // Run out
              if (p.isOut) updatedPlayer.isOut = false;
              // If run out happened to the striker, revert balls faced
              if (lastEvent.outBatsman && lastEvent.outBatsman.name === p.name) {
                updatedPlayer.ballsFaced = Math.max(0, p.ballsFaced - 1);
              }
              // If runs were scored on a runout ball, revert striker stats if credited?
              // Usually runs are credited to striker even in runout if they ran.
              if (lastEvent.runs > 0) {
                updatedPlayer.runsScored = Math.max(0, p.runsScored - lastEvent.runs);
              }
            }
          }
          return updatedPlayer;
        }

        // Revert Non-Striker / Out Batsman stats for Run Out (if not striker)
        if (lastEvent.outBatsman && p.name === lastEvent.outBatsman.name && p.name !== lastEvent.striker?.name) {
          if (lastEvent.type === "wicket" && lastEvent.wicketType === "run_out") {
            updatedPlayer.isOut = false;
            updatedPlayer.hasBatted = true;
            // ballsFaced usually not incremented for non-striker
          }
        }

        // Revert bowler's stats
        if (lastEvent.bowler && p.name === lastEvent.bowler.name) {
          if (lastEvent.type === "runs") {
            updatedPlayer.runsConceded = Math.max(0, p.runsConceded - lastEvent.runs);
            if (lastEvent.runs === 0) updatedPlayer.dotBalls = Math.max(0, updatedPlayer.dotBalls - 1);
          } else if (lastEvent.type === "extra" && (lastEvent.extraType === "wd" || lastEvent.extraType === "nb")) {
            updatedPlayer.runsConceded = Math.max(0, p.runsConceded - lastEvent.runs);
          } else if (lastEvent.type === "wicket") {
            if (lastEvent.wicketType !== "run_out") {
              updatedPlayer.wicketsTaken = Math.max(0, p.wicketsTaken - 1);
              updatedPlayer.dotBalls = Math.max(0, updatedPlayer.dotBalls - 1);
            } else {
              if (lastEvent.runs > 0) {
                updatedPlayer.runsConceded = Math.max(0, p.runsConceded - lastEvent.runs);
              } else {
                updatedPlayer.dotBalls = Math.max(0, updatedPlayer.dotBalls - 1);
              }
            }
          }
          return updatedPlayer;
        }
        return p;
      }));

      // --- Undo Player Swaps and Bowler Overs if end of over was undone ---
      const wasEndOfOver = (prevScore.balls % 6 === 0 && prevScore.balls !== 0);

      if (wasEndOfOver) {
        if (lastBowler) {
          setBowlerOvers(prev => ({ ...prev, [lastBowler.name]: Math.max(0, (prev[lastBowler.name] || 0) - 1) }));
          setAllPlayers(prevPlayers => prevPlayers.map(p =>
            p.name === lastBowler.name ? { ...p, oversBowled: Math.max(0, p.oversBowled - 1) } : p
          ));

          // Restore current bowler
          setCurrentBowler(lastBowler);
          setLastBowler(null);
        }
        // Swap batsmen back
        setStriker(nonStriker);
        setNonStriker(striker);
      } else {
        // Mid-over swap undo
        if (lastEvent.type === "runs" && lastEvent.runs % 2 !== 0) {
          setStriker(nonStriker);
          setNonStriker(striker);
        }
      }

      // Restore View
      if (currentView === 'new_batsman_selection' || currentView === 'new_bowler_selection' || currentView === 'innings_break' || currentView === 'match_end') {
        setCurrentView('scoring');
      }

      return { runs: newRuns, wickets: newWickets, balls: newBalls, overs: newOvers };
    });
  };

  const shareMatch = async () => {
    const shareData = {
      title: `${matchData.teamA} vs ${matchData.teamB}`,
      text: `Join live cricket match with code: ${matchData.matchCode}`,
      url: window.location.href
    };

    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      navigator.clipboard.writeText(`Match Code: ${matchData.matchCode}\n${shareData.text}`);
    }
  };

  // Helper to calculate max overs per bowler
  const getMaxOversPerBowler = () => {
    // If we saved it during creation, use it. Otherwise calculate.
    if (matchData.maxOversPerBowler) return matchData.maxOversPerBowler;

    // Fallback calculation for older matches or if missing
    const totalOvers = matchData.overs;
    const teamSize = matchData.teamSize || 11;
    const eligibleBowlersInfo = teamSize - 1; // 1 WK cannot bowl
    return Math.ceil(totalOvers / Math.max(1, eligibleBowlersInfo));
  };

  if (currentView === 'player_selection') {
    return (
      <div className="min-h-screen bg-gray-900 text-white font-sans p-4">
        <div className="max-w-md mx-auto">
          <Card className="shadow-cricket animate-slide-up bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="w-5 h-5 text-orange-400" />
                Select Players
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Batting Team Players */}
              <div className="space-y-2">
                <label className="text-sm font-medium block text-gray-300">Select Opening Batsmen ({battingTeam})</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={striker?.name || ''}
                  onChange={(e) => setStriker(matchData[battingTeam === matchData.teamA ? 'teamAPlayers' : 'teamBPlayers'].find((p: any) => p.name === e.target.value) || null)}
                >
                  <option value="">Select Striker</option>
                  {battingTeam && matchData[battingTeam === matchData.teamA ? 'teamAPlayers' : 'teamBPlayers'].map((player: any) => (
                    <option key={player.name} value={player.name}>{player.name}</option>
                  ))}
                </select>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={nonStriker?.name || ''}
                  onChange={(e) => setNonStriker(matchData[battingTeam === matchData.teamA ? 'teamAPlayers' : 'teamBPlayers'].find((p: any) => p.name === e.target.value) || null)}
                  disabled={!striker}
                >
                  <option value="">Select Non-Striker</option>
                  {battingTeam && matchData[battingTeam === matchData.teamA ? 'teamAPlayers' : 'teamBPlayers']
                    .filter((p: any) => p.name !== (striker ? striker.name : ''))
                    .map((player: any) => (
                      <option key={player.name} value={player.name}>{player.name}</option>
                    ))}
                </select>
              </div>

              {/* Bowling Team Player */}
              <div className="space-y-2">
                <label className="text-sm font-medium block text-gray-300">Select Opening Bowler ({bowlingTeam})</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={currentBowler?.name || ''}
                  onChange={(e) => setCurrentBowler(matchData[bowlingTeam === matchData.teamA ? 'teamAPlayers' : 'teamBPlayers'].find((p: any) => p.name === e.target.value) || null)}
                >
                  <option value="">Select Bowler</option>
                  {bowlingTeam && matchData[bowlingTeam === matchData.teamA ? 'teamAPlayers' : 'teamBPlayers']
                    .filter((p: any) => !p.isWicketKeeper) // W/K cannot bowl
                    .map((player: any) => (
                      <option key={player.name} value={player.name}>{player.name}</option>
                    ))}
                </select>
              </div>

              <Button
                onClick={() => {
                  setIsMatchStarted(true);
                  setCurrentView('scoring');
                }}
                disabled={!striker || !nonStriker || !currentBowler || striker.name === nonStriker.name}
                className="w-full bg-gradient-field hover:opacity-90 transition-all duration-300"
              >
                Start Scoring
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentView === 'new_batsman_selection') {
    // Filter out players who are out, have batted, or are currently on crease
    const availableBatsmen = allPlayers.filter(p =>
      (battingTeam === matchData.teamA ? matchData.teamAPlayers.some((tp: any) => tp.name === p.name) : matchData.teamBPlayers.some((tp: any) => tp.name === p.name))
      && !p.isOut
      && !p.hasBatted
      && p.name !== (striker ? striker.name : '') // Exclude current striker
      && p.name !== (nonStriker ? nonStriker.name : '') // Exclude current non-striker
    );

    return (
      <div className="min-h-screen bg-gray-900 text-white font-sans p-4">
        <div className="max-w-md mx-auto">
          <Card className="shadow-cricket animate-slide-up bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="w-5 h-5 text-primary" />
                Select New Batsman
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium block text-gray-300">Choose New Batsman ({battingTeam})</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newBatsman?.name || ''}
                  onChange={(e) => setNewBatsman(availableBatsmen.find((p: any) => p.name === e.target.value) || null)}
                >
                  <option value="">Select New Batsman</option>
                  {availableBatsmen.map((player: any) => (
                    <option key={player.name} value={player.name}>{player.name}</option>
                  ))}
                </select>
              </div>
              <Button
                onClick={() => {
                  if (newBatsman) {
                    // INTELLIGENT FILL LOGIC: Fill the empty slot
                    if (!striker) {
                      setStriker(newBatsman);
                    } else if (!nonStriker) {
                      setNonStriker(newBatsman);
                    } else {
                      // Fallback: This case shouldn't happen if logic is correct, but default to Striker to avoid crash
                      setStriker(newBatsman);
                    }

                    // Mark as hasBatted immediately to ensure it shows up in lists and syncs
                    setAllPlayers(prev => prev.map(p =>
                      p.name === newBatsman.name ? { ...p, hasBatted: true } : p
                    ));
                    setNewBatsman(null);
                    if (!currentBowler) {
                      setCurrentView('new_bowler_selection');
                    } else {
                      setCurrentView('scoring');
                    }
                  }
                }}
                disabled={!newBatsman}
                className="w-full bg-gradient-field hover:opacity-90 transition-all duration-300"
              >
                Confirm New Batsman
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentView === 'new_bowler_selection') {
    // 1. Get all eligible bowlers (Team member, Not WK, Not maxxed out)
    const candidates = allPlayers.filter(p =>
      (bowlingTeam === matchData.teamA ? matchData.teamAPlayers.some((tp: any) => tp.name === p.name) : matchData.teamBPlayers.some((tp: any) => tp.name === p.name))
      && !p.isWicketKeeper
      && (bowlerOvers[p.name] || 0) < getMaxOversPerBowler()
    );

    // 2. Try to exclude the last bowler (Consecutive rule)
    let availableBowlers = candidates.filter(p => p.name !== (lastBowler ? lastBowler.name : ''));

    // 3. Exception: If ALL other bowlers are exhausted/invalid, allow lastBowler to bowl consecutive over
    if (availableBowlers.length === 0 && candidates.length > 0) {
      availableBowlers = candidates; // Allow consecutive bowling
    }

    return (
      <div className="min-h-screen bg-gray-900 text-white font-sans p-4">
        <div className="max-w-md mx-auto">
          <Card className="shadow-cricket animate-slide-up bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Target className="w-5 h-5 text-primary" />
                Select New Bowler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium block text-gray-300">Choose New Bowler ({bowlingTeam})</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newBowler?.name || ''}
                  onChange={(e) => setNewBowler(availableBowlers.find((p: any) => p.name === e.target.value) || null)}
                >
                  <option value="">Select New Bowler</option>
                  {availableBowlers.map((player: any) => (
                    <option key={player.name} value={player.name}>
                      {player.name} ({bowlerOvers[player.name] || 0}/{getMaxOversPerBowler()} overs)
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={() => {
                  if (newBowler) {
                    setCurrentBowler(newBowler);
                    setNewBowler(null);
                    setCurrentView('scoring');
                  }
                }}
                disabled={!newBowler}
                className="w-full bg-gradient-field hover:opacity-90 transition-all duration-300"
              >
                Confirm New Bowler
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentView === 'innings_break') {
    return (
      <div className="min-h-screen bg-gray-900 text-white font-sans p-4">
        <div className="max-w-md mx-auto">
          <Card className="shadow-cricket animate-slide-up bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <RotateCcw className="w-5 h-5 text-primary" />
                Innings Break
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                First innings completed. {battingTeam} scored {score.runs}/{score.wickets} in {score.overs} overs.
              </p>
              <p className="text-gray-300">
                Target for {bowlingTeam}: {score.runs + 1} runs.
              </p>
              <Button
                onClick={() => {
                  // Initialize Second Innings
                  setCurrentInnings(2);

                  // Swap Batting and Bowling Teams
                  const newBattingTeam = bowlingTeam;
                  const newBowlingTeam = battingTeam;
                  setBattingTeam(newBattingTeam);
                  setBowlingTeam(newBowlingTeam);

                  // Reset player stats for the new batting team (previously bowling team)
                  setAllPlayers(prevPlayers => prevPlayers.map(p => {
                    const isNewBattingTeamPlayer = newBattingTeam === matchData.teamA
                      ? matchData.teamAPlayers.some((tp: any) => tp.name === p.name)
                      : matchData.teamBPlayers.some((tp: any) => tp.name === p.name);

                    if (isNewBattingTeamPlayer) {
                      return {
                        ...p,
                        isOut: false,
                        hasBatted: false
                      };
                    }
                    return p;
                  }));

                  // Reset Score and Match State
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
                }}
                className="w-full bg-gradient-field hover:opacity-90 transition-all duration-300"
              >
                Start Second Innings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentView === 'match_end') {
    return (
      <div className="min-h-screen bg-gray-900 text-white font-sans p-4">
        <div className="max-w-md mx-auto">
          <Card className="shadow-cricket animate-slide-up bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Target className="w-5 h-5 text-primary" />
                Match Ended
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg font-bold text-center text-white">{matchResult}</p>
              <div className="space-y-2">
                <Button
                  onClick={() => setCurrentView('summary')}
                  className="w-full bg-gradient-field hover:opacity-90 transition-all duration-300"
                >
                  View Match Summary
                </Button>
                <Button
                  onClick={onBackToCreate}
                  variant="outline"
                  className="w-full"
                >
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentView === 'scoring') {
    return (
      <ScoringInterface
        matchData={matchData}
        onBack={() => setCurrentView('dashboard')}
        onViewScorecard={() => setCurrentView('scorecard')}
        score={score}
        recentBalls={recentBalls}
        addRuns={addRuns}
        addWicket={addWicket}
        addExtra={addExtra}
        undoLastBall={undoLastBall}
        striker={striker}
        nonStriker={nonStriker}
        currentBowler={currentBowler}
        allPlayers={allPlayers}
        battingTeam={battingTeam}
        bowlingTeam={bowlingTeam}
        bowlerOvers={bowlerOvers}
        currentOverRuns={currentOverRuns}
        currentOverBalls={currentOverBalls}
        setStriker={setStriker}

        setNonStriker={setNonStriker}

        setCurrentBowler={setCurrentBowler}
        currentInnings={currentInnings}
        isFreeHit={isFreeHit} // Pass Free Hit state
        partnershipStartScore={partnershipStartScore}
        battingPlayers={allPlayers.filter(p =>

          (battingTeam === matchData.teamA ? matchData.teamAPlayers.some((tp: any) => tp.name === p.name) : matchData.teamBPlayers.some((tp: any) => tp.name === p.name))

        )}

        bowlingPlayers={allPlayers.filter(p =>
          (bowlingTeam === matchData.teamA ? matchData.teamAPlayers.some((tp: any) => tp.name === p.name) : matchData.teamBPlayers.some((tp: any) => tp.name === p.name))
          && !p.isWicketKeeper
          && (bowlerOvers[p.name] || 0) < getMaxOversPerBowler()
        )}

        innings1Score={innings1Score}

        matchResult={matchResult}

      />
    );
  }

  if (currentView === 'viewing') {
    return (
      <LiveViewer
        matchData={matchData}
        onBack={() => setCurrentView('dashboard')}
        score={score}
        striker={striker}
        nonStriker={nonStriker}
        currentBowler={currentBowler}
        battingTeam={battingTeam}
        bowlingTeam={bowlingTeam}
        bowlerOvers={bowlerOvers}
        allPlayers={allPlayers}
        totalDotBalls={totalDotBalls}
        totalFours={totalFours}
        totalSixes={totalSixes}
        ballHistory={ballHistory}
        currentOverRuns={currentOverRuns}
        currentOverBalls={currentOverBalls}
        currentInnings={currentInnings}
        innings1Score={innings1Score}
        matchResult={matchResult}
      />
    );
  }

  if (currentView === 'scorecard') {
    return (
      <Scorecard
        matchData={matchData}
        allPlayers={allPlayers}
        battingTeam={battingTeam}
        score={score}
        onBackToUpdate={() => setCurrentView('scoring')}
        currentBowler={currentBowler}
        bowlerOvers={bowlerOvers}
        currentOverBalls={currentOverBalls}
        ballHistory={ballHistory}
      />
    );
  }

  if (currentView === 'summary') {
    return (
      <MatchSummary
        matchData={matchData}
        allPlayers={allPlayers}
        ballHistory={ballHistory}
        innings1Score={innings1Score}
        matchResult={matchResult}
        totalFours={totalFours}
        totalSixes={totalSixes}
        totalDotBalls={totalDotBalls}
        onBackToCreate={onBackToCreate}
      />
    );
  }

  // Default dashboard view
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header with New Match Button */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">
            Match Dashboard
          </h1>
          <Button
            onClick={onBackToCreate}
            variant="outline"
            className="border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white"
          >
            Create New Match
          </Button>
        </div>

        {/* Umpire Authentication */}
        {!umpireAuthenticated && (
          <Card className="shadow-cricket animate-slide-up bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-2 h-8 w-8 text-gray-400 hover:text-white"
                  onClick={onBackToCreate}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <Target className="w-5 h-5 text-primary" />
                Umpire Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="password"
                placeholder="Enter Umpire Key"
                value={umpireKeyInput}
                onChange={(e) => setUmpireKeyInput(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
              {umpireAuthError && (
                <Alert variant="destructive">
                  <AlertTitle>Authentication Failed</AlertTitle>
                  <AlertDescription>{umpireAuthError}</AlertDescription>
                </Alert>
              )}
              <Button
                onClick={() => {
                  if (umpireKeyInput === matchData.umpireKey) {
                    setUmpireAuthenticated(true);
                    setUmpireAuthError(null);
                    setCurrentView('player_selection'); // Automatically navigate to player selection
                  } else {
                    setUmpireAuthError("Invalid umpire key. Please try again.");
                  }
                }}
                disabled={!umpireKeyInput}
                className="w-full bg-gradient-field hover:opacity-90 transition-all duration-300"
              >
                Authenticate
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Match Info - Only shown if authenticated */}
        {umpireAuthenticated && (
          <>
            <Card className="shadow-cricket animate-slide-up bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white">
                  <span>{matchData.teamA} vs {matchData.teamB}</span>
                  <Badge variant="secondary">{matchData.overs} overs</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-400">Toss Winner</p>
                    <p className="font-semibold">{matchData.tossWinner}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-400">Decision</p>
                    <p className="font-semibold">{matchData.tossDecision}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setCurrentView('player_selection')}
                    disabled={!umpireAuthenticated}
                    className="flex-1 bg-gradient-field hover:opacity-90 transition-all duration-300"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Scoring
                  </Button>
                  <Button
                    onClick={() => setCurrentView('viewing')}
                    variant="outline"
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Live View
                  </Button>
                </div>
                <Button
                  onClick={shareMatch}
                  variant="ghost"
                  className="w-full"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Match
                </Button>
              </CardContent>
            </Card>

            {/* Current Score (if match started) */}
            {isMatchStarted && (
              <Card className="shadow-cricket animate-slide-up bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Current Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{score.runs}/{score.wickets}</p>
                    <p className="text-sm text-gray-400">Overs: {score.overs}</p>
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