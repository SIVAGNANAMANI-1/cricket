import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, Users, Clock, Target } from "lucide-react";

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
}

export const LiveViewer = ({ matchData, onBack, score, striker, nonStriker, currentBowler, battingTeam, bowlingTeam, bowlerOvers, allPlayers, totalDotBalls, totalFours, totalSixes, ballHistory, currentOverRuns, currentOverBalls }: LiveViewerProps) => {
  const [activeTab, setActiveTab] = useState<'scorecard' | 'stats' | 'commentary'>('scorecard');

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
            <h1 className="text-xl font-bold text-cricket-field">Live Match</h1>
            <p className="text-sm text-muted-foreground">
              Code: {matchData.matchCode}
            </p>
          </div>
          <div className="w-3 h-3 bg-cricket-ball rounded-full animate-pulse"></div>
        </div>

        {/* Match Header */}
        <Card className="shadow-cricket mb-4 animate-fade-in">
          <CardContent className="p-4">
            <div className="text-center mb-3">
              <h2 className="text-lg font-bold text-cricket-field">
                {matchData.teamA} vs {matchData.teamB}
              </h2>
              <Badge variant="secondary">{matchData.overs} Overs Match</Badge>
              <p className="text-sm text-muted-foreground mt-1">
                {battingTeam} to bat, {bowlingTeam} to bowl.
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-cricket-field mb-1">
                {score.runs}/{score.wickets}
              </div>
              <div className="text-sm text-muted-foreground">
                Overs: {score.overs.toFixed(1)} • CRR: {(score.runs / (score.overs || 1)).toFixed(1)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="flex mb-4 bg-card rounded-lg p-1 shadow-cricket">
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
              className={`flex-1 ${activeTab === id ? "bg-gradient-field" : ""}`}
            >
              <Icon className="w-4 h-4 mr-1" />
              {label}
            </Button>
          ))}
        </div>

        {/* Content based on active tab */}
        {activeTab === 'scorecard' && (
          <div className="space-y-4">
            {/* Current Batsmen */}
            <Card className="shadow-cricket">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Current Partnership
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {currentStrikerStats && (
                  <div className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div>
                      <p className="font-medium">{currentStrikerStats.name} *</p>
                      <p className="text-xs text-muted-foreground">
                        {currentStrikerStats.ballsFaced} balls • SR: {currentStrikerStats.ballsFaced > 0 ? (currentStrikerStats.runsScored / currentStrikerStats.ballsFaced * 100).toFixed(1) : '0.0'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{currentStrikerStats.runsScored}</p>
                      <p className="text-xs text-muted-foreground">
                        4s: {currentStrikerStats.fours} • 6s: {currentStrikerStats.sixes}
                      </p>
                    </div>
                  </div>
                )}
                {currentNonStrikerStats && (
                  <div className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div>
                      <p className="font-medium">{currentNonStrikerStats.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {currentNonStrikerStats.ballsFaced} balls • SR: {currentNonStrikerStats.ballsFaced > 0 ? (currentNonStrikerStats.runsScored / currentNonStrikerStats.ballsFaced * 100).toFixed(1) : '0.0'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{currentNonStrikerStats.runsScored}</p>
                      <p className="text-xs text-muted-foreground">
                        4s: {currentNonStrikerStats.fours} • 6s: {currentNonStrikerStats.sixes}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* All Batsmen Scorecard */}
            <Card className="shadow-cricket">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Batting Scorecard</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-7 text-xs font-semibold text-muted-foreground border-b pb-1">
                  <span className="col-span-2">Batsman</span>
                  <span>R</span>
                  <span>B</span>
                  <span>4s</span>
                  <span>6s</span>
                  <span>SR</span>
                </div>
                {allPlayers.filter((p: any) => 
                    (battingTeam === matchData.teamA ? matchData.teamAPlayers.some((tp: any) => tp.name === p.name) : matchData.teamBPlayers.some((tp: any) => tp.name === p.name))
                    && p.hasBatted
                  )
                  .sort((a, b) => b.runsScored - a.runsScored) // Sort by runs
                  .map((player: any) => (
                  <div key={player.name} className="grid grid-cols-7 text-sm py-2 border-b last:border-b-0 items-center">
                    <div className="col-span-2">
                      <p className="font-medium">
                        {player.name} 
                        {player.name === striker?.name || player.name === nonStriker?.name ? ' *' : ''}
                        {player.isCaptain ? '(C)' : ''} 
                        {player.isWicketKeeper ? '(Wk)' : ''}
                      </p>
                      {player.isOut && (player.name !== striker?.name && player.name !== nonStriker?.name) && player.outType && (
                        <p className="text-xs text-muted-foreground">
                          {player.outType === 'bowled' && `b ${player.outBowler}`}
                          {player.outType === 'caught' && `c ${player.outFielder} b ${player.outBowler}`}
                          {player.outType === 'stumped' && `st ${player.outFielder} b ${player.outBowler}`}
                          {player.outType === 'lbw' && `lbw b ${player.outBowler}`}
                          {player.outType === 'run_out' && `run out (${player.outFielder})`}
                        </p>
                      )}
                      {!player.isOut && (player.name === striker?.name || player.name === nonStriker?.name) && (
                        <p className="text-xs text-muted-foreground">not out</p>
                      )}
                    </div>
                    <span>{player.runsScored}</span>
                    <span>{player.ballsFaced}</span>
                    <span>{player.fours}</span>
                    <span>{player.sixes}</span>
                    <span>{player.ballsFaced > 0 ? (player.runsScored / player.ballsFaced * 100).toFixed(1) : '0.0'}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Yet to Bat */}
            <Card className="shadow-cricket">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Yet to Bat</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 text-sm font-semibold text-muted-foreground border-b pb-1">
                  <span>Player Name</span>
                </div>
                {allPlayers.filter((p: any) => 
                    (battingTeam === matchData.teamA ? matchData.teamAPlayers.some((tp: any) => tp.name === p.name) : matchData.teamBPlayers.some((tp: any) => tp.name === p.name))
                    && !p.hasBatted
                  )
                  .map((player: any) => (
                  <div key={player.name} className="grid grid-cols-1 text-sm py-2 border-b last:border-b-0 items-center">
                    <span className="font-medium">{player.name} {player.isCaptain ? '(C)' : ''} {player.isWicketKeeper ? '(Wk)' : ''}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Bowling Figures */}
            <Card className="shadow-cricket">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Current Bowling</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {currentBowlerStats && (
                  <div className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div>
                      <p className="font-medium">{currentBowlerStats.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Overs: {(bowlerOvers[currentBowlerStats.name] || 0) + (currentOverBalls / 10).toFixed(1).slice(1)} • Runs: {currentOverRuns} • Wickets: {currentBowlerStats.wicketsTaken}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {(bowlerOvers[currentBowlerStats.name] || 0) + (currentOverBalls / 10).toFixed(1).slice(1)} - {currentBowlerStats.maidens || 0} - {currentBowlerStats.runsConceded} - {currentBowlerStats.wicketsTaken}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Econ: {((currentBowlerStats.runsConceded) / ((bowlerOvers[currentBowlerStats.name] || 0) * 6 + currentOverBalls || 1) * 6).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* All Bowlers Scorecard */}
            <Card className="shadow-cricket">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Bowling Scorecard</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-6 text-xs font-semibold text-muted-foreground border-b pb-1">
                  <span>Bowler</span>
                  <span>O</span>
                  <span>M</span>
                  <span>R</span>
                  <span>W</span>
                  <span>Econ</span>
                </div>
                {allPlayers.filter((p: any) => 
                    (bowlingTeam === matchData.teamA ? matchData.teamAPlayers.some((tp: any) => tp.name === p.name) : matchData.teamBPlayers.some((tp: any) => tp.name === p.name))
                    && p.oversBowled > 0
                  )
                  .sort((a, b) => b.wicketsTaken - a.wicketsTaken) // Sort by wickets
                  .map((player: any) => {
                    const totalBallsBowled = (player.oversBowled * 6) + (player.ballsBowledInCurrentOver || 0); // Need to adjust this if ballsBowledInCurrentOver is not available
                    const economy = totalBallsBowled > 0 ? ((player.runsConceded / totalBallsBowled) * 6).toFixed(2) : '0.00';
                    return (
                      <div key={player.name} className="grid grid-cols-6 text-sm py-2 border-b last:border-b-0 items-center">
                        <span className="font-medium">{player.name}</span>
                        <span>{player.oversBowled}</span>
                        <span>{player.maidens}</span>
                        <span>{player.runsConceded}</span>
                        <span>{player.wicketsTaken}</span>
                        <span>{economy}</span>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-4">
            <Card className="shadow-cricket">
              <CardHeader>
                <CardTitle className="text-sm">Match Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Run Rate</span>
                  <span className="font-medium">{(score.runs / (score.overs || 1)).toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Boundaries</span>
                  <span className="font-medium">{totalFours + totalSixes} (4s: {totalFours}, 6s: {totalSixes})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dot Balls</span>
                  <span className="font-medium">{totalDotBalls} ({score.balls > 0 ? (totalDotBalls / score.balls * 100).toFixed(1) : '0.0'}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Extras</span>
                  <span className="font-medium">N/A (requires more detailed tracking)</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'commentary' && (
          <div className="space-y-4">
            <Card className="shadow-cricket">
              <CardHeader>
                <CardTitle className="text-sm">Live Commentary</CardTitle>
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
                        <div key={index} className="p-2 rounded" style={{ backgroundColor: ball.type === 'wicket' ? 'hsl(var(--destructive)/0.1)' : (ball.type === 'runs' && (ball.runs === 4 || ball.runs === 6)) ? 'hsl(var(--primary)/0.1)' : 'hsl(var(--card))', borderLeft: ball.type === 'wicket' ? '4px solid hsl(var(--destructive))' : (ball.type === 'runs' && (ball.runs === 4 || ball.runs === 6)) ? '4px solid hsl(var(--primary))' : '4px solid hsl(var(--border))' }}>
                          <p className="font-medium text-xs text-muted-foreground mb-1">{overFormatted} overs</p>
                          <p>{commentary}</p>
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