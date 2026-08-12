import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { ArrowLeft, User, Search, Target, Award, Activity } from "lucide-react";

interface PlayerCareerStats {
  name: string;
  matches: number;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  highestScore: number;
  wickets: number;
  runsConceded: number;
  ballsBowled: number;
  oversBowled: number;
}

const appId = (window as any).__app_id || 'default-app-id';

const PlayerProfilesPage: React.FC = () => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<PlayerCareerStats[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPlayerStats = async () => {
    try {
      const path = `artifacts/${appId}/public/data/matches`;
      const snap = await getDocs(collection(db, path));
      const playerMap: Record<string, PlayerCareerStats> = {};

      const initPlayer = (name: string) => {
        if (!playerMap[name]) {
          playerMap[name] = {
            name, matches: 0, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, highestScore: 0,
            wickets: 0, runsConceded: 0, ballsBowled: 0, oversBowled: 0
          };
        }
      };

      snap.forEach((doc) => {
        const d = doc.data();
        const allPlayers = d.allPlayers || [];

        // Count match participation
        allPlayers.forEach((p: any) => {
          initPlayer(p.name);
          playerMap[p.name].matches++;
          playerMap[p.name].runs += (p.runsScored || 0);
          playerMap[p.name].ballsFaced += (p.ballsFaced || 0);
          playerMap[p.name].fours += (p.fours || 0);
          playerMap[p.name].sixes += (p.sixes || 0);
          playerMap[p.name].highestScore = Math.max(playerMap[p.name].highestScore, p.runsScored || 0);

          playerMap[p.name].wickets += (p.wicketsTaken || 0);
          playerMap[p.name].runsConceded += (p.runsConceded || 0);
          
          const overs = p.oversBowled || 0;
          const completedBalls = Math.floor(overs) * 6 + Math.round((overs % 1) * 10);
          playerMap[p.name].ballsBowled += completedBalls;
          playerMap[p.name].oversBowled += overs;
        });
      });

      setPlayers(Object.values(playerMap));
    } catch (e) {
      console.warn("Firestore fetch failed, load mock player directory:", e);
      const mockPlayers: PlayerCareerStats[] = [
        { name: "Virat Kohli", matches: 12, runs: 540, ballsFaced: 360, fours: 42, sixes: 18, highestScore: 110, wickets: 2, runsConceded: 45, ballsBowled: 18, oversBowled: 3 },
        { name: "Jasprit Bumrah", matches: 12, runs: 45, ballsFaced: 40, fours: 2, sixes: 1, highestScore: 15, wickets: 28, runsConceded: 240, ballsBowled: 288, oversBowled: 48 },
        { name: "Hardik Pandya", matches: 12, runs: 280, ballsFaced: 180, fours: 22, sixes: 14, highestScore: 65, wickets: 14, runsConceded: 180, ballsBowled: 144, oversBowled: 24 },
        { name: "Rohit Sharma", matches: 10, runs: 410, ballsFaced: 270, fours: 35, sixes: 22, highestScore: 92, wickets: 0, runsConceded: 12, ballsBowled: 6, oversBowled: 1 }
      ];
      setPlayers(mockPlayers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayerStats();
  }, []);

  const filteredPlayers = players.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      {/* Header */}
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <User className="w-6 h-6 text-orange-500" />
            Player Profiles & Career Stats
          </h1>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search Player..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-905 border-gray-800 text-white pl-10 focus:border-orange-500"
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPlayers.map((p, idx) => {
          // Calculations
          const strikeRate = p.ballsFaced > 0 ? ((p.runs / p.ballsFaced) * 100).toFixed(1) : "0.0";
          const battingAvg = p.matches > 0 ? (p.runs / p.matches).toFixed(1) : "0.0";
          
          const econ = p.ballsBowled > 0 ? ((p.runsConceded / p.ballsBowled) * 6).toFixed(2) : "0.00";
          const bowlAvg = p.wickets > 0 ? (p.runsConceded / p.wickets).toFixed(2) : "0.00";

          return (
            <Card key={idx} className="bg-gray-900 border-gray-800 text-white hover:border-orange-500/30 transition-all cursor-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-black text-white flex items-center justify-between">
                  <span>{p.name}</span>
                  <Badge variant="outline" className="text-xs text-orange-450 border-orange-500/20">{p.matches} Matches</Badge>
                </CardTitle>
                <CardDescription className="text-gray-400 text-xs">Career Directory Stats Card</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Batting Stats Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-orange-450 font-black uppercase tracking-wider border-b border-gray-850 pb-1">
                    <Award className="w-3.5 h-3.5" /> Batting Summary
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-gray-850 p-2 rounded-lg border border-gray-800">
                      <span className="text-slate-500 block">RUNS</span>
                      <span className="font-bold text-sm">{p.runs}</span>
                    </div>
                    <div className="bg-gray-850 p-2 rounded-lg border border-gray-800">
                      <span className="text-slate-500 block">AVG</span>
                      <span className="font-bold text-sm">{battingAvg}</span>
                    </div>
                    <div className="bg-gray-850 p-2 rounded-lg border border-gray-800">
                      <span className="text-slate-500 block">S/R</span>
                      <span className="font-bold text-sm">{strikeRate}</span>
                    </div>
                    <div className="bg-gray-850 p-2 rounded-lg border border-gray-800">
                      <span className="text-slate-500 block">HS</span>
                      <span className="font-bold text-sm text-green-400">{p.highestScore}</span>
                    </div>
                  </div>
                </div>

                {/* Bowling Stats Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-blue-450 font-black uppercase tracking-wider border-b border-gray-850 pb-1">
                    <Activity className="w-3.5 h-3.5" /> Bowling Summary
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-gray-850 p-2 rounded-lg border border-gray-800">
                      <span className="text-slate-500 block">WICKETS</span>
                      <span className="font-bold text-sm">{p.wickets}</span>
                    </div>
                    <div className="bg-gray-850 p-2 rounded-lg border border-gray-800">
                      <span className="text-slate-500 block">ECON</span>
                      <span className="font-bold text-sm">{econ}</span>
                    </div>
                    <div className="bg-gray-850 p-2 rounded-lg border border-gray-800">
                      <span className="text-slate-500 block">AVG</span>
                      <span className="font-bold text-sm">{bowlAvg}</span>
                    </div>
                    <div className="bg-gray-850 p-2 rounded-lg border border-gray-800">
                      <span className="text-slate-500 block">OVERS</span>
                      <span className="font-bold text-sm text-blue-400">{p.oversBowled.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          );
        })}

        {filteredPlayers.length === 0 && (
          <div className="col-span-full text-center py-12 bg-gray-900/40 border border-dashed border-gray-850 rounded-2xl">
            <User className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-bold">No Players Match Your Search</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerProfilesPage;
