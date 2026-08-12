import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity, ChevronRight, Play, Users, Zap,
  BarChart3, Globe, Radio
} from "lucide-react";

const FEATURES = [
  { icon: Radio, title: "Real-Time Scoring", desc: "Ball-by-ball updates synced instantly to all connected devices via Firestore." },
  { icon: BarChart3, title: "Match Analytics", desc: "Run rate graphs, partnership charts, bowling economy, win probability and more." },
  { icon: Zap, title: "ICC Cricket Rules", desc: "Complete cricket engine covering all dismissals, extras, free hits and over logic." },
  { icon: Users, title: "Multi-Role Access", desc: "Separate flows for Admin, Umpire/Scorer and unlimited Spectators." },
  { icon: Globe, title: "Shareable Match Link", desc: "Invite spectators with a single QR code or shareable link. No app required." },
];

const STATS = [
  { value: "100+", label: "Ball Types Supported" },
  { value: "11", label: "Dismissal Types" },
  { value: "Unlimited", label: "Spectators" },
  { value: "Real-Time", label: "Sync via Firestore" },
];

const BallTrail: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <div className="absolute w-3 h-3 rounded-full bg-red-500 opacity-20 blur-sm animate-pulse" style={style} />
);

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden">

      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-gray-950/95 backdrop-blur-md border-b border-white/10 shadow-xl" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-400 flex items-center justify-center shadow-lg shadow-red-500/30">
              <span className="text-white font-black text-xs">TU</span>
            </div>
            <span className="font-black text-lg tracking-tight">
              THE <span className="text-orange-400">THIRD</span> UMPIRE
            </span>
          </div>

          {/* Left blank as requested */}
          <div className="flex items-center gap-4">
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section id="home" className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">

        {/* Stadium background pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-950/40 via-gray-950 to-gray-950" />
          {/* Field circles */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-green-900/20" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-green-900/15" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-green-900/20 bg-green-950/10" />
          {/* Pitch strip */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-48 bg-yellow-900/20 rounded" />
          {/* Floating balls */}
          <BallTrail style={{ top: "20%", left: "15%", animationDelay: "0s" }} />
          <BallTrail style={{ top: "70%", left: "80%", animationDelay: "1s" }} />
          <BallTrail style={{ top: "40%", left: "75%", animationDelay: "2s" }} />
          <BallTrail style={{ top: "80%", left: "25%", animationDelay: "0.5s" }} />
          {/* Glow orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          {/* Live badge removed as requested */}

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4 leading-tight">
            THE{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-400 to-orange-500">
              THIRD
            </span>
            <br />UMPIRE
          </h1>

          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            Professional real-time cricket scoring platform. Ball-by-ball tracking,
            live scorecards, and analytics -- built for the ground.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => navigate("/create-match")}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-base px-8 py-6 shadow-xl shadow-orange-500/25 transition-all hover:scale-105">
              <Play className="w-5 h-5 mr-2" />
              Start a Match
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/join-match")}
              className="border-white/20 text-white hover:bg-white/10 font-semibold text-base px-8 py-6 backdrop-blur transition-all hover:scale-105">
              <Users className="w-5 h-5 mr-2" />
              Join as Spectator
            </Button>
          </div>

          {/* Scroll cue */}
          <div className="mt-16 flex flex-col items-center gap-1 opacity-40">
            <span className="text-xs text-gray-500">Scroll to explore</span>
            <div className="w-px h-8 bg-gradient-to-b from-gray-500 to-transparent" />
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-gray-900/60 border-y border-white/5 py-8">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <div className="text-2xl font-black text-orange-400 mb-1">{s.value}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/30 mb-4">Platform Features</Badge>
            <h2 className="text-3xl md:text-4xl font-black mb-4">Everything a Scorer Needs</h2>
            <p className="text-gray-500 max-w-xl mx-auto">From toss to trophy -- every cricket moment captured, scored and shared in real time.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i}
                className="group relative bg-gray-900/50 border border-white/5 rounded-2xl p-6 hover:border-orange-500/30 hover:bg-gray-900/80 transition-all duration-300 cursor-default">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4 group-hover:bg-orange-500/20 transition-colors">
                  <f.icon className="w-5 h-5 text-orange-400" />
                </div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="live" className="py-24 px-4 bg-gray-900/40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="bg-green-500/10 text-green-400 border-green-500/30 mb-4">Workflow</Badge>
            <h2 className="text-3xl md:text-4xl font-black mb-4">Up and Running in 60 Seconds</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create Match", desc: "Enter team names, choose format, complete the toss. Your match ID is auto-generated.", icon: Zap },
              { step: "02", title: "Score Live", desc: "Use the Scoring Console to record every ball. All devices sync instantly.", icon: Activity },
              { step: "03", title: "Share & Watch", desc: "Spectators join via match code or link. Full scorecards, stats and commentary.", icon: Globe },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-800 border border-white/10 mb-4">
                  <item.icon className="w-6 h-6 text-orange-400" />
                  <span className="absolute -top-2 -right-2 text-xs font-black text-orange-500 bg-gray-950 px-1 rounded">{item.step}</span>
                </div>
                <h3 className="font-bold text-white mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                {i < 2 && <ChevronRight className="w-4 h-4 text-gray-700 mx-auto mt-4 hidden md:block" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="about" className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 mb-4">Roles</Badge>
            <h2 className="text-3xl md:text-4xl font-black mb-4">Built for Everyone at the Ground</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { role: "Admin", color: "from-purple-500 to-blue-500", desc: "Create matches, manage teams, officials and configure match settings." },
              { role: "Umpire / Scorer", color: "from-orange-500 to-red-500", desc: "Full scoring console with ball-by-ball recording, undo, and live sync." },
              { role: "Spectator", color: "from-green-500 to-teal-500", desc: "Read-only live scorecard, commentary, stats -- join via link or QR." },
            ].map((r, i) => (
              <div key={i} className="bg-gray-900/50 border border-white/5 rounded-2xl p-6 text-center">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${r.color} flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg`}>
                  {r.role[0]}
                </div>
                <h3 className="font-bold text-white mb-2">{r.role}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4 text-center text-gray-600 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="font-black text-gray-400">THE THIRD UMPIRE</span>
          <span className="text-gray-700">|</span>
          <span>Professional Cricket Scoring Platform</span>
        </div>
        <p className="text-xs text-gray-700">Built with React, TypeScript, Firebase, Tailwind CSS</p>
      </footer>
    </div>
  );
};

export default LandingPage;