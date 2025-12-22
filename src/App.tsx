// App.tsx
import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import LoginForm from "./components/LoginForm";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import Categories from "./pages/Categories";
import Employees from "./pages/Employees";
import HomeDashboard from "./pages/HomeDashboard";
import AssetsByCategoryReport from "./pages/reports/AssetsByCategory";
import AllAssetsReport from "./pages/reports/AllAssets";
import AllStationsReport from "./pages/reports/AllStations";
import Accounts from "./pages/Accounts";
import Analytics from "./pages/Analytics";
import { API_BASE } from "./lib/api";
import Sidebar from "./components/Sidebar";

type View =
  | "login"
  | "home"
  | "dashboard"
  | "assets"
  | "categories"
  | "employees"
  | "r-assets-by-cat"
  | "r-all-assets"
  | "r-all-stations"
  | "accounts"
  | "analytics";

function App() {
  const [currentView, setCurrentView] = useState<View>("login");
  const [authUser, setAuthUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [selectedPumpId, setSelectedPumpId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ✅ Restore session when app loads
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Get token from localStorage (primary) or try cookie (fallback)
        const storedToken = localStorage.getItem("auth_token");
        
        let res;
        if (storedToken) {
          // Use localStorage token
          res = await fetch(`${API_BASE}/api/me`, {
            credentials: "include",
            method: "GET",
            headers: {
              "Authorization": `Bearer ${storedToken}`,
            },
            cache: "no-store", // Prevent caching
          });
        } else {
          // Try cookie
          res = await fetch(`${API_BASE}/api/me`, { 
            credentials: "include",
            method: "GET",
            cache: "no-store", // Prevent caching
          });
        }
        
        const data = await res.json();

        if (data?.authenticated && data?.user) {
          // User is authenticated - restore their session
          // Always use fresh data from API (don't trust cached state)
          console.log("[RESTORE SESSION] User authenticated:", { username: data.user.username, role: data.user.role });
          setAuthUser(data.user);
          setUserRole(data.user.role);

          // Determine the correct view based on current hash
          const hash = window.location.hash?.replace(/^#/, "") as View | "";
          const validViews: View[] = [
            "login",
            "home",
            "dashboard",
            "assets",
            "categories",
            "employees",
            "r-assets-by-cat",
            "r-all-assets",
            "r-all-stations",
            "accounts",
          ];

          // If hash is accounts but user is not admin, redirect to analytics
          if (hash === "accounts" && data.user.role !== "admin") {
            setCurrentView("analytics");
            window.history.replaceState({ view: "analytics" }, "Dashboard", "#analytics");
            return;
          }

          // If hash is valid and not login, use it; otherwise default to analytics (main dashboard)
          const view = (hash && validViews.includes(hash as View) && hash !== "login") 
            ? (hash as View) 
            : (hash === "login" ? "analytics" : "analytics"); // Default to analytics (main dashboard)
          setCurrentView(view);
          // Don't change URL if we're already on the correct view
          if (view !== hash && hash !== "login") {
            window.history.replaceState({ view }, view, `#${view}`);
          }
        } else {
          // User is not authenticated - clear everything
          setAuthUser(null);
          localStorage.removeItem("auth_token");
          const hash = window.location.hash?.replace(/^#/, "") as View | "";
          // Only redirect to login if not already there
          if (hash !== "login") {
            setCurrentView("login");
            window.history.replaceState({ view: "login" }, "Login", "#login");
          } else {
            setCurrentView("login");
          }
        }
      } catch (e) {
        console.error("Session restore failed", e);
        // On network error, check if we have a stored token
        const storedToken = localStorage.getItem("auth_token");
        if (storedToken) {
          // If we have a token, assume user is authenticated (will be verified on next API call)
          const hash = window.location.hash?.replace(/^#/, "") as View | "";
          const validViews: View[] = [
            "login",
            "home",
            "dashboard",
            "assets",
            "categories",
            "employees",
            "r-assets-by-cat",
            "r-all-assets",
            "r-all-stations",
            "accounts",
          ];
          
          if (hash && validViews.includes(hash as View) && hash !== "login") {
            // Prevent non-admins from accessing accounts page (even if we don't have role yet, redirect to be safe)
            if (hash === "accounts") {
              setAuthUser({ username: "user" }); // Temporary user object
              setCurrentView("analytics");
              window.history.replaceState({ view: "analytics" }, "Dashboard", "#analytics");
            } else {
              // Keep them on the page - API calls will verify auth
              setAuthUser({ username: "user" }); // Temporary user object
              setCurrentView(hash as View);
            }
          } else {
            setAuthUser(null);
            setCurrentView("login");
            window.history.replaceState({ view: "login" }, "Login", "#login");
          }
        } else {
          setAuthUser(null);
          setCurrentView("login");
          window.history.replaceState({ view: "login" }, "Login", "#login");
        }
      } finally {
        setAuthLoading(false);
      }
    };

    restoreSession();
  }, []);

  // ✅ Handle login
  const handleLogin = async (username: string, _password: string) => {
    try {
      setAuthLoading(true);
      
      // Small delay to ensure cookie is set on server
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Fetch user role after login - always use fresh token from localStorage
      try {
        const storedToken = localStorage.getItem("auth_token");
        if (!storedToken) {
          console.warn("[LOGIN] No token in localStorage after login");
          setAuthUser({ username });
          setCurrentView("analytics");
          window.history.pushState({ view: "analytics" }, "Dashboard", "#analytics");
          return;
        }
        
        const res = await fetch(`${API_BASE}/api/me`, {
          credentials: "include",
          headers: { "Authorization": `Bearer ${storedToken}` },
          cache: "no-store", // Prevent caching
        });
        const data = await res.json();
        if (data?.authenticated && data?.user) {
          console.log("[LOGIN] User authenticated:", { username: data.user.username, role: data.user.role });
          setAuthUser(data.user);
          setUserRole(data.user.role);
        } else {
          console.warn("[LOGIN] Authentication failed, using username only");
          setAuthUser({ username });
        }
      } catch (err) {
        console.error("[LOGIN] Error fetching user data:", err);
        setAuthUser({ username });
      }
      setCurrentView("analytics");
      window.history.pushState({ view: "analytics" }, "Dashboard", "#analytics");
    } finally {
      setAuthLoading(false);
    }
  };

  // ✅ Handle logout
  const handleLogout = async () => {
    try {
      // Clear localStorage first
      localStorage.removeItem("auth_token");
      
      // Clear state immediately
      setAuthUser(null);
      setUserRole(null);
      setCurrentView("login");
      setSelectedPumpId(null);
      
      // Then call logout endpoint to clear server-side cookie
      await fetch(`${API_BASE}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
      
      // Navigate to login
      window.history.pushState({ view: "login" }, "Login", "#login");
    } catch (e) {
      console.warn("Logout failed", e);
      // Even if logout fails, clear local state and navigate to login
      localStorage.removeItem("auth_token");
      setAuthUser(null);
      setUserRole(null);
      setCurrentView("login");
      setSelectedPumpId(null);
      window.history.pushState({ view: "login" }, "Login", "#login");
    }
  };

  const navigate = (view: View) => {
    // Prevent non-admins from accessing accounts page
    if (view === "accounts" && userRole !== "admin") {
      setCurrentView("analytics");
      window.history.pushState({ view: "analytics" }, "Dashboard", "#analytics");
      return;
    }
    setCurrentView(view);
    window.history.pushState({ view }, view, `#${view}`);
  };

  const handleViewAssets = (pump_id: number) => {
    setSelectedPumpId(pump_id);
    navigate("assets");
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const view = (e.state && e.state.view) as View;
      // Prevent non-admins from accessing accounts page
      if (view === "accounts" && userRole !== "admin") {
        setCurrentView("analytics");
        window.history.replaceState({ view: "analytics" }, "Dashboard", "#analytics");
        return;
      }
      if (view) setCurrentView(view);
      else {
        setCurrentView("analytics");
        window.history.replaceState({ view: "analytics" }, "Dashboard", "#analytics");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [userRole]);


  // ✅ Loading indicator while checking session
  if (authLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading…
      </div>
    );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {authUser == null ? (
          <LoginForm onLogin={handleLogin} />
        ) : (
          <>
            <Header 
              onLogout={handleLogout} 
              currentView={currentView}
              userRole={userRole}
              showMenuButton={true}
              onMenuClick={() => setSidebarOpen(!sidebarOpen)}
              onNavigate={(view) => {
                // Prevent non-admins from accessing accounts page
                if (view === "accounts" && userRole !== "admin") {
                  setCurrentView("analytics");
                  window.history.pushState({ view: "analytics" }, "Dashboard", "#analytics");
                  return;
                }
                setCurrentView(view as View);
                window.history.pushState({ view }, view, `#${view}`);
              }}
            />

            <div className="flex min-h-[calc(100vh-4rem)] relative">
              <Sidebar 
                open={sidebarOpen} 
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                onNavigate={(view) => {
                  // Prevent non-admins from accessing accounts page
                  if (view === "accounts" && userRole !== "admin") {
                    setCurrentView("analytics");
                    window.history.pushState({ view: "analytics" }, "Dashboard", "#analytics");
                    return;
                  }
                  setCurrentView(view as View);
                  window.history.pushState({ view }, view, `#${view}`);
                }}
              />

              <div className="flex-1 overflow-auto">
                {currentView === "dashboard" && (
                  <Dashboard onViewAssets={handleViewAssets} />
                )}

                {currentView === "assets" && (
                  <Assets
                    pump_id={selectedPumpId}
                    onBack={() => navigate("dashboard")}
                  />
                )}

                {currentView === "categories" && <Categories />}
                {currentView === "employees" && <Employees />}
                {currentView === "r-assets-by-cat" && <AssetsByCategoryReport />}
                {currentView === "r-all-assets" && <AllAssetsReport />}
                {currentView === "r-all-stations" && <AllStationsReport />}
                {currentView === "accounts" && userRole === "admin" && <Accounts />}
                {currentView === "analytics" && <Analytics onNavigate={(view) => navigate(view as View)} />}
              </div>
            </div>
          </>
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
