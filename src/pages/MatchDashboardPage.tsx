import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { MatchDashboard } from "@/components/MatchDashboard";

const appId = (window as any).__app_id || 'default-app-id';

const MatchDashboardPage: React.FC = () => {
  const { publicCode } = useParams<{ publicCode: string }>();
  const navigate = useNavigate();
  const [matchData, setMatchData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatch = async () => {
      if (!publicCode) {
        setError("Invalid match code.");
        setLoading(false);
        return;
      }
      try {
        const docPath = `artifacts/${appId}/public/data/matches/${publicCode}`;
        const matchRef = doc(db, docPath);
        const snap = await getDoc(matchRef);
        if (!snap.exists()) {
          setError("Match not found.");
          setLoading(false);
          return;
        }
        setMatchData(snap.data());
        setLoading(false);
      } catch (err) {
        console.error("Failed to load match:", err);
        setError("Error loading match data.");
        setLoading(false);
      }
    };
    fetchMatch();
  }, [publicCode]);

  const handleBackToCreate = () => {
    navigate("/create-match");
  };

  if (loading) {
    return <div className="text-center text-white p-8">Loading match data...</div>;
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-8">
        <p>{error}</p>
        <button className="mt-4 px-4 py-2 bg-blue-600 rounded" onClick={handleBackToCreate}>
          Back to Create Match
        </button>
      </div>
    );
  }

  return (
    <MatchDashboard matchData={matchData} onBackToCreate={handleBackToCreate} />
  );
};

export default MatchDashboardPage;
