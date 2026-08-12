import { useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RotateCcw, Trophy, User, Share2 } from "lucide-react";
import html2canvas from "html2canvas";

interface MatchSummaryProps {
  matchData: any;
  allPlayers: any[];
  ballHistory: any[]; // New prop
  innings1Score: number | null;
  matchResult: string | null;
  totalFours: number;
  totalSixes: number;
  totalDotBalls: number;
  onBackToCreate: () => void;
}

export const MatchSummary = ({
  matchData,
  allPlayers,
  ballHistory, // Destructure new prop
  matchResult,
  onBackToCreate
}: MatchSummaryProps) => {
  const summaryRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    if (!summaryRef.current) return;

    try {
      const canvas = await html2canvas(summaryRef.current, {
        scale: 2, // High resolution
        backgroundColor: "#1a1a1a", // Ensure dark background
        useCORS: true // Allow loading external images if any
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          console.error("Canvas to Blob failed");
          return;
        }

        const file = new File([blob], "match-summary.png", { type: "image/png" });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "Match Summary",
              text: `Match Result: ${matchResult || 'Ongoing Info'}`,
            });
          } catch (err) {
            console.warn("Native sharing failed", err);
          }
        } else {
          // Fallback: Download
          const link = document.createElement('a');
          link.download = `match-summary-${Date.now()}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
        }
      }, 'image/png');

    } catch (err) {
      console.error("HTML2Canvas failed:", err);
      alert("Could not generate image. Please try again.");
    }
  };
  // Process ball history to get innings data
  const { innings1, innings2 } = useMemo(() => {
    const history = ballHistory || matchData.ballHistory || []; // Use prop first, then matchData
    const teamA = matchData.teamA;
    const teamB = matchData.teamB;

    // Helper to find which team a player belongs to
    const getPlayerTeam = (playerName: string) => {
      if (matchData.teamAPlayers.some((p: any) => p.name === playerName)) return teamA;
      if (matchData.teamBPlayers.some((p: any) => p.name === playerName)) return teamB;
      return null;
    };

    const i1Stats = {
      team: '',
      runs: 0,
      wickets: 0,
      overs: 0,
      batters: {} as Record<string, { runs: number, balls: number, name: string }>,
      bowlers: {} as Record<string, { wickets: number, runs: number, balls: number, name: string }>
    };

    const i2Stats = {
      team: '',
      runs: 0,
      wickets: 0,
      overs: 0,
      batters: {} as Record<string, { runs: number, balls: number, name: string }>,
      bowlers: {} as Record<string, { wickets: number, runs: number, balls: number, name: string }>
    };

    let currentInnings = 1;
    let firstBattingTeam = '';
    let i1LegalBalls = 0;
    let i2LegalBalls = 0;

    history.forEach((ball: any) => {
      const strikerName = typeof ball.striker === 'object' ? ball.striker?.name : ball.striker;
      const bowlerName = typeof ball.bowler === 'object' ? ball.bowler?.name : ball.bowler;

      if (!strikerName) return;

      const battingTeam = getPlayerTeam(strikerName);
      if (!battingTeam) return;

      if (!firstBattingTeam) {
        firstBattingTeam = battingTeam;
        i1Stats.team = battingTeam;
      }

      // Detect innings change
      if (battingTeam !== firstBattingTeam && currentInnings === 1) {
        currentInnings = 2;
        i2Stats.team = battingTeam;
      }

      const stats = currentInnings === 1 ? i1Stats : i2Stats;

      // Update Score
      stats.runs += ball.runs || 0;
      if (ball.isWicket) {
        stats.wickets += 1;
      }

      // Track legal balls count
      const isLegalBall = ball.deliveryType !== 'wide' && ball.deliveryType !== 'no_ball';
      if (isLegalBall) {
        if (currentInnings === 1) i1LegalBalls++;
        else i2LegalBalls++;
      }

      // Update Batter Stats
      if (!stats.batters[strikerName]) {
        stats.batters[strikerName] = { runs: 0, balls: 0, name: strikerName };
      }
      stats.batters[strikerName].runs += ball.batRuns || 0;
      stats.batters[strikerName].balls += 1; // Wide is included per custom rules

      // Update Bowler Stats
      if (bowlerName) {
        if (!stats.bowlers[bowlerName]) {
          stats.bowlers[bowlerName] = { wickets: 0, runs: 0, balls: 0, name: bowlerName };
        }
        if (ball.deliveryType !== 'bye' && ball.deliveryType !== 'leg_bye') {
          stats.bowlers[bowlerName].runs += ball.runs || 0;
        }
        if (ball.isWicket && ball.dismissalType !== 'run_out' && ball.dismissalType !== 'retired_hurt' && ball.dismissalType !== 'retired_out') {
          stats.bowlers[bowlerName].wickets += 1;
        }
        if (isLegalBall) {
          stats.bowlers[bowlerName].balls += 1;
        }
      }
    });

    const calculateOversNum = (balls: number) => {
      return Math.floor(balls / 6) + (balls % 6) / 10;
    };

    i1Stats.overs = calculateOversNum(i1LegalBalls);
    i2Stats.overs = calculateOversNum(i2LegalBalls);

    // If second innings hasn't started yet, make sure the team name is set correctly
    if (!i2Stats.team && i1Stats.team) {
      i2Stats.team = i1Stats.team === teamA ? teamB : teamA;
    }

    return { innings1: i1Stats, innings2: i2Stats };
  }, [matchData, ballHistory]);

  const getTopPerformers = (stats: any) => {
    const batters = Object.values(stats.batters)
      .sort((a: any, b: any) => b.runs - a.runs)
      .slice(0, 3);

    const bowlers = Object.values(stats.bowlers)
      .sort((a: any, b: any) => b.wickets - a.wickets || a.runs - b.runs) // Most wickets, then least runs
      .slice(0, 3);

    return { batters, bowlers };
  };

  const i1Performers = getTopPerformers(innings1);
  const i2Performers = getTopPerformers(innings2);

  // Helper to format overs
  const formatOvers = (balls: number) => {
    const overs = Math.floor(balls / 6);
    const rem = balls % 6;
    return `${overs}${rem > 0 ? `.${rem}` : ''}`;
  };

  // Calculate overs from balls for bowlers
  const getBowlerOvers = (balls: number) => {
    const overs = Math.floor(balls / 6);
    const rem = balls % 6;
    return `${overs}${rem > 0 ? `.${rem}` : ''}`;
  };

  return (
    <div className="min-h-screen bg-transparent text-foreground font-sans flex items-center justify-center p-4">
      <Card ref={summaryRef} className="w-full max-w-2xl bg-card border-border shadow-2xl overflow-hidden">
        {/* Header Section */}
        <div className="bg-muted p-6 border-b border-border">
          <div className="flex justify-between items-center mb-4">
            {/* Team 1 (Innings 1) */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-8 bg-gradient-to-r from-orange-500 to-green-500 rounded shadow-sm flex items-center justify-center text-xs font-bold text-white">
                {innings1.team.substring(0, 3).toUpperCase()}
              </div>
              <div>
                <div className="text-2xl font-bold leading-none text-foreground">
                  {innings1.runs}/{innings1.wickets}
                </div>
                <div className="text-muted-foreground text-sm">
                  ({innings1.overs.toFixed(1)})
                </div>
              </div>
            </div>

            {/* Match Result */}
            <div className="text-center">
              <div className="text-muted-foreground text-sm mb-1">RESULT</div>
              <div className="text-sm font-medium text-foreground px-3 py-1 bg-background/50 rounded-full whitespace-nowrap">
                {matchResult || "Match in Progress"}
              </div>
            </div>

            {/* Team 2 (Innings 2) */}
            <div className="flex items-center gap-3 text-right">
              <div>
                <div className="text-2xl font-bold leading-none text-foreground">
                  {innings2.runs}/{innings2.wickets}
                </div>
                <div className="text-muted-foreground text-sm">
                  ({innings2.overs.toFixed(1)})
                </div>
              </div>
              <div className="w-10 h-8 bg-blue-600 rounded shadow-sm flex items-center justify-center text-xs font-bold text-white">
                {innings2.team ? innings2.team.substring(0, 3).toUpperCase() : 'T2'}
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {/* Innings 1 Details */}
          <div className="p-4">
            <div className="bg-muted py-2 px-6 flex items-center justify-center gap-2 border-b border-border mb-4 rounded-lg">
              <span className="w-6 h-4 bg-gradient-to-r from-orange-500 to-green-500 rounded-sm inline-block"></span>
              <span className="text-muted-foreground text-sm">
                {innings1.team} · {innings1.runs}/{innings1.wickets} ({innings1.overs.toFixed(1)})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* Batting */}
              <div className="space-y-4">
                {i1Performers.batters.map((batter: any) => (
                  <div key={batter.name} className="flex items-center gap-3 bg-muted p-2.5 rounded-lg border border-border">
                    <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
                      <User className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-foreground capitalize leading-tight">{batter.name}</span>
                      <span className="text-orange-600 dark:text-orange-400 text-sm font-mono font-bold leading-tight">
                        {batter.runs} <span className="text-xs text-muted-foreground font-sans">({batter.balls})</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bowling */}
              <div className="space-y-4">
                {i1Performers.bowlers.map((bowler: any) => (
                  <div key={bowler.name} className="flex items-center justify-end gap-3 text-right bg-muted p-2.5 rounded-lg border border-border">
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-sm text-foreground capitalize leading-tight">{bowler.name}</span>
                      <span className="text-blue-600 dark:text-blue-400 text-sm font-mono font-bold leading-tight">
                        {bowler.wickets}/{bowler.runs} <span className="text-xs text-muted-foreground font-sans">({getBowlerOvers(bowler.balls)})</span>
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
                      <User className="w-6 h-6 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Divider / Innings 2 Header */}
          {innings2.team && (
            <>
              <div className="bg-muted py-2 px-6 flex items-center justify-center gap-2 border-y border-border">
                <span className="w-6 h-4 bg-blue-600 rounded-sm inline-block"></span>
                <span className="text-muted-foreground text-sm">
                  {innings2.team} · {innings2.runs}/{innings2.wickets} ({innings2.overs.toFixed(1)})
                </span>
              </div>

              {/* Innings 2 Details */}
              <div className="p-4">
                <div className="grid grid-cols-2 gap-8">
                  {/* Batting */}
                  <div className="space-y-4">
                    {i2Performers.batters.map((batter: any) => (
                      <div key={batter.name} className="flex items-center gap-3 bg-muted p-2.5 rounded-lg border border-border">
                        <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
                          <User className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-foreground capitalize leading-tight">{batter.name}</span>
                          <span className="text-orange-600 dark:text-orange-400 text-sm font-mono font-bold leading-tight">
                            {batter.runs} <span className="text-xs text-muted-foreground font-sans">({batter.balls})</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bowling */}
                  <div className="space-y-4">
                    {i2Performers.bowlers.map((bowler: any) => (
                      <div key={bowler.name} className="flex items-center justify-end gap-3 text-right bg-muted p-2.5 rounded-lg border border-border">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-sm text-foreground capitalize leading-tight">{bowler.name}</span>
                          <span className="text-blue-600 dark:text-blue-400 text-sm font-mono font-bold leading-tight">
                            {bowler.wickets}/{bowler.runs} <span className="text-xs text-muted-foreground font-sans">({getBowlerOvers(bowler.balls)})</span>
                          </span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
                          <User className="w-6 h-6 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="p-4 bg-muted border-t border-border flex justify-center gap-4">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Summary
            </Button>
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground hover:bg-background"
              onClick={onBackToCreate}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
