// pages/Assets.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import AssetTable, { type Asset } from "@/components/AssetTable";
import AssetForm, { type AssetFormData } from "@/components/AssetForm";
import BarcodeScannerModal from "../components/BarcodeScannerModal";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import PrintAssets from "@/components/PrintAssets";
import BackToDashboardButton from "@/components/BackToDashboardButton";
import { useUserRole } from "@/hooks/useUserRole";
import { ArrowLeft, Plus, Printer, FileDown, RotateCcw, PackagePlus } from "lucide-react";
import { API_BASE } from "@/lib/api";
import AddBatchModal from "@/components/AddBatchModal";
import ViewBatchesModal from "@/components/ViewBatchesModal";

interface AssetsProps {
  pump_id: number | null;
  onBack: () => void;
}

export default function Assets({ pump_id, onBack }: AssetsProps) {
  const { isAdmin } = useUserRole();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [deletingAssetId, setDeletingAssetId] = useState<number | null>(null);
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [selectedAssetForBatch, setSelectedAssetForBatch] = useState<Asset | null>(null);
  const [showViewBatches, setShowViewBatches] = useState(false);
  const [selectedAssetForViewBatches, setSelectedAssetForViewBatches] = useState<Asset | null>(null);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const url = new URL(`${API_BASE}/api/assets`);
      if (pump_id != null) {
        url.searchParams.set("pump_id", pump_id.toString());
      }
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch assets");
      const data = await res.json();
      setAssets(data);
    } catch (err) {
      console.error("Error loading assets:", err);
      setError("Failed to load assets. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [pump_id]);

  // --- helpers: map payload names to backend expectations ---
  const toNum = (v: any) =>
    v === "" || v === null || v === undefined ? null : Number(v);
  const toNull = (v: any) => (v === "" || v === undefined ? null : v);
  const trimOrEmpty = (v: any) => (typeof v === "string" ? v.trim() : v);

  const buildAssetPayload = (data: AssetFormData) => ({
    asset_name: trimOrEmpty(data.asset_name ?? ""),
    asset_number: trimOrEmpty(data.asset_number ?? ""),
    units: toNull(data.units),
    category_id: toNull(data.category_id),
  });

  const handleAddAsset = async (data: AssetFormData) => {
    try {
      const payload = buildAssetPayload(data);
      if (!payload.asset_name || !payload.asset_number)
        throw new Error("Asset name and asset number are required.");
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
      const newAsset = await res.json();
      setAssets((p) => [newAsset, ...p]);
      setShowForm(false);
    } catch (err: any) {
      alert(err?.message || "Error adding asset");
    }
  };

  const handleUpdateAsset = async (data: AssetFormData) => {
    if (!editingAsset) return;
    try {
      const payload = buildAssetPayload(data);
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/assets/${editingAsset.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setAssets((p) => p.map((a) => (a.id === updated.id ? updated : a)));
      setEditingAsset(null);
      setShowForm(false);
    } catch (err: any) {
      alert(err?.message || "Error updating asset");
    }
  };

  const handleDeleteAsset = async () => {
    if (!deletingAssetId) return;
    try {
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/assets/${deletingAssetId}`, {
        method: "DELETE",
        headers: {
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete asset");
      setAssets((p) => p.filter((a) => a.id !== deletingAssetId));
      setDeletingAssetId(null);
    } catch {
      alert("Error deleting asset");
    }
  };

  const handleScan = (barcode: string) => {
    setShowScanner(false);
    const found = assets.find((a) => a.barcode === barcode);
    alert(found ? `Asset Found: ${found.asset_name}` : "No asset found");
  };

  const assetsForView = useMemo(() => {
    if (pump_id == null) return assets;
    return assets
      .map((asset) => {
        const scopedAssignments = (asset.assignments || []).filter(
          (assignment) => assignment.pump_id === pump_id
        );
        if (scopedAssignments.length === 0) return null;
        const scopedTotal = scopedAssignments.reduce(
          (sum, assignment) => sum + (assignment.quantity || 0),
          0
        );
        const totalAssignedValue = scopedAssignments.reduce(
          (sum, assignment) =>
            sum + (assignment.assignment_value ?? 0),
          0
        );
        const remaining =
          asset.quantity == null
            ? null
            : Math.max((asset.quantity || 0) - scopedTotal, 0);
        const remainingValue =
          remaining == null
            ? null
            : remaining * (asset.asset_value ?? 0);
        return {
          ...asset,
          assignments: scopedAssignments,
          totalAssigned: scopedTotal,
          totalAssignedValue,
          remainingQuantity: remaining,
          remainingValue,
        };
      })
      .filter(Boolean) as Asset[];
  }, [assets, pump_id]);

  const totalValueForView = useMemo(() => {
    return assetsForView.reduce((sum, asset) => {
      const value =
        pump_id == null
          ? asset.totalValue ?? 0
          : asset.totalAssignedValue ?? 0;
      return sum + (value || 0);
    }, 0);
  }, [assetsForView, pump_id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <PrintAssets assets={assetsForView} />
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 no-print">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3 flex-wrap">
            {pump_id ? (
              <Button 
                variant="outline" 
                onClick={onBack} 
                className="gap-2 shrink-0 border-2 border-border/50 hover:border-primary/50 bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            ) : (
              <BackToDashboardButton />
            )}
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Assets
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">Complete asset inventory</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:items-end w-full sm:w-auto">
            <div className="px-4 py-2 rounded-xl bg-primary/10 border-2 border-primary/20">
              <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                Total Value
              </div>
              <div className="text-2xl font-bold text-primary">
                SAR {totalValueForView.toLocaleString()}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline" 
                onClick={() => window.print()} 
                className="gap-2 border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Print</span>
              </Button>
              <Button 
                variant="outline" 
                className="gap-2 border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <FileDown className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowScanner(true)} 
                className="gap-2 border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <RotateCcw className="w-4 h-4" /> <span className="hidden sm:inline">Scan</span>
              </Button>
              {isAdmin && (
                <Button 
                  onClick={() => setShowForm(true)} 
                  className="gap-2 bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300 font-semibold"
                >
                  <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-muted-foreground">Loading assets…</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : assets.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No assets found.</div>
        ) : (
          <AssetTable
            assets={assetsForView}
            mode={pump_id == null ? "global" : "station"}
            onEdit={(id) => {
              if (!isAdmin) return;
              const a = assets.find((x) => x.id === id);
              if (a) {
                setEditingAsset(a);
                setShowForm(true);
              }
            }}
            onDelete={(id) => {
              if (!isAdmin) return;
              setDeletingAssetId(id);
            }}
            onAddInventory={(id) => {
              if (!isAdmin) return;
              const a = assets.find((x) => x.id === id);
              if (a) {
                setSelectedAssetForBatch(a);
                setShowAddBatch(true);
              }
            }}
            onViewBatches={(id) => {
              const a = assets.find((x) => x.id === id);
              if (a) {
                setSelectedAssetForViewBatches(a);
                setShowViewBatches(true);
              }
            }}
          />
        )}
      </div>

      <AssetForm
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingAsset(null);
        }}
        onSubmit={editingAsset ? handleUpdateAsset : handleAddAsset}
        title={editingAsset ? "Edit Asset" : "Add Asset"}
        initialData={editingAsset ?? undefined}
      />

      <BarcodeScannerModal
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
      />

      <DeleteConfirmDialog
        open={!!deletingAssetId}
        onClose={() => setDeletingAssetId(null)}
        onConfirm={handleDeleteAsset}
        title="Delete Asset"
        description="Are you sure you want to delete this asset?"
      />

      <AddBatchModal
        open={showAddBatch}
        onClose={() => {
          setShowAddBatch(false);
          setSelectedAssetForBatch(null);
        }}
        assetId={selectedAssetForBatch?.id || 0}
        assetName={selectedAssetForBatch?.asset_name || ""}
        onSuccess={() => {
          fetchAssets();
        }}
      />

      <ViewBatchesModal
        open={showViewBatches}
        onClose={() => {
          setShowViewBatches(false);
          setSelectedAssetForViewBatches(null);
        }}
        assetId={selectedAssetForViewBatches?.id || 0}
        assetName={selectedAssetForViewBatches?.asset_name || ""}
        onRefresh={fetchAssets}
      />
    </div>
  );
}
