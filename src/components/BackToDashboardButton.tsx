import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function BackToDashboardButton() {
  const handleClick = () => {
    // 🔹 Update URL hash directly
    window.history.pushState({ view: "home" }, "Home", "#home");

    // 🔹 Trigger hashchange manually so App updates the view
    window.dispatchEvent(new PopStateEvent("popstate", { state: { view: "home" } }));
  };

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      className="flex items-center gap-2 bg-white/60 backdrop-blur-md hover:bg-white/80"
    >
      <Home className="w-4 h-4" />
      Back to Dashboard
    </Button>
  );
}
