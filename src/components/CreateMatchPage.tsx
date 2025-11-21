import React from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MatchCreation } from "./MatchCreation";

const CreateMatchPage: React.FC = () => {
  const navigate = useNavigate();

  const handleMatchCreated = (match: any) => {
    // match.publicCode is generated inside MatchCreation.tsx
    if (match?.publicCode) {
      navigate(`/live/${match.publicCode}`);
    } else {
      console.error("Match has no publicCode! Cannot navigate.");
    }
  };

  return (
    <div className="w-full">
      <MatchCreation onMatchCreated={handleMatchCreated} />
    </div>
  );
};

export default CreateMatchPage;
