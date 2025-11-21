import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RotateCcw, Target } from "lucide-react";

interface ScoringInterfaceProps {
  matchData: any;
  onBack: () => void;
  onViewSummary: () => void; // New prop for viewing match summary
  score: { runs: number; wickets: number; overs: number; balls: number };
  recentBalls: string[];
  addRuns: (runs: number) => void;
  addWicket: (wicketType: string, fielder?: string | null, runs?: number) => void;
  addExtra: (type: string, runs?: number) => void;
  undoLastBall: () => void;
  striker: any;
  nonStriker: any;
  currentBowler: any;
  allPlayers: any[]; // Add allPlayers to props
  battingTeam: string; // Add battingTeam to props
  bowlingTeam: string; // Add bowlingTeam to props
  bowlerOvers: { [key: string]: number }; // Add bowlerOvers to props
  currentOverRuns: number; // Add currentOverRuns to props
  currentOverBalls: number; // Add currentOverBalls to props
}

export const ScoringInterface = ({ matchData, onBack, onViewSummary, score, recentBalls, addRuns, addWicket, addExtra, undoLastBall, striker, nonStriker, currentBowler, allPlayers, battingTeam, bowlingTeam, bowlerOvers, currentOverRuns, currentOverBalls }: ScoringInterfaceProps) => {
  const [currentInnings, setCurrentInnings] = useState(1);
  const [selectedExtraType, setSelectedExtraType] = useState<string | null>(null);
  const [selectedWicketType, setSelectedWicketType] = useState<string | null>(null);
  const [fielderSelectionType, setFielderSelectionType] = useState<string | null>(null);
  const [selectedFielder, setSelectedFielder] = useState<string | null>(null);
  const [runOutRuns, setRunOutRuns] = useState<number>(0);
  const [runOutBatsmanSelection, setRunOutBatsmanSelection] = useState<boolean>(false);
  const [outBatsmanForRunOut, setOutBatsmanForRunOut] = useState<any>(null);

  // Function to find player stats from allPlayers array
  const getPlayerStats = (playerName: string) => {
    return allPlayers.find(p => p.name === playerName);
  };

  const currentStrikerStats = striker ? getPlayerStats(striker.name) : null;
  const currentNonStrikerStats = nonStriker ? getPlayerStats(nonStriker.name) : null;
  const currentBowlerStats = currentBowler ? getPlayerStats(currentBowler.name) : null;

  return (
    <div className="min-h-screen bg-gradient-sky p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-cricket-field">Live Scoring</h1>
            <p className="text-sm text-muted-foreground">
              {matchData.teamA} vs {matchData.teamB}
            </p>
          </div>
        </div>

        {/* Score Display */}
        <Card className="shadow-cricket mb-4 animate-fade-in">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-cricket-field mb-2">
                {score.runs}/{score.wickets}
              </div>
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <span>Overs: {score.overs.toFixed(1)}</span>
                <Badge variant="secondary">Innings {currentInnings}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Balls */}
        <Card className="shadow-cricket mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Balls</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-2">
              {recentBalls.map((ball, index) => (
                <Badge 
                  key={index}
                  variant={ball === "W" ? "destructive" : ball === "4" || ball === "6" ? "default" : "outline"}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                >
                  {ball}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current Players */}
        <Card className="shadow-cricket mb-4">
          <CardContent className="p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Striker:</span>
                <span className="font-medium">{currentStrikerStats ? `${currentStrikerStats.name} (${currentStrikerStats.runsScored} runs, ${currentStrikerStats.ballsFaced} balls)` : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Non-striker:</span>
                <span className="font-medium">{currentNonStrikerStats ? `${currentNonStrikerStats.name} (${currentNonStrikerStats.runsScored} runs, ${currentNonStrikerStats.ballsFaced} balls)` : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bowler:</span>
                <span className="font-medium">{currentBowlerStats ? currentBowlerStats.name : 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Bowling Details */}
        {currentBowlerStats && (
          <Card className="shadow-cricket mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Current Bowling</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex justify-between items-center py-2">
                <div>
                  <p className="font-medium">{currentBowlerStats.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Overs: {(bowlerOvers[currentBowlerStats.name] || 0) + (currentOverBalls / 10).toFixed(1).slice(1)} • Maidens: {currentBowlerStats.maidens || 0} • Runs: {currentOverRuns || 0} • Wickets: {currentBowlerStats.wicketsTaken || 0} • Dot Balls: {currentBowlerStats.dotBalls || 0}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    Econ: {((currentBowlerStats.runsConceded || 0) / ((bowlerOvers[currentBowlerStats.name] || 0) * 6 + currentOverBalls || 1) * 6).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scoring Buttons */}
        <div className="space-y-4">
          {/* Runs */}
          <Card className="shadow-cricket">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4" />
                Runs
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3, 4, 6].map((runs) => (
                  <Button
                    key={runs}
                    onClick={() => addRuns(runs)}
                    variant={runs === 4 || runs === 6 ? "default" : "outline"}
                    className={`h-12 text-lg font-bold ${
                      runs === 4 || runs === 6 ? "bg-gradient-field" : ""
                    }`}
                  >
                    {runs}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Wicket & Extras */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="shadow-cricket">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Wicket</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  onClick={() => setSelectedWicketType("select")}
                  variant="destructive"
                  className="w-full h-12 font-bold"
                >
                  OUT
                </Button>

                {selectedWicketType && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => {
                      addWicket("bowled");
                      setSelectedWicketType(null);
                    }}>
                      Bowled
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setSelectedWicketType("caught");
                      setFielderSelectionType("caught");
                    }}>
                      Caught
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      addWicket("stumped");
                      setSelectedWicketType(null);
                    }}>
                      Stumped
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      addWicket("lbw");
                      setSelectedWicketType(null);
                    }}>
                      LBW
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setSelectedWicketType("run_out");
                      setRunOutBatsmanSelection(true); // Trigger batsman selection
                    }}>
                      Run Out
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => {
                        setSelectedWicketType(null);
                        setFielderSelectionType(null); 
                      }}
                      className="col-span-2"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-cricket">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Extras</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" onClick={() => addExtra("wd")}>
                    WD
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => addExtra("nb")}>
                    NB
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedExtraType("b")}>
                    B
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedExtraType("lb")}>
                    LB
                  </Button>
                </div>

                {selectedExtraType && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {[1, 2, 3, 4].map((runs) => (
                      <Button
                        key={runs}
                        size="sm"
                        variant="default"
                        onClick={() => {
                          addExtra(selectedExtraType, runs);
                          setSelectedExtraType(null);
                        }}
                      >
                        {runs}
                      </Button>
                    ))}
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => setSelectedExtraType(null)}
                      className="col-span-4"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {selectedWicketType === "run_out" && runOutBatsmanSelection && (
            <Card className="shadow-cricket mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Select Out Batsman for Run Out</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={outBatsmanForRunOut ? outBatsmanForRunOut.name : ""}
                  onChange={(e) => setOutBatsmanForRunOut(allPlayers.find((p: any) => p.name === e.target.value))}
                >
                  <option value="">Select Batsman</option>
                  {allPlayers
                    .filter((p: any) => p.name === striker.name || p.name === nonStriker.name)
                    .map((player: any) => (
                      <option key={player.name} value={player.name}>{player.name}</option>
                    ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={() => {
                      setRunOutBatsmanSelection(false); // Move to next step (runs selection)
                    }}
                    disabled={!outBatsmanForRunOut}
                  >
                    Confirm
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => {
                      setSelectedWicketType(null);
                      setRunOutBatsmanSelection(false);
                      setOutBatsmanForRunOut(null);
                      setRunOutRuns(0);
                      setFielderSelectionType(null);
                      setSelectedFielder(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedWicketType === "run_out" && !fielderSelectionType && !runOutBatsmanSelection && (
            <Card className="shadow-cricket mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Runs for Run Out</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    setRunOutRuns(0);
                    setFielderSelectionType("run_out");
                  }}>
                    W
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setRunOutRuns(1);
                    setFielderSelectionType("run_out");
                  }}>
                    1+W
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setRunOutRuns(2);
                    setFielderSelectionType("run_out");
                  }}>
                    2+W
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setSelectedWicketType(null);
                    setRunOutRuns(0);
                    setOutBatsmanForRunOut(null); // Also reset batsman selection
                  }}
                  className="w-full"
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          )}

          {fielderSelectionType && (
            <Card className="shadow-cricket mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Select Fielder for {fielderSelectionType === "caught" ? "Catch" : "Run Out"}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedFielder || ""}
                  onChange={(e) => setSelectedFielder(e.target.value)}
                >
                  <option value="">Select Fielder</option>
                  {allPlayers
                    .filter((p: any) => p.name !== striker.name && p.name !== nonStriker.name && p.name !== currentBowler.name && (matchData[bowlingTeam === matchData.teamA ? 'teamAPlayers' : 'teamBPlayers'].some((tp: any) => tp.name === p.name)))
                    .map((player: any) => (
                    <option key={player.name} value={player.name}>{player.name}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={() => {
                      addWicket(fielderSelectionType, selectedFielder, runOutRuns, outBatsmanForRunOut); // Pass outBatsmanForRunOut
                      setSelectedWicketType(null);
                      setFielderSelectionType(null);
                      setSelectedFielder(null);
                      setRunOutRuns(0); 
                      setOutBatsmanForRunOut(null);
                    }}
                    disabled={!selectedFielder}
                  >
                    Confirm
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => {
                      setSelectedWicketType(null);
                      setFielderSelectionType(null);
                      setSelectedFielder(null);
                      setRunOutRuns(0); 
                      setOutBatsmanForRunOut(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Undo and Summary */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={undoLastBall}
              variant="outline"
              disabled={recentBalls.length === 0}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Undo
            </Button>
            <Button
              onClick={onViewSummary}
              variant="secondary"
            >
              <Target className="w-4 h-4 mr-2" />
              Summary
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
