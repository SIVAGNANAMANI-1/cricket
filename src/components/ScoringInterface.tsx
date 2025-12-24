import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RotateCcw, Target } from "lucide-react";
import { announceScore } from "@/utils/speech";


interface ScoringInterfaceProps {
  matchData: any;
  onBack: () => void;
  onViewScorecard: () => void;
  score: { runs: number; wickets: number; overs: number; balls: number };
  recentBalls: string[];
  addRuns: (runs: number) => void;
  addWicket: (wicketType: string, fielder?: string | null, runs?: number, outBatsman?: any, isNoBallWicket?: boolean) => void;
  addExtra: (type: string, runs?: number, runsOffBat?: number) => void;
  undoLastBall: () => void;
  striker: any;
  nonStriker: any;
  currentBowler: any;
  setStriker: (player: any) => void;
  setNonStriker: (player: any) => void;
  setCurrentBowler: (player: any) => void;
  allPlayers: any[];
  battingTeam: string;
  bowlingTeam: string;
  bowlerOvers: { [key: string]: number };
  currentOverRuns: number;
  currentOverBalls: number;
  currentInnings: number;
  battingPlayers: any[];
  bowlingPlayers: any[];
  innings1Score?: number | null;
  matchResult?: string | null;
  isFreeHit?: boolean;
  partnershipStartScore?: { runs: number, balls: number };
}

export const ScoringInterface = ({
  matchData,
  onBack,
  onViewScorecard,
  score,
  recentBalls,
  addRuns,
  addWicket,
  addExtra,
  undoLastBall,
  striker,
  nonStriker,
  currentBowler,
  setStriker,
  setNonStriker,
  setCurrentBowler,
  allPlayers,
  battingTeam,
  bowlingTeam,
  bowlerOvers,
  currentOverRuns,
  currentOverBalls,
  currentInnings,
  battingPlayers,
  bowlingPlayers,
  innings1Score,
  matchResult,
  isFreeHit,
  partnershipStartScore
}: ScoringInterfaceProps) => {
  const [selectedExtraType, setSelectedExtraType] = useState<string | null>(null);
  const [selectedWicketType, setSelectedWicketType] = useState<string | null>(null);
  const [fielderSelectionType, setFielderSelectionType] = useState<string | null>(null);
  const [selectedFielder, setSelectedFielder] = useState<string | null>(null);
  const [runOutRuns, setRunOutRuns] = useState<number>(0);
  const [runOutBatsmanSelection, setRunOutBatsmanSelection] = useState<boolean>(false);
  const [outBatsmanForRunOut, setOutBatsmanForRunOut] = useState<any>(null);
  const [nbWicketSelection, setNbWicketSelection] = useState<boolean>(false);

  // Function to find player stats from allPlayers array
  const getPlayerStats = (playerName: string) => {
    return allPlayers.find(p => p.name === playerName);
  };

  // Helper function to calculate remaining overs in cricket format (base-6)
  const calculateRemainingOvers = (totalOvers: number, currentOvers: number) => {
    // Convert overs to balls
    const totalBalls = totalOvers * 6;
    const currentBalls = Math.floor(currentOvers) * 6 + Math.round((currentOvers % 1) * 10);
    const remainingBalls = totalBalls - currentBalls;

    // Convert back to overs format
    const remainingCompleteOvers = Math.floor(remainingBalls / 6);
    const remainingExtraBalls = remainingBalls % 6;

    return remainingCompleteOvers + (remainingExtraBalls / 10);
  };

  const currentStrikerStats = striker ? getPlayerStats(striker.name) : null;
  const currentNonStrikerStats = nonStriker ? getPlayerStats(nonStriker.name) : null;
  const currentBowlerStats = currentBowler ? getPlayerStats(currentBowler.name) : null;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-white hover:bg-gray-800">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Live Scoring</h1>
            <p className="text-sm text-gray-400">
              {matchData.teamA} vs {matchData.teamB}
            </p>
          </div>
        </div>

        {/* Winner Banner */}
        {matchResult && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-600 to-green-700 rounded-lg text-center animate-pulse shadow-lg">
            <p className="text-xl font-bold text-white">
              🏆 {matchResult}
            </p>
          </div>
        )}

        {/* Free Hit Banner */}
        {isFreeHit && (
          <div className="mb-6 p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-center animate-pulse shadow-lg border-2 border-yellow-400">
            <p className="text-xl font-bold text-white tracking-wider">
              ⚠️ FREE HIT DELIVERY ⚠️
            </p>
            <p className="text-xs text-white/90 mt-1">Batsman can only be Run Out</p>
          </div>
        )}

        {/* Score Display */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg p-4 mb-6 shadow-lg">
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">
              {score.runs}/{score.wickets}
            </div>
            <div className="flex items-center justify-center gap-4 text-sm opacity-90">
              <span>Overs: {score.overs.toFixed(1)}</span>
              <Badge variant="secondary" className="bg-white/20 text-white border-0">Innings {currentInnings}</Badge>
            </div>
            {partnershipStartScore && (
              <div className="text-xs text-white/80 mt-1">
                Partnership: {score.runs - partnershipStartScore.runs} runs ({score.balls - partnershipStartScore.balls} balls)
              </div>
            )}


            {/* Current Run Rate (CRR) - Show for all innings */}
            {(() => {
              const crr = score.overs > 0 ? (score.runs / score.overs).toFixed(2) : '0.00';
              return (
                <div className="mt-2 text-xs opacity-80">
                  CRR: {crr}
                </div>
              );
            })()}

            {/* Target Information for 2nd Innings */}
            {currentInnings === 2 && innings1Score !== null && innings1Score !== undefined && (() => {
              const remainingOvers = calculateRemainingOvers(matchData.overs, score.overs);
              const runsNeeded = innings1Score + 1 - score.runs;
              const remainingBalls = Math.floor(remainingOvers) * 6 + Math.round((remainingOvers % 1) * 10);
              const rrr = remainingBalls > 0 ? (runsNeeded / (remainingBalls / 6)).toFixed(2) : '0.00';

              return (
                <div className="mt-3 p-2 bg-white/10 border border-white/30 rounded-md">
                  <p className="text-sm font-semibold">
                    {runsNeeded} runs needed in {remainingOvers.toFixed(1)} overs
                  </p>
                  <p className="text-xs opacity-80 mt-1">
                    Target: {innings1Score + 1} • RRR: {rrr}
                  </p>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Recent Balls */}
        <div className="bg-gray-800 rounded-lg mb-6 overflow-hidden">
          <div className="bg-gray-700 px-4 py-3 border-b border-gray-600">
            <h3 className="font-semibold">Recent Balls</h3>
          </div>
          <div className="p-4" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
            <div className="flex gap-2">
              {recentBalls.map((ball, index) => (
                ball === "|" ? (
                  <div key={index} className="flex items-center justify-center text-gray-500 font-bold text-lg mx-1">
                    |
                  </div>
                ) : (
                  <Badge
                    key={index}
                    variant={ball.includes("W") ? "destructive" : ball === "4" || ball === "6" ? "default" : "outline"}
                    className={`min-w-[2rem] h-8 px-1 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 ${ball.includes("W") ? "bg-red-600 hover:bg-red-700 border-none" :
                      ball === "4" || ball === "6" ? "bg-green-600 hover:bg-green-700 border-none" :
                        "border-gray-400 text-white hover:bg-gray-700"
                      }`}
                  >
                    {ball}
                  </Badge>
                )
              ))}
            </div>
          </div>
        </div>

        {/* Current Players */}
        <div className="bg-gray-800 rounded-lg mb-6 overflow-hidden">
          <div className="bg-gray-700 px-4 py-3 border-b border-gray-600">
            <h3 className="font-semibold">Current Players</h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">Striker</label>
                {striker ? (
                  <div className="flex h-9 w-full items-center rounded-md border border-gray-600 bg-gray-700 px-3 py-1 text-sm shadow-sm">
                    {striker.name}
                  </div>
                ) : (
                  <select
                    className="flex h-9 w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-1 text-sm shadow-sm transition-colors text-white"
                    value={striker?.name || ''}
                    onChange={(e) => setStriker(battingPlayers.find(p => p.name === e.target.value))}
                  >
                    <option value="">Select Striker</option>
                    {battingPlayers.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </select>
                )}
                {currentStrikerStats && (
                  <p className="text-xs text-gray-400 text-right">
                    {currentStrikerStats.runsScored || 0} runs ({currentStrikerStats.ballsFaced || 0} balls)
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">Non-Striker</label>
                {nonStriker ? (
                  <div className="flex h-9 w-full items-center rounded-md border border-gray-600 bg-gray-700 px-3 py-1 text-sm shadow-sm">
                    {nonStriker.name}
                  </div>
                ) : (
                  <select
                    className="flex h-9 w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-1 text-sm shadow-sm transition-colors text-white"
                    value={nonStriker?.name || ''}
                    onChange={(e) => setNonStriker(battingPlayers.find(p => p.name === e.target.value))}
                  >
                    <option value="">Select Non-Striker</option>
                    {battingPlayers.filter(p => p.name !== striker?.name).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </select>
                )}
                {currentNonStrikerStats && (
                  <p className="text-xs text-gray-400 text-right">
                    {currentNonStrikerStats.runsScored || 0} runs ({currentNonStrikerStats.ballsFaced || 0} balls)
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">Bowler</label>
                {currentBowler ? (
                  <div className="flex h-9 w-full items-center rounded-md border border-gray-600 bg-gray-700 px-3 py-1 text-sm shadow-sm">
                    {currentBowler.name}
                  </div>
                ) : (
                  <select
                    className="flex h-9 w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-1 text-sm shadow-sm transition-colors text-white"
                    value={currentBowler?.name || ''}
                    onChange={(e) => setCurrentBowler(bowlingPlayers.find(p => p.name === e.target.value))}
                  >
                    <option value="">Select Bowler</option>
                    {bowlingPlayers.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </select>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Current Bowling Details */}
        {currentBowlerStats && (
          <div className="bg-gray-800 rounded-lg mb-6 overflow-hidden">
            <div className="bg-gray-700 px-4 py-3 border-b border-gray-600">
              <h3 className="font-semibold">Current Bowling</h3>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{currentBowlerStats.name}</p>
                  <p className="text-xs text-gray-400">
                    Overs: {(bowlerOvers[currentBowlerStats.name] || 0) + (currentOverBalls / 10).toFixed(1).slice(1)} • Maidens: {currentBowlerStats.maidens || 0} • Runs: {currentOverRuns || 0} • Wickets: {currentBowlerStats.wicketsTaken || 0} • Dot Balls: {currentBowlerStats.dotBalls || 0}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    Econ: {((currentBowlerStats.runsConceded || 0) / ((bowlerOvers[currentBowlerStats.name] || 0) * 6 + currentOverBalls || 1) * 6).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scoring Buttons */}
        <div className="space-y-4">
          {/* Runs */}
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="bg-gray-700 px-4 py-3 border-b border-gray-600">
              <h3 className="font-semibold flex items-center gap-2">
                <Target className="w-4 h-4" />
                Runs
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3, 4, 6].map((runs) => (
                  <Button
                    key={runs}
                    onClick={() => {
                      addRuns(runs);
                      announceScore(runs);
                    }}
                    style={{ color: 'white' }}
                    className={`h-12 text-lg font-bold !text-white ${runs === 4 || runs === 6 ? "bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800" : "border-2 border-gray-600 hover:bg-gray-700 bg-gray-800"}`}
                  >
                    {runs}
                  </Button>
                ))}

                {/* Undo Button - Placed in the Runs Grid for easy access */}
                <Button
                  onClick={undoLastBall}
                  className="h-12 text-lg font-bold border-2 border-red-500/50 bg-red-900/20 hover:bg-red-900/40 text-red-500 col-span-2"
                  disabled={recentBalls.length === 0}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Undo
                </Button>
              </div>
            </div>
          </div>

          {/* Wicket & Extras */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="bg-gray-700 px-4 py-3 border-b border-gray-600">
                <h3 className="font-semibold text-sm">Wicket</h3>
              </div>
              <div className="p-4">
                <Button
                  onClick={() => setSelectedWicketType("select")}
                  variant="destructive"
                  className="w-full h-12 font-bold text-white"
                >
                  OUT
                </Button>

                {selectedWicketType && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {!isFreeHit && (
                      <>
                        <Button size="sm" variant="outline" className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700" onClick={() => {
                          addWicket("bowled");
                          setSelectedWicketType(null);
                        }}>
                          Bowled
                        </Button>
                        <Button size="sm" variant="outline" className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700" onClick={() => {
                          setSelectedWicketType("caught");
                          setFielderSelectionType("caught");
                        }}>
                          Caught
                        </Button>
                        <Button size="sm" variant="outline" className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700" onClick={() => {
                          addWicket("stumped");
                          setSelectedWicketType(null);
                        }}>
                          Stumped
                        </Button>
                        <Button size="sm" variant="outline" className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700" onClick={() => {
                          addWicket("lbw");
                          setSelectedWicketType(null);
                        }}>
                          LBW
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" className={`bg-gray-800 border-gray-600 text-white hover:bg-gray-700 ${isFreeHit ? 'col-span-2' : ''}`} onClick={() => {
                      setSelectedWicketType("run_out");
                      setRunOutBatsmanSelection(true);
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
                      className="col-span-2 text-white"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="bg-gray-700 px-4 py-3 border-b border-gray-600">
                <h3 className="font-semibold text-sm">Extras</h3>
              </div>
              <div className="p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700" onClick={() => addExtra("wd")}>
                    WD
                  </Button>
                  <Button size="sm" variant="outline" className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700" onClick={() => setSelectedExtraType("nb")}>
                    NB
                  </Button>
                  <Button size="sm" variant="outline" className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700" onClick={() => setSelectedExtraType("b")}>
                    B
                  </Button>
                  <Button size="sm" variant="outline" className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700" onClick={() => setSelectedExtraType("lb")}>
                    LB
                  </Button>
                </div>
                {selectedExtraType && selectedExtraType !== "nb" && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {[1, 2, 3, 4].map((runs) => (
                      <Button
                        key={runs}
                        size="sm"
                        variant="default"
                        className="bg-orange-600 hover:bg-orange-700 text-white"
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
                      className="col-span-4 text-white"
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {/* Specific Run Selection for No Ball (0,1,2,3,4,6,W) */}
                {selectedExtraType === "nb" && !nbWicketSelection && (
                  <div className="space-y-2 mt-2">
                    <p className="text-xs text-center text-gray-400">Runs scored off Bat in NB:</p>
                    <div className="grid grid-cols-7 gap-1">
                      {[0, 1, 2, 3, 4, 6].map((runs) => (
                        <Button
                          key={runs}
                          size="sm"
                          variant="default"
                          className={`text-white p-1 ${runs === 4 || runs === 6 ? "bg-orange-600 hover:bg-orange-700" : "bg-blue-600 hover:bg-blue-700"}`}
                          onClick={() => {
                            // Total runs = 1 (penalty) + runs off bat
                            addExtra("nb", 1 + runs, runs);
                            setSelectedExtraType(null);
                          }}
                        >
                          {runs}
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        variant="destructive"
                        className="text-white p-1 bg-red-600 hover:bg-red-700"
                        onClick={() => setNbWicketSelection(true)}
                      >
                        W
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setSelectedExtraType(null)}
                      className="w-full text-white"
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {/* NB Wicket Selection (W, W+1, W+2) */}
                {selectedExtraType === "nb" && nbWicketSelection && !runOutBatsmanSelection && !fielderSelectionType && (
                  <div className="space-y-2 mt-2">
                    <p className="text-xs text-center text-gray-400">Run Out on No Ball:</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                        onClick={() => {
                          setRunOutRuns(0);
                          setRunOutBatsmanSelection(true);
                        }}
                      >
                        W
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                        onClick={() => {
                          setRunOutRuns(1);
                          setRunOutBatsmanSelection(true);
                        }}
                      >
                        W+1
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                        onClick={() => {
                          setRunOutRuns(2);
                          setRunOutBatsmanSelection(true);
                        }}
                      >
                        W+2
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setNbWicketSelection(false);
                        setRunOutRuns(0);
                      }}
                      className="w-full text-white"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {(selectedWicketType === "run_out" || (selectedExtraType === "nb" && nbWicketSelection)) && runOutBatsmanSelection && (
            <Card className="shadow-cricket mb-4 bg-gray-800 border-gray-700">
              <CardHeader className="pb-2 border-b border-gray-700">
                <CardTitle className="text-sm text-white">Select Out Batsman for Run Out</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                <select
                  className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
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
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={() => {
                      setRunOutBatsmanSelection(false);
                      setFielderSelectionType("run_out");
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
                      setNbWicketSelection(false);
                      setSelectedExtraType(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Runs for Run Out */}
          {selectedWicketType === "run_out" && !fielderSelectionType && !runOutBatsmanSelection && (
            <Card className="shadow-cricket mb-4 bg-gray-800 border-gray-700">
              <CardHeader className="pb-2 border-b border-gray-700">
                <CardTitle className="text-sm text-white">Runs for Run Out</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <Button size="sm" variant="outline" className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700" onClick={() => {
                    setRunOutRuns(0);
                    setFielderSelectionType("run_out");
                  }}>
                    W
                  </Button>
                  <Button size="sm" variant="outline" className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700" onClick={() => {
                    setRunOutRuns(1);
                    setFielderSelectionType("run_out");
                  }}>
                    1+W
                  </Button>
                  <Button size="sm" variant="outline" className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700" onClick={() => {
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
                    setOutBatsmanForRunOut(null);
                  }}
                  className="w-full"
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          )}

          {fielderSelectionType && (
            <Card className="shadow-cricket mb-4 bg-gray-800 border-gray-700">
              <CardHeader className="pb-2 border-b border-gray-700">
                <CardTitle className="text-sm text-white">Select Fielder for {fielderSelectionType === "caught" ? "Catch" : "Run Out"}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                <select
                  className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
                  value={selectedFielder || ""}
                  onChange={(e) => setSelectedFielder(e.target.value)}
                >
                  <option value="">Select Fielder</option>
                  {allPlayers
                    .filter((p: any) => p.name !== striker.name && p.name !== nonStriker.name && (matchData[bowlingTeam === matchData.teamA ? 'teamAPlayers' : 'teamBPlayers'].some((tp: any) => tp.name === p.name)))
                    .map((player: any) => (
                      <option key={player.name} value={player.name}>{player.name}</option>
                    ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={() => {
                      // Check if this is an NB wicket by seeing if selectedExtraType is 'nb'
                      const isNoBall = selectedExtraType === "nb";

                      if (isNoBall) {
                        // For NB wicket: First record the No Ball with runs
                        addExtra("nb", 1 + runOutRuns, runOutRuns);
                      }

                      // Then record the wicket
                      addWicket(fielderSelectionType, selectedFielder, runOutRuns, outBatsmanForRunOut, isNoBall);
                      setSelectedWicketType(null);
                      setFielderSelectionType(null);
                      setSelectedFielder(null);
                      setRunOutRuns(0);
                      setOutBatsmanForRunOut(null);
                      setNbWicketSelection(false);
                      setSelectedExtraType(null);
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
                      setNbWicketSelection(false);
                      setSelectedExtraType(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scorecard Button */}
          <Button
            onClick={onViewScorecard}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold py-6"
            size="lg"
          >
            <Target className="w-4 h-4 mr-2" />
            Scorecard
          </Button>
        </div>
      </div >
    </div >
  );
};
