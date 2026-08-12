import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, Radio, Target, ChevronRight } from "lucide-react";
import { announceScore } from "@/utils/speech";
import { ballsToOvers, currentRunRate, requiredRunRate, getInningsPhase } from "@/lib/cricketEngine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ScoringInterface = (props: any) => {
  const {
    matchData, onBack, onViewScorecard, score, recentBalls,
    addRuns, addWicket, addExtra, undoLastBall,
    striker, nonStriker, currentBowler, allPlayers,
    battingTeam, bowlingTeam, bowlerOvers, currentOverRuns, currentOverBalls,
    currentInnings, innings1Score, matchResult, isFreeHit, partnershipStartScore
  } = props;

  const [wStep, setWStep] = useState("none");
  const [wType, setWType] = useState("");
  const [fielder, setFielder] = useState("");
  const [roBatsman, setRoBatsman] = useState<any>(null);
  const [roRuns, setRoRuns] = useState(0);
  const [eStep, setEStep] = useState("none");

  const [crossed, setCrossed] = useState(false);
  const [isWideWicket, setIsWideWicket] = useState(false);

  const getP = (n: string) => allPlayers.find((p: any) => p.name === n);
  const sStats: any = striker ? getP(striker.name) : null;
  const nsStats: any = nonStriker ? getP(nonStriker.name) : null;
  const bStats: any = currentBowler ? getP(currentBowler.name) : null;

  const crr = currentRunRate(score.runs, score.balls);
  const totalBalls = matchData.overs * 6;
  const ballsLeft = Math.max(0, totalBalls - score.balls);
  const phase = getInningsPhase(score.balls, matchData.format || "T20", matchData.overs);
  const partRuns = partnershipStartScore ? score.runs - partnershipStartScore.runs : 0;
  const partBalls = partnershipStartScore ? score.balls - partnershipStartScore.balls : 0;

  const resetW = () => { setWStep("none"); setWType(""); setFielder(""); setRoBatsman(null); setRoRuns(0); setCrossed(false); setIsWideWicket(false); };
  const resetE = () => setEStep("none");

  const phaseClass =
    phase === "powerplay" ? "bg-blue-500/20 text-blue-400 border-blue-500/40" :
    phase === "death" ? "bg-red-500/20 text-red-400 border-red-500/40" :
    "bg-yellow-500/20 text-yellow-400 border-yellow-500/40";
  const phaseLabel = phase === "powerplay" ? "POWERPLAY" : phase === "death" ? "DEATH" : "MIDDLE";

  const bowlTeamPlayers = allPlayers.filter((p: any) =>
    (bowlingTeam === matchData.teamA ? matchData.teamAPlayers : matchData.teamBPlayers)
      .some((tp: any) => tp.name === p.name)
  );

  const ballCls = (b: string) => {
    if (b.includes("W")) return "bg-red-800/30 border-red-500 text-red-400";
    if (b === "6") return "bg-blue-800/30 border-blue-500 text-blue-400";
    if (b === "4") return "bg-green-800/30 border-green-500 text-green-400";
    if (b === "0") return "bg-gray-900 border-gray-700 text-gray-500";
    if (b.startsWith("Wd") || b.startsWith("NB") || b.startsWith("nb"))
      return "bg-yellow-800/30 border-yellow-600 text-yellow-400";
    return "bg-gray-800 border-gray-600 text-white";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-8">
      <div className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur border-b border-white/10">
        <div className="max-w-lg mx-auto flex items-center gap-2 px-4 h-14">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-gray-400 hover:text-white h-8 w-8 flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate">{matchData.teamA} vs {matchData.teamB}</div>
            <div className="text-xs text-gray-500">Innings {currentInnings} - {matchData.overs} overs</div>
          </div>
          <span className={"text-xs font-bold border rounded-full px-2 py-0.5 flex-shrink-0 " + phaseClass}>{phaseLabel}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Radio className="w-3 h-3 text-red-400 animate-pulse" />
            <span className="text-xs text-red-400 font-semibold">LIVE</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {matchResult && (
          <div className="p-4 bg-green-900/30 border border-green-500/40 rounded-2xl text-center">
            <p className="text-lg font-black text-white">{matchResult}</p>
          </div>
        )}
        {isFreeHit && (
          <div className="p-3 bg-purple-900/30 border-2 border-yellow-400/50 rounded-2xl text-center">
            <p className="font-black text-yellow-300">FREE HIT - Only Run Out allowed</p>
          </div>
        )}

        <div className="bg-gradient-to-br from-orange-600 to-red-700 rounded-2xl p-5 shadow-2xl shadow-orange-900/50">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-5xl font-black tabular-nums leading-none">{score.runs}/{score.wickets}</div>
              <div className="text-orange-200 text-sm mt-1">{ballsToOvers(score.balls)} overs</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-orange-200 uppercase tracking-wider">CRR</div>
              <div className="text-2xl font-black">{crr.toFixed(2)}</div>
            </div>
          </div>
          {currentInnings === 2 && innings1Score !== null && !matchResult && (() => {
            const needed = innings1Score + 1 - score.runs;
            const rrr = requiredRunRate(needed, ballsLeft);
            return (
              <div className="mt-3 bg-black/25 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
                <div><p className="text-xs text-orange-200">Target</p><p className="font-black text-white">{innings1Score + 1}</p></div>
                <div><p className="text-xs text-orange-200">Need</p><p className="font-bold text-white text-sm">{needed} in {ballsLeft}b</p></div>
                <div><p className="text-xs text-orange-200">RRR</p><p className={"font-black " + (rrr > crr ? "text-red-300" : "text-green-300")}>{rrr.toFixed(2)}</p></div>
              </div>
            );
          })()}
          <div className="mt-3 text-xs text-orange-200 flex justify-between">
            <span>Partnership: <b className="text-white">{partRuns}({partBalls})</b></span>
            <span>This over: <b className="text-white">{currentOverRuns}R</b></span>
          </div>
        </div>

        <div className="bg-gray-900 border border-white/10 rounded-2xl p-3">
          <div className="text-xs text-gray-500 uppercase mb-2 flex justify-between">
            <span>This Over</span><span>{currentOverBalls}/6 - {currentOverRuns} runs</span>
          </div>
          <div className="flex gap-2 flex-wrap min-h-[36px] items-center">
            {recentBalls.slice(-9).map((b: string, i: number) =>
              b === "|"
                ? <span key={i} className="text-gray-600 font-bold text-lg">|</span>
                : <div key={i} className={"w-9 h-9 rounded-full flex items-center justify-center text-xs font-black border-2 " + ballCls(b)}>{b}</div>
            )}
            {recentBalls.length === 0 && <span className="text-gray-700 text-sm">Waiting for first ball</span>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1 bg-gray-900 rounded-xl p-3 border border-orange-500/50">
            <div className="text-xs text-gray-500 mb-1">Striker</div>
            <div className="font-bold text-sm truncate text-white">{striker ? striker.name + " *" : "Not set"}</div>
            {sStats && <div className="text-xs text-gray-400 mt-0.5 tabular-nums">{sStats.runsScored ?? 0}({sStats.ballsFaced ?? 0})</div>}
          </div>
          <div className="col-span-1 bg-gray-900 rounded-xl p-3 border border-white/10">
            <div className="text-xs text-gray-500 mb-1">Non-Striker</div>
            <div className="font-bold text-sm truncate text-white">{nonStriker ? nonStriker.name : "Not set"}</div>
            {nsStats && <div className="text-xs text-gray-400 mt-0.5 tabular-nums">{nsStats.runsScored ?? 0}({nsStats.ballsFaced ?? 0})</div>}
          </div>
          <div className="col-span-1 bg-gray-900 rounded-xl p-3 border border-white/10">
            <div className="text-xs text-gray-500 mb-1">Bowler</div>
            <div className="font-bold text-sm truncate text-white">{currentBowler ? currentBowler.name : "Not set"}</div>
            {bStats && <div className="text-xs text-gray-400 mt-0.5 tabular-nums">{bowlerOvers[currentBowler?.name] || 0}.{currentOverBalls} - {bStats.runsConceded ?? 0}R/{bStats.wicketsTaken ?? 0}W</div>}
          </div>
        </div>

        <div className="bg-gray-900 border border-white/10 rounded-2xl p-3">
          <div className="text-xs text-gray-500 uppercase mb-2">Runs</div>
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3, 4, 6].map((r) => (
              <Button key={r} onClick={() => { addRuns(r); announceScore(r); }}
                className={"h-14 text-2xl font-black text-white active:scale-95 transition-transform " +
                  (r === 4 ? "bg-green-700 hover:bg-green-600" : r === 6 ? "bg-blue-700 hover:bg-blue-600" :
                   r === 0 ? "bg-gray-800 hover:bg-gray-700 border border-white/10" : "bg-gray-700 hover:bg-gray-600")}>
                {r}
              </Button>
            ))}
            <Button onClick={undoLastBall} disabled={recentBalls.length === 0}
              className="col-span-2 h-14 bg-red-950/60 hover:bg-red-900/60 border border-red-500/30 text-red-400 font-semibold disabled:opacity-40">
              <RotateCcw className="w-4 h-4 mr-2" /> Undo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-3">
            <div className="text-xs text-gray-500 uppercase mb-2">Wicket</div>
            {wStep === "none" && <Button onClick={() => setWStep("type")} className="w-full h-12 bg-red-700 hover:bg-red-600 text-white font-black text-xl">OUT</Button>}
            {wStep === "type" && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400 text-center">How out?</p>
                {(!isFreeHit ? ["bowled", "caught", "lbw", "stumped", "hit_wicket"] : []).map((t) => (
                  <Button key={t} size="sm" variant="outline" className="w-full border-gray-700 text-white hover:bg-gray-800 capitalize justify-start text-xs h-8"
                    onClick={() => { if (t === "caught") { setWType("caught"); setWStep("caught_crossed"); } else { addWicket(t); announceScore(0, true); resetW(); } }}>
                    {t.replace("_", " ")}
                  </Button>
                ))}
                <Button size="sm" variant="outline" className="w-full border-gray-700 text-white hover:bg-gray-800 justify-start text-xs h-8" onClick={() => { setWType("run_out"); setWStep("ro_who"); }}>Run Out</Button>
                <Button size="sm" variant="ghost" className="w-full text-gray-600 text-xs h-7" onClick={resetW}>Cancel</Button>
              </div>
            )}
            {wStep === "caught_crossed" && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400 text-center">Did batters cross before catch?</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" className="border-gray-700 text-white hover:bg-gray-800" onClick={() => { setCrossed(true); setWStep("fielder"); }}>Yes</Button>
                  <Button size="sm" variant="outline" className="border-gray-700 text-white hover:bg-gray-800" onClick={() => { setCrossed(false); setWStep("fielder"); }}>No</Button>
                </div>
                <Button size="sm" variant="ghost" className="w-full text-gray-600 text-xs h-7" onClick={resetW}>Cancel</Button>
              </div>
            )}
            {wStep === "ro_who" && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400 text-center">Who was run out?</p>
                {[striker, nonStriker].filter(Boolean).map((p: any) => (
                  <Button key={p.name} size="sm" variant="outline" className="w-full border-gray-700 text-white hover:bg-orange-900/30 text-xs h-8" onClick={() => { setRoBatsman(p); setWStep("ro_runs"); }}>
                    {p.name} {p.name === striker?.name ? "(Striker)" : "(Non-Striker)"}
                  </Button>
                ))}
                <Button size="sm" variant="ghost" className="w-full text-gray-600 text-xs h-7" onClick={resetW}>Cancel</Button>
              </div>
            )}
            {wStep === "ro_runs" && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400 text-center">Completed runs (ICC Law)?</p>
                <div className="grid grid-cols-4 gap-1">
                  {[0, 1, 2, 3].map((r) => (
                    <Button key={r} size="sm" className={"text-white font-bold h-9 " + (roRuns === r ? "bg-orange-600" : "bg-gray-700 hover:bg-gray-600")} onClick={() => setRoRuns(r)}>{r}</Button>
                  ))}
                </div>
                <Button size="sm" className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs h-8" onClick={() => setWStep("fielder")}>Next</Button>
                <Button size="sm" variant="ghost" className="w-full text-gray-600 text-xs h-7" onClick={resetW}>Cancel</Button>
              </div>
            )}
            {wStep === "fielder" && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400 text-center">{wType === "caught" ? "Caught by?" : wType === "stumped" ? "Stumped by?" : "Run out by?"}</p>
                <select className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-xs" value={fielder} onChange={(e) => setFielder(e.target.value)}>
                  <option value="">Select fielder</option>
                  {bowlTeamPlayers.map((p: any) => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
                <Button size="sm" disabled={!fielder} className="w-full bg-red-700 hover:bg-red-600 text-white font-semibold text-xs h-8"
                  onClick={() => { addWicket(wType, fielder || null, roRuns, roBatsman, false, crossed, isWideWicket ? "wide" : "legal"); announceScore(0, true); resetW(); }}>
                  Confirm Dismissal
                </Button>
                <Button size="sm" variant="ghost" className="w-full text-gray-600 text-xs h-7" onClick={resetW}>Cancel</Button>
              </div>
            )}
          </div>

          <div className="bg-gray-900 border border-white/10 rounded-2xl p-3">
            <div className="text-xs text-gray-500 uppercase mb-2">Extras</div>
            {eStep === "none" && (
              <div className="grid grid-cols-2 gap-1.5">
                {[["wd","Wide","bg-yellow-800/50 border-yellow-700/50 hover:bg-yellow-700/60"],["nb","No Ball","bg-orange-800/50 border-orange-700/50 hover:bg-orange-700/60"],["b","Bye","bg-gray-700 border-gray-600 hover:bg-gray-600"],["lb","Leg Bye","bg-gray-700 border-gray-600 hover:bg-gray-600"]].map(([k,l,c]) => (
                  <Button key={k} size="sm" className={"border text-white font-semibold h-10 text-xs " + c}
                    onClick={() => { if (k==="wd") setEStep("wd"); else if (k==="nb") setEStep("nb"); else if (k==="b") setEStep("bye"); else if (k==="lb") setEStep("lb"); }}>
                    {l}
                  </Button>
                ))}
              </div>
            )}
            {eStep === "wd" && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400 text-center">Wide Ball Options</p>
                <div className="grid grid-cols-3 gap-1.5">
                  <Button size="sm" className="bg-gray-700 hover:bg-gray-600 text-white font-bold h-10 text-xs"
                    onClick={() => { addExtra("wd", 1); resetE(); }}>
                    Wide (1)
                  </Button>
                  <Button size="sm" className="bg-gray-700 hover:bg-gray-600 text-white font-bold h-10 text-xs"
                    onClick={() => { addExtra("wd", 2); resetE(); }}>
                    Wide+1 (2)
                  </Button>
                  <Button size="sm" className="bg-gray-700 hover:bg-gray-600 text-white font-bold h-10 text-xs"
                    onClick={() => { addExtra("wd", 3); resetE(); }}>
                    Wide+2 (3)
                  </Button>
                </div>
                <Button size="sm" className="w-full bg-red-950/60 hover:bg-red-900/60 border border-red-500/30 text-red-400 font-bold h-10 text-xs"
                  onClick={() => { setWType("stumped"); setWStep("fielder"); setIsWideWicket(true); resetE(); }}>
                  Wide + Wicket (Stumping)
                </Button>
                <Button size="sm" variant="ghost" className="w-full text-gray-600 text-xs h-7" onClick={resetE}>Cancel</Button>
              </div>
            )}
            {eStep === "nb" && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400 text-center">Bat runs on No Ball?</p>
                <div className="grid grid-cols-3 gap-1">
                  {[0,1,2,4,6].map((r) => (
                    <Button key={r} size="sm" className={"text-white font-bold h-9 "+(r===4?"bg-green-700 hover:bg-green-600":r===6?"bg-blue-700 hover:bg-blue-600":"bg-gray-700 hover:bg-gray-600")}
                      onClick={() => { addExtra("nb",1+r,r); resetE(); }}>{r}</Button>
                  ))}
                </div>
                <Button size="sm" variant="ghost" className="w-full text-gray-600 text-xs h-7" onClick={resetE}>Cancel</Button>
              </div>
            )}
            {(eStep === "bye" || eStep === "lb") && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400 text-center">{eStep === "bye" ? "Bye" : "Leg Bye"} runs?</p>
                <div className="grid grid-cols-4 gap-1">
                  {[1,2,3,4].map((r) => (
                    <Button key={r} size="sm" className="bg-gray-700 hover:bg-gray-600 text-white font-bold h-9"
                      onClick={() => { addExtra(eStep==="bye"?"b":"lb",r); resetE(); }}>{r}</Button>
                  ))}
                </div>
                <Button size="sm" variant="ghost" className="w-full text-gray-600 text-xs h-7" onClick={resetE}>Cancel</Button>
              </div>
            )}
          </div>
        </div>

        <Button onClick={onViewScorecard} className="w-full bg-gray-800 hover:bg-gray-700 border border-white/10 text-white font-semibold h-12 flex items-center gap-2">
          <Target className="w-4 h-4" />
          View Scorecard
          <ChevronRight className="w-4 h-4 ml-auto" />
        </Button>


      </div>
    </div>
  );
};
