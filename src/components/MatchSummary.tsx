import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Users, RotateCcw } from "lucide-react";

interface MatchSummaryProps {
  matchData: any;
  allPlayers: any[];
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
  innings1Score,
  matchResult,
  totalFours,
  totalSixes,
  totalDotBalls,
  onBackToCreate
}: MatchSummaryProps) => {
  // Calculate final scores for each team
  const teamAScore = allPlayers.filter(p => matchData.teamAPlayers.some((tp: any) => tp.name === p.name)).reduce((sum, p) => sum + p.runsScored, 0);
  const teamBScore = allPlayers.filter(p => matchData.teamBPlayers.some((tp: any) => tp.name === p.name)).reduce((sum, p) => sum + p.runsScored, 0);

  // Calculate top performers overall
  const topRunScorer = allPlayers.reduce((max, p) => p.runsScored > max.runsScored ? p : max, allPlayers[0]);
  const topWicketTaker = allPlayers.reduce((max, p) => p.wicketsTaken > max.wicketsTaken ? p : max, allPlayers[0]);

  return (
    <div className="min-h-screen bg-gradient-sky p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6 animate-fade-in">
          <h1 className="text-2xl font-bold text-cricket-field mb-2">Match Summary</h1>
          <div className="bg-card p-4 rounded-lg shadow-cricket">
            <p className="text-lg font-semibold mb-2">
              {matchData.teamA} vs {matchData.teamB}
            </p>
            <div className="text-3xl font-bold text-cricket-field mb-1">
              {matchResult || "Match Concluded"}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Final Scores */}
          <Card className="shadow-cricket animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Final Scores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                <strong>{matchData.teamA}:</strong> {teamAScore} runs
              </p>
              <p className="text-sm">
                <strong>{matchData.teamB}:</strong> {teamBScore} runs
              </p>
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card className="shadow-cricket animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm font-medium">Highest Run Scorer</p>
                <p className="text-sm">{topRunScorer?.name}: {topRunScorer?.runsScored} runs</p>
              </div>
              <div>
                <p className="text-sm font-medium">Best Bowler</p>
                <p className="text-sm">{topWicketTaker?.name}: {topWicketTaker?.wicketsTaken} wickets</p>
              </div>
            </CardContent>
          </Card>

          {/* Key Statistics */}
          <Card className="shadow-cricket animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Key Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm"><strong>Total Fours:</strong> {totalFours}</p>
              <p className="text-sm"><strong>Total Sixes:</strong> {totalSixes}</p>
              <p className="text-sm"><strong>Total Dot Balls:</strong> {totalDotBalls}</p>
            </CardContent>
          </Card>

          {/* Back Button */}
          <Button
            onClick={onBackToCreate}
            variant="ghost"
            className="w-full text-muted-foreground"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Create New Match
          </Button>
        </div>
      </div>
    </div>
  );
};
