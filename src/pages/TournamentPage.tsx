import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { doc, getDoc, getDocs, setDoc, deleteDoc, collection, query, where } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useAuth } from "@/context/AuthContext";
import {
  Trophy, Calendar, BarChart3, Users, Settings, Plus,
  Trash2, Play, ArrowLeft, Check, AlertCircle, Clock,
  MapPin, FolderOpen
} from "lucide-react";
import {
  generateTournamentSchedule,
  formatDateString,
  parseDateString,
  ScheduledMatch,
  SchedulingResult
} from "@/utils/scheduler";

interface RosterPlayer {
  name: string;
  role: string;
}

interface TeamInput {
  id: string;
  name: string;
  shortName: string;
  captain: string;
  keeper: string;
  players: RosterPlayer[];
}

interface TournamentData {
  id: string;
  name: string;
  description: string;
  organizer: string;
  venue: string;
  city: string;
  format: "T20" | "ODI" | "Test" | "Custom";
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: "draft" | "scheduled" | "live" | "completed" | "cancelled" | "archived";
  matchesPerTeam: number;
  maxMatchesPerDay: number;
  allowDoubleHeaders: boolean;
  minRestDays: number;
  firstMatchStartTime: string;
  matchDurationHours: number;
  breakDurationMinutes: number;
  pointsConfig: {
    win: number;
    tie: number;
    nr: number;
    loss: number;
  };
  teams: TeamInput[];
  playoffs: "league_only" | "league_playoffs" | "league_semis_final";
  finalDate: string;
}

const appId = (window as any).__app_id || 'default-app-id';

const TournamentPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  // Directory state
  const [tournamentList, setTournamentList] = useState<TournamentData[]>([]);
  
  // Active Tournament state
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Wizard Creation states
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState(1);
  const [loadCodeInput, setLoadCodeInput] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  // STEP 1: Info states
  const [tName, setTName] = useState("");
  const [tDesc, setTDesc] = useState("");
  const [tOrganizer, setTOrganizer] = useState("");
  const [tVenue, setTVenue] = useState("");
  const [tCity, setTCity] = useState("");
  const [tFormat, setTFormat] = useState<TournamentData["format"]>("T20");
  const [tStartDate, setTStartDate] = useState("");
  const [tEndDate, setTEndDate] = useState("");
  const [tPlayoffs, setTPlayoffs] = useState<TournamentData["playoffs"]>("league_only");

  // STEP 2: Teams states
  const [teamList, setTeamList] = useState<TeamInput[]>([]);
  const [tTeamName, setTTeamName] = useState("");
  const [tTeamShort, setTTeamShort] = useState("");
  const [tTeamCaptain, setTTeamCaptain] = useState("");
  const [tTeamKeeper, setTTeamKeeper] = useState("");

  // STEP 3: Scheduling states
  const [matchesPerTeam, setMatchesPerTeam] = useState(3);
  const [maxMatchesPerDay, setMaxMatchesPerDay] = useState(2);
  const [allowDoubleHeaders, setAllowDoubleHeaders] = useState(false);
  const [minRestDays, setMinRestDays] = useState(1);
  const [firstMatchStartTime, setFirstMatchStartTime] = useState("09:00");
  const [matchDuration, setMatchDuration] = useState(3);
  const [breakDuration, setBreakDuration] = useState(30);

  // Step 4: Scheduling Solver result
  const [schedulingResult, setSchedulingResult] = useState<SchedulingResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [savingTournament, setSavingTournament] = useState(false);
  const [preGeneratedCode, setPreGeneratedCode] = useState("");

  const teamNameRef = React.useRef<HTMLInputElement | null>(null);
  const teamShortRef = React.useRef<HTMLInputElement | null>(null);
  const teamCaptainRef = React.useRef<HTMLInputElement | null>(null);
  const teamKeeperRef = React.useRef<HTMLInputElement | null>(null);

  // Point System Config
  const [winPoints, setWinPoints] = useState(2);
  const [tiePoints, setTiePoints] = useState(1);
  const [nrPoints, setNrPoints] = useState(1);
  const [lossPoints, setLossPoints] = useState(0);

  // Fetch all tournaments (Directory view)
  const fetchAllTournaments = async () => {
    try {
      const q = query(collection(db, `artifacts/${appId}/public/data/tournaments`));
      const snap = await getDocs(q);
      const list: TournamentData[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as TournamentData);
      });
      setTournamentList(list);
    } catch (e) {
      console.warn("Failed fetching tournament list:", e);
    }
  };

  // Fetch active tournament and its matches
  const selectActiveTournament = async (activeId: string) => {
    setLoading(true);
    try {
      const docRef = doc(db, `artifacts/${appId}/public/data/tournaments/${activeId}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const tData = { id: snap.id, ...snap.data() } as TournamentData;
        setTournament(tData);

        // Configure point inputs to match database values
        setWinPoints(tData.pointsConfig?.win ?? 2);
        setTiePoints(tData.pointsConfig?.tie ?? 1);
        setNrPoints(tData.pointsConfig?.nr ?? 1);
        setLossPoints(tData.pointsConfig?.loss ?? 0);

        // Fetch matches for this tournament
        const matchesQuery = query(
          collection(db, `artifacts/${appId}/public/data/matches`),
          where("tournamentId", "==", activeId)
        );
        const matchesSnap = await getDocs(matchesQuery);
        const mList: any[] = [];
        matchesSnap.forEach((mDoc) => {
          mList.push({ id: mDoc.id, ...mDoc.data() });
        });
        mList.sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));
        setFixtures(mList);
      }
    } catch (e) {
      console.warn("Failed selecting tournament:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDirectory = () => {
    setTournament(null);
    setFixtures([]);
    fetchAllTournaments();
  };

  const handleDeleteTournament = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this tournament and all its fixtures?")) return;
    try {
      // 1. Delete tournament doc
      await deleteDoc(doc(db, `artifacts/${appId}/public/data/tournaments/${id}`));
      
      // 2. Delete matches belonging to the tournament
      const matchesQuery = query(
        collection(db, `artifacts/${appId}/public/data/matches`),
        where("tournamentId", "==", id)
      );
      const matchesSnap = await getDocs(matchesQuery);
      for (const mDoc of matchesSnap.docs) {
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/matches/${mDoc.id}`));
      }

      setTournamentList(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error("Failed to delete tournament", err);
    }
  };

  const handleShareSchedule = () => {
    if (!tournament) return;
    const textHeader = `🏆 ${tournament.name} 🏆\n📍 Venue: ${tournament.venue}, ${tournament.city}\n🗓️ Dates: ${tournament.startDate} to ${tournament.endDate}\n🔑 Access Code: ${tournament.id}\n\n📅 MATCH TIMETABLE:\n`;
    const textFixtures = fixtures.map(f => {
      return `Match ${f.matchNumber}: ${f.teamA} vs ${f.teamB} (${f.scheduledDate} @ ${f.scheduledTime})`;
    }).join("\n");
    const shareLink = `\n\n🔗 View Standings Live: ${window.location.origin}/tournament?code=${tournament.id}`;
    const fullText = textHeader + textFixtures + shareLink;
    navigator.clipboard.writeText(fullText);
    alert("Tournament schedule and timetable link copied to clipboard!");
  };

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchAllTournaments();
      const activeId = localStorage.getItem("activeTournamentId");
      if (activeId) {
        await selectActiveTournament(activeId);
      }
      setLoading(false);
    };
    init();
  }, []);

  // Duration Helper
  const tournamentDurationDays = useMemo(() => {
    if (!tStartDate || !tEndDate) return 0;
    const start = parseDateString(tStartDate);
    const end = parseDateString(tEndDate);
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }, [tStartDate, tEndDate]);

  // Handle Team addition
  const handleAddTeam = () => {
    if (!tTeamName.trim() || !tTeamShort.trim()) return;
    const newTeam: TeamInput = {
      id: Math.random().toString(36).substring(2, 8).toUpperCase(),
      name: tTeamName.trim(),
      shortName: tTeamShort.trim().toUpperCase(),
      captain: tTeamCaptain.trim() || "Captain",
      keeper: tTeamKeeper.trim() || "Keeper",
      players: []
    };
    setTeamList(prev => [...prev, newTeam]);
    setTTeamName("");
    setTTeamShort("");
    setTTeamCaptain("");
    setTTeamKeeper("");
    setTimeout(() => {
      teamNameRef.current?.focus();
    }, 50);
  };

  const handleRemoveTeam = (id: string) => {
    setTeamList(prev => prev.filter(t => t.id !== id));
  };

  // Run Scheduling Validation
  const runSchedulerValidation = () => {
    setValidationErrors([]);
    const teams = teamList.map(t => t.name);

    const config = {
      teams,
      matchesPerTeam,
      startDate: tStartDate,
      endDate: tEndDate,
      maxMatchesPerDay,
      allowDoubleHeaders,
      minRestDays,
      firstMatchStartTime,
      matchDurationHours: matchDuration,
      breakDurationMinutes: breakDuration,
      finalDate: tEndDate,
      playoffs: tPlayoffs
    };

    const result = generateTournamentSchedule(config);
    setSchedulingResult(result);
  };

  useEffect(() => {
    if (step === 4) {
      runSchedulerValidation();
      setPreGeneratedCode(Math.random().toString(36).substring(2, 9).toUpperCase());
    }
  }, [step]);

  // Create and Save Tournament
  const handleCreateTournament = async () => {
    if (!schedulingResult || !schedulingResult.success || !schedulingResult.schedule) return;
    setSavingTournament(true);

    const tournamentId = preGeneratedCode || Math.random().toString(36).substring(2, 9).toUpperCase();

    const tPayload: TournamentData = {
      id: tournamentId,
      name: tName.trim(),
      description: tDesc.trim(),
      organizer: tOrganizer.trim(),
      venue: tVenue.trim(),
      city: tCity.trim(),
      format: tFormat,
      startDate: tStartDate,
      endDate: tEndDate,
      status: "scheduled",
      matchesPerTeam,
      maxMatchesPerDay,
      allowDoubleHeaders,
      minRestDays,
      firstMatchStartTime,
      matchDurationHours: matchDuration,
      breakDurationMinutes: breakDuration,
      pointsConfig: {
        win: winPoints,
        tie: tiePoints,
        nr: nrPoints,
        loss: lossPoints
      },
      teams: teamList,
      playoffs: tPlayoffs,
      finalDate: tEndDate
    };

    try {
      await setDoc(doc(db, `artifacts/${appId}/public/data/tournaments/${tournamentId}`), tPayload);

      for (const f of schedulingResult.schedule) {
        const matchCode = `TM${f.matchNumber}-${tournamentId}`;
        const matchPayload = {
          id: matchCode,
          publicCode: matchCode,
          umpireKey: Math.random().toString(36).substring(2, 8).toUpperCase(),
          tournamentId: tournamentId,
          isTournamentMatch: true,
          matchNumber: f.matchNumber,
          teamA: f.teamA,
          teamB: f.teamB,
          overs: tFormat === "T20" ? 20 : tFormat === "ODI" ? 50 : 5,
          teamSize: 11,
          teamAPlayers: [],
          teamBPlayers: [],
          scheduledDate: f.scheduledDate,
          scheduledTime: f.scheduledTime,
          venue: tVenue,
          status: "scheduled",
          score: { runs: 0, wickets: 0, balls: 0, overs: 0 },
          ballHistory: [],
          recentBalls: [],
          createdAt: Date.now()
        };

        await setDoc(doc(db, `artifacts/${appId}/public/data/matches/${matchCode}`), matchPayload);
      }

      localStorage.setItem("activeTournamentId", tournamentId);
      
      await selectActiveTournament(tournamentId);
      setIsCreating(false);
      setStep(1);
    } catch (e) {
      console.error("Failed saving tournament fixtures to Firestore:", e);
    } finally {
      setSavingTournament(false);
    }
  };

  const handleLoadTournament = async () => {
    if (!loadCodeInput.trim()) return;
    setLoadError(null);
    try {
      const docRef = doc(db, `artifacts/${appId}/public/data/tournaments/${loadCodeInput.trim().toUpperCase()}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        localStorage.setItem("activeTournamentId", loadCodeInput.trim().toUpperCase());
        await selectActiveTournament(loadCodeInput.trim().toUpperCase());
        setLoadCodeInput("");
      } else {
        setLoadError("Tournament code not found.");
      }
    } catch (e) {
      setLoadError("Network error. Please try again.");
    }
  };

  const standings = useMemo(() => {
    if (!tournament) return [];
    
    const tableMap: Record<string, any> = {};
    tournament.teams.forEach(t => {
      tableMap[t.name] = {
        teamName: t.name,
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        nr: 0,
        points: 0,
        runsScored: 0,
        oversFaced: 0,
        runsConceded: 0,
        oversBowled: 0
      };
    });

    fixtures.forEach(m => {
      if (m.status === "completed" && m.matchResult) {
        const teamA = m.teamA;
        const teamB = m.teamB;

        if (!tableMap[teamA]) return;
        if (!tableMap[teamB]) return;

        tableMap[teamA].played++;
        tableMap[teamB].played++;

        const winner = m.matchResult.includes(teamA) ? teamA : m.matchResult.includes(teamB) ? teamB : null;

        if (winner) {
          tableMap[winner].won++;
          tableMap[winner].points += winPoints;
          const loser = winner === teamA ? teamB : teamA;
          tableMap[loser].lost++;
          tableMap[loser].points += lossPoints;
        } else if (m.matchResult.toLowerCase().includes("tie")) {
          tableMap[teamA].tied++;
          tableMap[teamB].tied++;
          tableMap[teamA].points += tiePoints;
          tableMap[teamB].points += tiePoints;
        } else {
          tableMap[teamA].nr++;
          tableMap[teamB].nr++;
          tableMap[teamA].points += nrPoints;
          tableMap[teamB].points += nrPoints;
        }

        const oversFacedA = m.score && m.score.wickets >= 10 ? tournament.format === "T20" ? 20 : 50 : (m.score?.balls || 0) / 6;
        const oversFacedB = tournament.format === "T20" ? 20 : 50;

        const runsA = m.score?.runs || 0;
        const runsB = m.innings1Score || 0;

        tableMap[teamA].runsScored += runsA;
        tableMap[teamA].oversFaced += oversFacedA || 1;
        tableMap[teamA].runsConceded += runsB;
        tableMap[teamA].oversBowled += oversFacedB;

        tableMap[teamB].runsScored += runsB;
        tableMap[teamB].oversFaced += oversFacedB;
        tableMap[teamB].runsConceded += runsA;
        tableMap[teamB].oversBowled += oversFacedA || 1;
      }
    });

    return Object.values(tableMap)
      .map((t: any) => {
        const batRate = t.oversFaced > 0 ? t.runsScored / t.oversFaced : 0;
        const bowlRate = t.oversBowled > 0 ? t.runsConceded / t.oversBowled : 0;
        return { ...t, nrr: batRate - bowlRate };
      })
      .sort((a, b) => b.points - a.points || b.nrr - a.nrr);
  }, [tournament, fixtures, winPoints, tiePoints, nrPoints, lossPoints]);

  const isEditable = ["admin", "scorer", "umpire"].includes(role);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
      </div>
    );
  }

  // Render Dashboard if Active Tournament Exists
  if (tournament && !isCreating) {
    const completedCount = fixtures.filter(f => f.status === "completed").length;
    const liveMatches = fixtures.filter(f => f.status === "live");

    return (
      <div className="min-h-screen bg-gray-950 text-white p-4">
        {/* Navbar */}
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBackToDirectory} className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-1" /> Directory
            </Button>
            <div>
              <h1 className="text-xl font-black uppercase text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                {tournament.name}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-orange-400 uppercase tracking-widest font-bold">Tournament Code: {tournament.id}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(tournament.id);
                    alert(`Tournament Code "${tournament.id}" copied to clipboard!`);
                  }}
                  className="text-gray-400 hover:text-white transition-colors bg-white/5 p-1 rounded hover:bg-white/10"
                  title="Copy Tournament Code"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-orange-400" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={handleShareSchedule} variant="secondary" size="sm" className="text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 border-none gap-1 h-9">
              <Share2 className="w-3.5 h-3.5" /> Share Schedule
            </Button>
            <Button onClick={handleBackToDirectory} variant="outline" size="sm" className="text-xs font-bold border-gray-800 text-white hover:bg-gray-850 h-9">
              Switch Tournament
            </Button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto space-y-6">
          {/* Overview Dashboard Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gray-900 border-gray-800 text-white md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400 uppercase tracking-wider">Tournament Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span>Fixtures: {completedCount} / {fixtures.length} Completed</span>
                  <span className="font-bold text-orange-400">{Math.round((completedCount / (fixtures.length || 1)) * 100)}% Done</span>
                </div>
                <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="bg-orange-500 h-full transition-all" style={{ width: `${(completedCount / (fixtures.length || 1)) * 100}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2">
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block">FORMAT</span>
                    <span className="font-bold">{tournament.format}</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block">VENUE</span>
                    <span className="font-bold truncate block">{tournament.venue}</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block">END DATE</span>
                    <span className="font-bold text-red-400">{tournament.endDate}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400 uppercase tracking-wider">Live & Next Match</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {liveMatches.length > 0 ? (
                  <div className="bg-red-950/40 border border-red-500/25 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[9px] bg-red-650 text-white px-2 py-0.5 rounded font-black animate-pulse">LIVE</span>
                      <p className="text-xs font-bold text-white mt-1.5">{liveMatches[0].teamA} vs {liveMatches[0].teamB}</p>
                    </div>
                    <Button size="sm" onClick={() => navigate(`/live/${liveMatches[0].publicCode}`)} className="bg-red-650 hover:bg-red-700 text-xs font-bold h-8 border-none text-white">
                      Watch
                    </Button>
                  </div>
                ) : (
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-855">
                    <p className="text-xs text-slate-500">No active live matches.</p>
                    {fixtures.find(f => f.status === "scheduled") ? (
                      <div className="pt-2">
                        <span className="text-[10px] text-orange-400 font-bold block">NEXT UPCOMING</span>
                        <p className="text-xs font-bold text-white mt-0.5">
                          {fixtures.find(f => f.status === "scheduled")?.teamA} vs {fixtures.find(f => f.status === "scheduled")?.teamB}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 mt-2">All matches completed.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tab Content */}
          <Tabs defaultValue="standings" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-900 border border-gray-800 p-1">
              <TabsTrigger value="standings" className="text-xs font-bold">Standings</TabsTrigger>
              <TabsTrigger value="fixtures" className="text-xs font-bold">Fixtures</TabsTrigger>
              <TabsTrigger value="teams" className="text-xs font-bold">Teams</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs font-bold">Points Config</TabsTrigger>
            </TabsList>

            {/* STANDINGS TAB */}
            <TabsContent value="standings" className="mt-4">
              <Card className="bg-gray-900 border-gray-800 text-white">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-orange-400" /> Standings Table
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 sm:p-2">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800 hover:bg-transparent">
                        <TableHead className="text-gray-400 text-xs font-bold pl-4">TEAM</TableHead>
                        <TableHead className="text-gray-400 text-xs font-bold text-center">P</TableHead>
                        <TableHead className="text-gray-400 text-xs font-bold text-center">W</TableHead>
                        <TableHead className="text-gray-400 text-xs font-bold text-center">L</TableHead>
                        <TableHead className="text-gray-400 text-xs font-bold text-center">T</TableHead>
                        <TableHead className="text-gray-400 text-xs font-bold text-center">NR</TableHead>
                        <TableHead className="text-gray-400 text-xs font-bold text-center">PTS</TableHead>
                        <TableHead className="text-gray-400 text-xs font-bold text-right pr-4">NRR</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {standings.map((team, idx) => (
                        <TableRow key={idx} className="border-gray-800 hover:bg-gray-850">
                          <TableCell className="font-bold pl-4 flex items-center gap-2">
                            <span className="text-gray-500 text-xs">#{idx + 1}</span>
                            <span>{team.teamName}</span>
                          </TableCell>
                          <TableCell className="text-center font-semibold">{team.played}</TableCell>
                          <TableCell className="text-center font-medium text-green-400">{team.won}</TableCell>
                          <TableCell className="text-center font-medium text-red-400">{team.lost}</TableCell>
                          <TableCell className="text-center font-medium text-blue-400">{team.tied}</TableCell>
                          <TableCell className="text-center font-medium text-slate-400">{team.nr}</TableCell>
                          <TableCell className="text-center font-black text-orange-400">{team.points}</TableCell>
                          <TableCell className="text-right font-mono text-xs pr-4 text-gray-300">
                            {team.nrr >= 0 ? `+${team.nrr.toFixed(3)}` : team.nrr.toFixed(3)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* FIXTURES TAB */}
            <TabsContent value="fixtures" className="mt-4">
              <Card className="bg-gray-900 border-gray-800 text-white">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-400" /> Match Fixture Log
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {fixtures.map((f) => (
                    <div
                      key={f.id}
                      className="bg-gray-850 p-4 rounded-xl border border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-gray-700 transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-850">MATCH {f.matchNumber}</Badge>
                          <span className="text-xs text-gray-500">{f.scheduledDate} @ {f.scheduledTime}</span>
                        </div>
                        <p className="text-sm font-bold mt-1.5 flex items-center gap-1.5">
                          <span>{f.teamA}</span>
                          <span className="text-gray-500 font-normal">vs</span>
                          <span>{f.teamB}</span>
                        </p>
                        {f.status === "completed" && f.matchResult && (
                          <p className="text-xs font-bold text-green-400 mt-1">🏆 {f.matchResult}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={
                          f.status === "completed" ? "bg-gray-700 text-gray-300" :
                          f.status === "live" ? "bg-red-650 text-white animate-pulse" : "bg-blue-600 text-white"
                        }>
                          {f.status}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (f.status === "live" || f.status === "completed") {
                              navigate(`/live/${f.publicCode}`);
                            } else if (isEditable) {
                              localStorage.setItem("liveCricketMatch", JSON.stringify(f));
                              navigate("/create-match");
                            } else {
                              navigate(`/live/${f.publicCode}`);
                            }
                          }}
                          className="h-8 text-xs font-bold"
                        >
                          {f.status === "scheduled" && isEditable ? "Score Match" : "View"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TEAMS TAB */}
            <TabsContent value="teams" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tournament.teams.map((t) => (
                  <Card key={t.id} className="bg-gray-900 border-gray-800 text-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-black text-white">{t.name} ({t.shortName})</CardTitle>
                      <CardDescription className="text-gray-400 text-xs">Squad Profile Code: {t.id}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="flex justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                        <span className="text-slate-500">CAPTAIN</span>
                        <span className="font-bold text-white">{t.captain}</span>
                      </div>
                      <div className="flex justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-855">
                        <span className="text-slate-500">WICKETKEEPER</span>
                        <span className="font-bold text-white">{t.keeper}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* SETTINGS TAB */}
            <TabsContent value="settings" className="mt-4">
              <Card className="bg-gray-900 border-gray-800 text-white">
                <CardHeader>
                  <CardTitle className="text-base">Points System Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-400">WIN POINTS</Label>
                      <Input
                        type="number"
                        value={winPoints}
                        onChange={(e) => setWinPoints(Number(e.target.value))}
                        className="bg-white border-slate-350 text-black placeholder:text-slate-400 font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-400">TIE POINTS</Label>
                      <Input
                        type="number"
                        value={tiePoints}
                        onChange={(e) => setTiePoints(Number(e.target.value))}
                        className="bg-white border-slate-350 text-black placeholder:text-slate-400 font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-400">NO RESULT (NR)</Label>
                      <Input
                        type="number"
                        value={nrPoints}
                        onChange={(e) => setNrPoints(Number(e.target.value))}
                        className="bg-white border-slate-350 text-black placeholder:text-slate-400 font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-400">LOSS POINTS</Label>
                      <Input
                        type="number"
                        value={lossPoints}
                        onChange={(e) => setLossPoints(Number(e.target.value))}
                        className="bg-white border-slate-350 text-black placeholder:text-slate-400 font-bold"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={async () => {
                      const updated = {
                        ...tournament,
                        pointsConfig: { win: winPoints, tie: tiePoints, nr: nrPoints, loss: lossPoints }
                      };
                      await setDoc(doc(db, `artifacts/${appId}/public/data/tournaments/${tournament.id}`), updated, { merge: true });
                      setTournament(updated);
                    }}
                    className="bg-orange-500 hover:bg-orange-600 font-bold"
                  >
                    Save Points Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // Render Tournament Creation Wizard
  if (isCreating) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-4">
        {/* Header */}
        <div className="max-w-2xl mx-auto flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => { setIsCreating(false); setStep(1); }} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-1" /> Exit
          </Button>
          <h1 className="text-xl font-black uppercase text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-orange-500" />
            Tournament Creation Wizard
          </h1>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Progress Steps Header */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold text-gray-400 border-b border-white/5 pb-3">
            <span className={step >= 1 ? "text-orange-400" : ""}>1. Info</span>
            <span className={step >= 2 ? "text-orange-400" : ""}>2. Teams</span>
            <span className={step >= 3 ? "text-orange-400" : ""}>3. Matches</span>
            <span className={step >= 4 ? "text-orange-400" : ""}>4. Review</span>
          </div>

          {/* STEP 1: INFO */}
          {step === 1 && (
            <Card className="bg-gray-900 border-gray-800 text-white">
              <CardHeader><CardTitle className="text-lg">Tournament Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tournament Name</Label>
                  <Input
                    value={tName}
                    onChange={e => setTName(e.target.value)}
                    placeholder="e.g. Summer Premier League"
                    className="bg-white border-slate-350 text-black placeholder:text-slate-400 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={tDesc}
                    onChange={e => setTDesc(e.target.value)}
                    placeholder="Tournament details/notes"
                    className="bg-white border-slate-350 text-black placeholder:text-slate-400 font-bold"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2 col-span-1">
                    <Label>Format</Label>
                    <select
                      value={tFormat}
                      onChange={e => setTFormat(e.target.value as any)}
                      className="w-full bg-white border border-slate-350 rounded-lg p-2.5 text-sm text-black font-bold"
                    >
                      <option value="T20" className="text-black bg-white">T20</option>
                      <option value="ODI" className="text-black bg-white">ODI</option>
                      <option value="Custom" className="text-black bg-white">Custom (5 Overs)</option>
                    </select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Organizer / Club</Label>
                    <Input
                      value={tOrganizer}
                      onChange={e => setTOrganizer(e.target.value)}
                      placeholder="e.g. MCA Club"
                      className="bg-white border-slate-350 text-black placeholder:text-slate-400 font-bold"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Venue Ground</Label>
                    <Input
                      value={tVenue}
                      onChange={e => setTVenue(e.target.value)}
                      placeholder="e.g. Wankhede Ground"
                      className="bg-white border-slate-350 text-black placeholder:text-slate-400 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={tCity}
                      onChange={e => setTCity(e.target.value)}
                      placeholder="e.g. Mumbai"
                      className="bg-white border-slate-350 text-black placeholder:text-slate-400 font-bold"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={tStartDate}
                      onChange={e => setTStartDate(e.target.value)}
                      className="bg-white border-slate-350 text-black placeholder:text-slate-400 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={tEndDate}
                      onChange={e => setTEndDate(e.target.value)}
                      className="bg-white border-slate-350 text-black placeholder:text-slate-400 font-bold"
                    />
                  </div>
                </div>
                {tStartDate && tEndDate && (
                  <div className="p-3 bg-gray-850 border border-gray-800 rounded-lg text-xs text-gray-400">
                    Duration: <span className="font-bold text-white">{tournamentDurationDays} Days Available</span>
                  </div>
                )}
                <Button disabled={!tName || !tStartDate || !tEndDate} onClick={() => setStep(2)} className="w-full bg-orange-500 hover:bg-orange-600 font-bold text-white">
                  Next: Configure Teams
                </Button>
              </CardContent>
            </Card>
          )}

          {/* STEP 2: TEAMS */}
          {step === 2 && (
            <Card className="bg-gray-900 border-gray-800 text-white">
              <CardHeader>
                <CardTitle className="text-lg">Add Teams</CardTitle>
                <CardDescription className="text-gray-400 text-xs">Enter team names, assign captains and keepers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-850 p-4 rounded-xl border border-gray-800 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Team Name</Label>
                      <Input
                        ref={teamNameRef}
                        value={tTeamName}
                        onChange={e => setTTeamName(e.target.value)}
                        placeholder="e.g. Mumbai Gladiators"
                        className="bg-white border-slate-350 text-black placeholder:text-slate-400 font-bold"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            teamShortRef.current?.focus();
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Short Initials</Label>
                      <Input
                        ref={teamShortRef}
                        value={tTeamShort}
                        onChange={e => setTTeamShort(e.target.value)}
                        placeholder="e.g. MUM"
                        className="bg-white border-slate-350 text-black placeholder:text-slate-400 font-bold"
                        maxLength={4}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            teamCaptainRef.current?.focus();
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Captain</Label>
                      <Input
                        ref={teamCaptainRef}
                        value={tTeamCaptain}
                        onChange={e => setTTeamCaptain(e.target.value)}
                        placeholder="Captain Name"
                        className="bg-white border-slate-350 text-black placeholder:text-slate-400 font-bold"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            teamKeeperRef.current?.focus();
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Wicketkeeper</Label>
                      <Input
                        ref={teamKeeperRef}
                        value={tTeamKeeper}
                        onChange={e => setTTeamKeeper(e.target.value)}
                        placeholder="Keeper Name"
                        className="bg-white border-slate-350 text-black placeholder:text-slate-400 font-bold"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddTeam();
                          }
                        }}
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddTeam} variant="secondary" className="w-full font-bold">
                    <Plus className="w-4 h-4 mr-1" /> Add Team to Tournament
                  </Button>
                </div>

                {/* Team Roster Grid */}
                {teamList.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500 uppercase tracking-widest font-bold">Registered Teams ({teamList.length})</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {teamList.map((t) => (
                        <div key={t.id} className="flex justify-between items-center bg-gray-855 border border-gray-800 px-3 py-2 rounded-lg text-sm">
                          <div>
                            <span className="font-bold text-white">{t.name}</span>
                            <span className="text-gray-500 text-xs ml-1.5 font-mono">({t.shortName})</span>
                          </div>
                          <button onClick={() => handleRemoveTeam(t.id)} className="text-red-400 hover:text-red-300 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-gray-700 text-white">
                    Back
                  </Button>
                  <Button disabled={teamList.length < 2} onClick={() => setStep(3)} className="flex-1 bg-orange-500 hover:bg-orange-600 font-bold text-white">
                    Next: Matches Config
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3: MATCH SETTINGS */}
          {step === 3 && (
            <Card className="bg-gray-900 border-gray-800 text-white">
              <CardHeader><CardTitle className="text-lg">Match Scheduling Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Matches Per Team</Label>
                    <Input
                      type="number"
                      value={matchesPerTeam}
                      onChange={e => setMatchesPerTeam(Number(e.target.value))}
                      className="bg-white border-slate-355 text-black font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Matches Per Day</Label>
                    <Input
                      type="number"
                      value={maxMatchesPerDay}
                      onChange={e => setMaxMatchesPerDay(Number(e.target.value))}
                      className="bg-white border-slate-355 text-black font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                  <div className="space-y-2 col-span-1">
                    <Label>First Start Time</Label>
                    <Input
                      type="time"
                      value={firstMatchStartTime}
                      onChange={e => setFirstMatchStartTime(e.target.value)}
                      className="bg-white border-slate-355 text-black font-bold"
                    />
                  </div>
                  <div className="space-y-2 col-span-1">
                    <Label>Duration (Hrs)</Label>
                    <Input
                      type="number"
                      value={matchDuration}
                      onChange={e => setMatchDuration(Number(e.target.value))}
                      className="bg-white border-slate-355 text-black font-bold"
                    />
                  </div>
                  <div className="space-y-2 col-span-1">
                    <Label>Break (Mins)</Label>
                    <Input
                      type="number"
                      value={breakDuration}
                      onChange={e => setBreakDuration(Number(e.target.value))}
                      className="bg-white border-slate-355 text-black font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-gray-850 border border-gray-805 rounded-xl">
                  <div>
                    <Label className="font-bold text-white block">Allow Same-Day Double Headers</Label>
                    <span className="text-[10px] text-gray-500">Allows a team to play twice on the same day in non-overlapping slots.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowDoubleHeaders}
                    onChange={(e) => setAllowDoubleHeaders(e.target.checked)}
                    className="w-4 h-4 text-orange-500 rounded accent-orange-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1 border-gray-700 text-white">
                    Back
                  </Button>
                  <Button onClick={() => setStep(4)} className="flex-1 bg-orange-500 hover:bg-orange-600 font-bold text-white">
                    Next: Validate & Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 4: SUMMARY & VALIDATION */}
          {step === 4 && (
            <Card className="bg-gray-900 border-gray-800 text-white">
              <CardHeader>
                <CardTitle className="text-lg">Review and Validate Schedule</CardTitle>
                <CardDescription className="text-gray-400 text-xs">The scheduler engine will calculate and verify fixtures.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Error Box */}
                {schedulingResult && !schedulingResult.success && (
                  <div className="bg-red-955/40 border border-red-500/25 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-red-405 font-bold text-sm">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <span>Scheduling Constraint Error</span>
                    </div>
                    <p className="text-xs text-red-200 leading-relaxed">{schedulingResult.error}</p>
                    
                    {schedulingResult.suggestedEndDate && (
                      <div className="pt-2 border-t border-red-500/10 text-xs text-red-300">
                        💡 Suggested Minimum End Date: <span className="font-bold text-white">{schedulingResult.suggestedEndDate}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Success Box */}
                {schedulingResult && schedulingResult.success && (
                  <div className="bg-green-950/40 border border-green-500/25 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                      <Check className="w-5 h-5 text-green-400" />
                      <span>Schedule Validated Successfully ✓</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-300 pt-1">
                      <div>Total Fixtures: <span className="font-bold text-white">{schedulingResult.stats?.totalFixtures}</span></div>
                      <div>Required Days: <span className="font-bold text-white">{schedulingResult.stats?.requiredDays}</span></div>
                      <div>Available Days: <span className="font-bold text-white">{schedulingResult.stats?.availableDays}</span></div>
                      <div>Matches/Day Limit: <span className="font-bold text-white">{maxMatchesPerDay}</span></div>
                    </div>
                    <div className="text-xs text-orange-400 font-bold pt-2 border-t border-white/5 mt-2 flex items-center gap-1.5">
                      <span>🔑 Unique Access Code:</span>
                      <span className="bg-orange-500/20 border border-orange-500/30 px-2.5 py-0.5 rounded text-white tracking-wider font-mono font-bold text-xs">{preGeneratedCode}</span>
                    </div>
                  </div>
                )}

                {/* Fixture preview */}
                {schedulingResult && schedulingResult.success && schedulingResult.schedule && (
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Preview Generated Matches</Label>
                    <div className="bg-slate-950 border border-slate-900 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1.5">
                      {schedulingResult.schedule.map((f) => (
                        <div key={f.matchNumber} className="text-xs flex justify-between border-b border-slate-900 pb-1 last:border-none">
                          <span className="text-slate-500">M{f.matchNumber} ({f.scheduledDate} {f.scheduledTime})</span>
                          <span className="font-semibold text-white">{f.teamA} vs {f.teamB}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep(3)} className="flex-1 border-gray-700 text-white">
                    Back & Edit
                  </Button>
                  <Button
                    disabled={savingTournament || !schedulingResult || !schedulingResult.success}
                    onClick={handleCreateTournament}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                  >
                    {savingTournament ? "Generating..." : "Generate Tournament"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Render Directory listing if not managing active tournament
  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      {/* Navbar Header */}
      <div className="max-w-5xl mx-auto flex items-center justify-between mb-8 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-xl font-black uppercase text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-orange-500" />
            Tournament Management Center
          </h1>
        </div>

        <Button onClick={() => setIsCreating(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold">
          <Plus className="w-4 h-4 mr-1" /> New Tournament
        </Button>
      </div>

      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Load Tournament Code Card */}
        <Card className="bg-gray-900 border-gray-800 text-white max-w-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 uppercase tracking-wider">Access Tournament By Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadError && <p className="text-xs text-red-400 font-semibold">{loadError}</p>}
            <div className="flex gap-2">
              <Input
                placeholder="e.g. 7A8B9C"
                value={loadCodeInput}
                onChange={e => setLoadCodeInput(e.target.value)}
                className="bg-white border-slate-350 text-black placeholder:text-slate-400 font-bold"
              />
              <Button onClick={handleLoadTournament} variant="secondary" className="font-bold">
                Load
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tournament Directory Directory List */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-orange-400" /> Active Tournaments ({tournamentList.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tournamentList.map((t) => (
              <Card
                key={t.id}
                onClick={() => {
                  localStorage.setItem("activeTournamentId", t.id);
                  selectActiveTournament(t.id);
                }}
                className="bg-gray-900 border-gray-800 text-white hover:border-orange-500/40 transition-all cursor-pointer flex flex-col justify-between"
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-black">{t.name}</CardTitle>
                      <CardDescription className="text-gray-400 text-xs">Code: {t.id}</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs text-orange-400 border-orange-500/20">{t.format}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-450">
                    <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {t.startDate} to {t.endDate}</div>
                    <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {t.venue}, {t.city}</div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-xs text-orange-400 font-bold">{t.teams.length} Teams Registered</span>
                    {isEditable && (
                      <Button
                        onClick={(e) => handleDeleteTournament(t.id, e)}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 p-2 h-auto"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {tournamentList.length === 0 && (
              <div className="col-span-full text-center py-12 bg-gray-900/40 border border-dashed border-gray-850 rounded-2xl">
                <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 font-bold">No Tournaments Created Yet</p>
                <p className="text-xs text-gray-600 mt-1">Create your first tournament using the button above to generate fixtures.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TournamentPage;
