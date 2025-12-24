import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, Users, Clock, Target } from "lucide-react";
import { Scorecard } from "./Scorecard";
import { MatchSummary } from "./MatchSummary";

// Sub-component for Team Statistics
const TeamStats = ({ matchData, ballHistory, totalFours, totalSixes, totalDotBalls, score }: any) => {
  const [activeTeam, setActiveTeam] = useState<string>(matchData.teamA);

  const stats = useMemo(() => {
    const history = ballHistory || [];
    let runs = 0;
    let balls = 0;
    let fours = 0;
    let sixes = 0;
    let dots = 0;
    let extras = 0;
    let wides = 0;
    let noBalls = 0;
    let byes = 0;
    let legByes = 0;

    // Helper to check if a player belongs to the active team
    const isPlayerInActiveTeam = (playerName: string) => {
      if (activeTeam === matchData.teamA) {
        return matchData.teamAPlayers.some((p: any) => p.name === playerName);
      } else {
        return matchData.teamBPlayers.some((p: any) => p.name === playerName);
      }
    };

    history.forEach((ball: any) => {
      if (!ball.striker) return;

      if (isPlayerInActiveTeam(ball.striker.name)) {
        if (ball.type === 'runs') {
          runs += ball.runs;
          if (ball.runs === 4) fours++;
          if (ball.runs === 6) sixes++;
          if (ball.runs === 0) dots++;
        } else if (ball.type === 'extra') {
          runs += ball.runs;
          extras += ball.runs;
          if (ball.extraType === 'wd') wides += ball.runs;
          if (ball.extraType === 'nb') noBalls += ball.runs;
          if (ball.extraType === 'b') byes += ball.runs;
          if (ball.extraType === 'lb') legByes += ball.runs;
        } else if (ball.type === 'wicket') {
          if (ball.wicketType === 'run_out') runs += ball.runs;
          // Wicket counts as dot if no runs
          if (ball.runs === 0) dots++;
        }

        // Count legal balls
        if (ball.type !== 'extra' || (ball.extraType !== 'wd' && ball.extraType !== 'nb')) {
          balls++;
        }
      }
    });

    const overs = Math.floor(balls / 6) + (balls % 6) / 10;
    const runRate = overs > 0 ? (runs / overs).toFixed(2) : "0.00";
    const dotPercentage = balls > 0 ? ((dots / balls) * 100).toFixed(1) : "0.0";

    const extrasDetail = `${extras} (B-${byes}, W-${wides}, NB-${noBalls}, LB-${legByes})`;

    return { runs, overs, runRate, fours, sixes, dots, dotPercentage, extrasDetail };
  }, [activeTeam, ballHistory, matchData]);

  return (
    <div className="space-y-4">
      {/* Team Tabs */}
      <div className="flex border-b border-border mb-4">
        <button
          className={`flex-1 pb-2 text-center font-semibold text-sm transition-colors relative ${activeTeam === matchData.teamA ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          onClick={() => setActiveTeam(matchData.teamA)}
        >
          {matchData.teamA}
          {activeTeam === matchData.teamA && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          className={`flex-1 pb-2 text-center font-semibold text-sm transition-colors relative ${activeTeam === matchData.teamB ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          onClick={() => setActiveTeam(matchData.teamB)}
        >
          {matchData.teamB}
          {activeTeam === matchData.teamB && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      <Card className="shadow-cricket bg-card border-border text-card-foreground">
        <CardHeader>
          <CardTitle className="text-sm">{activeTeam} Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Score</span>
            <span className="font-medium">{stats.runs} ({stats.overs} ov)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Run Rate</span>
            <span className="font-medium">{stats.runRate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Boundaries</span>
            <span className="font-medium">{stats.fours + stats.sixes} (4s: {stats.fours}, 6s: {stats.sixes})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Dot Balls</span>
            <span className="font-medium">{stats.dots} ({stats.dotPercentage}%)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Extras</span>
            <span className="font-medium">{stats.extrasDetail}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface LiveViewerProps {
  matchData: any;
  onBack: () => void;
  score: { runs: number; wickets: number; overs: number; balls: number };
  striker: any;
  nonStriker: any;
  currentBowler: any;
  battingTeam: string;
  bowlingTeam: string;
  bowlerOvers: { [key: string]: number };
  allPlayers: any[];
  totalDotBalls: number;
  totalFours: number;
  totalSixes: number;
  ballHistory: any[]; // New prop for ball-by-ball history
  currentOverRuns: number;
  currentOverBalls: number;
  currentInnings: number;
  innings1Score: number | null;
  matchResult?: string | null;
}

export const LiveViewer = ({ matchData, onBack, score, striker, nonStriker, currentBowler, battingTeam, bowlingTeam, bowlerOvers, allPlayers, totalDotBalls, totalFours, totalSixes, ballHistory, currentOverRuns, currentOverBalls, currentInnings, innings1Score, matchResult }: LiveViewerProps) => {
  const [activeTab, setActiveTab] = useState<'scorecard' | 'stats' | 'commentary'>('scorecard');
  const [showSummary, setShowSummary] = useState(false);

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

  if (showSummary) {
    return (
      <MatchSummary
        matchData={matchData}
        allPlayers={allPlayers}
        ballHistory={ballHistory}
        innings1Score={innings1Score}
        matchResult={matchResult}
        totalFours={totalFours}
        totalSixes={totalSixes}
        totalDotBalls={totalDotBalls}
        onBackToCreate={() => setShowSummary(false)}
      />
    );
  }

  const currentStrikerStats = striker ? getPlayerStats(striker.name) : null;
  const currentNonStrikerStats = nonStriker ? getPlayerStats(nonStriker.name) : null;
  const currentBowlerStats = currentBowler ? getPlayerStats(currentBowler.name) : null;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-cricket-field dark:text-cricket-field">Live Match</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              Code: {matchData.publicCode || matchData.matchCode || matchData.id || 'N/A'}
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live updates active"></span>
            </p>
          </div>
          <div className="w-3 h-3 bg-cricket-ball rounded-full animate-pulse"></div>
        </div>

        {/* Match Header */}
        <Card className="shadow-xl mb-4 animate-fade-in bg-card text-card-foreground border-border">
          <CardContent className="p-4">
            {/* Winner Banner */}
            {matchResult && (
              <div className="mb-4 space-y-2">
                <div className="p-3 bg-gradient-to-r from-green-600 to-green-700 rounded-lg text-center animate-pulse">
                  <p className="text-lg font-bold text-white">
                    🏆 {matchResult}
                  </p>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
                  onClick={() => setShowSummary(true)}
                >
                  <Users className="w-4 h-4 mr-2" />
                  View Match Summary
                </Button>
              </div>
            )}

            <div className="text-center mb-3">
              <h2 className="text-lg font-bold text-foreground">
                {matchData.teamA} vs {matchData.teamB}
              </h2>
              <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted/80">{matchData.overs} Overs Match</Badge>
              <p className="text-sm text-muted-foreground mt-1">
                {battingTeam} to bat, {bowlingTeam} to bowl.
              </p>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-foreground mb-1">
                {score.runs}/{score.wickets}
              </div>
              <div className="text-sm text-muted-foreground">
                Overs: {score.overs.toFixed(1)} • CRR: {(score.runs / (score.overs || 1)).toFixed(1)}
              </div>

              {/* Target Information for 2nd Innings */}
              {currentInnings === 2 && innings1Score !== null && !matchResult && (() => {
                const remainingOvers = calculateRemainingOvers(matchData.overs, score.overs);
                const runsNeeded = innings1Score + 1 - score.runs;
                const remainingBalls = Math.floor(remainingOvers) * 6 + Math.round((remainingOvers % 1) * 10);
                const rrr = remainingBalls > 0 ? (runsNeeded / (remainingBalls / 6)).toFixed(2) : '0.00';

                // Check if it's the very start of the 2nd innings (0 balls bowled)
                const isStartOfInnings2 = score.balls === 0;

                // Check if match is effectively over (All Out or Overs Done) but no result synced yet
                const isAllOut = score.wickets >= ((matchData.teamSize || 11) - 1);
                const isOversDone = score.overs >= matchData.overs;
                const isLost = (isAllOut || isOversDone) && runsNeeded > 0;

                return (
                  <div className={`mt-2 p-3 border rounded-md ${isLost ? 'bg-destructive/20 border-destructive/50' : 'bg-orange-600/20 border-orange-600/50'}`}>
                    {isStartOfInnings2 && !isLost && (
                      <p className="text-sm font-bold text-orange-600 dark:text-orange-400 mb-1 uppercase tracking-wide">
                        End of Innings. {battingTeam} requires {runsNeeded} runs to win in {matchData.overs} overs.
                      </p>
                    )}

                    {!isStartOfInnings2 && (
                      isLost ? (
                        <>
                          <p className="text-sm font-semibold text-destructive">
                            Match Ended. {battingTeam} lost by {runsNeeded} runs.
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                          {battingTeam} requires {runsNeeded} runs in {remainingOvers.toFixed(1)} overs
                        </p>
                      )
                    )}

                    <p className="text-xs text-muted-foreground mt-1">
                      Target: {innings1Score + 1} {(!isLost && !isStartOfInnings2) ? `• RRR: ${rrr}` : ''}
                    </p>
                  </div>
                );
              })()}

              {/* Recent Balls */}
              <div className="mt-4 mb-2">
                <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide text-left">Recent Balls</div>
                <div className="flex flex-nowrap gap-2 justify-start overflow-x-auto pb-2 scrollbar-none">
                  {ballHistory.slice(-12).map((ball: any, index: number, arr: any[]) => {
                    let text = ball.runs.toString();
                    let isWicket = ball.type === 'wicket';
                    let isBoundary = ball.runs === 4 || ball.runs === 6;

                    if (isWicket) {
                      if (ball.wicketType === 'run_out') {
                        text = ball.runs > 0 ? `${ball.runs}R/W` : 'W(run-out)';
                      } else {
                        text = 'W';
                      }
                    } else if (ball.type === 'extra') {
                      text = ball.extraType === 'wd' ? (ball.runs > 1 ? `Wd+${ball.runs - 1}` : 'Wd') :
                        ball.extraType === 'nb' ? (ball.runs > 1 ? `Nb+${ball.runs - 1}` : 'Nb') :
                          ball.extraType === 'lb' ? `Lb${ball.runs}` : `B${ball.runs}`;
                    }

                    const showPipe = index > 0 && arr[index - 1].ballInOver === 6;

                    return (
                      <div key={index} className="flex items-center">
                        {showPipe && <span className="text-muted-foreground mx-1 text-lg">|</span>}
                        <div
                          className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold border ${isWicket ? 'bg-destructive/20 border-destructive text-destructive' :
                            isBoundary ? 'bg-green-500/20 border-green-500 text-green-600 dark:text-green-500' :
                              'bg-muted border-muted-foreground/30 text-foreground'
                            }`}
                        >
                          {text}
                        </div>
                      </div>
                    );
                  })}
                  {ballHistory.length === 0 && <span className="text-xs text-muted-foreground">No balls yet</span>}
                </div>
              </div>

              {/* Current Batsmen - Calculated from Ball History for Accuracy */}
              {(striker || nonStriker) && (() => {
                const calculateLiveStats = (playerId: string) => {
                  if (!playerId) return { runs: 0, balls: 0 };
                  let runs = 0;
                  let balls = 0;

                  ballHistory.forEach(ball => {
                    if (ball.striker && ball.striker.name === playerId) {
                      if (ball.type === 'runs') {
                        runs += ball.runs;
                        balls++;
                      } else if (ball.type === 'wicket') {
                        if (ball.wicketType === 'run_out') {
                          runs += ball.runs;
                        }
                        if (ball.runs === 0) {
                          // Wicket counts as ball faced? Usually yes, unless wide.
                          // Standard: Wicket ball counts as ball faced unless it's a wide/no-ball (which are extras)
                          // But here we check ball.type.
                          // If it was a wide+wicket, type might be 'extra' or handled differently.
                          // Assuming standard wicket type is a legal ball.
                          balls++;
                        } else {
                          // If runs > 0 (run out), it was a legal ball unless specified otherwise.
                          balls++;
                        }
                      } else if (ball.type === 'extra') {
                        // Wides and No Balls don't count to batsman balls faced
                        // Leg byes / Byes: Ball counts?
                        // Usually Byes/Leg Byes count as balls faced but 0 runs for batsman.
                        if (ball.extraType === 'b' || ball.extraType === 'lb') {
                          balls++;
                        }
                      }
                    }
                  });
                  return { runs, balls };
                };

                const strikerStats = striker ? calculateLiveStats(striker.name) : { runs: 0, balls: 0 };
                const nonStrikerStats = nonStriker ? calculateLiveStats(nonStriker.name) : { runs: 0, balls: 0 };

                return (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Batting</div>
                    <div className="space-y-1">
                      {striker && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-foreground">{striker.name}*</span>
                          <span className="text-foreground font-bold">
                            {strikerStats.runs}({strikerStats.balls})
                          </span>
                        </div>
                      )}
                      {nonStriker && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-foreground">{nonStriker.name}</span>
                          <span className="text-foreground font-bold">
                            {nonStrikerStats.runs}({nonStrikerStats.balls})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="flex mb-4 bg-muted rounded-lg p-1 shadow-lg border border-border">
          {[
            { id: 'scorecard', label: 'Scorecard', icon: Target },
            { id: 'stats', label: 'Stats', icon: TrendingUp },
            { id: 'commentary', label: 'Commentary', icon: Clock }
          ].map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={activeTab === id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(id as any)}
              className={`flex-1 ${activeTab === id
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
            >
              <Icon className="w-4 h-4 mr-1" />
              {label}
            </Button>
          ))}
        </div>

        {/* Content based on active tab */}
        {activeTab === 'scorecard' && (
          <div className="space-y-4">
            <Scorecard
              key={score.balls}
              matchData={matchData}
              allPlayers={allPlayers}
              battingTeam={battingTeam}
              score={score}
              onBackToUpdate={() => { }}
              currentBowler={currentBowler}
              bowlerOvers={bowlerOvers}
              currentOverBalls={currentOverBalls}
              isReadOnly={true}
              showHeader={false}
              className="min-h-0 bg-transparent p-0"
              ballHistory={ballHistory}
              striker={striker}
              nonStriker={nonStriker}
            />
          </div>
        )}

        {activeTab === 'stats' && (
          <TeamStats
            matchData={matchData}
            ballHistory={ballHistory}
            totalFours={totalFours}
            totalSixes={totalSixes}
            totalDotBalls={totalDotBalls}
            score={score}
          />
        )}

        {activeTab === 'commentary' && (
          <div className="space-y-4">
            <Card className="shadow-xl bg-card text-card-foreground border-border">
              <CardHeader>
                <CardTitle className="text-sm text-foreground">Live Commentary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  {/* Filter for last 4 overs */}
                  {ballHistory
                    .filter((ball: any) => ball.over >= (score.overs - 4))
                    .reverse() // Display most recent first
                    .map((ball: any, index: number) => {
                      let commentary = '';
                      const overFormatted = `${Math.floor(ball.over)}.${ball.ballInOver}`;
                      const bowlerName = ball.bowler ? ball.bowler.name : 'Unknown Bowler';
                      const strikerName = ball.striker ? ball.striker.name : 'Unknown Striker';

                      switch (ball.type) {
                        case 'runs':
                          if (ball.runs === 0) {
                            commentary = `Dot ball. ${bowlerName} to ${strikerName}, good line and length.`;
                          } else if (ball.runs === 4) {
                            commentary = `FOUR! ${strikerName} smashes it through the covers off ${bowlerName}.`;
                          } else if (ball.runs === 6) {
                            commentary = `SIX! ${strikerName} launches ${bowlerName} over long-on!`;
                          } else if (ball.runs === 1) {
                            commentary = `Single. ${strikerName} takes one off ${bowlerName}.`;
                          } else if (ball.runs === 2) {
                            commentary = `Two runs. Good running between the wickets by ${strikerName}.`;
                          } else if (ball.runs === 3) {
                            commentary = `Three runs. Excellent placement by ${strikerName}.`;
                          }
                          break;
                        case 'wicket':
                          commentary = `OUT! ${ball.striker.name} is out! ${ball.wicketType} by ${bowlerName}. New batsman coming in.`;
                          break;
                        case 'extra':
                          if (ball.extraType === 'wd') {
                            commentary = `Wide ball from ${bowlerName}. One extra run.`;
                          } else if (ball.extraType === 'nb') {
                            commentary = `No ball from ${bowlerName}. One extra run. Free Hit next!`;
                          } else if (ball.extraType === 'b') {
                            commentary = `Byes. ${ball.runs} run${ball.runs > 1 ? 's' : ''} added to the total.`;
                          } else if (ball.extraType === 'lb') {
                            commentary = `Leg Byes. ${ball.runs} run${ball.runs > 1 ? 's' : ''} added.`;
                          }
                          break;
                        default:
                          commentary = `Ball at ${overFormatted}: ${JSON.stringify(ball)}`;
                      }
                      return (
                        <div key={index} className="p-2 rounded border-l-4" style={{
                          backgroundColor: ball.type === 'wicket' ? 'rgba(239, 68, 68, 0.1)' :
                            (ball.type === 'runs' && ball.runs === 6) ? 'rgba(59, 130, 246, 0.1)' :
                              (ball.type === 'runs' && ball.runs === 4) ? 'rgba(34, 197, 94, 0.1)' :
                                'transparent', // Use transparent for default
                          borderColor: ball.type === 'wicket' ? '#ef4444' :
                            (ball.type === 'runs' && ball.runs === 6) ? '#3b82f6' :
                              (ball.type === 'runs' && ball.runs === 4) ? '#22c55e' :
                                'hsl(var(--border))' // Use theme border
                        }}>
                          <p className="font-medium text-xs text-muted-foreground mb-1">{overFormatted} overs</p>
                          <p className="text-foreground">{commentary}</p>
                        </div>
                      );
                    })}
                  {ballHistory.length === 0 && <p className="text-muted-foreground">No balls bowled yet.</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};