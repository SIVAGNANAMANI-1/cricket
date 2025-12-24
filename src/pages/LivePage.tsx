import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { db } from "@/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import { LiveViewer } from "@/components/LiveViewer";

// Get the global App ID provided by the environment
const appId = (window as any).__app_id || 'default-app-id';

export default function LivePage() {
  // we route with param name `publicCode` in App.tsx
  const { publicCode } = useParams<{ publicCode: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [match, setMatch] = useState<any>(location.state?.matchData || null);
  const [loading, setLoading] = useState<boolean>(!match);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!publicCode) return;
    // CORRECTED PATH: artifacts/{appId}/public/data/matches/{publicCode}
    const docPath = `artifacts/${appId}/public/data/matches/${publicCode}`;
    console.log("LivePage: Listening to match at:", docPath);
    const ref = doc(db, docPath);

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data = snap.data();
        console.log("LivePage: Match data updated:", data);
        setMatch(data);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore error in LivePage:", err);
        setNotFound(true);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [publicCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-sky flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cricket-field mx-auto mb-4"></div>
          <p className="text-gray-300 text-xl">Loading match details…</p>
        </div>
      </div>
    );
  }

  if (notFound || !match) {
    return (
      <div className="min-h-screen bg-gradient-sky flex items-center justify-center p-4">
        <div className="text-center bg-card p-8 rounded-xl shadow-cricket max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-400 mb-2">Match Not Found</h1>
          <p className="text-gray-400 mb-4">
            The match code "{publicCode}" doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-gradient-field text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Extract match data for LiveViewer
  const score = match.score || { runs: 0, wickets: 0, overs: 0, balls: 0 };
  const striker = match.striker || null;
  const nonStriker = match.nonStriker || null;
  const currentBowler = match.currentBowler || null;
  const battingTeam = match.battingTeam || match.teamA || "Team A";
  const bowlingTeam = match.bowlingTeam || match.teamB || "Team B";
  const bowlerOvers = match.bowlerOvers || {};
  const allPlayers = match.allPlayers || [];
  const totalDotBalls = match.totalDotBalls || 0;
  const totalFours = match.totalFours || 0;
  const totalSixes = match.totalSixes || 0;
  const ballHistory = match.ballHistory || [];
  const currentOverRuns = match.currentOverRuns || 0;
  const currentOverBalls = match.currentOverBalls || 0;
  const currentInnings = match.currentInnings || 1;
  const innings1Score = match.innings1Score || null;

  return (
    <LiveViewer
      matchData={match}
      onBack={() => navigate("/")}
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
      matchResult={match.matchResult}
    />
  );
}
