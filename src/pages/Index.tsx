import { useState } from "react";
import { MatchCreation } from "@/components/MatchCreation";
import { MatchDashboard } from "@/components/MatchDashboard";

const Index = () => {
  const [currentMatch, setCurrentMatch] = useState<any>(null);

  const handleMatchCreated = (matchData: any) => {
    setCurrentMatch(matchData);
    localStorage.setItem('liveCricketMatch', JSON.stringify(matchData));
  };

  const handleBackToCreate = () => {
    setCurrentMatch(null);
    localStorage.removeItem('liveCricketMatch');
  };

  return (
    <div className="min-h-screen">
      {!currentMatch && (
        <MatchCreation onMatchCreated={handleMatchCreated} />
      )}

      {currentMatch && (
        <MatchDashboard
          matchData={currentMatch}
          onBackToCreate={handleBackToCreate}
        />
      )}
    </div>
  );
};

export default Index;
