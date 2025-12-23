import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { useUserRole } from "@/hooks/useUserRole";
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
import PumpForm, { type PumpFormData } from "@/components/PumpForm";
import { Printer, Plus } from "lucide-react";

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

type Department = {
  id: number;
  name: string;
  manager: string;
  employeeCount?: number;
  totalAssetValue?: number;
};

export default function AllStationsPage() {
  const { isAdmin, isViewingUser, isAssigningUser } = useUserRole();
  const [stations, setStations] = useState<Pump[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selected, setSelected] = useState<Pump | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [open, setOpen] = useState(false);
  const [showPumpForm, setShowPumpForm] = useState(false);
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

  // 🟢 Fetch all departments
  useEffect(() => {
    async function fetchDepartments() {
      try {
        const res = await fetch(`${API_BASE}/api/departments`, { credentials: "include" });
        const data = await res.json();
        setDepartments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching departments:", err);
      }
    }
    fetchDepartments();
  }, []);

  // 🟢 Handle URL parameters for navigation from charts
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.split('?')[1] || '');
    
    // Check for department ID
    const deptId = params.get('deptId');
    if (deptId && departments.length > 0) {
      const dept = departments.find(d => d.id === Number(deptId));
      if (dept) {
        setActiveTab("departments");
        // Department details will be handled by AllDepartmentsComponent
      }
    }
    
    // Check for tab parameter
    const tab = params.get('tab');
    if (tab === 'departments') {
      setActiveTab("departments");
    }
    
    // Check for station ID
    const stationId = params.get('stationId');
    if (stationId && stations.length > 0) {
      const station = stations.find(s => s.id === Number(stationId));
      if (station) {
        setActiveTab("stations");
        openDetails(station);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, departments]);

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
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/pumps/${selected.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
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
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/pumps/${id}`, {
        method: "DELETE",
        headers: {
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
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

  // 🖨️ Print stations or departments based on active tab
  const handlePrint = () => {
    if (activeTab === "departments") {
      // Print departments
      const html = `
        <html>
          <head>
            <title>All Departments</title>
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
            <h1>All Departments</h1>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Manager</th>
                  <th>Employees</th>
                  <th>Total Value</th>
                </tr>
              </thead>
              <tbody>
                ${departments
                  .map(
                    (d) => `
                    <tr>
                      <td>${d.id}</td>
                      <td>${d.name}</td>
                      <td>${d.manager}</td>
                      <td>${d.employeeCount || 0}</td>
                      <td>${d.totalAssetValue ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(d.totalAssetValue) : '—'}</td>
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
    } else {
      // Print stations
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
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
          <div className="space-y-2">
            <BackToDashboardButton />
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              All Stations/Departments
            </h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={handlePrint} 
              variant="outline"
              className="border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300 font-medium"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            {isAdmin && !isViewingUser && !isAssigningUser && (
              <Button 
                onClick={() => setShowPumpForm(true)} 
                className="gap-2 bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300 font-semibold"
              >
                <Plus className="w-4 h-4" />
                Add
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "stations" | "departments")} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 bg-card/80 backdrop-blur-sm border-2 border-card-border shadow-sm">
            <TabsTrigger value="stations" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Open Stations</TabsTrigger>
            <TabsTrigger value="departments" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Open Departments</TabsTrigger>
          </TabsList>

        <TabsContent value="stations">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stations.map((s) => (
          <Card
            key={s.id}
            className="group relative overflow-hidden border-2 border-card-border bg-card/80 backdrop-blur-sm hover:border-primary/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto border-2 border-card-border">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div>
            <DialogTitle className="text-2xl font-bold">
              {editMode ? "Edit Station" : "Station Details"}
            </DialogTitle>
            <DialogDescription className="text-base">
              {editMode
                ? "Update station information below."
                : "View station details."}
            </DialogDescription>
              </div>
              {!editMode && selected && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const html = `
                      <html>
                        <head>
                          <title>Station Assets - ${selected.name}</title>
                          <style>
                            body { font-family: Arial, sans-serif; margin: 20px; background: #f8f9fa; }
                            h1 { text-align: center; color: #333; }
                            h2 { color: #666; margin-top: 20px; }
                            .station-info { background: #fff; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                            .station-info p { margin: 5px 0; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #fff; }
                            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                            th { background: #f0f0f0; font-weight: bold; }
                            tr:nth-child(even) { background: #fafafa; }
                            .asset-section { margin-bottom: 30px; }
                            .asset-name { font-weight: bold; font-size: 16px; color: #333; }
                            .asset-number { color: #666; font-size: 14px; }
                          </style>
                        </head>
                        <body>
                          <h1>Station Assets Report</h1>
                          <div class="station-info">
                            <p><strong>Station Name:</strong> ${selected.name}</p>
                            <p><strong>Location:</strong> ${selected.location}</p>
                            <p><strong>Manager:</strong> ${selected.manager}</p>
                            <p><strong>Contact Number:</strong> ${selected.contact_number || "—"}</p>
                            <p><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
                          </div>
                          <h2>Assigned Assets</h2>
                          ${stationAssets.length === 0 
                            ? "<p>No assets assigned to this station.</p>"
                            : (() => {
                                const allRows: any[] = [];
                                stationAssets.forEach((asset: any) => {
                                  const stationAssignments = asset.assignments?.filter(
                                    (a: any) => a.pump_id === selected.id
                                  ) || [];
                                  
                                  stationAssignments.forEach((assignment: any) => {
                                    if (assignment.batch_allocations) {
                                      assignment.batch_allocations.forEach((alloc: any) => {
                                        const batch = alloc.batch;
                                        if (batch) {
                                          allRows.push({
                                            asset_name: asset.asset_name,
                                            asset_number: asset.asset_number || "—",
                                            batch_name: batch.batch_name || `Batch #${batch.id}`,
                                            purchase_date: batch.purchase_date,
                                            serial_number: alloc.serial_number || "—",
                                            assignment_date: assignment.assignment_date || alloc.assignment_date,
                                            value: batch.purchase_price || 0
                                          });
                                        }
                                      });
                                    }
                                  });
                                });
                                
                                if (allRows.length === 0) return "<p>No assets assigned to this station.</p>";
                                
                                // Calculate total value
                                const totalValue = allRows.reduce((sum, row) => sum + (row.value || 0), 0);
                                
                                return `
                                  <div style="margin-bottom: 16px; padding: 12px; background: #fff3e0; border: 2px solid #f97316; border-radius: 5px;">
                                    <p style="margin: 0; font-size: 16px; font-weight: bold; color: #333;">
                                      Total Value of Assigned Assets: <span style="color: #f97316;">SAR ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </p>
                                  </div>
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>Asset Name</th>
                                        <th>Asset Number</th>
                                        <th>Batch Name</th>
                                        <th>Purchase Date</th>
                                        <th>Serial Number</th>
                                        <th>Assignment Date</th>
                                        <th>Value</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      ${allRows.map((row: any) => `
                                        <tr>
                                          <td>${row.asset_name}</td>
                                          <td>${row.asset_number}</td>
                                          <td>${row.batch_name}</td>
                                          <td>${new Date(row.purchase_date).toLocaleDateString()}</td>
                                          <td>${row.serial_number}</td>
                                          <td>${row.assignment_date ? new Date(row.assignment_date).toLocaleDateString() : "—"}</td>
                                          <td>${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(row.value)}</td>
                                        </tr>
                                      `).join("")}
                                    </tbody>
                                  </table>
                                `;
                              })()
                          }
                        </body>
                      </html>`;
                    const win = window.open("", "_blank");
                    win!.document.write(html);
                    win!.document.close();
                    win!.print();
                  }}
                  className="gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
              )}
            </div>
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
                  ) : (() => {
                    // Transform station assets to grouped structure (by asset, then batch, then items)
                    const assetSummary = new Map<number, {
                      asset_id: number;
                      asset_name: string;
                      asset_number: string;
                      batches: Map<number, {
                        batch_id: number;
                        batch_name: string | null;
                        purchase_date: string | null;
                        items: any[];
                      }>;
                    }>();
                    
                    stationAssets.forEach((asset) => {
                      // Get assignments for this station
                      // Use Number() to ensure type consistency in comparison
                      const stationAssignments = asset.assignments?.filter(
                        (a: any) => Number(a.pump_id) === Number(selected?.id)
                      ) || [];
                      
                      if (stationAssignments.length === 0) return;
                      
                      const assetKey = asset.id;
                      
                      if (!assetSummary.has(assetKey)) {
                        assetSummary.set(assetKey, {
                          asset_id: asset.id,
                          asset_name: asset.asset_name,
                          asset_number: asset.asset_number || "",
                          batches: new Map(),
                        });
                      }
                      
                      const assetData = assetSummary.get(assetKey)!;
                      
                      // Collect all batch allocations for this station
                      stationAssignments.forEach((assignment: any) => {
                        // Check if batch_allocations exists and is an array with items
                        if (assignment.batch_allocations && Array.isArray(assignment.batch_allocations) && assignment.batch_allocations.length > 0) {
                          assignment.batch_allocations.forEach((alloc: any) => {
                            const batch = alloc.batch;
                            if (!batch) return;
                            
                            const batchKey = batch.id;
                            
                            if (!assetData.batches.has(batchKey)) {
                              assetData.batches.set(batchKey, {
                                batch_id: batch.id,
                                batch_name: batch.batch_name,
                                purchase_date: batch.purchase_date,
                                items: [],
                              });
                            }
                            
                            const batchData = assetData.batches.get(batchKey)!;
                            batchData.items.push({
                              id: alloc.id || `${assignment.id}_${batch.id}_${batchData.items.length}`,
                              serial_number: alloc.serial_number,
                              assignment_date: alloc.assignment_date || assignment.assignment_date || null,
                            });
                          });
                        }
                      });
                    });
                    
                    const groupedAssets = Array.from(assetSummary.values()).map(asset => ({
                      asset_id: asset.asset_id,
                      asset_name: asset.asset_name,
                      asset_number: asset.asset_number,
                      batches: Array.from(asset.batches.values()),
                    }));
                    
                    if (groupedAssets.length === 0) {
                      return <p className="text-sm text-muted-foreground">No assets assigned to this station.</p>;
                    }
                    
                    return (
                      <div className="mt-1 space-y-2 pl-2 border-l-2 border-orange-300 bg-orange-50/50 rounded-r p-2">
                        <div className="flex justify-between items-center mb-2">
                          <div className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                            Assigned Assets:
                          </div>
                          {groupedAssets.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const html = `
                                  <html>
                                    <head>
                                      <title>Station Assets - ${selected?.name}</title>
                                      <style>
                                        body { font-family: Arial, sans-serif; margin: 20px; background: #f8f9fa; }
                                        h1 { text-align: center; color: #333; }
                                        .station-info { background: #fff; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                                        .station-info p { margin: 5px 0; }
                                        table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #fff; }
                                        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                                        th { background: #f0f0f0; font-weight: bold; }
                                        tr:nth-child(even) { background: #fafafa; }
                                      </style>
                                    </head>
                                    <body>
                                      <h1>Station Assets Report</h1>
                                      <div class="station-info">
                                        <p><strong>Station Name:</strong> ${selected?.name || "—"}</p>
                                        <p><strong>Location:</strong> ${selected?.location || "—"}</p>
                                        <p><strong>Manager:</strong> ${selected?.manager || "—"}</p>
                                        <p><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
                                      </div>
                                      <h2>Assigned Assets</h2>
                                      ${(() => {
                                        // Calculate total value first
                                        const allRows: any[] = [];
                                        stationAssets.forEach((asset) => {
                                          const stationAssignments = asset.assignments?.filter(
                                            (a: any) => a.pump_id === selected?.id
                                          ) || [];
                                          
                                          stationAssignments.forEach((assignment: any) => {
                                            if (assignment.batch_allocations) {
                                              assignment.batch_allocations.forEach((alloc: any) => {
                                                const batch = alloc.batch;
                                                if (!batch) return;
                                                const value = batch.purchase_price || 0;
                                                allRows.push({
                                                  asset_name: asset.asset_name,
                                                  asset_number: asset.asset_number || "—",
                                                  batch_name: batch.batch_name || `Batch #${batch.id}`,
                                                  purchase_date: batch.purchase_date,
                                                  serial_number: alloc.serial_number || "—",
                                                  assignment_date: assignment.assignment_date || alloc.assignment_date,
                                                  value: value,
                                                });
                                              });
                                            }
                                          });
                                        });
                                        
                                        if (allRows.length === 0) return "<p>No assets assigned to this station.</p>";
                                        
                                        const totalValue = allRows.reduce((sum, row) => sum + (row.value || 0), 0);
                                        
                                        return `
                                          <div style="margin-bottom: 16px; padding: 12px; background: #fff3e0; border: 2px solid #f97316; border-radius: 5px;">
                                            <p style="margin: 0; font-size: 16px; font-weight: bold; color: #333;">
                                              Total Value of Assigned Assets: <span style="color: #f97316;">SAR ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </p>
                                          </div>
                                          <table>
                                            <thead>
                                              <tr>
                                                <th>Asset Name</th>
                                                <th>Asset Number</th>
                                                <th>Batch Name</th>
                                                <th>Purchase Date</th>
                                                <th>Serial Number</th>
                                                <th>Assignment Date</th>
                                                <th>Value</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              ${allRows.map((row: any) => `
                                                <tr>
                                                  <td>${row.asset_name}</td>
                                                  <td>${row.asset_number}</td>
                                                  <td>${row.batch_name}</td>
                                                  <td>${new Date(row.purchase_date).toLocaleDateString()}</td>
                                                  <td>${row.serial_number}</td>
                                                  <td>${row.assignment_date ? new Date(row.assignment_date).toLocaleDateString() : "—"}</td>
                                                  <td>${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(row.value)}</td>
                                                </tr>
                                              `).join("")}
                                            </tbody>
                                          </table>
                                        `;
                                      })()}
                                    </body>
                                  </html>`;
                                const win = window.open("", "_blank");
                                win!.document.write(html);
                                win!.document.close();
                                win!.print();
                              }}
                              className="h-6 px-2 text-xs gap-1"
                            >
                              <Printer className="w-3 h-3" />
                              Print
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {groupedAssets.map((asset) => (
                            <div key={asset.asset_id} className="text-sm">
                              <div className="font-semibold text-foreground mb-1">
                                {asset.asset_name} <span className="text-muted-foreground font-normal">({asset.asset_number})</span>
                              </div>
                              <div className="ml-2 space-y-2">
                                {asset.batches.map((batch) => (
                                  <div key={batch.batch_id} className="text-xs space-y-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-medium">
                                        Batch: {batch.batch_name || `#${batch.batch_id}`}
                                      </span>
                                      {batch.purchase_date && (
                                        <span className="text-muted-foreground">
                                          Purchase: {new Date(batch.purchase_date).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                    {batch.items && batch.items.length > 0 && (
                                      <div className="ml-2 space-y-1">
                                        {batch.items.map((item: any, idx: number) => (
                                          <div key={item.id || idx} className="flex flex-wrap items-center gap-1.5">
                                            {item.serial_number && (
                                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-green-100 text-green-800 font-medium">
                                                Serial #: {item.serial_number}
                                              </span>
                                            )}
                                            {item.assignment_date && (
                                              <span className="text-muted-foreground">
                                                Assigned: {new Date(item.assignment_date).toLocaleDateString()}
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="col-span-2 flex justify-between mt-4">
                {!editMode ? (
                  <>
                    {isAdmin && !isViewingUser && !isAssigningUser && (
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
                    )}
                  </>
                ) : (
                  <>
                    {isAdmin && !isViewingUser && !isAssigningUser && (
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
                  </>
                )}
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <PumpForm
        open={showPumpForm}
        onClose={() => setShowPumpForm(false)}
        onSuccess={async () => {
          // Refresh stations list
          try {
            const res = await fetch(`${API_BASE}/api/pumps`, { credentials: "include" });
            const data = await res.json();
            setStations(Array.isArray(data) ? data : []);
            setShowPumpForm(false);
            alert("✅ Station/Department added successfully!");
          } catch (err) {
            console.error("Error refreshing stations:", err);
          }
        }}
        title="Add Station/Department"
      />
      </div>
    </div>
  );
}
