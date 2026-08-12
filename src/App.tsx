import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import JoinMatchPage from "./pages/JoinMatchPage";
import LivePage from "./pages/LivePage";
import LandingPage from "./pages/LandingPage";
import UmpireAuthPage from "./pages/UmpireAuthPage";
import LoginPage from "./pages/LoginPage";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import TournamentPage from "./pages/TournamentPage";

const queryClient = new QueryClient();

const App: React.FC = () => (
  <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
              <Routes>
                {/* Landing page for create or join match choice */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/create-match" element={<Index />} />

                {/* Fan/Viewer Routes */}
                <Route path="/join" element={<JoinMatchPage />} />
                <Route path="/join-match" element={<JoinMatchPage />} />
                <Route path="/live/:publicCode" element={<LivePage />} />

                {/* Umpire Authentication Route */}
                <Route path="/umpire-auth" element={<UmpireAuthPage />} />

                {/* Tournament & Squad Directory Routes */}
                <Route path="/tournament" element={<TournamentPage />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
