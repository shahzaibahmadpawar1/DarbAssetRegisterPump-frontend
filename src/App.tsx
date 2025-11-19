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
import HomeDashboard from "./pages/HomeDashboard";
import AssetsByCategoryReport from "./pages/reports/AssetsByCategory";
import AllAssetsReport from "./pages/reports/AllAssets";
import AllStationsReport from "./pages/reports/AllStations";
import AssetForm, { type AssetFormData } from "./components/AssetForm";
import PumpForm from "./components/PumpForm";
import { API_BASE } from "./lib/api";

type View =
  | "login"
  | "home"
  | "dashboard"
  | "assets"
  | "categories"
  | "r-assets-by-cat"
  | "r-all-assets"
  | "r-all-stations";

function App() {
  const [currentView, setCurrentView] = useState<View>("login");
  const [authUser, setAuthUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [selectedPumpId, setSelectedPumpId] = useState<number | null>(null);

  const [assetFormOpen, setAssetFormOpen] = useState(false);
  const [pumpFormOpen, setPumpFormOpen] = useState(false);

  // ✅ Restore session when app loads
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/me`, { credentials: "include" });
        const data = await res.json();

        if (data?.authenticated) {
          setAuthUser(data.user);

          // Determine the correct view based on current hash
          const hash = window.location.hash?.replace(/^#/, "") as View | "";
          const validViews: View[] = [
            "login",
            "home",
            "dashboard",
            "assets",
            "categories",
            "r-assets-by-cat",
            "r-all-assets",
            "r-all-stations",
          ];

          const view = validViews.includes(hash as View) ? (hash as View) : "home";
          setCurrentView(view);
          window.history.replaceState({ view }, view, `#${view}`);
        } else {
          setAuthUser(null);
          setCurrentView("login");
          window.history.replaceState({ view: "login" }, "Login", "#login");
        }
      } catch (e) {
        console.error("Session restore failed", e);
        setAuthUser(null);
        setCurrentView("login");
        window.history.replaceState({ view: "login" }, "Login", "#login");
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
      setAuthUser({ username });
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
      setAuthUser(null);
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

  // ✅ Add Asset handler (unchanged)
  const sanitizeAssignments = (
    assignments?: AssetFormData["assignments"]
  ) => {
    if (!assignments) return [];
    return assignments
      .filter(
        (row) =>
          row &&
          row.pump_id != null &&
          row.quantity != null &&
          Number(row.quantity) > 0
      )
      .map((row) => ({
        pump_id: row.pump_id!,
        quantity: Number(row.quantity),
      }));
  };

  const handleAddAsset = async (data: AssetFormData) => {
    try {
      const payload = {
        asset_name: data.asset_name?.trim() || "",
        asset_number: data.asset_number?.trim() || "",
        serial_number: data.serial_number ?? null,
        barcode: data.barcode ?? null,
        quantity: data.quantity == null ? null : Number(data.quantity),
        units: data.units ?? null,
        remarks: data.remarks ?? null,
        category_id: data.category_id || null,
        pump_id: null,
        asset_value: data.asset_value ?? 0,
        assignments: sanitizeAssignments(data.assignments),
      };
      const res = await fetch(`${API_BASE}/api/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
            <Header onLogout={handleLogout} />

            {currentView === "home" && (
              <HomeDashboard
                onGoPumps={() => setPumpFormOpen(true)}
                onGoAssets={() => setAssetFormOpen(true)}
                onGoAddCategory={() => navigate("categories")}
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
            {currentView === "r-assets-by-cat" && <AssetsByCategoryReport />}
            {currentView === "r-all-assets" && <AllAssetsReport />}
            {currentView === "r-all-stations" && <AllStationsReport />}

            <AssetForm
              open={assetFormOpen}
              onClose={() => setAssetFormOpen(false)}
              onSubmit={handleAddAsset}
              onScanBarcode={() => alert("Scan not implemented")}
              title="Add Asset"
              defaultPumpId={selectedPumpId}
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
