import { useState, useEffect } from "react";
import { MatchCreation } from "@/components/MatchCreation";
import { MatchDashboard } from "@/components/MatchDashboard";

const Index = () => {
  // Initialize state from local storage so refreshing doesn't lose the match

  const [currentMatch, setCurrentMatch] = useState<any>(() => {
    const saved = localStorage.getItem('liveCricketMatch');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate essential fields
        if (parsed && parsed.teamA && parsed.teamB) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse match data", e);
      }
    }
    return null;
  });

  const handleMatchCreated = (matchData: any) => {
    console.log("Match created! Switching to Dashboard:", matchData);
    // 1. Save to storage
    localStorage.setItem('liveCricketMatch', JSON.stringify(matchData));
    // 2. Update state to trigger re-render
    setCurrentMatch(matchData);
  };

  const handleBackToCreate = () => {
    // Clear everything to start over
    setCurrentMatch(null);
    localStorage.removeItem('liveCricketMatch');
  };

  return (
    <div className="min-h-screen">
      {/* Conditional Rendering:
        - If currentMatch is NULL -> Show Creation Form
        - If currentMatch EXISTS -> Show Dashboard
      */}
      {!currentMatch ? (
        <MatchCreation onMatchCreated={handleMatchCreated} />
      ) : (
        <MatchDashboard
          matchData={currentMatch}
          onBackToCreate={handleBackToCreate}
        />
      )}
    </div>
  );
};

export default Index;
