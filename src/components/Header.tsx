import { Button } from "../components/ui/button";
import { Fuel, LogOut, Menu, LayoutDashboard, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";

interface HeaderProps {
  onLogout: () => void;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  currentView?: string;
  onNavigate?: (view: string) => void;
}

export default function Header({ onLogout, onMenuClick, showMenuButton = false, currentView, onNavigate }: HeaderProps) {
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const storedToken = localStorage.getItem("auth_token");
        const res = await fetch(`${API_BASE}/api/me`, {
          credentials: "include",
          headers: storedToken ? { "Authorization": `Bearer ${storedToken}` } : {},
        });
        const data = await res.json();
        if (data?.authenticated && data?.user) {
          setUserRole(data.user.role);
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
      }
    };
    fetchUserRole();
  }, []);

  const handleNavigate = (view: string) => {
    if (onNavigate) {
      onNavigate(view);
    } else {
      window.history.pushState({ view }, view, `#${view}`);
      window.dispatchEvent(new PopStateEvent("popstate", { state: { view } }));
    }
  };

  return (
    <header className="h-16 border-b bg-card/70 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden"
            data-testid="button-menu-toggle"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Fuel className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Darb Station</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Asset Management</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border rounded-lg p-1 bg-background/50">
          <Button
            variant={currentView === "home" || currentView === "dashboard" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleNavigate("home")}
            className="gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>
          {userRole === "admin" && (
            <Button
              variant={currentView === "accounts" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleNavigate("accounts")}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Accounts</span>
            </Button>
          )}
        </div>
        
      <Button
        variant="ghost"
        onClick={onLogout}
        className="gap-2"
        data-testid="button-logout"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Logout</span>
      </Button>
      </div>
    </header>
  );
}
