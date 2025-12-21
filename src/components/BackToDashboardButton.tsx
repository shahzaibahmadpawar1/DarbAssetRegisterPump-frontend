import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function BackToDashboardButton() {
  const handleClick = () => {
    // 🔹 Update URL hash directly - analytics is now the main dashboard
    window.history.pushState({ view: "analytics" }, "Dashboard", "#analytics");

    // 🔹 Trigger hashchange manually so App updates the view
    window.dispatchEvent(new PopStateEvent("popstate", { state: { view: "analytics" } }));
  };

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      className="flex items-center gap-2 bg-card/80 backdrop-blur-sm border-2 border-border/50 hover:border-primary/50 hover:bg-card shadow-sm hover:shadow-md transition-all duration-300 font-medium"
    >
      <Home className="w-4 h-4" />
      Back to Dashboard
    </Button>
  );
}
