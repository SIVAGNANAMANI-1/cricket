import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, User } from "lucide-react";

interface ScorecardProps {
    matchData: any;
    allPlayers: any[];
    battingTeam: string;
    score: { runs: number; wickets: number; overs: number; balls: number };
    onBackToUpdate: () => void;
    currentBowler?: any;
    bowlerOvers?: { [key: string]: number };
    currentOverBalls?: number;
    isReadOnly?: boolean;
    title?: string;
    showHeader?: boolean;
    className?: string;
    ballHistory?: any[];
    striker?: any;
    nonStriker?: any;
}

export const Scorecard = ({
    matchData,
    allPlayers,
    battingTeam,
    score,
    onBackToUpdate,
    currentBowler,
    bowlerOvers,
    currentOverBalls,
    isReadOnly = false,
    title = "Scorecard",
    showHeader = true,
    className = "",
    ballHistory = [],
    striker,
    nonStriker
}: ScorecardProps) => {
    // State for active team tab
    const [activeTeam, setActiveTeam] = useState<string>(battingTeam);

    // Determine bowling team based on active team
    const activeBowlingTeam = activeTeam === matchData.teamA ? matchData.teamB : matchData.teamA;

    // Calculate score for the active team
    const activeTeamScore = useMemo(() => {
        // If viewing the current batting team, use the live score prop
        if (activeTeam === battingTeam) {
            return score;
        }

        // Otherwise, calculate from ball history (for previous innings)
        const history = ballHistory || matchData.ballHistory || [];
        let runs = 0;
        let wickets = 0;
        let balls = 0;

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

            // Determine if ball belongs to the active team
            // 1. Prefer explicit battingTeam tag from ball history (New robust method)
            // 2. Fallback to checking if striker is in active team's player list (Old method)
            let belongsToActiveTeam = false;
            if (ball.battingTeam) {
                belongsToActiveTeam = (ball.battingTeam === activeTeam);
            } else {
                belongsToActiveTeam = isPlayerInActiveTeam(ball.striker.name);
            }

            if (belongsToActiveTeam) {
                if (ball.type === 'runs') {
                    runs += ball.runs;
                } else if (ball.type === 'extra') {
                    runs += ball.runs;
                } else if (ball.type === 'wicket') {
                    wickets += 1;
                    if (ball.wicketType === 'run_out') {
                        runs += ball.runs;
                    }
                }

                // Count legal balls for overs
                if (ball.type !== 'extra' || (ball.extraType !== 'wd' && ball.extraType !== 'nb')) {
                    balls += 1;
                }
            }
        });

        const overs = Math.floor(balls / 6) + (balls % 6) / 10;
        return { runs, wickets, overs, balls };
    }, [activeTeam, battingTeam, score, ballHistory, matchData]);

    // Filter batting team players (active team)
    const battingPlayers = allPlayers.filter(p =>
    (activeTeam === matchData.teamA
        ? matchData.teamAPlayers.some((tp: any) => tp.name === p.name)
        : matchData.teamBPlayers.some((tp: any) => tp.name === p.name))
    );

    // Filter bowling team players (opponent of active team)
    const bowlingPlayers = allPlayers.filter(p =>
        (activeBowlingTeam === matchData.teamA
            ? matchData.teamAPlayers.some((tp: any) => tp.name === p.name)
            : matchData.teamBPlayers.some((tp: any) => tp.name === p.name))
        && (p.oversBowled > 0 || p.wicketsTaken > 0 || p.runsConceded > 0 || (currentBowler && p.name === currentBowler.name && activeTeam === battingTeam))
    );

    // Sort by batting order (those who batted/are batting come first)
    const sortedBattingPlayers = battingPlayers.sort((a, b) => {
        const isAStriker = striker && a.name === striker.name;
        const isANonStriker = nonStriker && a.name === nonStriker.name;
        const isBStriker = striker && b.name === striker.name;
        const isBNonStriker = nonStriker && b.name === nonStriker.name;

        // Current batsmen should be treated as "played"
        const aPlayed = a.hasBatted || a.ballsFaced > 0 || a.runsScored > 0 || isAStriker || isANonStriker;
        const bPlayed = b.hasBatted || b.ballsFaced > 0 || b.runsScored > 0 || isBStriker || isBNonStriker;

        if (aPlayed && !bPlayed) return -1;
        if (!aPlayed && bPlayed) return 1;
        return (b.runsScored || 0) - (a.runsScored || 0);
    });

    // Filter yet to bat players
    const yetToBatPlayers = battingPlayers.filter(p => {
        const isStriker = striker && p.name === striker.name;
        const isNonStriker = nonStriker && p.name === nonStriker.name;
        const hasPlayed = p.hasBatted || p.ballsFaced > 0 || p.runsScored > 0 || isStriker || isNonStriker;
        return !hasPlayed && !p.isOut;
    });

    // Get fall of wickets data
    const fallOfWickets = sortedBattingPlayers
        .filter(p => p.isOut)
        .map(p => ({
            playerName: p.name,
            runsAtWicket: p.fowRuns !== undefined ? p.fowRuns : 0,
            oversAtWicket: p.fowOvers !== undefined ? p.fowOvers : 0
        }))
        .sort((a, b) => a.oversAtWicket - b.oversAtWicket)
        .map((fow, index) => ({
            ...fow,
            wicketNumber: index + 1,
            formattedOvers: fow.oversAtWicket.toFixed(1)
        }));

    // Calculate strike rate
    const calculateStrikeRate = (runs: number, balls: number) => {
        if (balls === 0) return "0.00";
        return ((runs / balls) * 100).toFixed(2);
    };

    // Calculate economy rate
    const calculateEconomy = (runs: number, overs: number) => {
        if (overs === 0) return "0.00";
        return (runs / overs).toFixed(2);
    };

    // Format dismissal text
    const getDismissalText = (player: any) => {
        if (!player.isOut) return null;

        let dismissal = "";
        if (player.outType === "caught" && player.outFielder && player.outBowler) {
            dismissal = `c ${player.outFielder} b ${player.outBowler}`;
        } else if (player.outType === "bowled" && player.outBowler) {
            dismissal = `b ${player.outBowler}`;
        } else if (player.outType === "lbw" && player.outBowler) {
            dismissal = `lbw b ${player.outBowler}`;
        } else if (player.outType === "stumped" && player.outBowler) {
            dismissal = `st b ${player.outBowler}`;
        } else if (player.outType === "run_out" && player.outFielder) {
            dismissal = `run out (${player.outFielder})`;
        } else {
            dismissal = player.outType || "out";
        }

        return dismissal;
    };

    return (
        <div className={`min-h-screen bg-gray-900 text-white p-4 ${className}`}>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                {showHeader && (
                    <div className="flex items-center gap-3 mb-6">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onBackToUpdate}
                            className="text-white hover:bg-gray-800"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-white">{title}</h1>
                            <p className="text-sm text-gray-400">
                                {matchData.teamA} vs {matchData.teamB}
                            </p>
                        </div>
                    </div>
                )}

                {/* Team Tabs */}
                <div className="flex border-b border-gray-700 mb-6">
                    <button
                        className={`flex-1 pb-3 text-center font-semibold text-lg transition-colors relative ${activeTeam === matchData.teamA ? "text-white" : "text-gray-500 hover:text-gray-300"
                            }`}
                        onClick={() => setActiveTeam(matchData.teamA)}
                    >
                        {matchData.teamA}
                        {activeTeam === matchData.teamA && (
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-white rounded-t-full" />
                        )}
                    </button>
                    <button
                        className={`flex-1 pb-3 text-center font-semibold text-lg transition-colors relative ${activeTeam === matchData.teamB ? "text-white" : "text-gray-500 hover:text-gray-300"
                            }`}
                        onClick={() => setActiveTeam(matchData.teamB)}
                    >
                        {matchData.teamB}
                        {activeTeam === matchData.teamB && (
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-white rounded-t-full" />
                        )}
                    </button>
                </div>

                {/* Current Score */}
                <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg p-4 mb-6 shadow-lg">
                    <div className="text-center">
                        <h2 className="text-lg font-semibold mb-1">{activeTeam}</h2>
                        <div className="text-4xl font-bold mb-2">
                            {activeTeamScore.runs}/{activeTeamScore.wickets}
                        </div>
                        <div className="text-sm opacity-90">
                            Overs: {activeTeamScore.overs.toFixed(1)}
                        </div>
                    </div>
                </div>

                {/* Batting Section */}
                <div className="bg-gray-800 rounded-lg mb-6 overflow-hidden">
                    <div className="bg-gray-700 px-4 py-3 border-b border-gray-600">
                        <h3 className="font-semibold text-lg">Batting</h3>
                    </div>

                    {/* Batting Header */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-750 border-b border-gray-600 text-xs font-semibold text-gray-300">
                        <div className="col-span-5"></div>
                        <div className="text-center">R</div>
                        <div className="text-center">B</div>
                        <div className="text-center">4s</div>
                        <div className="text-center">6s</div>
                        <div className="col-span-2 text-right">S/R</div>
                    </div>

                    {/* Batting Rows */}
                    <div className="divide-y divide-gray-700">
                        {sortedBattingPlayers.map((player: any) => {
                            const isStriker = striker && player.name === striker.name;
                            const isNonStriker = nonStriker && player.name === nonStriker.name;
                            const hasPlayed = player.hasBatted || player.ballsFaced > 0 || player.runsScored > 0 || isStriker || isNonStriker;

                            // Always show current batsmen (striker/non-striker) and players who have batted or are out
                            if (!hasPlayed && !player.isOut) return null;

                            const dismissalText = getDismissalText(player);

                            return (
                                <div key={player.name} className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-gray-800/50 transition-colors items-center">
                                    <div className="col-span-5 flex items-center gap-3">
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                                            <User className="w-6 h-6 text-gray-300" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-base">
                                                {player.name}
                                                {isStriker && <span className="text-orange-500 ml-1">*</span>}
                                            </div>
                                            {dismissalText && (
                                                <div className="text-xs text-gray-400 mt-0.5">
                                                    {dismissalText}
                                                </div>
                                            )}
                                            {!player.isOut && hasPlayed && (
                                                <div className="text-xs text-green-400 mt-0.5 font-medium">not out</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-center font-bold text-white text-base">{player.runsScored || 0}</div>
                                    <div className="text-center text-gray-300">{player.ballsFaced || 0}</div>
                                    <div className="text-center text-gray-400">{player.fours || 0}</div>
                                    <div className="text-center text-gray-400">{player.sixes || 0}</div>
                                    <div className="col-span-2 text-right text-gray-300 font-mono">
                                        {calculateStrikeRate(player.runsScored || 0, player.ballsFaced || 0)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Yet to Bat Section / Playing XI for Bowling Team */}
                    {yetToBatPlayers.length > 0 && (() => {
                        // Check if this team is currently batting or not
                        const isCurrentlyBatting = activeTeam === battingTeam;
                        const label = isCurrentlyBatting ? "Yet to bat:" : "Playing XI:";

                        return (
                            <div className="px-4 py-3 bg-gray-900/20 border-t border-gray-700">
                                {isCurrentlyBatting ? (
                                    // Horizontal comma-separated list for "Yet to bat"
                                    <div className="flex flex-wrap gap-2 text-sm">
                                        <span className="font-semibold text-gray-400">{label}</span>
                                        {yetToBatPlayers.map((player, index) => (
                                            <span key={player.name} className="text-gray-300">
                                                {player.name}{index < yetToBatPlayers.length - 1 ? "," : ""}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    // Vertical list for "Playing XI"
                                    <div className="space-y-2">
                                        <div className="font-semibold text-gray-400 text-sm mb-3">Playing XI</div>
                                        {yetToBatPlayers.map((player) => (
                                            <div key={player.name} className="text-gray-300 text-sm py-1 border-b border-gray-700/50">
                                                {player.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>

                {/* Fall of Wickets */}
                {fallOfWickets.length > 0 && (
                    <div className="bg-gray-800 rounded-lg mb-6 overflow-hidden">
                        <div className="bg-gray-700 px-4 py-3 border-b border-gray-600">
                            <h3 className="font-semibold">Fall of wickets</h3>
                        </div>
                        <div className="px-4 py-3 text-sm text-gray-300">
                            {fallOfWickets.map((fow, index) => (
                                <span key={index}>
                                    {index > 0 && " · "}
                                    <span className="text-white font-medium">{fow.runsAtWicket}/{fow.wicketNumber}</span>
                                    {" "}({fow.playerName}, {fow.formattedOvers} ov)
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bowling Section */}
                {bowlingPlayers.length > 0 && (
                    <div className="bg-gray-800 rounded-lg mb-6 overflow-hidden">
                        <div className="bg-gray-700 px-4 py-3 border-b border-gray-600">
                            <h3 className="font-semibold text-lg">Bowling</h3>
                        </div>

                        {/* Bowling Header */}
                        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-750 border-b border-gray-600 text-xs font-semibold text-gray-300">
                            <div className="col-span-5"></div>
                            <div className="text-center">O</div>
                            <div className="text-center">M</div>
                            <div className="text-center">R</div>
                            <div className="text-center">W</div>
                            <div className="col-span-2 text-right">Econ</div>
                        </div>

                        {/* Bowling Rows */}
                        <div className="divide-y divide-gray-700">
                            {bowlingPlayers.map((player: any) => {
                                const isCurrentBowler = currentBowler && player.name === currentBowler.name && activeTeam === battingTeam;
                                const oversDisplay = isCurrentBowler && bowlerOvers && currentOverBalls !== undefined
                                    ? `${bowlerOvers[player.name] || 0}.${currentOverBalls}`
                                    : (player.oversBowled || 0).toFixed(1);

                                const economyDisplay = isCurrentBowler && bowlerOvers && currentOverBalls !== undefined
                                    ? calculateEconomy(player.runsConceded || 0, (bowlerOvers[player.name] || 0) + (currentOverBalls / 6))
                                    : calculateEconomy(player.runsConceded || 0, player.oversBowled || 0);

                                return (
                                    <div key={player.name} className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-gray-750 transition-colors">
                                        <div className="col-span-5">
                                            <div className="font-medium">{player.name}</div>
                                        </div>
                                        <div className="text-center font-semibold">{oversDisplay}</div>
                                        <div className="text-center text-gray-300">{player.maidens || 0}</div>
                                        <div className="text-center text-gray-300">{player.runsConceded || 0}</div>
                                        <div className="text-center text-gray-300">{player.wicketsTaken || 0}</div>
                                        <div className="col-span-2 text-right text-gray-300">
                                            {economyDisplay}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Back Button - Only show if not read only */}
                {!isReadOnly && (
                    <Button
                        onClick={onBackToUpdate}
                        className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 transition-all duration-300 text-white font-semibold py-6"
                        size="lg"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Update
                    </Button>
                )}
            </div>
        </div>
    );
};
