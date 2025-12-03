import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/lib/api";
import {
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from "@/components/ui/table";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import BackToDashboardButton from "@/components/BackToDashboardButton";
import type { Asset } from "@/components/AssetTable";
import ViewBatchesModal from "@/components/ViewBatchesModal";
import { Trash2 } from "lucide-react";

type AssetRow = Asset & {
  asset_value?: number | null;
  category_id?: string | null;
  categoryName?: string | null;
};

type Pump = { id: number; name: string };
type Category = { id: string; name: string };
type Employee = { id: number; name: string; employee_id?: string | null };

type AssignmentDraft = {
  id?: number;
  pump_id: number | null;
  quantity: number | null;
  batch_id: number | null; // Selected batch for this assignment
};

type EmployeeAssignmentDraft = {
  id?: number;
  employee_id: number | null;
  quantity: number | null;
  batch_id: number | null;
  assignment_date: string | null;
};

const sanitizeAssignmentDrafts = (rows: AssignmentDraft[]) =>
  rows
    .filter(
      (row) =>
        row.pump_id != null &&
        row.quantity != null &&
        Number(row.quantity) > 0 &&
        row.batch_id != null // Require batch selection
    )
    .map((row) => ({
      pump_id: row.pump_id!,
      quantity: Number(row.quantity),
      batch_id: row.batch_id!,
      id: row.id,
    }));

const draftTotalQuantity = (rows: AssignmentDraft[]) =>
  rows.reduce((sum, row) => sum + (row.quantity ? Number(row.quantity) : 0), 0);

const buildAssetPayload = (asset: AssetRow) => ({
  asset_name: asset.asset_name,
  asset_number: asset.asset_number,
  quantity: asset.quantity,
  units: asset.units,
  remarks: asset.remarks,
  category_id: asset.category_id,
  asset_value: asset.asset_value,
  assignments: sanitizeAssignmentDrafts(
    (asset.assignments || []).map((assignment) => ({
      id: assignment.id,
      pump_id: assignment.pump_id,
      quantity: assignment.quantity,
    }))
  ),
});

export default function AllAssetsPage() {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [selected, setSelected] = useState<AssetRow | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [open, setOpen] = useState(false);
  const detailNumericFields = useMemo(() => new Set(["quantity", "asset_value"]), []);
  const detailReadOnlyFields = useMemo(() => new Set(["categoryName"]), []);

  // Assign modal state
  const [assignOpen, setAssignOpen] = useState(false);
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [assignCatId, setAssignCatId] = useState<string>("none");
  const [assignmentRows, setAssignmentRows] = useState<AssignmentDraft[]>([]);
  const [assignmentError, setAssignmentError] = useState<string>("");
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  
  // Employee assign modal state
  const [employeeAssignOpen, setEmployeeAssignOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeAssignmentRows, setEmployeeAssignmentRows] = useState<EmployeeAssignmentDraft[]>([]);
  const [employeeAssignmentError, setEmployeeAssignmentError] = useState<string>("");
  
  // View batches modal state
  const [showViewBatches, setShowViewBatches] = useState(false);
  const [selectedAssetForBatches, setSelectedAssetForBatches] = useState<AssetRow | null>(null);
  const addAssignmentRow = () =>
    setAssignmentRows((rows) => [...rows, { pump_id: null, quantity: null, batch_id: null }]);
  const removeAssignmentRow = (index: number) =>
    setAssignmentRows((rows) => rows.filter((_, idx) => idx !== index));
  const updateAssignmentRow = (
    index: number,
    next: Partial<AssignmentDraft>
  ) => {
    setAssignmentRows((rows) =>
      rows.map((row, idx) => (idx === index ? { ...row, ...next } : row))
    );
  };

  // Employee assignment functions
  const addEmployeeAssignmentRow = () =>
    setEmployeeAssignmentRows((rows) => [...rows, { employee_id: null, quantity: null, batch_id: null, assignment_date: new Date().toISOString().split("T")[0] }]);
  const removeEmployeeAssignmentRow = (index: number) =>
    setEmployeeAssignmentRows((rows) => rows.filter((_, idx) => idx !== index));
  const updateEmployeeAssignmentRow = (
    index: number,
    next: Partial<EmployeeAssignmentDraft>
  ) => {
    setEmployeeAssignmentRows((rows) =>
      rows.map((row, idx) => (idx === index ? { ...row, ...next } : row))
    );
  };

  const totalAssignedDraft = useMemo(
    () => draftTotalQuantity(assignmentRows),
    [assignmentRows]
  );
  const remainingDraft = useMemo(() => {
    const capacity = selected?.quantity ?? 0;
    return capacity - totalAssignedDraft;
  }, [selected, totalAssignedDraft]);

  const totalInventoryValue = useMemo(
    () =>
      assets.reduce(
        (sum, asset) => sum + (asset.totalValue ?? 0),
        0
      ),
    [assets]
  );

  // 🟢 1. Calculate how much of each batch was ALREADY used by this asset 
  // before we started editing. We credit this back to "Available" capacity.
  const originalBatchUsage = useMemo(() => {
    const map = new Map<number, number>();
    if (!selected?.assignments) return map;

    selected.assignments.forEach((assign: any) => {
      // The backend returns batch_allocations inside assignments
      if (assign.batch_allocations && Array.isArray(assign.batch_allocations)) {
        assign.batch_allocations.forEach((alloc: any) => {
          const current = map.get(alloc.batch_id) || 0;
          map.set(alloc.batch_id, current + Number(alloc.quantity));
        });
      }
    });
    return map;
  }, [selected]);

  // 🟢 2. UPDATED: Validation Logic using True Limit
  useEffect(() => {
    if (!assignOpen) {
      setAssignmentError("");
      return;
    }
    
    let error = "";
    
    // Calculate requested usage per batch in the current form
    const currentDraftUsage = new Map<number, number>();

    for (const row of assignmentRows) {
      if (!row.batch_id) {
        if (row.pump_id) {
           error = "Please select a batch for all assignments.";
           break;
        }
        continue;
      }
      const current = currentDraftUsage.get(row.batch_id) || 0;
      currentDraftUsage.set(row.batch_id, current + (Number(row.quantity) || 0));
    }
    
    if (!error) {
      for (const [batchId, requestedQty] of currentDraftUsage.entries()) {
        const batch = availableBatches.find((b) => b.id === batchId);
        
        if (batch) {
          const dbRemaining = batch.remaining_quantity || 0;
          const originalUsage = originalBatchUsage.get(batchId) || 0;
          
          // ✨ Allowable = What's in DB + What we are currently holding
          const trueLimit = dbRemaining + originalUsage;

          if (requestedQty > trueLimit) {
            error = `Quantity for batch (${new Date(batch.purchase_date).toLocaleDateString()}) exceeds limit. Available: ${trueLimit} (Requested: ${requestedQty})`;
            break;
          }
        }
      }
    }
    
    if (!error && remainingDraft < 0) {
      error = "Assigned quantity exceeds available stock.";
    }
    
    setAssignmentError(error);
  }, [assignOpen, remainingDraft, assignmentRows, availableBatches, originalBatchUsage]);

  // Load all assets
  const loadAssets = async () => {
    const res = await fetch(`${API_BASE}/api/assets`, { credentials: "include" });
    const data = await res.json();
    setAssets(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadAssets();
  }, []);

  // Open asset details
  const openDetails = (asset: Asset) => {
    setSelected(asset);
    setEditMode(false);
    setOpen(true);
  };

  // Save edited asset
  const saveEdit = async () => {
    if (!selected) return;

    const payload = buildAssetPayload(selected);
    const totalAssignments = payload.assignments?.reduce(
      (sum: number, row: { quantity: number }) => sum + row.quantity,
      0
    );
    const capacity = selected.quantity ?? 0;
    if (totalAssignments && totalAssignments > capacity) {
      alert("Assigned quantity cannot exceed the available quantity.");
      return;
    }

    const res = await fetch(`${API_BASE}/api/assets/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!res.ok) return alert("Failed to update asset");
    const updated: AssetRow = await res.json();

    setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setSelected(updated);
    setEditMode(false);
    setOpen(false);
  };

  // Delete asset (stay on same page)
  const deleteAsset = async (id: number) => {
    if (!confirm("Delete this asset?")) return;
    const res = await fetch(`${API_BASE}/api/assets/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) return alert("Failed to delete");
    setAssets((prev) => prev.filter((a) => a.id !== id));
    setOpen(false);
  };

  // 🖨️ Print all assets (formatted like All Petrol Stations)
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>All Assets - Print</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              background: #fff;
            }
            h1 { text-align: center; margin-bottom: 20px; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th, td {
              border: 1px solid #ccc;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            tr:nth-child(even) {
              background-color: #fafafa;
            }
          </style>
        </head>
        <body>
          <h1>All Assets</h1>
          <h2 style="margin-top: 8px; margin-bottom: 16px; text-align: center; color: #555; font-size: 14px;">
            Total Inventory Value: ${totalInventoryValue.toLocaleString()}
          </h2>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Asset Name</th>
                <th>Asset #</th>
                <th>Barcode</th>
                <th>Quantity</th>
                <th>Units</th>
                <th>Total Value</th>
                <th>Remarks</th>
                <th>Category</th>
                <th>Station</th>
              </tr>
            </thead>
            <tbody>
              ${assets
                .map(
                  (a) => `
                  <tr>
                    <td>${a.id}</td>
                    <td>${a.asset_name ?? ""}</td>
                    <td>${a.asset_number ?? ""}</td>
                    <td>${a.barcode ?? ""}</td>
                    <td>${a.quantity ?? ""}</td>
                    <td>${a.units ?? ""}</td>
                    <td>${a.totalValue ?? 0}</td>
                    <td>${a.remarks ?? ""}</td>
                    <td>${a.categoryName ?? "-"}</td>
                    <td>${
                      a.assignments && a.assignments.length > 0
                        ? a.assignments
                            .map(
                              (as) =>
                                `${as.pump_name || `Station/Department #${as.pump_id}`}: ${as.quantity}`
                            )
                            .join("<br/>")
                        : "-"
                    }</td>
                  </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  // ---- ASSIGN MODAL ----
  const openAssign = async (asset: AssetRow) => {
    setSelected(asset);
    setAssignCatId(asset.category_id ?? "none");
    
    // Fetch batches for this asset first
    let allBatches: any[] = [];
    try {
      const batchesRes = await fetch(`${API_BASE}/api/assets/${asset.id}/batches`, { credentials: "include" });
      const batchesData = await batchesRes.json();
      allBatches = Array.isArray(batchesData) ? batchesData : [];
      setAvailableBatches(allBatches.filter((b: any) => b.remaining_quantity > 0));
    } catch (e) {
      console.error("Failed to fetch batches", e);
      setAvailableBatches([]);
    }

    // Load existing assignments with their batch allocations
    if (asset.assignments && asset.assignments.length > 0) {
      // For each assignment, get the batch_id from batch_allocations
      // If an assignment has multiple batch allocations, we'll use the first one
      const assignmentRowsWithBatches = asset.assignments.map((assignment: any) => {
        let batchId: number | null = null;
        
        // Check if assignment has batch_allocations
        if (assignment.batch_allocations && assignment.batch_allocations.length > 0) {
          // Use the first batch allocation's batch_id
          batchId = assignment.batch_allocations[0].batch_id;
        }
        
        return {
          id: assignment.id,
          pump_id: assignment.pump_id,
          quantity: assignment.quantity,
          batch_id: batchId,
        };
      });
      
      setAssignmentRows(assignmentRowsWithBatches);
    } else {
      setAssignmentRows([{ pump_id: null, quantity: null, batch_id: null }]);
    }
    
    setAssignmentError("");

    // Fetch dropdowns (cached)
    if (pumps.length === 0) {
      const r = await fetch(`${API_BASE}/api/pumps`, { credentials: "include" });
      setPumps(await r.json());
    }
    if (cats.length === 0) {
      const r2 = await fetch(`${API_BASE}/api/categories`, { credentials: "include" });
      setCats(await r2.json());
    }
    setAssignOpen(true);
  };

  const saveAssign = async () => {
    if (!selected) return;

    const payload = {
      category_id: assignCatId === "none" ? null : assignCatId,
      assignments: sanitizeAssignmentDrafts(assignmentRows),
    };

    if (
      payload.assignments.length > 0 &&
      (!selected.quantity || selected.quantity <= 0)
    ) {
      alert("Please set a total quantity for the asset before assigning.");
      return;
    }

    if (assignmentError) return;

    const res = await fetch(`${API_BASE}/api/assets/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) return alert("Failed to assign");
    const updated: AssetRow = await res.json();

    setAssets((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
    setSelected(updated);
    setAssignOpen(false);
  };

  // ---- EMPLOYEE ASSIGN MODAL ----
  const openEmployeeAssign = async (asset: AssetRow) => {
    setSelected(asset);
    
    // Fetch batches for this asset
    let allBatches: any[] = [];
    try {
      const batchesRes = await fetch(`${API_BASE}/api/assets/${asset.id}/batches`, { credentials: "include" });
      const batchesData = await batchesRes.json();
      allBatches = Array.isArray(batchesData) ? batchesData : [];
      setAvailableBatches(allBatches.filter((b: any) => b.remaining_quantity > 0));
    } catch (e) {
      console.error("Failed to fetch batches", e);
      setAvailableBatches([]);
    }
    
    // Initialize with one empty row
    setEmployeeAssignmentRows([{ employee_id: null, quantity: null, batch_id: null, assignment_date: new Date().toISOString().split("T")[0] }]);
    setEmployeeAssignmentError("");

    // Fetch employees
    if (employees.length === 0) {
      try {
        const r = await fetch(`${API_BASE}/api/employees`, { credentials: "include" });
        const data = await r.json();
        setEmployees(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load employees", e);
      }
    }
    setEmployeeAssignOpen(true);
  };

  // Validation for employee assignments
  useEffect(() => {
    if (!employeeAssignOpen) {
      setEmployeeAssignmentError("");
      return;
    }
    
    let error = "";
    
    // Calculate requested usage per batch
    const currentDraftUsage = new Map<number, number>();
    for (const row of employeeAssignmentRows) {
      if (!row.batch_id) {
        if (row.employee_id) {
          error = "Please select a batch for all assignments.";
          break;
        }
        continue;
      }
      const current = currentDraftUsage.get(row.batch_id) || 0;
      currentDraftUsage.set(row.batch_id, current + (Number(row.quantity) || 0));
    }
    
    if (!error) {
      for (const [batchId, requestedQty] of currentDraftUsage.entries()) {
        const batch = availableBatches.find((b) => b.id === batchId);
        if (batch && requestedQty > batch.remaining_quantity) {
          error = `Quantity for batch exceeds limit. Available: ${batch.remaining_quantity} (Requested: ${requestedQty})`;
          break;
        }
      }
    }
    
    setEmployeeAssignmentError(error);
  }, [employeeAssignOpen, employeeAssignmentRows, availableBatches]);

  const saveEmployeeAssign = async () => {
    if (!selected) return;
    if (employeeAssignmentError) return;

    // Save each employee assignment
    const validRows = employeeAssignmentRows.filter(
      (row) => row.employee_id != null && row.batch_id != null && row.quantity != null && Number(row.quantity) > 0
    );

    if (validRows.length === 0) {
      alert("Please add at least one employee assignment.");
      return;
    }

    try {
      for (const row of validRows) {
        const res = await fetch(`${API_BASE}/api/employees/${row.employee_id}/assignments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            batch_id: row.batch_id,
            quantity: Number(row.quantity),
            assignment_date: row.assignment_date || new Date().toISOString(),
          }),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to assign to employee");
        }
      }

      // Reload assets to refresh data
      await loadAssets();
      setEmployeeAssignOpen(false);
      alert("✅ Assets assigned to employees successfully!");
    } catch (err: any) {
      alert(err?.message || "Error assigning assets to employees");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
        <BackToDashboardButton />
        <div className="w-full sm:w-auto">
          <h1 className="text-2xl sm:text-3xl font-bold">All Assets</h1>
          <p className="text-sm text-black">
            Total inventory value:{" "}
            <span className="font-semibold">
              {totalInventoryValue.toLocaleString()}
            </span>
          </p>
        </div>
        <Button 
          onClick={handlePrint} 
          variant="outline"
          className="bg-white/60 backdrop-blur-md hover:bg-white/80 w-full sm:w-auto shrink-0"
        >
          🖨️ Print
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg shadow-md bg-white/60 backdrop-blur-md -mx-3 sm:mx-0">
        <Table className="w-full min-w-[900px] sm:min-w-0">
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Asset Name</TableHead>
              <TableHead>Asset #</TableHead>
              <TableHead>Total Value</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Station</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((a) => (
              <TableRow key={a.id} className="hover:bg-white/80 transition">
                <TableCell>{a.id}</TableCell>
                <TableCell>{a.asset_name}</TableCell>
                <TableCell>{a.asset_number}</TableCell>
                <TableCell>{a.totalValue ?? 0}</TableCell>
                <TableCell>{a.categoryName ?? "-"}</TableCell>
                <TableCell>
                  {a.assignments && a.assignments.length > 0 ? (
                    <div className="flex flex-col text-sm text-muted-foreground">
                      {a.assignments.slice(0, 2).map((assignment) => (
                        <span key={assignment.id}>
                          {assignment.pump_name || `Station/Department #${assignment.pump_id}`} ·{" "}
                          {assignment.quantity}
                        </span>
                      ))}
                      {a.assignments.length > 2 && (
                        <span>+{a.assignments.length - 2} more</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setSelectedAssetForBatches(a);
                        setShowViewBatches(true);
                      }} 
                      className="text-xs"
                      title="View Purchase Batches"
                    >
                      Batches
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openDetails(a)} className="text-xs">Details</Button>
                    <Button variant="outline" size="sm" onClick={() => openAssign(a)} className="text-xs">Assign</Button>
                    <Button variant="outline" size="sm" onClick={() => openEmployeeAssign(a)} className="text-xs">Assign to Employee</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* DETAILS dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? "Edit Asset" : "Asset Details"}</DialogTitle>
            <DialogDescription>
              {editMode ? "Update asset information and save changes." : "View detailed information about this asset."}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <>
              <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={(e) => e.preventDefault()}>
                {(
                  [
                    ["asset_name", "Asset Name"],
                    ["asset_number", "Asset #"],
                    ["serial_number", "Serial #"],
                    ["barcode", "Barcode"],
                    ["quantity", "Quantity"],
                    ["units", "Units"],
                    ["categoryName", "Category"],
                    ["asset_value", "Unit Value"],
                  ] as const
                ).map(([key, label]) => {
                  const keyName = key as string;
                  const isNumeric = detailNumericFields.has(keyName);
                  const isReadOnly = detailReadOnlyFields.has(keyName);
                  return (
                    <div className="col-span-1 sm:col-span-1" key={key}>
                      <Label>{label}</Label>
                      <Input
                        type={isNumeric ? "number" : "text"}
                        value={(selected as any)[key] ?? ""}
                        disabled={!editMode || isReadOnly}
                        onChange={
                          isReadOnly
                            ? undefined
                            : (e) => {
                                const nextValue = isNumeric
                                  ? e.target.value === ""
                                    ? null
                                    : Number(e.target.value)
                                  : e.target.value;
                                setSelected({ ...selected, [key]: nextValue });
                              }
                        }
                      />
                    </div>
                  );
                })}
                <div className="col-span-1 sm:col-span-2">
                  <Label>Remarks</Label>
                  <div className="border rounded-md p-2 text-sm text-muted-foreground min-h-[44px]">
                    {selected.remarks && selected.remarks.trim().length > 0
                      ? selected.remarks
                      : "—"}
                  </div>
                </div>

                <div className="col-span-1 sm:col-span-2 flex flex-col-reverse sm:flex-row justify-between gap-2 mt-4">
                  {!editMode ? (
                    <>
                      <Button type="button" variant="outline" onClick={() => setEditMode(true)} className="w-full sm:w-auto">✏️ Edit</Button>
                      <Button type="button" variant="destructive" onClick={() => deleteAsset(selected.id)} className="w-full sm:w-auto">🗑️ Delete</Button>
                    </>
                  ) : (
                    <>
                      <Button type="button" variant="outline" onClick={() => setEditMode(false)} className="w-full sm:w-auto">Cancel</Button>
                      <Button type="button" onClick={saveEdit} className="w-full sm:w-auto">💾 Save</Button>
                    </>
                  )}
                </div>
              </form>

              {/* Show Batches Section */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-3">Purchase Batches</h3>
                {selected.batches && selected.batches.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-10 gap-2 text-xs font-semibold text-muted-foreground pb-2 border-b">
                      <div>Name</div>
                      <div>Date</div>
                      <div>Serial #</div>
                      <div>Barcode</div>
                      <div>Price</div>
                      <div>Quantity</div>
                      <div>Remaining</div>
                      <div>Remarks</div>
                      <div>Value</div>
                      <div className="text-right">Action</div>
                    </div>
                    {selected.batches.map((batch: any) => {
                      const used = batch.quantity - batch.remaining_quantity;
                      const batchValue = batch.quantity * batch.purchase_price;
                      const remainingValue = batch.remaining_quantity * batch.purchase_price;
                      const canDelete = batch.remaining_quantity === batch.quantity; // Only if unused
                      return (
                        <div key={batch.id} className="grid grid-cols-10 gap-2 text-sm py-2 border-b items-center">
                          <div className="font-semibold">{batch.batch_name ?? "—"}</div>
                          <div className="font-mono text-xs">{new Date(batch.purchase_date).toLocaleDateString()}</div>
                          <div className="font-mono text-xs">{batch.serial_number ?? "—"}</div>
                          <div className="font-mono text-xs">{batch.barcode ?? "—"}</div>
                          <div className="font-semibold">{batch.purchase_price.toLocaleString()}</div>
                          <div>{batch.quantity}</div>
                          <div className={batch.remaining_quantity === 0 ? "text-muted-foreground" : ""}>{batch.remaining_quantity}</div>
                          <div className="text-sm text-muted-foreground truncate">{batch.remarks ?? "—"}</div>
                          <div>
                            <div className="font-semibold">{batchValue.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">
                              Used: {used} · Remaining Value: {remainingValue.toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                if (!confirm("Are you sure you want to delete this batch? This cannot be undone.")) {
                                  return;
                                }
                                
                                if (!canDelete) {
                                  alert("You can only delete batches that haven't been used (remaining quantity equals total quantity).");
                                  return;
                                }

                                try {
                                  const res = await fetch(`${API_BASE}/api/assets/${selected.id}/batches/${batch.id}`, {
                                    method: "DELETE",
                                    credentials: "include",
                                  });

                                  if (!res.ok) {
                                    const errorData = await res.json().catch(() => ({}));
                                    throw new Error(errorData.message || "Failed to delete batch");
                                  }

                                  // Reload assets to refresh the data
                                  await loadAssets();
                                  // Update selected asset
                                  const updatedAsset = assets.find((a) => a.id === selected.id);
                                  if (updatedAsset) {
                                    setSelected(updatedAsset);
                                  }
                                } catch (err: any) {
                                  alert(err?.message || "Error deleting batch");
                                }
                              }}
                              disabled={!canDelete}
                              title={canDelete ? "Delete batch" : "Cannot delete used batch"}
                              className="h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No purchase batches found for this asset.</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ASSIGN dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Asset</DialogTitle>
            <DialogDescription>
              Assign assets from specific batches to stations. Each assignment must specify which batch to use.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex-1">
                  <Label>Station Allocations</Label>
                  <p className="text-xs text-muted-foreground">
                    Assign quantities to one or more Stations/Departments.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addAssignmentRow} className="shrink-0">
                  Add Station
                </Button>
              </div>

              {assignmentRows.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No stations selected. Asset will remain unassigned.
                </p>
              )}

              {assignmentRows.map((row, index) => {
                const selectedBatch = availableBatches.find((b) => b.id === row.batch_id);
                // 🟢 3. UPDATED: UI shows correct limit including what is currently used
                let maxQuantity = 0;
                if (selectedBatch) {
                  const dbRemaining = selectedBatch.remaining_quantity || 0;
                  const originalUsage = originalBatchUsage.get(selectedBatch.id) || 0;
                  maxQuantity = dbRemaining + originalUsage;
                }

                return (
                  <div key={index} className="space-y-2 p-3 border rounded-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs uppercase tracking-wide">Station/Department</Label>
                        <Select
                          value={row.pump_id?.toString() ?? "none"}
                          onValueChange={(val) =>
                            updateAssignmentRow(index, {
                              pump_id: val === "none" ? null : Number(val),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Station/Department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {pumps.map((p) => (
                              <SelectItem key={p.id} value={p.id.toString()}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wide">Batch</Label>
                        <Select
                          value={row.batch_id?.toString() ?? "none"}
                          onValueChange={(val) =>
                            updateAssignmentRow(index, {
                              batch_id: val === "none" ? null : Number(val),
                              quantity: null, // Reset quantity when batch changes
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Batch" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select Batch</SelectItem>
                            {availableBatches.map((batch) => (
                              <SelectItem key={batch.id} value={batch.id.toString()}>
                                {batch.batch_name || "Unnamed"} - {new Date(batch.purchase_date).toLocaleDateString()} ({batch.remaining_quantity} available)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <Label className="text-xs uppercase tracking-wide">Quantity</Label>
                        <Input
                          type="number"
                          min={1}
                          max={maxQuantity}
                          value={row.quantity ?? ""}
                          onChange={(e) =>
                            updateAssignmentRow(index, {
                              quantity:
                                e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                          disabled={!row.batch_id}
                        />
                        {selectedBatch && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Max: {maxQuantity} available
                          </p>
                        )}
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => removeAssignmentRow(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="text-sm">
                <span>Total assigned: </span>
                <span className="font-semibold">{totalAssignedDraft}</span>
                <span className="ml-3">Remaining: </span>
                <span
                  className={`font-semibold ${
                    remainingDraft < 0 ? "text-destructive" : ""
                  }`}
                >
                  {remainingDraft}
                </span>
              </div>
              {assignmentError && (
                <p className="text-sm text-destructive">{assignmentError}</p>
              )}
            </div>

            <div>
              <Label>Category</Label>
              <Select value={assignCatId || "none"} onValueChange={setAssignCatId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {cats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-2">
              <Button variant="outline" onClick={() => setAssignOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={saveAssign} disabled={!!assignmentError} className="w-full sm:w-auto">
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* EMPLOYEE ASSIGN dialog */}
      <Dialog open={employeeAssignOpen} onOpenChange={setEmployeeAssignOpen}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Asset to Employee</DialogTitle>
            <DialogDescription>
              Assign assets from specific batches to employees. Each assignment must specify which batch to use.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex-1">
                  <Label>Employee Assignments</Label>
                  <p className="text-xs text-muted-foreground">
                    Assign quantities to one or more employees.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addEmployeeAssignmentRow} className="shrink-0">
                  Add Employee
                </Button>
              </div>

              {employeeAssignmentRows.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No employees selected. Click "Add Employee" to assign assets.
                </p>
              )}

              {employeeAssignmentRows.map((row, index) => {
                const selectedBatch = availableBatches.find((b) => b.id === row.batch_id);
                const maxQuantity = selectedBatch?.remaining_quantity || 0;

                return (
                  <div key={index} className="space-y-2 p-3 border rounded-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs uppercase tracking-wide">Employee</Label>
                        <Select
                          value={row.employee_id?.toString() ?? "none"}
                          onValueChange={(val) =>
                            updateEmployeeAssignmentRow(index, {
                              employee_id: val === "none" ? null : Number(val),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Employee" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select Employee</SelectItem>
                            {employees.map((e) => (
                              <SelectItem key={e.id} value={e.id.toString()}>
                                {e.name} {e.employee_id ? `(${e.employee_id})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wide">Batch</Label>
                        <Select
                          value={row.batch_id?.toString() ?? "none"}
                          onValueChange={(val) =>
                            updateEmployeeAssignmentRow(index, {
                              batch_id: val === "none" ? null : Number(val),
                              quantity: null, // Reset quantity when batch changes
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Batch" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select Batch</SelectItem>
                            {availableBatches.map((batch) => (
                              <SelectItem key={batch.id} value={batch.id.toString()}>
                                {batch.batch_name || "Unnamed"} - {new Date(batch.purchase_date).toLocaleDateString()} ({batch.remaining_quantity} available)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs uppercase tracking-wide">Quantity</Label>
                        <Input
                          type="number"
                          min={1}
                          max={maxQuantity}
                          value={row.quantity ?? ""}
                          onChange={(e) =>
                            updateEmployeeAssignmentRow(index, {
                              quantity:
                                e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                          disabled={!row.batch_id}
                        />
                        {selectedBatch && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Max: {maxQuantity} available
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wide">Assignment Date</Label>
                        <Input
                          type="date"
                          value={row.assignment_date ?? new Date().toISOString().split("T")[0]}
                          onChange={(e) =>
                            updateEmployeeAssignmentRow(index, {
                              assignment_date: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => removeEmployeeAssignmentRow(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {employeeAssignmentError && (
                <p className="text-sm text-destructive">{employeeAssignmentError}</p>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-2">
              <Button variant="outline" onClick={() => setEmployeeAssignOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={saveEmployeeAssign} disabled={!!employeeAssignmentError} className="w-full sm:w-auto">
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Batches Modal */}
      <ViewBatchesModal
        open={showViewBatches}
        onClose={() => {
          setShowViewBatches(false);
          setSelectedAssetForBatches(null);
        }}
        assetId={selectedAssetForBatches?.id || 0}
        assetName={selectedAssetForBatches?.asset_name || ""}
        onRefresh={loadAssets}
      />
    </div>
  );
}