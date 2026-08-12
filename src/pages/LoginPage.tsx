import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, UserRole } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Lock, Mail, Chrome, UserCheck, ShieldCheck } from "lucide-react";

const LoginPage: React.FC = () => {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, loginAnonymously } = useAuth();
  const navigate = useNavigate();

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("spectator");
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        await registerWithEmail(email, password, selectedRole);
      } else {
        await loginWithEmail(email, password);
      }
      navigate("/");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate("/");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Google Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginAnonymously();
      navigate("/");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Guest Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Stadium Grid Visual */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-950/20 via-gray-950 to-gray-950 z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-green-900/10 z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-green-900/5 z-0" />

      <Card className="relative z-10 w-full max-w-md bg-gray-900/80 backdrop-blur border border-white/10 shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-red-500/20 mb-2">
            <span className="text-xl">🏏</span>
          </div>
          <CardTitle className="text-2xl font-black tracking-tight text-white">
            THE <span className="text-orange-400">THIRD</span> UMPIRE
          </CardTitle>
          <CardDescription className="text-gray-400">
            {isRegistering ? "Create your scorer profile" : "Log in to the match console"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="bg-red-950/60 border-red-500/50 text-red-200">
              <AlertTitle>Authentication Error</AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300 font-semibold text-xs uppercase tracking-wider">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white pl-10 focus:border-orange-500 focus:ring-orange-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300 font-semibold text-xs uppercase tracking-wider">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white pl-10 focus:border-orange-500 focus:ring-orange-500"
                  required
                />
              </div>
            </div>

            {isRegistering && (
              <div className="space-y-3 pt-1">
                <Label className="text-gray-300 font-semibold text-xs uppercase tracking-wider">Select Account Role</Label>
                <RadioGroup
                  value={selectedRole}
                  onValueChange={(val: any) => setSelectedRole(val)}
                  className="grid grid-cols-2 gap-3"
                >
                  <div className="flex items-center space-x-2 bg-gray-800/50 border border-gray-700 rounded-lg p-2.5 hover:bg-gray-850 cursor-pointer">
                    <RadioGroupItem value="scorer" id="role-scorer" className="text-orange-500 border-gray-600" />
                    <Label htmlFor="role-scorer" className="text-sm font-medium text-gray-200 cursor-pointer flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-orange-400" /> Scorer
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 bg-gray-800/50 border border-gray-700 rounded-lg p-2.5 hover:bg-gray-850 cursor-pointer">
                    <RadioGroupItem value="spectator" id="role-spectator" className="text-orange-500 border-gray-600" />
                    <Label htmlFor="role-spectator" className="text-sm font-medium text-gray-200 cursor-pointer flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Spectator
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold h-11"
            >
              {loading ? "Authenticating..." : isRegistering ? "Create Profile" : "Sign In"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-850" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-900 px-2 text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="border-gray-850 text-white bg-gray-800/40 hover:bg-gray-800 h-11 flex items-center justify-center gap-2"
            >
              <Chrome className="w-4 h-4 text-red-400" /> Google
            </Button>
            <Button
              variant="outline"
              onClick={handleAnonymousLogin}
              disabled={loading}
              className="border-gray-850 text-white bg-gray-800/40 hover:bg-gray-800 h-11"
            >
              Guest Watcher
            </Button>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-xs text-orange-400 hover:text-orange-300 font-medium"
            >
              {isRegistering
                ? "Already have an account? Sign In"
                : "Don't have an account? Create Profile"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
