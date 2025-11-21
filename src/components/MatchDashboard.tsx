import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share2, Eye, Play, Users, Target, RotateCcw } from "lucide-react";
import { ScoringInterface } from "./ScoringInterface";
import { LiveViewer } from "./LiveViewer";
import { MatchSummary } from "./MatchSummary";
import { Input } from "@/components/ui/input"; // New: For umpire key input
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // New: For error messages
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";

// Get the global App ID provided by the environment
const appId = (window as any).__app_id || 'default-app-id';

interface MatchDashboardProps {
  matchData: any;
  onBackToCreate: () => void;
}

export const MatchDashboard = ({ matchData, onBackToCreate }: MatchDashboardProps) => {
  console.log("Match Data in MatchDashboard:", matchData); // New debug log
  const [currentView, setCurrentView] = useState<'dashboard' | 'scoring' | 'viewing' | 'summary' | 'player_selection' | 'new_batsman_selection' | 'new_bowler_selection' | 'innings_break' | 'match_end'>('dashboard');
  const [isMatchStarted, setIsMatchStarted] = useState(false);
  const [umpireKeyInput, setUmpireKeyInput] = useState(""); // New: State for umpire key input
  const [umpireAuthenticated, setUmpireAuthenticated] = useState(false); // New: State for umpire authentication
  const [umpireAuthError, setUmpireAuthError] = useState<string | null>(null); // New: State for umpire authentication error
  const [score, setScore] = useState({ runs: 0, wickets: 0, overs: 0, balls: 0 });
  const [recentBalls, setRecentBalls] = useState<string[]>([]);

  // New state for ball-by-ball history for commentary
  const [ballHistory, setBallHistory] = useState<any[]>([]);
  const [currentInnings, setCurrentInnings] = useState(1); // Track current innings
  const [innings1Score, setInnings1Score] = useState<number | null>(null); // Store first innings score
  const [matchResult, setMatchResult] = useState<string | null>(null); // New state to store final match result message

  // New state for current players and teams
  const [striker, setStriker] = useState<any>(null);
  const [nonStriker, setNonStriker] = useState<any>(null);
  const [currentBowler, setCurrentBowler] = useState<any>(null);
  const [battingTeam, setBattingTeam] = useState<any>(null);
  const [bowlingTeam, setBowlingTeam] = useState<any>(null);

  // New state for overall match statistics
  const [totalDotBalls, setTotalDotBalls] = useState(0);
  const [totalFours, setTotalFours] = useState(0);
  const [totalSixes, setTotalSixes] = useState(0);

  // Keep track of all players for easy updates
  const [allPlayers, setAllPlayers] = useState<any[]>([]);

  // State for tracking bowler overs
  const [bowlerOvers, setBowlerOvers] = useState<{ [key: string]: number }>({});
  const [lastBowler, setLastBowler] = useState<any>(null);
  const [isLastBallOfOverBeforeWicket, setIsLastBallOfOverBeforeWicket] = useState<boolean>(false);
  const [currentOverRuns, setCurrentOverRuns] = useState(0);
  const [currentOverBalls, setCurrentOverBalls] = useState(0);

  // New state for selecting new batsman and bowler
  const [newBatsman, setNewBatsman] = useState<any>(null);
  const [newBowler, setNewBowler] = useState<any>(null);

  // Function to sync state to Firestore
  const syncToFirestore = async (updates: any) => {
    if (!matchData.publicCode) return;
    try {
        const matchDocRef = doc(db, `artifacts/${appId}/public/data/matches/${matchData.publicCode}`);
        await updateDoc(matchDocRef, updates);
    } catch (e) {
        console.error("Error syncing to Firestore:", e);
    }
  };

  // Use useEffect to sync critical state changes to Firestore
  useEffect(() => {
    if (currentView === 'scoring' || currentView === 'match_end' || currentView === 'innings_break') {
        syncToFirestore({
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
            innings1Score
        });
    }
  }, [score, currentInnings, battingTeam, bowlingTeam, ballHistory, allPlayers, striker, nonStriker, currentBowler, bowlerOvers, matchResult]);


  // Function to handle strike rotation after each ball
  const handleStrikeRotation = (runsScored: number, isBallLastOfOver: boolean) => {
    if (isBallLastOfOver) {
      if (runsScored % 2 !== 0) { // Odd runs on last ball, swap for next over
        setStriker(nonStriker);
        setNonStriker(striker);
      }
      // If even runs, no swap here, striker remains for next over
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
          } else if (runs === 6) {
            updatedPlayer.sixes++;
            setTotalSixes(prev => prev + 1);
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
        bowler: currentBowler
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
      handleEndOfInnings(prev.wickets, newBalls, false);

      setRecentBalls(prev => [...prev.slice(-5), runs.toString()].slice(-6));
      return { runs: newRuns, wickets: prev.wickets, balls: newBalls, overs: newOvers };
    });
  };

  const addWicket = (wicketType: string, fielder: string | null = null, runs: number = 0, outBatsman: any = null) => {
    setScore(prev => {
      let newRuns = prev.runs; // Initialize newRuns with current score
      const newWickets = prev.wickets + 1;
      const newBalls = prev.balls + 1;
      const newOvers = Math.floor(newBalls / 6) + (newBalls % 6) / 10;
      const isBallLastOfOver = (newBalls % 6 === 0 && newBalls !== 0);

      // Update current over stats
      setCurrentOverRuns(prevRuns => prevRuns + runs);
      setCurrentOverBalls(prevBalls => prevBalls + 1);

      // For run out, add runs to total score
      if (wicketType === "run_out") {
        newRuns += runs; // Add runs directly to newRuns
      }

      // Set the flag if it was the last ball of the over before the wicket
      setIsLastBallOfOverBeforeWicket(isBallLastOfOver);

      // Mark the striker or specific outBatsman as out and update bowler's wicket taken
      setAllPlayers(prevPlayers => prevPlayers.map(p => {
        // If it's a run out, mark the selected outBatsman as out
        if (wicketType === "run_out" && outBatsman && p.name === outBatsman.name) {
          return { ...p, isOut: true, hasBatted: true, ballsFaced: p.ballsFaced + 1, outType: wicketType, outBowler: currentBowler?.name || null, outFielder: fielder || null };
        }
        // For other wicket types, mark the striker as out
        if (wicketType !== "run_out" && p.name === striker.name) {
          return { ...p, isOut: true, hasBatted: true, ballsFaced: p.ballsFaced + 1, outType: wicketType, outBowler: currentBowler?.name || null, outFielder: fielder || null };
        }
        if (currentBowler && p.name === currentBowler.name) {
          const updatedBowler = { ...p, wicketsTaken: p.wicketsTaken + 1 };
          updatedBowler.dotBalls++; // Wicket counts as a dot ball
          return updatedBowler;
        }
        return p;
      }));

      // Increment total dot balls (match level) for a wicket ball
      setTotalDotBalls(prev => prev + 1);

      // Capture ball history
      setBallHistory(prev => [...prev, {
        over: newOvers,
        ballInOver: (newBalls % 6 === 0 ? 6 : newBalls % 6),
        type: 'wicket',
        striker: striker, // Striker at the time of the ball
        nonStriker: nonStriker, // Non-striker at the time of the ball
        outBatsman: outBatsman, // The batsman who got out (for run outs)
        bowler: currentBowler,
        wicketType: wicketType,
        fielder: fielder,
        runs: runs,
        isLastBallOfOver: isBallLastOfOver
      }]);

      // Handle bowler change if wicket is on the last ball of the over
      if (isBallLastOfOver) {
        setBowlerOvers(prevBowlerOvers => ({ ...prevBowlerOvers, [currentBowler.name]: (prevBowlerOvers[currentBowler.name] || 0) + 1 }));
        setLastBowler(currentBowler);
        setCurrentBowler(null);
        setCurrentOverRuns(0); // Reset for next over
        setCurrentOverBalls(0); // Reset for next over
      }

      // Log score before handleEndOfInnings from addWicket
      console.log("ADDWICKET_BEFORE_END_INNINGS: Current score before check:", { runs: newRuns, wickets: newWickets, balls: newBalls });
      handleEndOfInnings(newWickets + 1, newBalls + 1, true);

      setRecentBalls(prev => [...prev.slice(-5), "W"].slice(-6));
      return { runs: newRuns, wickets: newWickets, balls: newBalls, overs: newOvers };
    });
  };

  const handleEndOfInnings = (currentWickets: number, currentBalls: number, isWicketCall: boolean) => {
    const newOvers = Math.floor(currentBalls / 6) + (currentBalls % 6) / 10;
    const battingTeamPlayers = allPlayers.filter(p =>
      (battingTeam === matchData.teamA ? matchData.teamAPlayers.some((tp: any) => tp.name === p.name) : matchData.teamBPlayers.some((tp: any) => tp.name === p.name))
    );
    const playersNotOutYet = battingTeamPlayers.filter(p => !p.isOut);

    const inningsEndedByWickets = currentWickets >= 10 || playersNotOutYet.length === 0;
    const inningsEndedByOvers = newOvers >= matchData.overs;

    // Real-time match end check for second innings (Chasing team wins)
    if (currentInnings === 2 && score.runs >= (innings1Score !== null ? innings1Score + 1 : 0) && currentWickets < 10 && newOvers < matchData.overs) {
      const target = innings1Score !== null ? innings1Score + 1 : 0;
      const wicketsRemaining = 10 - currentWickets;
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
        setInnings1Score(score.runs); // Store score of first innings
        setCurrentInnings(2); // Move to second innings

        // Swap batting and bowling teams
        const tempBattingTeam = battingTeam;
        setBattingTeam(bowlingTeam);
        setBowlingTeam(tempBattingTeam);

        // Reset only innings-specific flags, keep total stats
        setAllPlayers(prevPlayers => prevPlayers.map(p => ({
          ...p,
          isOut: false,
          hasBatted: false
        })));

        setCurrentView('innings_break'); // Go to innings break view

      } else if (currentInnings === 2) {
        // Second innings over, determine winner
        let winnerMessage = "";
        const target = innings1Score !== null ? innings1Score + 1 : 0;
        const chasingTeam = battingTeam;
        const defendingTeam = bowlingTeam;

        if (score.runs >= target) {
          const wicketsRemaining = 10 - score.wickets;
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

        } else if (score.runs === innings1Score && (inningsEndedByWickets || inningsEndedByOvers)) { // Draw condition
          winnerMessage = `Match Tied! Scores level at ${innings1Score} each.`;
        } else if (inningsEndedByWickets || inningsEndedByOvers) { // All out or overs finished, and not a win by wickets or draw
          const runsNeeded = target - score.runs - 1; // Runs Team A won by
          winnerMessage = `${defendingTeam} wins by ${runsNeeded} runs!`;
        }
        setMatchResult(winnerMessage); // Set the match result state
        setCurrentView('match_end'); // Go to match end view
      }
    } else if (isWicketCall && currentWickets < 10 && playersNotOutYet.length > 0) { // Only prompt for new batsman if a wicket fell
      // Continue with batsman selection if wicket fell but innings not over
      if (isLastBallOfOverBeforeWicket) {
        setCurrentView('new_batsman_selection');
      } else {
        setCurrentView('new_batsman_selection');
      }
    }
  };

  const addExtra = (type: string, runs: number = 1) => {
    setScore(prev => {
      const newRuns = prev.runs + runs;
      let newBalls = prev.balls;
      let newOvers = prev.overs;

      if (type !== "nb" && type !== "wd") { // B, LB count as a ball
        newBalls = prev.balls + 1;
        newOvers = Math.floor((prev.balls + 1) / 6) + ((prev.balls + 1) % 6) / 10;
        const isBallLastOfOver = (newBalls % 6 === 0 && newBalls !== 0);
        handleStrikeRotation(runs, isBallLastOfOver);
      }

      // Update bowler's runs conceded for wides and no balls
      if (currentBowler && (type === "nb" || type === "wd")) {
        setAllPlayers(prevPlayers => prevPlayers.map(p =>
          p.name === currentBowler.name ? { ...p, runsConceded: p.runsConceded + runs } : p
        ));
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
        bowler: currentBowler
      }]);

      let recentBallDisplay = type.toUpperCase();
      if (type === "b" || type === "lb") {
        recentBallDisplay = `${runs}${type}`;
      }

      // Log score before handleEndOfInnings from addExtra
      console.log("ADDEXTRA_BEFORE_END_INNINGS: Current score before check:", { runs: newRuns, wickets: prev.wickets, balls: newBalls });
      handleEndOfInnings(prev.wickets, newBalls, false);

      setRecentBalls(prev => [...prev.slice(-5), recentBallDisplay].slice(-6));
      return { runs: newRuns, wickets: prev.wickets, balls: newBalls, overs: newOvers };
    });
  };

  const undoLastBall = () => {
    if (recentBalls.length === 0) return; // Nothing to undo

    const lastEvent = ballHistory[ballHistory.length - 1];
    if (!lastEvent) return; // Should not happen if recentBalls is not empty

    const newRecentBalls = recentBalls.slice(0, -1);
    setBallHistory(prev => prev.slice(0, -1)); // Revert ball history

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

      // --- Revert individual player stats and overall boundary/dot ball counts ---
      setAllPlayers(prevPlayers => prevPlayers.map(p => {
        // Revert striker's stats
        if (lastEvent.striker && p.name === lastEvent.striker.name) {
          const updatedPlayer = { ...p };
          if (lastEvent.type === "runs") {
            updatedPlayer.runsScored = Math.max(0, p.runsScored - lastEvent.runs);
            updatedPlayer.ballsFaced = Math.max(0, p.ballsFaced - 1);
            if (lastEvent.runs === 4) setTotalFours(prev => Math.max(0, prev - 1));
            if (lastEvent.runs === 6) setTotalSixes(prev => Math.max(0, prev - 1));
            if (lastEvent.runs === 0) setTotalDotBalls(prev => Math.max(0, prev - 1));
          } else if (lastEvent.type === "wicket") {
            // Revert balls faced for the out batsman if it wasn't a run out
            if (lastEvent.wicketType !== "run_out") {
              updatedPlayer.ballsFaced = Math.max(0, p.ballsFaced - 1);
              if (p.isOut) updatedPlayer.isOut = false; // Revert isOut for striker if not run out
            }
          }
          return updatedPlayer;
        }

        // Revert outBatsman's stats for run out
        if (lastEvent.outBatsman && p.name === lastEvent.outBatsman.name) {
          if (lastEvent.type === "wicket" && lastEvent.wicketType === "run_out") {
            return { ...p, isOut: false, hasBatted: false, ballsFaced: Math.max(0, p.ballsFaced - 1) };
          }
        }

        // Revert bowler's stats
        if (lastEvent.bowler && p.name === lastEvent.bowler.name) {
          const updatedBowler = { ...p };
          if (lastEvent.type === "runs") {
            updatedBowler.runsConceded = Math.max(0, p.runsConceded - lastEvent.runs);
          } else if (lastEvent.type === "extra" && (lastEvent.extraType === "wd" || lastEvent.extraType === "nb")) {
            updatedBowler.runsConceded = Math.max(0, p.runsConceded - 1);
          } else if (lastEvent.type === "wicket") {
            updatedBowler.wicketsTaken = Math.max(0, p.wicketsTaken - 1);
          }
          return updatedBowler;
        }
        return p;
      }));

      // --- Undo Player Swaps and Bowler Overs if end of over was undone ---
      // Determine if the ball being undone *was* the 6th ball of an over (before current undo)
      const wasEndOfOver = (prevScore.balls % 6 === 0 && prevScore.balls !== 0);

      if (wasEndOfOver) {
        // Revert bowler overs count for the bowler who just finished the over
        if (lastBowler) {
          setBowlerOvers(prev => ({ ...prev, [lastBowler.name]: Math.max(0, (prev[lastBowler.name] || 0) - 1) }));
          // Revert bowler's total overs in allPlayers
          setAllPlayers(prevPlayers => prevPlayers.map(p =>
            p.name === lastBowler.name ? { ...p, oversBowled: Math.max(0, p.oversBowled - 1) } : p
          ));
          // Revert bowler's maiden count (simplified: assumes last over wasn't maiden if any runs were scored in it)
          // For proper maiden undo, need a history of runs per over.
          // For now, if the last over was a maiden, this won't perfectly undo maiden count.

          // If we are undoing an over, the current bowler was null (forced selection).
          // We need to set the currentBowler back to lastBowler for the purpose of the previous ball.
          setCurrentBowler(lastBowler);
          setLastBowler(null); // Clear last bowler after reverting
        }

        // Revert striker/non-striker swap that occurred at the end of the over
        setStriker(nonStriker);
        setNonStriker(striker);
      } else { // Not end of over, check for mid-over strike rotation undo
        // This is tricky: we need to know what the runs for the undone ball were BEFORE it was undone.
        // Given `recentBalls` is just a string, we infer by the current `striker` / `nonStriker` positions.
        // If the current `striker` is what was `nonStriker` from previous state (before this undo logic runs),
        // it implies an odd run caused a swap. So, swap them back.
        // This relies on `setStriker` / `setNonStriker` being synchronous, which they are not guarantee to be within `setScore`.
        // A more robust solution requires storing previous striker/nonStriker with each ball in recentBalls.
        if (lastEvent.type === "runs" && lastEvent.runs % 2 !== 0) {
          setStriker(nonStriker);
          setNonStriker(striker);
        }
      }

      // If the undo brought us back from a player selection screen, go to scoring
      if (currentView === 'new_batsman_selection' || currentView === 'new_bowler_selection') {
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
    const totalOvers = matchData.overs;
    if (totalOvers <= 10) return 1;
    if (totalOvers <= 20) return 4;
    if (totalOvers <= 50) return 10;
    return 2; // Default or fallback
  };

  if (currentView === 'player_selection') {
    return (
      <div className="min-h-screen bg-gray-900 text-white font-sans p-4">
        <div className="max-w-md mx-auto">
          <Card className="shadow-cricket animate-slide-up bg-orange-800 bg-opacity-70 backdrop-blur-sm border border-orange-600/50">
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
          <Card className="shadow-cricket animate-slide-up bg-orange-800 bg-opacity-70 backdrop-blur-sm border border-orange-600/50">
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
                    setStriker(newBatsman);
                    setNewBatsman(null);
                    setCurrentView('scoring');
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
    // Filter out bowlers who have bowled max overs or are wicket keepers
    const availableBowlers = allPlayers.filter(p =>
      (bowlingTeam === matchData.teamA ? matchData.teamAPlayers.some((tp: any) => tp.name === p.name) : matchData.teamBPlayers.some((tp: any) => tp.name === p.name))
      && !p.isWicketKeeper
      && (bowlerOvers[p.name] || 0) < getMaxOversPerBowler()
      && p.name !== (lastBowler ? lastBowler.name : '') // Exclude last bowler if possible
    );

    return (
      <div className="min-h-screen bg-gray-900 text-white font-sans p-4">
        <div className="max-w-md mx-auto">
          <Card className="shadow-cricket animate-slide-up bg-orange-800 bg-opacity-70 backdrop-blur-sm border border-orange-600/50">
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
          <Card className="shadow-cricket animate-slide-up bg-orange-800 bg-opacity-70 backdrop-blur-sm border border-orange-600/50">
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
          <Card className="shadow-cricket animate-slide-up bg-orange-800 bg-opacity-70 backdrop-blur-sm border border-orange-600/50">
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
        onViewSummary={() => setCurrentView('summary')}
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
      />
    );
  }

  if (currentView === 'summary') {
    return (
      <MatchSummary
        matchData={matchData}
        allPlayers={allPlayers}
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
        {/* Umpire Authentication */}
        {!umpireAuthenticated && (
          <Card className="shadow-cricket animate-slide-up bg-orange-800 bg-opacity-70 backdrop-blur-sm border border-orange-600/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
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

        {/* Match Info */}
        <Card className="shadow-cricket animate-slide-up bg-orange-800 bg-opacity-70 backdrop-blur-sm border border-orange-600/50">
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
                onClick={() => setCurrentView('scoring')}
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
          <Card className="shadow-cricket animate-slide-up bg-orange-800 bg-opacity-70 backdrop-blur-sm border border-orange-600/50">
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
      </div>
    </div>
  );
};