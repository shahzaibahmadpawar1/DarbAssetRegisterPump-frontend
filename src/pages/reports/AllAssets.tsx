import { useEffect, useMemo, useState, useRef } from "react";
import { API_BASE } from "@/lib/api";
import { useUserRole } from "@/hooks/useUserRole";
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
import BarcodeScannerModal from "@/components/BarcodeScannerModal";
import { Trash2, Search, QrCode } from "lucide-react";

type AssetRow = Asset & {
  asset_value?: number | null;
  category_id?: string | null;
  categoryName?: string | null;
};

type Pump = { id: number; name: string };
type Category = { id: string; name: string };
type Employee = { id: number; name: string; employee_id?: string | null };

type AssignmentItem = {
  batch_id: number;
  serial_number?: string;
  barcode?: string;
};

type AssignmentDraft = {
  id?: number;
  pump_id: number | null;
  items: AssignmentItem[]; // Array of items with batch_id, serial_number, barcode
};

type EmployeeAssignmentItem = {
  batch_id: number;
  serial_number?: string;
  barcode?: string;
};

type EmployeeAssignmentDraft = {
  id?: number;
  employee_id: number | null;
  items: EmployeeAssignmentItem[];
  assignment_date: string | null;
};

const sanitizeAssignmentDrafts = (rows: AssignmentDraft[]) =>
  rows
    .filter(
      (row) =>
        row.pump_id != null &&
        row.items.length > 0 &&
        row.items.every(item => item.batch_id != null)
    )
    .map((row) => ({
      pump_id: row.pump_id!,
      items: row.items.map(item => ({
        batch_id: item.batch_id,
        serial_number: item.serial_number?.trim() || undefined,
        barcode: item.barcode?.trim() || undefined,
      })),
      id: row.id,
    }));

const draftTotalQuantity = (rows: AssignmentDraft[]) =>
  rows.reduce((sum, row) => sum + row.items.length, 0);

const buildAssetPayload = (asset: AssetRow) => ({
  asset_name: asset.asset_name,
  asset_number: asset.asset_number,
  quantity: asset.quantity,
  units: asset.units,
  remarks: asset.remarks,
  category_id: asset.category_id,
  asset_value: asset.asset_value,
  // Convert existing assignments to new format with items
  assignments: (asset.assignments || []).map((assignment: any) => {
    const items: AssignmentItem[] = [];
    // Extract items from batch_allocations
    if (assignment.batch_allocations && Array.isArray(assignment.batch_allocations)) {
      assignment.batch_allocations.forEach((alloc: any) => {
        // If allocation has quantity > 1, create multiple items
        const count = alloc.quantity || 1;
        for (let i = 0; i < count; i++) {
          items.push({
            batch_id: alloc.batch_id,
            serial_number: alloc.serial_number || undefined,
            barcode: alloc.barcode || undefined,
          });
        }
      });
    }
    return {
      id: assignment.id,
      pump_id: assignment.pump_id,
      items: items.length > 0 ? items : [],
    };
  }).filter((assignment: any) => assignment.items.length > 0),
});

export default function AllAssetsPage() {
  const { canAssign, isAdmin } = useUserRole();
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [selected, setSelected] = useState<AssetRow | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [open, setOpen] = useState(false);
  const detailNumericFields = useMemo(() => new Set(["quantity", "asset_value"]), []);
  const detailReadOnlyFields = useMemo(() => new Set(["categoryName"]), []);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeFilter, setBarcodeFilter] = useState<string | null>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isScanningMode, setIsScanningMode] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Assign modal state
  const [assignOpen, setAssignOpen] = useState(false);
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [assignCatId, setAssignCatId] = useState<string>("none");
  const [assignmentRows, setAssignmentRows] = useState<AssignmentDraft[]>([]);
  
  // Helper to add an item to an assignment row
  const addItemToAssignment = (rowIndex: number, item: AssignmentItem) => {
    setAssignmentRows((rows) => {
      const newRows = [...rows];
      newRows[rowIndex] = {
        ...newRows[rowIndex],
        items: [...(newRows[rowIndex].items || []), item],
      };
      return newRows;
    });
  };
  
  // Helper to remove an item from an assignment row
  const removeItemFromAssignment = (rowIndex: number, itemIndex: number) => {
    setAssignmentRows((rows) => {
      const newRows = [...rows];
      newRows[rowIndex] = {
        ...newRows[rowIndex],
        items: newRows[rowIndex].items.filter((_, idx) => idx !== itemIndex),
      };
      return newRows;
    });
  };
  
  // Helper to update an item in an assignment row
  const updateItemInAssignment = (rowIndex: number, itemIndex: number, updates: Partial<AssignmentItem>) => {
    setAssignmentRows((rows) => {
      const newRows = [...rows];
      newRows[rowIndex] = {
        ...newRows[rowIndex],
        items: newRows[rowIndex].items.map((item, idx) =>
          idx === itemIndex ? { ...item, ...updates } : item
        ),
      };
      return newRows;
    });
  };
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
    setAssignmentRows((rows) => [...rows, { pump_id: null, items: [] }]);
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
    setEmployeeAssignmentRows((rows) => [...rows, { employee_id: null, items: [], assignment_date: new Date().toISOString().split("T")[0] }]);
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

  // Filter assets based on search query and barcode
  const filteredAssets = useMemo(() => {
    let filtered = assets;

    // Filter by barcode first (if set)
    if (barcodeFilter) {
      filtered = filtered.filter((asset) => {
        // Check if any assignment has a batch allocation with this barcode
        return asset.assignments?.some((assignment: any) =>
          assignment.batch_allocations?.some((alloc: any) =>
            alloc.barcode?.toLowerCase() === barcodeFilter.toLowerCase()
          )
        ) || false;
      });
    }

    // Filter by search query (asset name or serial number)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((asset) => {
        // Check asset name
        const nameMatch = asset.asset_name?.toLowerCase().includes(query);
        
        // Check serial numbers in batch allocations
        const serialMatch = asset.assignments?.some((assignment: any) =>
          assignment.batch_allocations?.some((alloc: any) =>
            alloc.serial_number?.toLowerCase().includes(query)
          )
        ) || false;

        return nameMatch || serialMatch;
      });
    }

    return filtered;
  }, [assets, searchQuery, barcodeFilter]);

  const totalInventoryValue = useMemo(
    () =>
      filteredAssets.reduce(
        (sum, asset) => sum + (asset.totalValue ?? 0),
        0
      ),
    [filteredAssets]
  );

  // 🟢 1. Calculate how much of each batch was ALREADY used by this asset 
  // before we started editing. We credit this back to "Available" capacity.
  const originalBatchUsage = useMemo(() => {
    const map = new Map<number, number>();
    if (!selected?.assignments) return map;

    selected.assignments.forEach((assign: any) => {
      // The backend returns batch_allocations inside assignments
      // Each allocation is now one item (no quantity field)
      if (assign.batch_allocations && Array.isArray(assign.batch_allocations)) {
        assign.batch_allocations.forEach((alloc: any) => {
          const current = map.get(alloc.batch_id) || 0;
          map.set(alloc.batch_id, current + 1); // Each allocation = 1 item
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
      if (!row.pump_id) continue;
      if (row.items.length === 0) {
        error = "Please add at least one item for each assignment.";
           break;
        }
      for (const item of row.items) {
        if (!item.batch_id) {
          error = "Please select a batch for all items.";
          break;
      }
        if (!item.serial_number || !item.serial_number.trim()) {
          error = "Serial number is required for all items.";
          break;
        }
        const current = currentDraftUsage.get(item.batch_id) || 0;
        currentDraftUsage.set(item.batch_id, current + 1);
      }
      if (error) break;
    }
    
    if (!error) {
      for (const [batchId, requestedCount] of currentDraftUsage.entries()) {
        const batch = availableBatches.find((b) => b.id === batchId);
        
        if (batch) {
          const dbRemaining = batch.remaining_quantity || 0;
          const originalUsage = originalBatchUsage.get(batchId) || 0;
          
          // ✨ Allowable = What's in DB + What we are currently holding
          const trueLimit = dbRemaining + originalUsage;

          if (requestedCount > trueLimit) {
            error = `Quantity for batch (${new Date(batch.purchase_date).toLocaleDateString()}) exceeds limit. Available: ${trueLimit} (Requested: ${requestedCount})`;
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

  // Focus hidden input when scanning mode is enabled
  useEffect(() => {
    if (isScanningMode && barcodeInputRef.current) {
      // Small delay to ensure the input is ready
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    } else if (!isScanningMode && barcodeInputRef.current) {
      barcodeInputRef.current.blur();
      barcodeInputRef.current.value = "";
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
    }
  }, [isScanningMode]);

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
    // Calculate total assignments from items array
    const totalAssignments = payload.assignments?.reduce(
      (sum: number, row: { items: AssignmentItem[] }) => sum + (row.items?.length || 0),
      0
    ) || 0;
    const capacity = selected.quantity ?? 0;
    if (totalAssignments && totalAssignments > capacity) {
      alert("Assigned quantity cannot exceed the available quantity.");
      return;
    }

    const storedToken = localStorage.getItem("auth_token");
    const res = await fetch(`${API_BASE}/api/assets/${selected.id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
      },
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
    const storedToken = localStorage.getItem("auth_token");
    const res = await fetch(`${API_BASE}/api/assets/${id}`, {
      method: "DELETE",
      headers: {
        ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
      },
      credentials: "include",
    });
    if (!res.ok) return alert("Failed to delete");
    setAssets((prev) => prev.filter((a) => a.id !== id));
    setOpen(false);
  };

  // 🖨️ Print filtered assets (shows only what's currently visible on screen)
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Calculate total value for filtered assets
    const filteredTotalValue = filteredAssets.reduce(
      (sum, asset) => sum + (asset.totalValue ?? 0),
      0
    );

    // Determine if results are filtered
    const isFiltered = searchQuery.trim().length > 0 || barcodeFilter !== null;
    const filterInfo = isFiltered 
      ? `<p style="text-align: center; color: #666; font-size: 12px; margin-bottom: 10px;">
          ${searchQuery.trim() ? `Search: "${searchQuery}"` : ""}
          ${barcodeFilter ? `Barcode: "${barcodeFilter}"` : ""}
          (Showing ${filteredAssets.length} of ${assets.length} assets)
         </p>`
      : "";

    const html = `
      <html>
        <head>
          <title>${isFiltered ? "Filtered Assets" : "All Assets"} - Print</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              background: #fff;
            }
            h1 { text-align: center; margin-bottom: 10px; }
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
          <h1>${isFiltered ? "Filtered Assets" : "All Assets"}</h1>
          ${filterInfo}
          <h2 style="margin-top: 8px; margin-bottom: 16px; text-align: center; color: #555; font-size: 14px;">
            Total Inventory Value: ${filteredTotalValue.toLocaleString()}
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
              ${filteredAssets.length === 0 
                ? `<tr><td colspan="10" style="text-align: center; padding: 20px; color: #999;">No assets found</td></tr>`
                : filteredAssets
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
      // Convert existing assignments to new format with items
      const assignmentRowsWithItems = asset.assignments.map((assignment: any) => {
        const items: AssignmentItem[] = [];
        
        // Extract items from batch_allocations
        if (assignment.batch_allocations && assignment.batch_allocations.length > 0) {
          assignment.batch_allocations.forEach((alloc: any) => {
            items.push({
              batch_id: alloc.batch_id,
              serial_number: alloc.serial_number || undefined,
              barcode: alloc.barcode || undefined,
            });
          });
        }
        
        return {
          id: assignment.id,
          pump_id: assignment.pump_id,
          items: items.length > 0 ? items : [],
        };
      });
      
      setAssignmentRows(assignmentRowsWithItems.length > 0 ? assignmentRowsWithItems : [{ pump_id: null, items: [] }]);
    } else {
      setAssignmentRows([{ pump_id: null, items: [] }]);
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

    const storedToken = localStorage.getItem("auth_token");
    const res = await fetch(`${API_BASE}/api/assets/${selected.id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: "Failed to assign" }));
      alert(errorData.message || "Failed to assign");
      return;
    }
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
    // Note: For employee assignments, we show ALL batches regardless of remaining_quantity
    // because employee assignments are independent of station assignments
    let allBatches: any[] = [];
    try {
      const batchesRes = await fetch(`${API_BASE}/api/assets/${asset.id}/batches`, { credentials: "include" });
      const batchesData = await batchesRes.json();
      allBatches = Array.isArray(batchesData) ? batchesData : [];
      // Don't filter by remaining_quantity - employee assignments are independent
      setAvailableBatches(allBatches);
    } catch (e) {
      console.error("Failed to fetch batches", e);
      setAvailableBatches([]);
    }
    
    // Initialize with one empty row
    setEmployeeAssignmentRows([{ employee_id: null, items: [], assignment_date: new Date().toISOString().split("T")[0] }]);
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
    // Employee assignments are tracked separately from station assignments
  useEffect(() => {
    if (!employeeAssignOpen) {
      setEmployeeAssignmentError("");
      return;
    }
    
    let error = "";
    
      // Calculate requested usage per batch for employees
    const currentDraftUsage = new Map<number, number>();
    for (const row of employeeAssignmentRows) {
      if (!row.employee_id) continue;
      if (row.items.length === 0) {
        error = "Please add at least one item for each employee assignment.";
          break;
        }
      for (const item of row.items) {
        if (!item.batch_id) {
          error = "Please select a batch for all items.";
          break;
      }
          if (!item.serial_number || !item.serial_number.trim()) {
            error = "Serial number is required for all items.";
            break;
          }
        const current = currentDraftUsage.get(item.batch_id) || 0;
        currentDraftUsage.set(item.batch_id, current + 1);
      }
      if (error) break;
    }
    
    // Check employee-specific remaining quantity for each batch
    if (!error) {
      for (const [batchId, requestedCount] of currentDraftUsage.entries()) {
        const batch = availableBatches.find((b) => b.id === batchId);
        if (batch) {
          // Use employee_remaining_quantity which is tracked separately from station assignments
          const employeeRemaining = batch.employee_remaining_quantity ?? (batch.quantity - (batch.employee_assigned_count || 0));
          
          if (requestedCount > employeeRemaining) {
            error = `Quantity for batch (${new Date(batch.purchase_date).toLocaleDateString()}) exceeds employee assignment limit. Available for employees: ${employeeRemaining} (Requested: ${requestedCount})`;
          break;
          }
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
      (row) => row.employee_id != null && row.items.length > 0
    );

    if (validRows.length === 0) {
      alert("Please add at least one employee assignment with items.");
      return;
    }

    try {
      const storedToken = localStorage.getItem("auth_token");
      for (const row of validRows) {
        const res = await fetch(`${API_BASE}/api/employees/${row.employee_id}/assignments`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            items: row.items.map(item => ({
              batch_id: item.batch_id,
              serial_number: item.serial_number?.trim() || "",
              barcode: item.barcode?.trim() || undefined,
            })),
            assignment_date: row.assignment_date || new Date().toISOString(),
          }),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          const errorMessage = errorData.message || "Failed to assign to employee";
          console.error("Employee assignment API error:", errorData);
          throw new Error(errorMessage);
        }
      }

      // Reload assets to refresh data
      await loadAssets();
      setEmployeeAssignOpen(false);
      alert("✅ Assets assigned to employees successfully!");
    } catch (err: any) {
      const errorMessage = err?.message || "Error assigning assets to employees";
      console.error("Employee assignment error:", err);
      alert(errorMessage);
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

      {/* Search and Barcode Scanner */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Search by asset name or serial number..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              // Clear barcode filter when searching
              if (barcodeFilter) setBarcodeFilter(null);
            }}
            className="pl-10 bg-white/60 backdrop-blur-md"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setIsScanningMode(true);
            setShowBarcodeScanner(false); // Close camera modal if open
            // Focus will be handled by useEffect
          }}
          className={`bg-white/60 backdrop-blur-md hover:bg-white/80 shrink-0 ${isScanningMode ? "ring-2 ring-primary ring-offset-2" : ""}`}
        >
          <QrCode className="w-4 h-4 mr-2" />
          {isScanningMode ? "Scanning... (Click to Cancel)" : "Scan Barcode"}
        </Button>
        {isScanningMode && (
          <Button
            variant="outline"
            onClick={() => {
              setIsScanningMode(false);
              if (barcodeInputRef.current) {
                barcodeInputRef.current.value = "";
              }
              if (barcodeTimeoutRef.current) {
                clearTimeout(barcodeTimeoutRef.current);
              }
            }}
            className="bg-white/60 backdrop-blur-md hover:bg-white/80 shrink-0"
          >
            Cancel Scan
          </Button>
        )}
        {barcodeFilter && (
          <Button
            variant="outline"
            onClick={() => setBarcodeFilter(null)}
            className="bg-white/60 backdrop-blur-md hover:bg-white/80 shrink-0"
          >
            Clear Barcode Filter
          </Button>
        )}
      </div>

      {isScanningMode && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>🔍 Scanning mode active:</strong> Scan a barcode with your barcode scanner. The page will automatically filter results.
          </p>
        </div>
      )}

      {barcodeFilter && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Filtered by barcode:</strong> {barcodeFilter}
          </p>
        </div>
      )}

      {/* Hidden input for barcode scanner (physical scanners send keyboard input) */}
      <input
        ref={barcodeInputRef}
        type="text"
        style={{
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
          opacity: 0,
          pointerEvents: "none",
        }}
        onBlur={(e) => {
          // Refocus if still in scanning mode (barcode scanner needs focus)
          if (isScanningMode && barcodeInputRef.current) {
            setTimeout(() => {
              if (isScanningMode && barcodeInputRef.current) {
                barcodeInputRef.current.focus();
              }
            }, 50);
          }
        }}
        onChange={(e) => {
          // Handle barcode input
          const value = e.target.value;
          
          // Clear any existing timeout
          if (barcodeTimeoutRef.current) {
            clearTimeout(barcodeTimeoutRef.current);
          }

          // Barcode scanners typically send characters very quickly
          // If no input for 150ms, assume scan is complete
          barcodeTimeoutRef.current = setTimeout(() => {
            const scannedBarcode = value.trim();
            if (scannedBarcode.length > 0 && isScanningMode) {
              setBarcodeFilter(scannedBarcode);
              setSearchQuery(""); // Clear search when barcode is scanned
              setIsScanningMode(false);
              if (barcodeInputRef.current) {
                barcodeInputRef.current.value = "";
              }
            }
          }, 150);
        }}
        onKeyDown={(e) => {
          // Handle Enter key (barcode scanners typically send Enter at the end)
          if (e.key === "Enter") {
            e.preventDefault();
            const scannedBarcode = barcodeInputRef.current?.value.trim() || "";
            if (scannedBarcode.length > 0) {
              setBarcodeFilter(scannedBarcode);
              setSearchQuery(""); // Clear search when barcode is scanned
              setIsScanningMode(false);
              if (barcodeInputRef.current) {
                barcodeInputRef.current.value = "";
              }
              if (barcodeTimeoutRef.current) {
                clearTimeout(barcodeTimeoutRef.current);
              }
            }
          }
        }}
        placeholder=""
        autoComplete="off"
      />

      <div className="overflow-x-auto rounded-lg shadow-md bg-white/60 backdrop-blur-md -mx-3 sm:mx-0">
        <Table className="w-full min-w-[900px] sm:min-w-0">
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Asset Name</TableHead>
              <TableHead>Asset #</TableHead>
              <TableHead>Total Value</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Station</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  {searchQuery || barcodeFilter
                    ? "No assets found matching your search criteria."
                    : "No assets available."}
                </TableCell>
              </TableRow>
            ) : (
              filteredAssets.map((a) => (
              <TableRow key={a.id} className="hover:bg-white/80 transition">
                <TableCell>{a.id}</TableCell>
                <TableCell>{a.asset_name}</TableCell>
                <TableCell>{a.asset_number}</TableCell>
                <TableCell>{a.totalValue ?? 0}</TableCell>
                <TableCell>{a.categoryName ?? "-"}</TableCell>
                <TableCell>
                  {(() => {
                    // Calculate total items from all batches
                    const totalItems = (a.batches || []).reduce(
                      (sum: number, batch: any) => sum + (batch.quantity || 0),
                      0
                    );
                    // Get assigned items count
                    const assignedItems = a.totalAssigned || 0;
                    // Format as "assigned/total" with zero-padding
                    const formatNumber = (num: number) => String(num).padStart(2, '0');
                    return totalItems > 0 
                      ? `${formatNumber(assignedItems)}/${formatNumber(totalItems)}`
                      : "—";
                  })()}
                </TableCell>
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
                    {canAssign && (
                      <>
                    <Button variant="outline" size="sm" onClick={() => openAssign(a)} className="text-xs">Assign</Button>
                    <Button variant="outline" size="sm" onClick={() => openEmployeeAssign(a)} className="text-xs">Assign to Employee</Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        open={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={(barcode) => {
          setBarcodeFilter(barcode);
          setSearchQuery(""); // Clear search when barcode is scanned
          setShowBarcodeScanner(false);
        }}
      />

      {/* DETAILS dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto">
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

                <div className="col-span-1 sm:col-span-2 flex flex-col-reverse sm:flex-row justify-between gap-2 mt-4">
                  {!editMode ? (
                    <>
                      {isAdmin && (
                    <>
                      <Button type="button" variant="outline" onClick={() => setEditMode(true)} className="w-full sm:w-auto">✏️ Edit</Button>
                      <Button type="button" variant="destructive" onClick={() => deleteAsset(selected.id)} className="w-full sm:w-auto">🗑️ Delete</Button>
                        </>
                      )}
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
                  <div className="space-y-2 overflow-x-auto">
                    <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-muted-foreground pb-2 border-b min-w-[1000px]">
                      <div className="col-span-2">Name</div>
                      <div className="col-span-1">Date</div>
                      <div className="col-span-1">Serial #</div>
                      <div className="col-span-1">Barcode</div>
                      <div className="col-span-1">Price</div>
                      <div className="col-span-1">Quantity</div>
                      <div className="col-span-1">Remaining</div>
                      <div className="col-span-1">Remarks</div>
                      <div className="col-span-2">Value</div>
                      <div className="col-span-1 text-right">Action</div>
                    </div>
                    {selected.batches.map((batch: any) => {
                      const used = batch.quantity - batch.remaining_quantity;
                      const batchValue = batch.quantity * batch.purchase_price;
                      const remainingValue = batch.remaining_quantity * batch.purchase_price;
                      const canDelete = batch.remaining_quantity === batch.quantity; // Only if unused
                      return (
                        <div key={batch.id} className="grid grid-cols-12 gap-3 text-sm py-2 border-b items-center min-w-[1000px]">
                          <div className="col-span-2 font-semibold break-words">{batch.batch_name || "—"}</div>
                          <div className="col-span-1 font-mono text-xs">{new Date(batch.purchase_date).toLocaleDateString()}</div>
                          <div className="col-span-1 font-mono text-xs break-words">{batch.serial_number ?? "—"}</div>
                          <div className="col-span-1 font-mono text-xs break-words">{batch.barcode ?? "—"}</div>
                          <div className="col-span-1 font-semibold">{batch.purchase_price.toLocaleString()}</div>
                          <div className="col-span-1">{batch.quantity}</div>
                          <div className={`col-span-1 ${batch.remaining_quantity === 0 ? "text-muted-foreground" : ""}`}>{batch.remaining_quantity}</div>
                          <div className="col-span-1 text-sm text-muted-foreground break-words">{batch.remarks ?? "—"}</div>
                          <div className="col-span-2">
                            <div className="font-semibold">{batchValue.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">
                              Used: {used} · Remaining Value: {remainingValue.toLocaleString()}
                            </div>
                          </div>
                          <div className="col-span-1 text-right">
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
                                  const storedToken = localStorage.getItem("auth_token");
                                  const res = await fetch(`${API_BASE}/api/assets/${selected.id}/batches/${batch.id}`, {
                                    method: "DELETE",
                                    headers: {
                                      ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
                                    },
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
                return (
                  <div key={index} className="space-y-3 p-3 border rounded-lg">
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
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => removeAssignmentRow(index)}
                        >
                          Remove Station
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs uppercase tracking-wide">Items ({row.items.length})</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addItemToAssignment(index, { batch_id: 0, serial_number: "", barcode: "" })}
                        >
                          + Add Item
                        </Button>
                      </div>
                      
                      {row.items.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No items added. Click "Add Item" to assign assets.
                        </p>
                      )}
                      
                      {row.items.map((item, itemIndex) => {
                        const selectedBatch = availableBatches.find((b) => b.id === item.batch_id);
                        let maxAvailable = 0;
                        if (selectedBatch) {
                          const dbRemaining = selectedBatch.remaining_quantity || 0;
                          const originalUsage = originalBatchUsage.get(selectedBatch.id) || 0;
                          maxAvailable = dbRemaining + originalUsage;
                        }
                        
                        return (
                          <div key={itemIndex} className="p-2 border rounded bg-gray-50 space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                                <Label className="text-xs">Batch *</Label>
                        <Select
                                  value={item.batch_id?.toString() ?? "none"}
                          onValueChange={(val) =>
                                    updateItemInAssignment(index, itemIndex, {
                                      batch_id: val === "none" ? 0 : Number(val),
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
                        {selectedBatch && (
                          <p className="text-xs text-muted-foreground mt-1">
                                    {maxAvailable} available
                          </p>
                        )}
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                                  onClick={() => removeItemFromAssignment(index, itemIndex)}
                        >
                          Remove
                        </Button>
                      </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Serial Number *</Label>
                                <Input
                                  value={item.serial_number || ""}
                                  onChange={(e) =>
                                    updateItemInAssignment(index, itemIndex, {
                                      serial_number: e.target.value,
                                    })
                                  }
                                  placeholder="Enter serial number"
                                  required
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Barcode (optional)</Label>
                                <Input
                                  value={item.barcode || ""}
                                  onChange={(e) =>
                                    updateItemInAssignment(index, itemIndex, {
                                      barcode: e.target.value,
                                    })
                                  }
                                  placeholder="Enter barcode"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
                return (
                  <div key={index} className="space-y-3 p-3 border rounded-lg">
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
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
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
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs uppercase tracking-wide">Items ({row.items.length})</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newItems = [...(row.items || []), { batch_id: 0, serial_number: "", barcode: "" }];
                            updateEmployeeAssignmentRow(index, { items: newItems });
                          }}
                        >
                          + Add Item
                        </Button>
                      </div>
                      
                      {row.items.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No items added. Click "Add Item" to assign assets.
                        </p>
                      )}
                      
                      {row.items.map((item, itemIndex) => {
                        const selectedBatch = availableBatches.find((b) => b.id === item.batch_id);
                        const employeeRemaining = selectedBatch 
                          ? (selectedBatch.employee_remaining_quantity ?? (selectedBatch.quantity - (selectedBatch.employee_assigned_count || 0)))
                          : 0;
                        
                        return (
                          <div key={itemIndex} className="p-2 border rounded bg-gray-50 space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Batch *</Label>
                                <Select
                                  value={item.batch_id?.toString() ?? "none"}
                                  onValueChange={(val) => {
                                    const newItems = [...row.items];
                                    newItems[itemIndex] = { ...item, batch_id: val === "none" ? 0 : Number(val) };
                                    updateEmployeeAssignmentRow(index, { items: newItems });
                                  }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Batch" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select Batch</SelectItem>
                            {availableBatches.map((batch) => {
                              const empRemaining = batch.employee_remaining_quantity ?? (batch.quantity - (batch.employee_assigned_count || 0));
                              const isDisabled = empRemaining <= 0;
                              return (
                                <SelectItem 
                                  key={batch.id} 
                                  value={batch.id.toString()}
                                  disabled={isDisabled}
                                >
                                  {batch.batch_name || "Unnamed"} - {new Date(batch.purchase_date).toLocaleDateString()} ({empRemaining} available for employees{isDisabled ? " - FULL" : ""})
                              </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        {selectedBatch && (
                          <p className="text-xs text-muted-foreground mt-1">
                                    {employeeRemaining} available for employee assignment (Total: {selectedBatch.quantity}, Assigned to employees: {selectedBatch.employee_assigned_count || 0})
                          </p>
                        )}
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                                  onClick={() => {
                                    const newItems = row.items.filter((_, idx) => idx !== itemIndex);
                                    updateEmployeeAssignmentRow(index, { items: newItems });
                                  }}
                        >
                          Remove
                        </Button>
                      </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Serial Number *</Label>
                                <Input
                                  value={item.serial_number || ""}
                                  onChange={(e) => {
                                    const newItems = [...row.items];
                                    newItems[itemIndex] = { ...item, serial_number: e.target.value };
                                    updateEmployeeAssignmentRow(index, { items: newItems });
                                  }}
                                  placeholder="Enter serial number"
                                  required
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Barcode (optional)</Label>
                                <Input
                                  value={item.barcode || ""}
                                  onChange={(e) => {
                                    const newItems = [...row.items];
                                    newItems[itemIndex] = { ...item, barcode: e.target.value };
                                    updateEmployeeAssignmentRow(index, { items: newItems });
                                  }}
                                  placeholder="Enter barcode"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
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