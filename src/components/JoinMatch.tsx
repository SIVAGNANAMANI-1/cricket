import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Compass } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";

// Get the global App ID provided by the environment
const appId = (window as any).__app_id || 'default-app-id';

interface JoinMatchProps {
  onJoinMatch: (matchData: any) => void;
}

export const JoinMatch = ({ onJoinMatch }: JoinMatchProps) => {
  const [matchCodeInput, setMatchCodeInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setError(null);
    setLoading(true);
    try {
      // CORRECTED PATH: artifacts/{appId}/public/data/matches/{matchCode}
      const matchDocRef = doc(db, `artifacts/${appId}/public/data/matches/${matchCodeInput.toUpperCase()}`);
      const matchDoc = await getDoc(matchDocRef);
      if (matchDoc.exists()) {
        onJoinMatch({ id: matchDoc.id, ...matchDoc.data() });
      } else {
        setError("Invalid Match Code. Please try again.");
      }
    } catch (err) {
      console.error("Error joining match: ", err);
      setError("Error connecting to the match. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400 mb-2">
            The Third Umpire
          </h1>
          <p className="text-gray-300">Join a live cricket match</p>
        </div>

        <Card className="shadow-cricket animate-slide-up bg-orange-800 bg-opacity-70 backdrop-blur-sm border border-orange-600/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Compass className="w-5 h-5 text-primary" />
              Join Match
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-300">Enter Match Code</label>
              <Input
                placeholder="e.g., ABCDEF"
                value={matchCodeInput}
                onChange={(e) => setMatchCodeInput(e.target.value)}
                className="border-2 focus:border-primary uppercase bg-gray-700 text-white"
                maxLength={6}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleJoin}
              className="w-full bg-gradient-field hover:opacity-90 transition-all duration-300"
              disabled={matchCodeInput.length !== 6 || loading}
            >
              {loading ? "Joining..." : "Join Match"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};