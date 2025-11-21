import React from "react";
import { useNavigate } from "react-router-dom";
import { JoinMatch } from "@/components/JoinMatch";

const JoinMatchPage: React.FC = () => {
  const navigate = useNavigate();

  const handleJoinMatch = (matchData: any) => {
    const publicCode = matchData.id; // Assuming id is the publicCode
    navigate(`/live/${publicCode}`, {
      state: { matchData },
    });
  };

  return <JoinMatch onJoinMatch={handleJoinMatch} />;
};

export default JoinMatchPage;
