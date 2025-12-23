import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 text-white p-4">
      <h1 className="text-4xl font-bold mb-12 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">
        The Third Umpire
      </h1>
      <div className="space-y-6 w-full max-w-xs">
        <Button
          className="w-full bg-gradient-to-r from-blue-600 to-green-500 hover:opacity-90 transition"
          onClick={() => navigate("/create-match")}
        >
          Create Match
        </Button>
        <Button
          className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-90 transition"
          onClick={() => navigate("/join-match")}
        >
          Join Match
        </Button>
      </div>
    </div>
  );
};

export default LandingPage;
