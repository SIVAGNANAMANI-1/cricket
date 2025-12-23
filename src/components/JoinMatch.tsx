import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Compass } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { useSearchParams } from "react-router-dom";

// Get the global App ID provided by the environment
const appId = (window as any).__app_id || 'default-app-id';

// Get the initial auth token if provided by the environment
const initialAuthToken = (window as any).__initial_auth_token;

interface JoinMatchProps {
  onJoinMatch: (matchData: any) => void;
}

export const JoinMatch = ({ onJoinMatch }: JoinMatchProps) => {
  const [useParams] = useSearchParams();
  const [matchCodeInput, setMatchCodeInput] = useState(useParams.get("code") || "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const auth = getAuth();

    const performSignIn = async () => {
      try {
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.warn("Auth failed, running in Guest Mode:", error);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        performSignIn();
      }
    });

    return () => unsubscribe();
  }, []);

  const handleJoin = async () => {
    setError(null);
    setLoading(true);

    const code = matchCodeInput.trim().toUpperCase();
    if (!code) {
      setError("Please enter a match code.");
      setLoading(false);
      return;
    }

    // Helper to check local storage
    const checkLocalMatch = (storageKey: string) => {
      try {
        const localData = localStorage.getItem(storageKey);
        if (localData) {
          const parsed = JSON.parse(localData);
          // Check if the stored match has the same code (handling various field names)
          if (parsed.publicCode === code || parsed.matchCode === code || parsed.id === code) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn(`Error parsing ${storageKey}:`, e);
      }
      return null;
    };

    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        // Attempt anonymous sign-in, but don't block if it fails (might be offline)
        try {
          await signInAnonymously(auth);
        } catch (authErr) {
          console.warn("Anonymous auth failed (likely offline):", authErr);
        }
      }

      // CORRECTED PATH: artifacts/{appId}/public/data/matches/{matchCode}
      const docPath = `artifacts/${appId}/public/data/matches/${code}`;
      console.log("JoinMatch: Looking for match at:", docPath);

      const matchDocRef = doc(db, docPath);

      // Try to get doc with a timeout or just standard getDoc
      // We wrap in a try/catch specifically for the network call
      let matchFound = false;
      try {
        const matchDoc = await getDoc(matchDocRef);
        if (matchDoc.exists()) {
          const fetchedData = { id: matchDoc.id, ...matchDoc.data() };
          console.log("JoinMatch: Successfully fetched match from Firestore:", fetchedData);
          onJoinMatch(fetchedData);
          matchFound = true;
        }
      } catch (firestoreErr) {
        console.warn("JoinMatch: Firestore fetch failed, trying local storage fallback...", firestoreErr);
      }

      if (!matchFound) {
        // Fallback: Check local storage
        // 1. Check 'liveCricketMatch' (Creator's local storage)
        let localMatch = checkLocalMatch('liveCricketMatch');

        // 2. Check 'cricket_match_current' (Viewer's previous local storage)
        if (!localMatch) {
          localMatch = checkLocalMatch('cricket_match_current');
        }

        if (localMatch) {
          console.log("JoinMatch: Found match in local storage:", localMatch);
          onJoinMatch(localMatch);
        } else {
          throw new Error("Match not found in cloud or local storage.");
        }
      }

    } catch (err: any) {
      console.error("JoinMatch: Error joining match:", err);
      setError(`Connection Error: ${err.message || "Failed to connect"}`);
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