// src/pages/UmpireAuthPage.tsx
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function UmpireAuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [umpireCode, setUmpireCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Called when user clicks Authenticate
  const handleSubmit = async () => {
    setError(null);
    if (!umpireCode) {
      setError("Enter umpire code");
      return;
    }
    setIsLoading(true);
    try {
      // We expect match documents to store umpire keys / publicCode mapping
      // This assumes match documents are stored under "matches" with field umpireKey
      // If your structure differs, change collection/path accordingly
      const matchesRef = doc(db, "matches", umpireCode);
      // NOTE: many projects store a mapping; if your UI used a generated UMP-XXX, adapt this to query.
      // Try direct doc read
      const snap = await getDoc(matchesRef);

      // If doc not found, try scanning by field "umpireKey" (slower) - fallback
      if (!snap.exists()) {
        // fallback: query by field "umpireKey" -- left as comment for you to implement if needed
        // const q = query(collection(db, "matches"), where("umpireKey","==",umpireCode));
        // const qSnap = await getDocs(q);
        setError("Invalid umpire code or match not found. Double-check the code.");
        setIsLoading(false);
        return;
      }

      const matchData = { id: snap.id, ...snap.data() } as any;
      // compute publicCode (either present as field or same as id). Use a known field name "publicCode"
      const publicCode = matchData.publicCode || matchData.id || matchData.matchCode;

      // navigate to live page with param and pass match data in state. Live page will accept both.
      navigate(`/live/${publicCode}`, { state: { matchData, from: "umpireAuth" } });

    } catch (e: any) {
      console.error("Umpire auth error:", e);
      setError("Authentication failed. See console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-xl mb-4">Umpire Authentication</h2>
      <Input
        value={umpireCode}
        onChange={(e: any) => setUmpireCode(e.target.value.trim())}
        placeholder="Enter UMP-XXXX or match doc id"
        disabled={isLoading}
        className="mb-4"
      />
      {error && <div className="text-red-400 mb-4">{error}</div>}
      <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
        {isLoading ? "Authenticating..." : "Authenticate"}
      </Button>
    </div>
  );
}
