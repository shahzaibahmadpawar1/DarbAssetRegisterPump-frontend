import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BackToDashboardButton from "@/components/BackToDashboardButton";
import AllDepartmentsComponent from "./AllDepartments";

type Pump = {
  id: number;
  name: string;
  location: string;
  manager: string;
  contact_number?: string | null;
  remarks?: string | null;
  assetCount: number;
  totalAssetValue?: number;
};

type StationAsset = {
  id: number;
  asset_name: string;
  asset_number: string;
  assignments: Array<{
    id: number;
    pump_id: number;
    batch_allocations: Array<{
      batch_id: number;
      batch?: {
        id: number;
        batch_name?: string;
        purchase_price: number;
        purchase_date: string;
        asset?: {
          id: number;
          asset_name: string;
        };
      };
    }>;
  }>;
};

export default function AllStationsPage() {
  const [stations, setStations] = useState<Pump[]>([]);
  const [selected, setSelected] = useState<Pump | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"stations" | "departments">("stations");
  const [stationAssets, setStationAssets] = useState<StationAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  // 🟢 Fetch all stations
  useEffect(() => {
    async function fetchStations() {
      try {
        const res = await fetch(`${API_BASE}/api/pumps`, { credentials: "include" });
        const data = await res.json();
        setStations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching stations:", err);
      }
    }
    fetchStations();
  }, []);

  // 🟢 Open modal for details/edit
  const openDetails = async (pump: Pump) => {
    setSelected(pump);
    setEditMode(false);
    setOpen(true);
    setLoadingAssets(true);
    
    // Fetch assets assigned to this station
    try {
      const res = await fetch(`${API_BASE}/api/assets?pump_id=${pump.id}`, { credentials: "include" });
      const data = await res.json();
      setStationAssets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching station assets:", err);
      setStationAssets([]);
    } finally {
      setLoadingAssets(false);
    }
  };

  // 🟢 Save edits
  const saveEdit = async () => {
    if (!selected) return;
    try {
      const payload = {
        name: selected.name,
        location: selected.location,
        manager: selected.manager,
        contact_number: selected.contact_number ?? null,
        remarks: selected.remarks ?? null,
      };
      const res = await fetch(`${API_BASE}/api/pumps/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update Station");
      const updated = await res.json();
      setStations((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEditMode(false);
      alert("✅ Station updated successfully!");
    } catch (err) {
      console.error("Update error:", err);
      alert("❌ Failed to update station");
    }
  };

  // 🗑️ Delete station
  const deleteStation = async (id: number) => {
    if (!confirm("Are you sure you want to delete this station?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/pumps/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setStations((prev) => prev.filter((s) => s.id !== id));
      setOpen(false);
      alert("🗑️ Station deleted successfully.");
    } catch (err) {
      console.error("Delete error:", err);
      alert("❌ Failed to delete station.");
    }
  };

  // 🖨️ Print all stations
  const handlePrint = () => {
    const html = `
      <html>
        <head>
          <title>All Stations</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f8f9fa; }
            h1 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background: #f0f0f0; }
            tr:nth-child(even) { background: #fafafa; }
          </style>
        </head>
        <body>
          <h1>All Stations</h1>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Location</th>
                <th>Manager</th>
                <th>Assets</th>
              </tr>
            </thead>
            <tbody>
              ${stations
                .map(
                  (s) => `
                  <tr>
                    <td>${s.id}</td>
                    <td>${s.name}</td>
                    <td>${s.location}</td>
                    <td>${s.manager}</td>
                    <td>${s.assetCount}</td>
                  </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>`;
    const win = window.open("", "_blank");
    win!.document.write(html);
    win!.document.close();
    win!.print();
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <BackToDashboardButton />
        <h1 className="text-3xl font-bold">All Stations/Departments</h1>
        <Button 
          onClick={handlePrint} 
          variant="outline"
          className="bg-white/60 backdrop-blur-md hover:bg-white/80"
        >
          🖨️ Print
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "stations" | "departments")} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="stations">Open Stations</TabsTrigger>
          <TabsTrigger value="departments">Open Departments</TabsTrigger>
        </TabsList>

        <TabsContent value="stations">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stations.map((s) => (
          <Card
            key={s.id}
            className="bg-white/60 backdrop-blur-md hover:bg-white/80 transition hover:shadow-lg"
          >
            <CardHeader>
              <div className="flex justify-between items-start">
              <CardTitle className="text-lg">{s.name}</CardTitle>
                {s.totalAssetValue !== undefined && s.totalAssetValue > 0 && (
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Total Value</div>
                    <div className="text-lg font-bold text-orange-600">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'SAR',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(s.totalAssetValue)}
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm font-semibold">Location: </span>
                <span className="text-sm text-muted-foreground">{s.location}</span>
              </div>
              <div>
                <span className="text-sm font-semibold">Manager: </span>
                <span className="text-sm text-muted-foreground">{s.manager}</span>
              </div>
              <div>
                <span className="text-sm font-semibold">Assets: </span>
                <span className="text-sm text-muted-foreground">{s.assetCount}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openDetails(s)}
                className="w-full mt-4"
              >
                Details
              </Button>
            </CardContent>
          </Card>
        ))}
          </div>
        </TabsContent>

        <TabsContent value="departments">
          <AllDepartmentsComponent />
        </TabsContent>
      </Tabs>

      {/* 🧩 Modal for Details/Edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editMode ? "Edit Station" : "Station Details"}
            </DialogTitle>
            <DialogDescription>
              {editMode
                ? "Update station information below."
                : "View station details."}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <form className="grid grid-cols-2 gap-4">
              {(
                [
                  ["name", "Station Name"],
                  ["manager", "Manager"],
                  ["location", "Location"],
                  ["contact_number", "Contact Number"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="col-span-2 sm:col-span-1">
                  <Label>{label}</Label>
                  <Input
                    value={(selected as any)[key] ?? ""}
                    disabled={!editMode}
                    onChange={(e) =>
                      setSelected({ ...selected, [key]: e.target.value })
                    }
                  />
                </div>
              ))}

              <div className="col-span-2">
                <Label>Remarks</Label>
                <Textarea
                  value={selected.remarks ?? ""}
                  disabled={!editMode}
                  onChange={(e) =>
                    setSelected({ ...selected, remarks: e.target.value })
                  }
                  rows={3}
                />
              </div>

              {/* Assets Section */}
              {!editMode && (
                <div className="col-span-2 mt-6 pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-3">Assigned Assets</h3>
                  {loadingAssets ? (
                    <p className="text-sm text-muted-foreground">Loading assets...</p>
                  ) : stationAssets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No assets assigned to this station.</p>
                  ) : (
                    <div className="space-y-4">
                      {stationAssets.map((asset) => {
                        // Get assignments for this station
                        const stationAssignments = asset.assignments?.filter(
                          (a: any) => a.pump_id === selected?.id
                        ) || [];
                        
                        if (stationAssignments.length === 0) return null;
                        
                        // Collect all batch allocations for this station
                        const batchAllocations: any[] = [];
                        stationAssignments.forEach((assignment: any) => {
                          if (assignment.batch_allocations) {
                            assignment.batch_allocations.forEach((alloc: any) => {
                              batchAllocations.push(alloc);
                            });
                          }
                        });
                        
                        return (
                          <div key={asset.id} className="border rounded-lg p-4 space-y-2">
                            <div className="font-semibold text-base">{asset.asset_name}</div>
                            <div className="text-sm text-muted-foreground">Asset #: {asset.asset_number || "—"}</div>
                            
                            {batchAllocations.length > 0 ? (
                              <div className="mt-3">
                                <div className="text-sm font-semibold mb-2">Batch Details:</div>
                                <div className="space-y-2">
                                  {batchAllocations.map((alloc: any, idx: number) => {
                                    const batch = alloc.batch;
                                    if (!batch) return null;
                                    
                                    const value = batch.purchase_price || 0;
                                    return (
                                      <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                                        <div className="flex-1">
                                          <div className="font-medium">
                                            Batch: {batch.batch_name || `Batch #${batch.id}`}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            Date: {new Date(batch.purchase_date).toLocaleDateString()}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="font-semibold text-orange-600">
                                            {new Intl.NumberFormat('en-US', {
                                              style: 'currency',
                                              currency: 'SAR',
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            }).format(value)}
                                          </div>
                                          <div className="text-xs text-muted-foreground">Qty: 1</div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground mt-2">No batch details available</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="col-span-2 flex justify-between mt-4">
                {!editMode ? (
                  <>
                    <Button type="button" variant="outline" onClick={() => setEditMode(true)}>
                      ✏️ Edit
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => deleteStation(selected.id)}
                    >
                      🗑️ Delete
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditMode(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="button" onClick={saveEdit}>💾 Save</Button>
                  </>
                )}
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
