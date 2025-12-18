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
import AssetForm, { type AssetFormData } from "./components/AssetForm";
import PumpForm from "./components/PumpForm";
import { API_BASE } from "./lib/api";

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
  | "accounts";

function App() {
  const [currentView, setCurrentView] = useState<View>("login");
  const [authUser, setAuthUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [selectedPumpId, setSelectedPumpId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [assetFormOpen, setAssetFormOpen] = useState(false);
  const [pumpFormOpen, setPumpFormOpen] = useState(false);

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
          });
        } else {
          // Try cookie
          res = await fetch(`${API_BASE}/api/me`, { 
            credentials: "include",
            method: "GET",
          });
        }
        
        const data = await res.json();

        if (data?.authenticated && data?.user) {
          // User is authenticated - restore their session
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

          // If hash is valid and not login, use it; otherwise default to home
          const view = (hash && validViews.includes(hash as View) && hash !== "login") 
            ? (hash as View) 
            : (hash === "login" ? "home" : "home"); // If on login page, go to home
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
            // Keep them on the page - API calls will verify auth
            setAuthUser({ username: "user" }); // Temporary user object
            setCurrentView(hash as View);
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
      // Fetch user role after login
      try {
        const storedToken = localStorage.getItem("auth_token");
        const res = await fetch(`${API_BASE}/api/me`, {
          credentials: "include",
          headers: storedToken ? { "Authorization": `Bearer ${storedToken}` } : {},
        });
        const data = await res.json();
        if (data?.authenticated && data?.user) {
          setAuthUser(data.user);
          setUserRole(data.user.role);
        } else {
          setAuthUser({ username });
        }
      } catch (err) {
      setAuthUser({ username });
      }
      setCurrentView("home");
      window.history.pushState({ view: "home" }, "Home", "#home");
    } finally {
      setAuthLoading(false);
    }
  };

  // ✅ Handle logout
  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.warn("Logout failed", e);
    } finally {
      // Clear localStorage token
      localStorage.removeItem("auth_token");
      setAuthUser(null);
      setUserRole(null);
      setCurrentView("login");
      setSelectedPumpId(null);
      window.history.pushState({ view: "login" }, "Login", "#login");
    }
  };

  const navigate = (view: View) => {
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
      if (view) setCurrentView(view);
      else {
        setCurrentView("home");
        window.history.replaceState({ view: "home" }, "Home", "#home");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleAddAsset = async (data: AssetFormData) => {
    try {
      const payload = {
        asset_name: data.asset_name?.trim() || "",
        asset_number: data.asset_number?.trim() || "",
        units: data.units ?? null,
        category_id: data.category_id || null,
      };
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/assets`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      alert("✅ Asset added successfully!");
      setAssetFormOpen(false);
    } catch (err: any) {
      alert(err.message || "Error adding asset");
    }
  };

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
              onNavigate={(view) => {
                setCurrentView(view as View);
                window.history.pushState({ view }, view, `#${view}`);
              }}
            />

            {currentView === "home" && (
              <HomeDashboard
                onGoPumps={() => setPumpFormOpen(true)}
                onGoAssets={() => setAssetFormOpen(true)}
                onGoAddCategory={() => navigate("categories")}
                onGoAddEmployee={() => navigate("employees")}
                onGoEmployees={() => navigate("employees")}
                onGoReportAssetsByCategory={() => navigate("r-assets-by-cat")}
                onGoReportAllAssets={() => navigate("r-all-assets")}
                onGoReportAllStations={() => navigate("r-all-stations")}
              />
            )}

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

            <AssetForm
              open={assetFormOpen}
              onClose={() => setAssetFormOpen(false)}
              onSubmit={handleAddAsset}
              title="Add Asset"
            />

            <PumpForm
              open={pumpFormOpen}
              onClose={() => setPumpFormOpen(false)}
              onSuccess={() => {
                setPumpFormOpen(false);
                alert("Petrol Station added!");
              }}
            />
          </>
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
