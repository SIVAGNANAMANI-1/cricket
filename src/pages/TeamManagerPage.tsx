import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { doc, getDocs, collection, setDoc, query } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { ArrowLeft, Plus, Trash2, Users, Shield, Award, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface SquadPlayer {
  name: string;
  role: "batsman" | "bowler" | "all_rounder" | "wicket_keeper";
}

interface TeamData {
  id: string;
  name: string;
  captain: string;
  keeper: string;
  players: SquadPlayer[];
}

const TeamManagerPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerRole, setNewPlayerRole] = useState<SquadPlayer["role"]>("batsman");
  const [currentPlayers, setCurrentPlayers] = useState<SquadPlayer[]>([]);
  
  const [captain, setCaptain] = useState("");
  const [keeper, setKeeper] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchTeams = async () => {
    try {
      const q = query(collection(db, "teams"));
      const snap = await getDocs(q);
      const list: TeamData[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as TeamData);
      });
      setTeams(list);
    } catch (e) {
      console.warn("Offline or failed fetching teams, loading default teams:", e);
      // Fallback local storage
      const saved = localStorage.getItem("umpireTeams");
      if (saved) setTeams(JSON.parse(saved));
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return;
    const upName = newPlayerName.trim();
    if (currentPlayers.some(p => p.name.toLowerCase() === upName.toLowerCase())) return;

    setCurrentPlayers(prev => [...prev, { name: upName, role: newPlayerRole }]);
    if (newPlayerRole === "wicket_keeper" && !keeper) setKeeper(upName);
    setNewPlayerName("");
  };

  const handleRemovePlayer = (name: string) => {
    setCurrentPlayers(prev => prev.filter(p => p.name !== name));
    if (captain === name) setCaptain("");
    if (keeper === name) setKeeper("");
  };

  const handleSaveTeam = async () => {
    if (!newTeamName.trim() || currentPlayers.length < 5) return;
    setLoading(true);

    const teamId = Math.random().toString(36).substring(2, 9);
    const teamPayload: TeamData = {
      id: teamId,
      name: newTeamName.trim(),
      captain: captain || (currentPlayers[0]?.name || ""),
      keeper: keeper || (currentPlayers.find(p => p.role === "wicket_keeper")?.name || ""),
      players: currentPlayers
    };

    try {
      await setDoc(doc(db, "teams", teamId), teamPayload);
      setTeams(prev => [...prev, teamPayload]);
      localStorage.setItem("umpireTeams", JSON.stringify([...teams, teamPayload]));
      
      // Reset creation state
      setNewTeamName("");
      setCurrentPlayers([]);
      setCaptain("");
      setKeeper("");
      setIsCreating(false);
    } catch (e) {
      console.error("Save team failed", e);
    } finally {
      setLoading(false);
    }
  };

  const isEditable = ["admin", "scorer", "umpire"].includes(role);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      {/* Navbar header */}
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Users className="w-6 h-6 text-orange-500" />
            Squad & Team Roster Manager
          </h1>
        </div>

        {isEditable && !isCreating && (
          <Button onClick={() => setIsCreating(true)} className="bg-orange-500 hover:bg-orange-600 font-bold">
            <Plus className="w-4 h-4 mr-1" /> New Team
          </Button>
        )}
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {isCreating && (
          <Card className="bg-gray-900 border-gray-800 text-white">
            <CardHeader>
              <CardTitle className="text-xl">Create Team Profile</CardTitle>
              <CardDescription className="text-gray-400">Add player details, assign captain and wicket-keeper roles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  placeholder="e.g. Mumbai Strikers"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              {/* Add player form */}
              <div className="bg-gray-850 p-4 rounded-xl border border-gray-800 space-y-3">
                <Label className="text-xs text-gray-400 uppercase font-bold block">Add Roster Players</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="Player Name"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white col-span-1 sm:col-span-1.5"
                  />
                  <select
                    className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-2.5"
                    value={newPlayerRole}
                    onChange={(e) => setNewPlayerRole(e.target.value as any)}
                  >
                    <option value="batsman">Batsman</option>
                    <option value="bowler">Bowler</option>
                    <option value="all_rounder">All-Rounder</option>
                    <option value="wicket_keeper">Wicketkeeper</option>
                  </select>
                  <Button onClick={handleAddPlayer} variant="secondary" className="font-bold">
                    <UserPlus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>

                {/* Added players list */}
                {currentPlayers.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                    {currentPlayers.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-800 border border-gray-750 px-3 py-2 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{p.name}</span>
                          <Badge variant="secondary" className="bg-slate-700 text-slate-200 capitalize text-[10px]">
                            {p.role.replace("_", " ")}
                          </Badge>
                          {captain === p.name && <Badge className="bg-yellow-600 text-white text-[9px] font-bold">C</Badge>}
                          {keeper === p.name && <Badge className="bg-blue-600 text-white text-[9px] font-bold">WK</Badge>}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCaptain(p.name)}
                            className={`text-xs px-2 py-1 rounded font-bold transition-colors ${captain === p.name ? "bg-yellow-600 text-white" : "text-gray-400 hover:text-white"}`}
                          >
                            Captain
                          </button>
                          <button
                            onClick={() => setKeeper(p.name)}
                            className={`text-xs px-2 py-1 rounded font-bold transition-colors ${keeper === p.name ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
                          >
                            Keeper
                          </button>
                          <button onClick={() => handleRemovePlayer(p.name)} className="text-red-400 hover:text-red-300 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsCreating(false)} className="flex-1 border-gray-700 hover:bg-gray-800 text-white">
                  Cancel
                </Button>
                <Button
                  disabled={loading || !newTeamName.trim() || currentPlayers.length < 5}
                  onClick={handleSaveTeam}
                  className="flex-1 bg-green-600 hover:bg-green-700 font-bold"
                >
                  {loading ? "Saving..." : "Save Team Profile"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Teams Directory */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team) => (
            <Card key={team.id} className="bg-gray-900 border-gray-800 text-white hover:border-orange-500/30 transition-all cursor-default">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-black text-white flex items-center justify-between">
                  <span>{team.name}</span>
                  <Badge variant="outline" className="text-xs text-orange-400 border-orange-500/20">{team.players.length} Squad</Badge>
                </CardTitle>
                <CardDescription className="text-gray-400 text-xs">Team Code: {team.id.toUpperCase()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-850 p-2.5 rounded-lg border border-gray-800 flex items-center gap-2">
                    <Award className="w-4 h-4 text-yellow-500" />
                    <div>
                      <span className="text-slate-500 block">CAPTAIN</span>
                      <span className="font-bold">{team.captain || "N/A"}</span>
                    </div>
                  </div>
                  <div className="bg-gray-850 p-2.5 rounded-lg border border-gray-800 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <div>
                      <span className="text-slate-500 block">WICKETKEEPER</span>
                      <span className="font-bold">{team.keeper || "N/A"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider mb-1.5">Roster Ranks</span>
                  <div className="flex flex-wrap gap-1.5">
                    {team.players.map((p, idx) => (
                      <span key={idx} className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-750 flex items-center gap-1.5 text-gray-200">
                        {p.name}
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          p.role === "batsman" ? "bg-orange-500" :
                          p.role === "bowler" ? "bg-blue-500" :
                          p.role === "wicket_keeper" ? "bg-purple-500" : "bg-yellow-500"
                        }`} />
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {teams.length === 0 && (
            <div className="col-span-full text-center py-12 bg-gray-900/40 border border-dashed border-gray-850 rounded-2xl">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-bold">No Squads Registered Yet</p>
              <p className="text-xs text-gray-600 mt-1">Register teams to quickly load squads when scoring matches.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamManagerPage;
