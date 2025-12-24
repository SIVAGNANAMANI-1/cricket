import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share, Users, Clock, Zap, Copy, Check } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { db } from "@/firebaseConfig";
import { useNavigate } from "react-router-dom";

// Get the global App ID provided by the environment
const appId = (window as any).__app_id || 'default-app-id';
// Get the initial auth token if provided by the environment
const initialAuthToken = (window as any).__initial_auth_token;

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
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const teamBInputRef = useRef<HTMLInputElement | null>(null);
  const teamAPlayerInputRef = useRef<HTMLInputElement | null>(null);
  const teamBPlayerInputRef = useRef<HTMLInputElement | null>(null);

  const publicCodeRef = useRef<string>("");
  const umpireKeyRef = useRef<string>("");

  const [tossDetails, setTossDetails] = useState({
    flippingTeam: "",
    callingTeam: "",
    call: "",
    result: "",
    winner: "",
  });

  const [coinState, setCoinState] = useState<'idle' | 'flipping-heads' | 'flipping-tails'>('idle');
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  // Auth states
  const [user, setUser] = useState<any>(null);
  // Default to TRUE so buttons are enabled by default
  const [isAuthBypassed, setIsAuthBypassed] = useState(true);

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
    teamSize: 11,
  });

  // New state for umpire code input show/hide and values
  const [isUmpireAuthStarted, setIsUmpireAuthStarted] = useState(false);
  const [inputUmpireCode, setInputUmpireCode] = useState("");
  const [umpireAuthError, setUmpireAuthError] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleUmpireAuth = async () => {
    setUmpireAuthError(null);
    if (inputUmpireCode !== umpireKeyRef.current) {
      setUmpireAuthError("Incorrect umpire code.");
    } else {
      // Authentication successful: create match and proceed to dashboard
      setIsLoadingAuth(true);
      await handleCreateMatch();
      setIsLoadingAuth(false);
      window.location.reload();
    }
  };

  // --- AUTHENTICATION LOGIC ---
  useEffect(() => {
    const auth = getAuth();

    const performSignIn = async () => {
      try {
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.warn("Auth failed, running in Guest Mode:", error);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        performSignIn();
      }
    });

    return () => unsubscribe();
  }, []);

  // Helpers
  const generatePublicCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
  const generateUmpireKey = () => "UMP-" + Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleCreateMatch = async () => {
    setIsCreatingMatch(true);
    setCreationError(null);

    let publicCode = publicCodeRef.current || matchData.publicCode;
    let umpireKey = umpireKeyRef.current || matchData.umpireKey;

    if (!publicCode || !umpireKey) {
      publicCode = generatePublicCode();
      umpireKey = generateUmpireKey();
      publicCodeRef.current = publicCode;
      umpireKeyRef.current = umpireKey;
    }

    const creatorId = user?.uid || `guest_${Math.random().toString(36).slice(2)}`;
    const payload = {
      teamA: matchData.teamA,
      teamB: matchData.teamB,
      overs: matchData.overs,
      publicCode,
      umpireKey,
      tossWinner: matchData.tossWinner,
      tossDecision: matchData.tossDecision,
      teamAPlayers: matchData.teamAPlayers,
      teamBPlayers: matchData.teamBPlayers,
      teamSize: matchData.teamSize,
      maxOversPerBowler: Math.ceil(matchData.overs / (matchData.teamSize - 1)),
      status: "pending",
      isCreator: true,
      creatorId: creatorId,
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
      const docPath = `artifacts/${appId}/public/data/matches/${publicCode}`;
      console.log("Saving match to:", docPath);

      // Create a timeout promise that rejects after 5 seconds
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Firebase write timeout")), 5000)
      );

      // Race the setDoc against the timeout
      await Promise.race([
        setDoc(doc(db, docPath), payload),
        timeoutPromise
      ]);

      console.log("Match saved successfully!");
    } catch (err: any) {
      console.warn("Backend write failed or timed out (expected in Guest Mode). Proceeding locally.", err);
    } finally {
      setIsCreatingMatch(false);
      onMatchCreated(payload);
    }
  };

  // --- Coin Toss & Player Logic ---
  const handleToss = () => {
    // 1. Decide result immediately
    const calls = ["heads", "tails"] as const;
    const result = calls[Math.floor(Math.random() * calls.length)];

    // 2. Start animation based on result
    setCoinState(result === 'heads' ? 'flipping-heads' : 'flipping-tails');

    // 3. Wait for animation to finish (3s matches CSS)
    setTimeout(() => {
      const teams = [matchData.teamA, matchData.teamB];
      let tossWinner = "";
      if (tossDetails.call === result) {
        tossWinner = tossDetails.callingTeam;
      } else {
        tossWinner = teams.find((t) => t !== tossDetails.callingTeam) || "";
      }

      setTossDetails((prev) => ({ ...prev, result, winner: tossWinner }));
      setMatchData((prev: any) => ({ ...prev, tossWinner }));
    }, 3000);
  };

  const addPlayerToTeamA = (name: string) => {
    if (!name) return;
    setMatchData((prev: any) => ({ ...prev, teamAPlayers: [...prev.teamAPlayers, { name }] }));
  };
  const addPlayerToTeamB = (name: string) => {
    if (!name) return;
    setMatchData((prev: any) => ({ ...prev, teamBPlayers: [...prev.teamBPlayers, { name }] }));
  };

  const toggleCaptainA = (playerName: string) => {
    setMatchData((prev: any) => ({ ...prev, teamAPlayers: prev.teamAPlayers.map((p: Player) => p.name === playerName ? { ...p, isCaptain: !p.isCaptain } : { ...p, isCaptain: false }) }));
  };
  const toggleWK_A = (playerName: string) => {
    setMatchData((prev: any) => ({ ...prev, teamAPlayers: prev.teamAPlayers.map((p: Player) => p.name === playerName ? { ...p, isWicketKeeper: !p.isWicketKeeper } : { ...p, isWicketKeeper: false }) }));
  };
  const toggleCaptainB = (playerName: string) => {
    setMatchData((prev: any) => ({ ...prev, teamBPlayers: prev.teamBPlayers.map((p: Player) => p.name === playerName ? { ...p, isCaptain: !p.isCaptain } : { ...p, isCaptain: false }) }));
  };
  const toggleWK_B = (playerName: string) => {
    setMatchData((prev: any) => ({ ...prev, teamBPlayers: prev.teamBPlayers.map((p: Player) => p.name === playerName ? { ...p, isWicketKeeper: !p.isWicketKeeper } : { ...p, isWicketKeeper: false }) }));
  };

  // UI
  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70 mb-2">
            The Third Umpire
          </h1>
          <p className="text-muted-foreground">Create your cricket match</p>
        </div>

        {step === 1 && (
          <Card className="shadow-cricket animate-slide-up bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Users className="w-5 h-5 text-primary" />
                Team Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-muted-foreground">Team 1</label>
                <Input
                  placeholder="Enter team name"
                  value={matchData.teamA}
                  onChange={(e) => setMatchData((p: any) => ({ ...p, teamA: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") teamBInputRef.current?.focus(); }}
                  className="border-input focus:border-primary bg-background text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block text-muted-foreground">Team 2</label>
                <Input
                  ref={teamBInputRef}
                  placeholder="Enter team name"
                  value={matchData.teamB}
                  onChange={(e) => setMatchData((p: any) => ({ ...p, teamB: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && matchData.teamA && matchData.teamB) {
                      setStep(2);
                    }
                  }}
                  className="border-input focus:border-primary bg-background text-foreground"
                />
              </div>
              <Button onClick={() => setStep(2)} disabled={!matchData.teamA || !matchData.teamB} className="w-full bg-primary text-primary-foreground hover:opacity-90 transition-all duration-300">
                Next: Match Details
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="shadow-cricket animate-slide-up bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Users className="w-5 h-5 text-primary" />
                Match Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-muted-foreground">Number of Players per Team (Min 4)</label>
                <Input
                  type="number"
                  min={4}
                  max={11}
                  placeholder="11"
                  value={matchData.teamSize}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setMatchData((p: any) => ({ ...p, teamSize: isNaN(val) ? "" : val }));
                  }}
                  className="border-input focus:border-primary bg-background text-foreground"
                />
              </div>


              <div>
                <label className="text-sm font-medium mb-3 block text-muted-foreground">Overs</label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 20, 50].map((o) => (
                    <Button key={o} variant={matchData.overs === o ? "default" : "outline"} onClick={() => setMatchData((p: any) => ({ ...p, overs: o }))} className="h-10 text-xs">
                      {o}
                    </Button>
                  ))}
                </div>
                <Input
                  type="number"
                  placeholder="Custom overs"
                  value={matchData.overs}
                  onChange={(e) => setMatchData((p: any) => ({ ...p, overs: parseInt(e.target.value) || 20 }))}
                  className="border-input focus:border-primary bg-background text-foreground mt-2"
                />
              </div>

              {matchData.teamSize >= 4 && matchData.overs > 0 && (
                <div className="bg-muted p-3 rounded border border-border text-sm">
                  <p className="font-semibold text-primary">Match Feasibility:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                    <li>Bowlers per team: <span className="text-foreground font-bold">{matchData.teamSize - 1}</span> (1 WK)</li>
                    <li>Max overs per bowler: <span className="text-foreground font-bold">{Math.ceil(matchData.overs / (matchData.teamSize - 1))}</span></li>
                  </ul>
                </div>
              )}

              <div className="flex gap-3 flex-col sm:flex-row mt-4">
                <Button
                  onClick={() => {
                    setMatchData((p: any) => ({ ...p, teamSize: 11, overs: 20 }));
                    setStep(3);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  Quick Start (11v11, 20ov)
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!matchData.teamSize || matchData.teamSize < 4 || matchData.teamSize > 11 || !matchData.overs || matchData.overs < 1}
                  className="flex-1 bg-primary text-primary-foreground hover:opacity-90"
                >
                  Continue
                </Button>
              </div>
              <Button variant="outline" onClick={() => setStep(1)} className="w-full mt-2">Back</Button>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="shadow-cricket animate-slide-up bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Users className="w-5 h-5 text-primary" />
                Team Players
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Team A Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium block text-muted-foreground">{matchData.teamA || "Team A"} Players ({matchData.teamAPlayers.length}/{matchData.teamSize})</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Player Name"
                    ref={teamAPlayerInputRef}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.currentTarget as HTMLInputElement).value) {
                        addPlayerToTeamA((e.currentTarget as HTMLInputElement).value);
                        (e.currentTarget as HTMLInputElement).value = "";
                        if (matchData.teamAPlayers.length + 1 === matchData.teamSize) teamBPlayerInputRef.current?.focus();
                      }
                    }}
                    disabled={matchData.teamAPlayers.length >= matchData.teamSize}
                    className="border-input focus:border-primary bg-background text-foreground"
                  />
                  <Button
                    onClick={() => {
                      if (teamAPlayerInputRef.current && teamAPlayerInputRef.current.value) {
                        addPlayerToTeamA(teamAPlayerInputRef.current.value);
                        teamAPlayerInputRef.current.value = "";
                        if (matchData.teamAPlayers.length + 1 === matchData.teamSize) teamBPlayerInputRef.current?.focus();
                      }
                    }}
                    disabled={matchData.teamAPlayers.length >= matchData.teamSize}
                    className="bg-primary text-primary-foreground hover:opacity-90"
                  >
                    Enter
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {matchData.teamAPlayers.map((player: Player, idx: number) => {
                    const isCaptainSelected = matchData.teamAPlayers.some((p: Player) => p.isCaptain);
                    const isWKSelected = matchData.teamAPlayers.some((p: Player) => p.isWicketKeeper);
                    return (
                      <div key={idx} className="flex items-center justify-between bg-muted text-foreground p-2 rounded text-sm shadow-sm transition-all hover:brightness-110">
                        <span className="truncate mr-2 font-medium">{player.name}</span>
                        <div className="flex gap-1">
                          {(!isCaptainSelected || player.isCaptain) && (
                            <button onClick={() => toggleCaptainA(player.name)} className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${player.isCaptain ? 'bg-orange-600 text-white border border-orange-400 shadow-md transform scale-105' : 'bg-primary/20 text-primary hover:bg-primary/30'}`}>C</button>
                          )}
                          {(!isWKSelected || player.isWicketKeeper) && (
                            <button onClick={() => toggleWK_A(player.name)} className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${player.isWicketKeeper ? 'bg-orange-600 text-white border border-orange-400 shadow-md transform scale-105' : 'bg-primary/20 text-primary hover:bg-primary/30'}`}>WK</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Team B Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium block text-muted-foreground">{matchData.teamB || "Team B"} Players ({matchData.teamBPlayers.length}/{matchData.teamSize})</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Player Name"
                    ref={teamBPlayerInputRef}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.currentTarget as HTMLInputElement).value) {
                        addPlayerToTeamB((e.currentTarget as HTMLInputElement).value);
                        (e.currentTarget as HTMLInputElement).value = "";
                      }
                    }}
                    disabled={matchData.teamBPlayers.length >= matchData.teamSize}
                    className="border-input focus:border-primary bg-background text-foreground"
                  />
                  <Button
                    onClick={() => {
                      if (teamBPlayerInputRef.current && teamBPlayerInputRef.current.value) {
                        addPlayerToTeamB(teamBPlayerInputRef.current.value);
                        teamBPlayerInputRef.current.value = "";
                      }
                    }}
                    disabled={matchData.teamBPlayers.length >= matchData.teamSize}
                    className="bg-primary text-primary-foreground hover:opacity-90"
                  >
                    Enter
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {matchData.teamBPlayers.map((player: Player, idx: number) => {
                    const isCaptainSelected = matchData.teamBPlayers.some((p: Player) => p.isCaptain);
                    const isWKSelected = matchData.teamBPlayers.some((p: Player) => p.isWicketKeeper);
                    return (
                      <div key={idx} className="flex items-center justify-between bg-muted text-foreground p-2 rounded text-sm shadow-sm transition-all hover:brightness-110">
                        <span className="truncate mr-2 font-medium">{player.name}</span>
                        <div className="flex gap-1">
                          {(!isCaptainSelected || player.isCaptain) && (
                            <button onClick={() => toggleCaptainB(player.name)} className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${player.isCaptain ? 'bg-orange-600 text-white border border-orange-400 shadow-md transform scale-105' : 'bg-primary/20 text-primary hover:bg-primary/30'}`}>C</button>
                          )}
                          {(!isWKSelected || player.isWicketKeeper) && (
                            <button onClick={() => toggleWK_B(player.name)} className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${player.isWicketKeeper ? 'bg-orange-600 text-white border border-orange-400 shadow-md transform scale-105' : 'bg-primary/20 text-primary hover:bg-primary/30'}`}>WK</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                <Button
                  onClick={() => setStep(4)}
                  className="flex-1 bg-primary hover:animate-pulse-glow"
                  disabled={
                    matchData.teamAPlayers.length !== matchData.teamSize ||
                    matchData.teamBPlayers.length !== matchData.teamSize ||
                    !matchData.teamAPlayers.some((p: Player) => p.isCaptain) ||
                    !matchData.teamBPlayers.some((p: Player) => p.isCaptain) ||
                    !matchData.teamAPlayers.some((p: Player) => p.isWicketKeeper) ||
                    !matchData.teamBPlayers.some((p: Player) => p.isWicketKeeper)
                  }
                >
                  Next: Toss
                </Button>
              </div>
              {(matchData.teamAPlayers.length === matchData.teamSize || matchData.teamBPlayers.length === matchData.teamSize) && (
                <div className="text-xs text-gray-400 mt-2 space-y-1">
                  {matchData.teamAPlayers.length === matchData.teamSize && !matchData.teamAPlayers.some((p: Player) => p.isCaptain) && (
                    <p className="text-yellow-400">⚠️ Select a captain for {matchData.teamA}</p>
                  )}
                  {matchData.teamAPlayers.length === matchData.teamSize && !matchData.teamAPlayers.some((p: Player) => p.isWicketKeeper) && (
                    <p className="text-yellow-400">⚠️ Select a wicket-keeper for {matchData.teamA}</p>
                  )}
                  {matchData.teamBPlayers.length === matchData.teamSize && !matchData.teamBPlayers.some((p: Player) => p.isCaptain) && (
                    <p className="text-yellow-400">⚠️ Select a captain for {matchData.teamB}</p>
                  )}
                  {matchData.teamBPlayers.length === matchData.teamSize && !matchData.teamBPlayers.some((p: Player) => p.isWicketKeeper) && (
                    <p className="text-yellow-400">⚠️ Select a wicket-keeper for {matchData.teamB}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="shadow-cricket animate-slide-up bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Zap className="w-5 h-5 text-primary" />
                Coin Toss
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium block text-muted-foreground">Which team will flip the coin?</label>
                <div className="flex gap-2">
                  <Button variant={tossDetails.flippingTeam === matchData.teamA ? "default" : "outline"} onClick={() => setTossDetails((p) => ({ ...p, flippingTeam: matchData.teamA, callingTeam: matchData.teamB }))} className="flex-1">{matchData.teamA}</Button>
                  <Button variant={tossDetails.flippingTeam === matchData.teamB ? "default" : "outline"} onClick={() => setTossDetails((p) => ({ ...p, flippingTeam: matchData.teamB, callingTeam: matchData.teamA }))} className="flex-1">{matchData.teamB}</Button>
                </div>
              </div>
              {tossDetails.flippingTeam && (
                <div className="space-y-2">
                  <label className="text-sm font-medium block text-muted-foreground">{tossDetails.callingTeam} call it!</label>
                  <div className="flex gap-2">
                    <Button variant={tossDetails.call === "heads" ? "default" : "outline"} onClick={() => setTossDetails((p) => ({ ...p, call: "heads" }))} className="flex-1">Heads</Button>
                    <Button variant={tossDetails.call === "tails" ? "default" : "outline"} onClick={() => setTossDetails((p) => ({ ...p, call: "tails" }))} className="flex-1">Tails</Button>
                  </div>
                </div>
              )}
              {tossDetails.call && !tossDetails.result && (
                <>
                  <div className={`coin-container`}>
                    <div className={`coin ${coinState}`}>
                      <div className="side heads">H</div>
                      <div className="side tails">T</div>
                    </div>
                  </div>
                  <Button onClick={handleToss} className="w-full bg-primary text-primary-foreground hover:opacity-90 transition-all duration-300" disabled={!tossDetails.flippingTeam || !tossDetails.callingTeam || !tossDetails.call || coinState !== 'idle'}>
                    {coinState !== 'idle' ? "Flipping..." : "Flip Coin"}
                  </Button>
                </>
              )}
              {tossDetails.result && (
                <div className="text-center space-y-2 mt-4">
                  <p className="text-lg font-semibold text-foreground">Result: {tossDetails.result.toUpperCase()}</p>
                  <p className="text-xl font-bold text-primary">{tossDetails.winner} won the toss!</p>
                  <div className="space-y-2 mt-4">
                    <label className="text-sm font-medium block text-muted-foreground">{tossDetails.winner} decision:</label>
                    <div className="flex gap-2">
                      <Button
                        variant={matchData.tossDecision === "bat" ? "default" : "outline"}
                        onClick={() => {
                          const publicCode = generatePublicCode();
                          const umpireKey = generateUmpireKey();
                          publicCodeRef.current = publicCode;
                          umpireKeyRef.current = umpireKey;
                          setMatchData((p: any) => ({
                            ...p,
                            tossDecision: "bat",
                            publicCode,
                            umpireKey,
                          }));
                        }}
                        className="flex-1"
                      >
                        Bat
                      </Button>
                      <Button
                        variant={matchData.tossDecision === "bowl" ? "default" : "outline"}
                        onClick={() => {
                          const publicCode = generatePublicCode();
                          const umpireKey = generateUmpireKey();
                          publicCodeRef.current = publicCode;
                          umpireKeyRef.current = umpireKey;
                          setMatchData((p: any) => ({
                            ...p,
                            tossDecision: "bowl",
                            publicCode,
                            umpireKey,
                          }));
                        }}
                        className="flex-1"
                      >
                        Bowl
                      </Button>
                    </div>
                  </div>
                  {matchData.tossDecision && (
                    <>
                      <div className="p-4 bg-muted rounded-lg mt-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Public Match Code:</p>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-xl font-bold text-primary tracking-wider">{publicCodeRef.current}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => copyToClipboard(publicCodeRef.current, 'public')}
                              >
                                {copiedField === 'public' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/50"
                            onClick={async () => {
                              const code = publicCodeRef.current || matchData.publicCode;
                              const shareText = `🏏 Live Match: ${matchData.teamA} vs ${matchData.teamB}\n🔑 Use Code: ${code}\n🔗 Link: ${window.location.origin}/live/${code}`;

                              if (navigator.share) {
                                try {
                                  await navigator.share({
                                    title: `${matchData.teamA} vs ${matchData.teamB}`,
                                    text: shareText,
                                    url: `${window.location.origin}/live/${code}`
                                  });
                                } catch (err) {
                                  console.log('Share failed:', err);
                                }
                              } else {
                                navigator.clipboard.writeText(shareText);
                                alert("Match code and link copied to clipboard!");
                              }
                            }}
                          >
                            <Share className="w-4 h-4 mr-2" />
                            Share Code
                          </Button>
                        </div>
                        <div className="pt-2 border-t border-border">
                          <p className="text-sm text-muted-foreground">Umpire Key:</p>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-lg text-primary">{umpireKeyRef.current}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => copyToClipboard(umpireKeyRef.current, 'umpire')}
                            >
                              {copiedField === 'umpire' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6">
                        <Button
                          onClick={handleCreateMatch}
                          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-6 text-lg shadow-lg hover:shadow-green-500/20 transition-all duration-300 transform hover:scale-[1.02]"
                          disabled={isCreatingMatch}
                        >
                          {isCreatingMatch ? (
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Creating Match...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>Go into Umpire Authentication</span>
                              <Zap className="w-5 h-5 fill-current" />
                            </div>
                          )}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground mt-3">
                          You will need to enter the Umpire Key on the next screen to verify your access.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {step === 5 && (
          <Card className="shadow-cricket animate-slide-up bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Umpire Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg flex flex-col items-center">
                <p className="text-sm font-medium text-muted-foreground mb-4 text-center">
                  Only the specific device with the correct Umpire Key can score this match.
                </p>
                <Input
                  type="text"
                  placeholder="Enter Umpire Key"
                  className="bg-background text-foreground border-input focus:border-primary text-center font-mono text-lg tracking-widest"
                  value={enteredUmpireKey}
                  onChange={(e) => setEnteredUmpireKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  (In a real app, this would be auto-verified or stored secureley)
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(4)} className="flex-1">Back</Button>
                <Button
                  onClick={() => {
                    // Simple structural check or direct match if we were storing it strictly
                    if (enteredUmpireKey === umpireKeyRef.current) {
                      setStep(6);
                    } else {
                      alert("Incorrect Umpire Key!");
                    }
                  }}
                  className="flex-1 bg-primary text-primary-foreground hover:opacity-90"
                >
                  Verify & Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {
          step === 6 && (
            <Card className="shadow-cricket animate-slide-up bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <Zap className="w-5 h-5 text-primary" />
                  Match Ready!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center space-y-3">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Match Details</p>
                    <p className="font-semibold text-foreground">{matchData.teamA} vs {matchData.teamB}</p>
                    <Badge variant="secondary" className="mt-2">{matchData.overs} Overs</Badge>
                    <p className="text-sm mt-2 text-muted-foreground">{matchData.tossWinner} won the toss and decided to {matchData.tossDecision} first.</p>

                    <div className="text-sm mt-2 font-mono text-primary flex items-center justify-center gap-2">
                      Public Match Code: <Badge>{publicCodeRef.current || matchData.publicCode || "—"}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => copyToClipboard(publicCodeRef.current || matchData.publicCode, 'public_final')}
                      >
                        {copiedField === 'public_final' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                    <div className="text-sm mt-2 font-mono text-primary flex items-center justify-center gap-2">
                      Umpire Key: <Badge>{umpireKeyRef.current || matchData.umpireKey || "—"}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => copyToClipboard(umpireKeyRef.current || matchData.umpireKey, 'umpire_final')}
                      >
                        {copiedField === 'umpire_final' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {creationError && (
                  <div className="text-destructive text-sm text-center bg-destructive/20 p-2 rounded">
                    {creationError}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(5)} className="flex-1">Back</Button>
                  <Button
                    onClick={handleCreateMatch}
                    className="flex-1 bg-primary text-primary-foreground hover:animate-pulse-glow"
                    disabled={isCreatingMatch}
                  >
                    {isCreatingMatch ? "Creating..." : "Create Match"}
                    {!isCreatingMatch && <Share className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        }
      </div >
    </div >
  );
};

export default MatchCreation;