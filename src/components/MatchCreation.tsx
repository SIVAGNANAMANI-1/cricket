import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share, Users, Clock, Zap } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";

// Get the global App ID provided by the environment
const appId = (window as any).__app_id || 'default-app-id';

interface Player {
  name: string;
  isCaptain?: boolean;
  isWicketKeeper?: boolean;
  isOut?: boolean;
  hasBatted?: boolean;
}

interface MatchCreationProps {
  onMatchCreated: (matchData: any) => void;
}

export const MatchCreation: React.FC<MatchCreationProps> = ({ onMatchCreated }) => {
  const [step, setStep] = useState<number>(1);

  const teamBInputRef = useRef<HTMLInputElement | null>(null);
  const teamAPlayerInputRef = useRef<HTMLInputElement | null>(null);
  const teamBPlayerInputRef = useRef<HTMLInputElement | null>(null);
  const publicCodeRef = useRef<string>("");
  const umpireKeyRef = useRef<string>("");

  const [tossDetails, setTossDetails] = useState({
    flippingTeam: "",
    callingTeam: "",
    call: "", // 'heads' or 'tails'
    result: "", // 'heads' or 'tails'
    winner: "",
  });

  const [isFlipping, setIsFlipping] = useState(false);
  const [displayChar, setDisplayChar] = useState("H");
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  const [matchData, setMatchData] = useState<any>({
    teamA: "",
    teamB: "",
    overs: 20,
    publicCode: "",
    umpireKey: "",
    tossWinner: "",
    tossDecision: "",
    teamAPlayers: [] as Player[],
    teamBPlayers: [] as Player[],
  });

  // Helpers
  const generatePublicCode = () =>
    Math.random().toString(36).substring(2, 8).toUpperCase();

  const generateUmpireKey = () =>
    "UMP-" + Math.random().toString(36).substring(2, 8).toUpperCase();

  // Create match and save to Firestore
  const handleCreateMatch = async () => {
    setIsCreatingMatch(true);
    setCreationError(null);

    const publicCode = publicCodeRef.current;
    const umpire = umpireKeyRef.current;

    // construct payload based on current values (don't rely on setState sync)
    const payload = {
      teamA: matchData.teamA,
      teamB: matchData.teamB,
      overs: matchData.overs,
      publicCode,
      umpireKey: umpire,
      tossWinner: matchData.tossWinner,
      tossDecision: matchData.tossDecision,
      teamAPlayers: matchData.teamAPlayers,
      teamBPlayers: matchData.teamBPlayers,
      status: "pending",
      isCreator: true,
      battingTeam: "",
      bowlingTeam: "",
      score: 0,
      wickets: 0,
      totalBalls: 0,
      ballsThisOver: [],
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
      log: [],
      lastEvent: "Match created.",
      createdAt: Date.now(),
    };

    try {
      // CORRECTED PATH: artifacts/{appId}/public/data/matches/{publicCode}
      await setDoc(doc(db, `artifacts/${appId}/public/data/matches/${publicCode}`), payload);
      
      // update local state for display (though navigation happens next)
      setMatchData((prev: any) => ({ ...prev, publicCode, umpireKey: umpire }));
      setIsCreatingMatch(false);
      onMatchCreated({ ...payload }); // parent handles navigation
    } catch (err: any) {
      console.error("Error creating match:", err);
      setCreationError(err?.message || "Failed to create match");
      setIsCreatingMatch(false);
    }
  };

  // Coin toss animation + logic
  const handleToss = () => {
    setIsFlipping(true);
    const flipInterval = setInterval(() => {
      setDisplayChar((prev) => (prev === "H" ? "T" : "H"));
    }, 100);

    setTimeout(() => {
      clearInterval(flipInterval);
      const calls = ["heads", "tails"] as const;
      const result = calls[Math.floor(Math.random() * calls.length)];
      setDisplayChar(result.charAt(0).toUpperCase());

      const teams = [matchData.teamA, matchData.teamB];
      let tossWinner = "";
      if (tossDetails.call === result) {
        tossWinner = tossDetails.callingTeam;
      } else {
        tossWinner = teams.find((t) => t !== tossDetails.callingTeam) || "";
      }

      setTossDetails((prev) => ({ ...prev, result, winner: tossWinner }));
      setMatchData((prev: any) => ({ ...prev, tossWinner }));
      setIsFlipping(false);
    }, 1600);
  };

  // Player add helpers
  const addPlayerToTeamA = (name: string) => {
    if (!name) return;
    setMatchData((prev: any) => ({
      ...prev,
      teamAPlayers: [...prev.teamAPlayers, { name }],
    }));
  };
  const addPlayerToTeamB = (name: string) => {
    if (!name) return;
    setMatchData((prev: any) => ({
      ...prev,
      teamBPlayers: [...prev.teamBPlayers, { name }],
    }));
  };

  // Toggle captain/WK
  const toggleCaptainA = (playerName: string) => {
    setMatchData((prev: any) => ({
      ...prev,
      teamAPlayers: prev.teamAPlayers.map((p: Player) =>
        p.name === playerName ? { ...p, isCaptain: !p.isCaptain } : { ...p, isCaptain: false }
      ),
    }));
  };
  const toggleWK_A = (playerName: string) => {
    setMatchData((prev: any) => ({
      ...prev,
      teamAPlayers: prev.teamAPlayers.map((p: Player) =>
        p.name === playerName ? { ...p, isWicketKeeper: !p.isWicketKeeper } : { ...p, isWicketKeeper: false }
      ),
    }));
  };
  const toggleCaptainB = (playerName: string) => {
    setMatchData((prev: any) => ({
      ...prev,
      teamBPlayers: prev.teamBPlayers.map((p: Player) =>
        p.name === playerName ? { ...p, isCaptain: !p.isCaptain } : { ...p, isCaptain: false }
      ),
    }));
  };
  const toggleWK_B = (playerName: string) => {
    setMatchData((prev: any) => ({
      ...prev,
      teamBPlayers: prev.teamBPlayers.map((p: Player) =>
        p.name === playerName ? { ...p, isWicketKeeper: !p.isWicketKeeper } : { ...p, isWicketKeeper: false }
      ),
    }));
  };

  // UI
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400 mb-2">
            The Third Umpire
          </h1>
          <p className="text-gray-300">Create your cricket match</p>
        </div>

        {step === 1 && (
          <Card className="shadow-cricket animate-slide-up bg-orange-800 bg-opacity-70 backdrop-blur-sm border border-orange-600/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="w-5 h-5 text-primary" />
                Team Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-gray-300">Team 1</label>
                <Input
                  placeholder="Enter team name"
                  value={matchData.teamA}
                  onChange={(e) => setMatchData((p: any) => ({ ...p, teamA: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") teamBInputRef.current?.focus();
                  }}
                  className="border-2 focus:border-primary bg-gray-700 text-white"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block text-gray-300">Team 2</label>
                <Input
                  ref={teamBInputRef}
                  placeholder="Enter team name"
                  value={matchData.teamB}
                  onChange={(e) => setMatchData((p: any) => ({ ...p, teamB: e.target.value }))}
                  className="border-2 focus:border-primary bg-gray-700 text-white"
                />
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!matchData.teamA || !matchData.teamB}
                className="w-full bg-primary hover:opacity-90 transition-all duration-300"
              >
                Next: Team Players
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="shadow-cricket animate-slide-up bg-orange-800 bg-opacity-70 backdrop-blur-sm border border-orange-600/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="w-5 h-5 text-primary" />
                Team Players
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Team A */}
              <div className="space-y-2">
                <label className="text-sm font-medium block text-gray-300">
                  {matchData.teamA || "Team A"} Players ({matchData.teamAPlayers.length}/11)
                </label>
                <Input
                  placeholder="Player Name"
                  ref={teamAPlayerInputRef}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.currentTarget as HTMLInputElement).value) {
                      addPlayerToTeamA((e.currentTarget as HTMLInputElement).value);
                      (e.currentTarget as HTMLInputElement).value = "";
                      if (matchData.teamAPlayers.length + 1 === 11) teamBPlayerInputRef.current?.focus();
                    }
                  }}
                  disabled={matchData.teamAPlayers.length >= 11}
                  className="border-2 focus:border-primary bg-gray-700 text-white"
                />

                <div className="grid grid-cols-2 gap-2 mt-2">
                  {matchData.teamAPlayers.map((player: Player, idx: number) => (
                    <Badge key={idx} variant="secondary" className="flex items-center justify-between bg-gray-600 text-white">
                      {player.name}
                      <div className="flex gap-1">
                        <Button
                          variant={player.isCaptain ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleCaptainA(player.name)}
                          className={player.isCaptain ? "" : "bg-gray-700 border-gray-500 text-white hover:bg-gray-600"}
                        >
                          C
                        </Button>
                        <Button
                          variant={player.isWicketKeeper ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleWK_A(player.name)}
                          className={player.isWicketKeeper ? "" : "bg-gray-700 border-gray-500 text-white hover:bg-gray-600"}
                        >
                          WK
                        </Button>
                      </div>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Team B */}
              <div className="space-y-2">
                <label className="text-sm font-medium block text-gray-300">
                  {matchData.teamB || "Team B"} Players ({matchData.teamBPlayers.length}/11)
                </label>
                <Input
                  placeholder="Player Name"
                  ref={teamBPlayerInputRef}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.currentTarget as HTMLInputElement).value) {
                      addPlayerToTeamB((e.currentTarget as HTMLInputElement).value);
                      (e.currentTarget as HTMLInputElement).value = "";
                    }
                  }}
                  disabled={matchData.teamBPlayers.length >= 11}
                  className="border-2 focus:border-primary bg-gray-700 text-white"
                />

                <div className="grid grid-cols-2 gap-2 mt-2">
                  {matchData.teamBPlayers.map((player: Player, idx: number) => (
                    <Badge key={idx} variant="secondary" className="flex items-center justify-between bg-gray-600 text-white">
                      {player.name}
                      <div className="flex gap-1">
                        <Button
                          variant={player.isCaptain ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleCaptainB(player.name)}
                          className={player.isCaptain ? "" : "bg-gray-700 border-gray-500 text-white hover:bg-gray-600"}
                        >
                          C
                        </Button>
                        <Button
                          variant={player.isWicketKeeper ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleWK_B(player.name)}
                          className={player.isWicketKeeper ? "" : "bg-gray-700 border-gray-500 text-white hover:bg-gray-600"}
                        >
                          WK
                        </Button>
                      </div>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-primary hover:animate-pulse-glow"
                  disabled={
                    matchData.teamAPlayers.length !== 11 ||
                    matchData.teamBPlayers.length !== 11 ||
                    matchData.teamAPlayers.filter((p: Player) => p.isCaptain).length !== 1 ||
                    matchData.teamBPlayers.filter((p: Player) => p.isCaptain).length !== 1 ||
                    matchData.teamAPlayers.filter((p: Player) => p.isWicketKeeper).length !== 1 ||
                    matchData.teamBPlayers.filter((p: Player) => p.isWicketKeeper).length !== 1
                  }
                >
                  Next: Match Format
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="shadow-cricket animate-slide-up bg-orange-800 bg-opacity-70 backdrop-blur-sm border border-orange-600/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="w-5 h-5 text-primary" />
                Match Format
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-3 block text-gray-300">Select Overs</label>
                <div className="grid grid-cols-3 gap-3">
                  {[5, 10, 20, 50].map((o) => (
                    <Button
                      key={o}
                      variant={matchData.overs === o ? "default" : "outline"}
                      onClick={() => setMatchData((p: any) => ({ ...p, overs: o }))}
                      className="h-12"
                    >
                      {o}
                    </Button>
                  ))}
                </div>

                <div className="mt-3">
                  <Input
                    type="number"
                    placeholder="Custom overs"
                    onChange={(e) => setMatchData((p: any) => ({ ...p, overs: parseInt(e.target.value) || 20 }))}
                    className="border-2 focus:border-primary bg-gray-700 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep(4)} className="flex-1 bg-primary">
                  Next: Toss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="shadow-cricket animate-slide-up bg-orange-800 bg-opacity-70 backdrop-blur-sm border border-orange-600/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Zap className="w-5 h-5 text-primary" />
                Coin Toss
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium block text-gray-300">Which team will flip the coin?</label>
                <div className="flex gap-2">
                  <Button
                    variant={tossDetails.flippingTeam === matchData.teamA ? "default" : "outline"}
                    onClick={() => setTossDetails((p) => ({ ...p, flippingTeam: matchData.teamA, callingTeam: matchData.teamB }))}
                    className="flex-1"
                  >
                    {matchData.teamA}
                  </Button>
                  <Button
                    variant={tossDetails.flippingTeam === matchData.teamB ? "default" : "outline"}
                    onClick={() => setTossDetails((p) => ({ ...p, flippingTeam: matchData.teamB, callingTeam: matchData.teamA }))}
                    className="flex-1"
                  >
                    {matchData.teamB}
                  </Button>
                </div>
              </div>

              {tossDetails.flippingTeam && (
                <div className="space-y-2">
                  <label className="text-sm font-medium block text-gray-300">{tossDetails.callingTeam} call it!</label>
                  <div className="flex gap-2">
                    <Button
                      variant={tossDetails.call === "heads" ? "default" : "outline"}
                      onClick={() => setTossDetails((p) => ({ ...p, call: "heads" }))}
                      className="flex-1"
                    >
                      Heads
                    </Button>
                    <Button
                      variant={tossDetails.call === "tails" ? "default" : "outline"}
                      onClick={() => setTossDetails((p) => ({ ...p, call: "tails" }))}
                      className="flex-1"
                    >
                      Tails
                    </Button>
                  </div>
                </div>
              )}

              {tossDetails.call && !tossDetails.result && (
                <>
                  <div className={`coin-container ${isFlipping ? "flipping" : ""}`}>
                    <div className="coin">
                      <div className="side heads">{displayChar}</div>
                      <div className="side tails">{displayChar}</div>
                    </div>
                  </div>

                  <Button
                    onClick={handleToss}
                    className="w-full bg-primary hover:opacity-90 transition-all duration-300"
                    disabled={!tossDetails.flippingTeam || !tossDetails.callingTeam || !tossDetails.call || isFlipping}
                  >
                    {isFlipping ? "Flipping..." : "Flip Coin"}
                  </Button>
                </>
              )}

              {tossDetails.result && (
                <div className="text-center space-y-2 mt-4">
                  <p className="text-lg font-semibold text-white">Result: {tossDetails.result.toUpperCase()}</p>
                  <p className="text-xl font-bold text-primary">{tossDetails.winner} won the toss!</p>

                  <div className="space-y-2 mt-4">
                    <label className="text-sm font-medium block text-gray-300">{tossDetails.winner} decision:</label>
                    <div className="flex gap-2">
                      <Button
                        variant={matchData.tossDecision === "bat" ? "default" : "outline"}
                        onClick={() => setMatchData((p: any) => ({ ...p, tossDecision: "bat" }))}
                        className="flex-1"
                      >
                        Bat
                      </Button>
                      <Button
                        variant={matchData.tossDecision === "bowl" ? "default" : "outline"}
                        onClick={() => setMatchData((p: any) => ({ ...p, tossDecision: "bowl" }))}
                        className="flex-1"
                      >
                        Bowl
                      </Button>
                    </div>
                  </div>

                  {matchData.tossDecision && (
                    <Button
                      onClick={() => {
                        publicCodeRef.current = generatePublicCode();
                        umpireKeyRef.current = generateUmpireKey();
                        setMatchData((p: any) => ({ ...p, publicCode: publicCodeRef.current, umpireKey: umpireKeyRef.current }));
                        setStep(5);
                      }}
                      className="w-full bg-primary mt-4"
                    >
                      Next: Match Ready
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === 5 && (
          <Card className="shadow-cricket animate-slide-up bg-orange-800 bg-opacity-70 backdrop-blur-sm border border-orange-600/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Zap className="w-5 h-5 text-primary" />
                Match Ready!
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-center space-y-3">
                <div className="p-4 bg-accent rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Match Details</p>
                  <p className="font-semibold">{matchData.teamA} vs {matchData.teamB}</p>
                  <Badge variant="secondary" className="mt-2">
                    {matchData.overs} Overs
                  </Badge>

                  <p className="text-sm mt-2">
                    {matchData.tossWinner} won the toss and decided to {matchData.tossDecision} first.
                  </p>

                  {/* CHANGED P TAGS TO DIV TAGS BELOW TO FIX NESTING ERROR */}
                  <div className="text-sm mt-2 font-mono text-cricket-field flex items-center justify-center gap-2">
                    Public Match Code: <Badge>{publicCodeRef.current || "—"}</Badge>
                  </div>

                  <div className="text-sm mt-2 font-mono text-cricket-field flex items-center justify-center gap-2">
                    Umpire Key: <Badge>{umpireKeyRef.current || "—"}</Badge>
                  </div>
                </div>
              </div>

              {creationError && (
                <div className="text-red-500 text-sm text-center">
                  {creationError}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(4)} className="flex-1">
                  Back
                </Button>

                <Button
                  onClick={handleCreateMatch}
                  className="flex-1 bg-primary hover:animate-pulse-glow"
                  disabled={!matchData.tossWinner || !matchData.tossDecision || isCreatingMatch}
                >
                  <Share className="w-4 h-4 mr-2" />
                  {isCreatingMatch ? "Creating..." : "Create Match"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
export default MatchCreation;