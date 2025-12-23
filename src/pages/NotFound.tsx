import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-orange-400 mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-gray-400 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button
          onClick={() => window.location.href = "/"}
          className="bg-gradient-field hover:opacity-90 transition-all duration-300"
        >
          <Home className="w-4 h-4 mr-2" />
          Go Home
        </Button>
      </div>
    </div>
  );
}
