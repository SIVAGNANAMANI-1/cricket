import React from "react";
import { useNavigate } from "react-router-dom";
import { JoinMatch } from "@/components/JoinMatch";

const JoinMatchPage: React.FC = () => {
  const navigate = useNavigate();

  const handleJoinMatch = (matchData: any) => {
    const publicCode = matchData.publicCode || matchData.id || matchData.matchCode;
    if (publicCode) {
      navigate(`/live/${publicCode}`, {
        state: { matchData },
      });
    } else {
      console.error("Could not determine match code from data:", matchData);
    }
  };

  return <JoinMatch onJoinMatch={handleJoinMatch} />;
};

export default JoinMatchPage;
