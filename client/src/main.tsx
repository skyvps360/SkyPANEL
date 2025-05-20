import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

createRoot(document.getElementById("root")!).render(
  <Suspense fallback={
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  }>
    <App />
  </Suspense>
);
