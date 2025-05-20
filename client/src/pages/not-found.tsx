
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

export default function NotFound() {
  const [, navigate] = useLocation();
  const [animateIn, setAnimateIn] = useState(false);
  
  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
      <Card className={`w-full max-w-md mx-4 shadow-lg border-t-4 border-t-blue-500 transition-all duration-500 transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
        <CardContent className="pt-8 pb-6">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-red-100 rounded-full p-3 mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">404</h1>
            <h2 className="text-xl font-semibold text-gray-800">Page Not Found</h2>
          </div>

          <p className="text-center text-gray-600 mb-6">
            The page you're looking for doesn't exist or was moved to another location.
          </p>
          
          <div className="flex justify-center">
            <Button 
              onClick={() => navigate("/")} 
              className="bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Home className="h-4 w-4 mr-2" />
              Return Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
