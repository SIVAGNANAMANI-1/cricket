import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { db } from "@/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

export default function LivePage() {
  // we route with param name `publicCode` in App.tsx
  const { publicCode } = useParams<{ publicCode: string }>();
  const location = useLocation();
  const [match, setMatch] = useState<any>(location.state?.matchData || null);
  const [loading, setLoading] = useState<boolean>(!match);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!publicCode) return;
    const ref = doc(db, "matches", publicCode);

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setMatch(snap.data());
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
    return <div className="p-8 text-center text-gray-300 text-xl">Loading match details…</div>;
  }

  if (notFound || !match) {
    return (
      <div className="p-8 text-center text-red-400 text-xl">
        ❌ Match not found
        <p className="text-gray-400 mt-2">Check if the Match ID is correct.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900/40 border border-gray-700 rounded-xl shadow-lg backdrop-blur-md">
      <h1 className="text-2xl font-bold text-orange-400 text-center mb-4">Live Match – {publicCode}</h1>

      <div className="grid grid-cols-2 gap-4 text-center mb-6">
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h2 className="text-xl font-semibold">{match.teamA}</h2>
        </div>
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h2 className="text-xl font-semibold">{match.teamB}</h2>
        </div>
      </div>

      <div className="text-center text-lg mb-4">
        <span className="text-blue-300">Total Overs:</span> {match.overs}
      </div>

      <div className="text-center text-lg mb-2">
        <span className="text-blue-300">Status:</span>{" "}
        <span className="text-yellow-400 font-semibold">{match.status}</span>
      </div>

      <div className="mt-6 p-4 bg-gray-800/60 rounded-lg border border-gray-700 text-center text-gray-300">
        Scoring UI will go here…
      </div>
    </div>
  );
}
