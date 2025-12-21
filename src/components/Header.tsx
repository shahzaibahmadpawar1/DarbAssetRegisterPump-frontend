import { Button } from "../components/ui/button";
import { Fuel, LogOut, Menu, LayoutDashboard, Users, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";

interface HeaderProps {
  onLogout: () => void;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  currentView?: string;
  onNavigate?: (view: string) => void;
  userRole?: string | null; // Pass userRole as prop from App.tsx
}

export default function Header({ onLogout, onMenuClick, showMenuButton = false, currentView, onNavigate, userRole: propUserRole }: HeaderProps) {
  const [userRole, setUserRole] = useState<string | null>(propUserRole || null);

  // Update local state when prop changes
  useEffect(() => {
    if (propUserRole !== undefined) {
      setUserRole(propUserRole);
    }
  }, [propUserRole]);

  // Fallback: fetch user role if not provided as prop
  useEffect(() => {
    if (propUserRole === undefined) {
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
    }
  }, [propUserRole]);

  const handleNavigate = (view: string) => {
    if (onNavigate) {
      onNavigate(view);
    } else {
      window.history.pushState({ view }, view, `#${view}`);
      window.dispatchEvent(new PopStateEvent("popstate", { state: { view } }));
    }
  };

  // Format role name for display
  const getRoleDisplayName = (role: string | null): string => {
    if (!role) return "";
    switch (role) {
      case "admin":
        return "Admin";
      case "assigning_user":
        return "Assigning User";
      case "viewing_user":
        return "Viewing User";
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  return (
    <header className="h-16 border-b border-border/50 bg-card/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden hover:bg-primary/10"
            data-testid="button-menu-toggle"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
            <Fuel className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Darb Station
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block font-medium">
              Asset Management System
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {/* User Role Badge */}
        {userRole && (
          <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-sm font-medium text-primary hidden sm:flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Role:</span>
            <span>{getRoleDisplayName(userRole)}</span>
          </div>
        )}
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border border-border/50 rounded-xl p-1 bg-background/60 backdrop-blur-sm shadow-sm">
          <Button
            variant={currentView === "home" || currentView === "analytics" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleNavigate("analytics")}
            className="gap-2 font-medium transition-all duration-200"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>
          {userRole === "admin" && (
            <Button
              variant={currentView === "accounts" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleNavigate("accounts")}
              className="gap-2 font-medium transition-all duration-200"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Accounts</span>
            </Button>
          )}
        </div>
        
        <Button
          variant="ghost"
          onClick={onLogout}
          className="gap-2 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 font-medium"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
