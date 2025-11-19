// pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import PumpCard, { type Pump } from "../components/PumpCard";
import PumpForm, { type PumpFormData } from "../components/PumpForm";
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
      const res = await fetch(`${API_BASE}/api/pumps`);
      if (!res.ok) throw new Error("Failed to fetch pumps");
      const data = await res.json();
      setPumps(data);
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
      const res = await fetch(`${API_BASE}/api/pumps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add pump");
      const newPump = await res.json();
      setPumps((prev) => [newPump, ...prev]);
      setShowPumpForm(false);
    } catch (err) {
      console.error(err);
      alert("Error adding pump");
    }
  };

  const handleUpdatePump = async (data: PumpFormData) => {
    if (!editingPump) return;
    try {
      const res = await fetch(`${API_BASE}/api/pumps/${editingPump.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update pump");
      setPumps((prev) =>
        prev.map((p) =>
          p.id === editingPump.id ? { ...p, ...data } : p
        )
      );
      setEditingPump(null);
      setShowPumpForm(false);
    } catch (err) {
      console.error(err);
      alert("Error updating pump");
    }
  };

  const handleDeletePump = async () => {
    if (!deletingPumpId) return;
    try {
      const res = await fetch(`${API_BASE}/api/pumps/${deletingPumpId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete pump");
      setPumps((prev) => prev.filter((p) => p.id !== deletingPumpId));
      setDeletingPumpId(null);
    } catch (err) {
      console.error(err);
      alert("Error deleting pump");
    }
  };

  return (
    <div className="min-h-screen bg-white/60 dark:bg-black/40">
      <PrintPumps pumps={pumps} />
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 no-print">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Petrol Pump Stations</h1>
            <p className="text-muted-foreground mt-1">
              Manage your petrol pump stations and their assets
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => window.print()} className="gap-2">
              <Printer className="w-4 h-4" /> Print
            </Button>
            <Button variant="outline" className="gap-2">
              <FileDown className="w-4 h-4" /> Export
            </Button>
            <Button
              onClick={() => {
                setEditingPump(null);
                setShowPumpForm(true);
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" /> Add Pump
            </Button>
          </div>
        </div>
        {loading ? (
          <div className="text-muted-foreground">Loading pumps…</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : pumps.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">
              No petrol pumps added yet. Click “Add Pump” to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pumps.map((pump) => (
              <PumpCard
                key={pump.id}
                pump={pump}
                onViewAssets={onViewAssets}
                onEdit={(id) => {
                  const p = pumps.find((x) => x.id === id);
                  if (p) {
                    setEditingPump(p);
                    setShowPumpForm(true);
                  }
                }}
                onDelete={(id) => setDeletingPumpId(id)}
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
        title={editingPump ? "Edit Petrol Pump" : "Add Petrol Pump"}
      />
      <DeleteConfirmDialog
        open={deletingPumpId !== null}
        onClose={() => setDeletingPumpId(null)}
        onConfirm={handleDeletePump}
        title="Delete Pump Station"
        description="Are you sure you want to delete this pump station?"
      />
    </div>
  );
}
