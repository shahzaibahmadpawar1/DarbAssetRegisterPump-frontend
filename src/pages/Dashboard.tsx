// pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import PumpCard, { type Pump } from "../components/PumpCard";
import PumpForm, { type PumpFormData } from "../components/PumpForm";
import DepartmentForm, { type DepartmentFormData } from "../components/DepartmentForm";
import DeleteConfirmDialog from "../components/DeleteConfirmDialog";
import PrintPumps from "../components/PrintPumps";
import { Plus, Printer, FileDown } from "lucide-react";
import { API_BASE } from "@/lib/api";

interface DashboardProps {
  onViewAssets: (pumpId: number) => void;
  openAddOnMount?: boolean;
}

export default function Dashboard({
  onViewAssets,
  openAddOnMount = false,
}: DashboardProps) {
  const { isAdmin } = useUserRole();
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [showPumpForm, setShowPumpForm] = useState(false);
  useEffect(() => {
    if (openAddOnMount) setShowPumpForm(true);
  }, [openAddOnMount]);
  const [editingPump, setEditingPump] = useState<Pump | null>(null);
  const [deletingPumpId, setDeletingPumpId] = useState<number | null>(null);

  // ✅ Fetch pumps
  const fetchPumps = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/pumps`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pumps");
      const data = await res.json();
      setPumps(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading pumps:", err);
      setError("Failed to load pumps. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPumps();
  }, []);

  const handleAddPump = async (data: PumpFormData) => {
    try {
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/pumps`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add pump");
      const newPump = await res.json();
      setPumps((prev) => [newPump, ...prev]);
      setShowPumpForm(false);
    } catch (err) {
      console.error(err);
      alert("Error adding Station");
    }
  };

  const handleUpdatePump = async (data: PumpFormData) => {
    if (!editingPump) return;
    try {
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/pumps/${editingPump.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update Station");
      setPumps((prev) =>
        prev.map((p) =>
          p.id === editingPump.id ? { ...p, ...data } : p
        )
      );
      setEditingPump(null);
      setShowPumpForm(false);
    } catch (err) {
      console.error(err);
      alert("Error updating Station");
    }
  };

  const handleDeletePump = async () => {
    if (!deletingPumpId) return;
    try {
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/pumps/${deletingPumpId}`, {
        method: "DELETE",
        headers: {
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete Statoion");
      setPumps((prev) => prev.filter((p) => p.id !== deletingPumpId));
      setDeletingPumpId(null);
    } catch (err) {
      console.error(err);
      alert("Error deleting Station");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <PrintPumps pumps={pumps} />
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 no-print">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Stations/Departments
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage your stations and departments
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <BackToDashboardButton />
            <Button 
              variant="outline" 
              onClick={() => window.print()} 
              className="gap-2 border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <Printer className="w-4 h-4" /> Print
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <FileDown className="w-4 h-4" /> Export
            </Button>
            {isAdmin && (
              <Button
                onClick={() => {
                  setEditingPump(null);
                  setShowPumpForm(true);
                }}
                className="gap-2 bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300 font-semibold"
              >
                <Plus className="w-4 h-4" /> Add
              </Button>
            )}
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-muted-foreground text-lg">Loading stations…</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-destructive font-medium">{error}</p>
          </div>
        ) : pumps.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-block p-8 rounded-2xl bg-card/80 backdrop-blur-sm border-2 border-card-border">
              <p className="text-muted-foreground text-lg mb-4">
                No stations/departments added yet.
              </p>
              {isAdmin && (
                <Button
                  onClick={() => {
                    setEditingPump(null);
                    setShowPumpForm(true);
                  }}
                  className="bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Station/Department
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pumps.map((pump) => (
              <PumpCard
                key={pump.id}
                pump={pump}
                onViewAssets={onViewAssets}
                onEdit={(id) => {
                  if (!isAdmin) return;
                  const p = pumps.find((x) => x.id === id);
                  if (p) {
                    setEditingPump(p);
                    setShowPumpForm(true);
                  }
                }}
                onDelete={(id) => {
                  if (!isAdmin) return;
                  setDeletingPumpId(id);
                }}
              />
            ))}
          </div>
        )}
      </div>
      <PumpForm
        open={showPumpForm}
        onClose={() => {
          setShowPumpForm(false);
          setEditingPump(null);
        }}
        onSubmit={editingPump ? handleUpdatePump : handleAddPump}
        initialData={
          editingPump
            ? {
                name: editingPump.name,
                location: editingPump.location,
                manager: editingPump.manager,
              }
            : undefined
        }
        title={editingPump ? "Edit Station" : "Add Station/Department"}
      />
      <DeleteConfirmDialog
        open={deletingPumpId !== null}
        onClose={() => setDeletingPumpId(null)}
        onConfirm={handleDeletePump}
        title="Delete Station"
        description="Are you sure you want to delete this station?"
      />
    </div>
  );
}
