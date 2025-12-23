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
import { Card } from "@/components/ui/card";
import BackToDashboardButton from "@/components/BackToDashboardButton";
import type { Asset } from "@/components/AssetTable";
import ViewBatchesModal from "@/components/ViewBatchesModal";
import BarcodeScannerModal from "@/components/BarcodeScannerModal";
import AssetForm, { type AssetFormData } from "@/components/AssetForm";
import { Trash2, Search, QrCode, Printer, Plus, Upload, FileSpreadsheet } from "lucide-react";
import { useEffect as useEffectImport } from "react";
import * as XLSX from 'xlsx';

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
  const { canAssign, isAdmin, isViewingUser, isAssigningUser } = useUserRole();
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [selected, setSelected] = useState<AssetRow | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [open, setOpen] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const detailNumericFields = useMemo(() => new Set(["quantity", "asset_value"]), []);
  const detailReadOnlyFields = useMemo(() => new Set(["categoryName"]), []);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeFilter, setBarcodeFilter] = useState<string | null>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isScanningMode, setIsScanningMode] = useState(false);
  const [barcodeSearchLoading, setBarcodeSearchLoading] = useState(false);
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
  
  // Import state
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  
  // Batch assignments state
  const [batchAssignments, setBatchAssignments] = useState<Map<number, Array<{serial_number: string | null, assigned_to: string, type: 'station' | 'employee'}>>>(new Map());
  const [loadingBatchAssignments, setLoadingBatchAssignments] = useState(false);
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

  // Filter assets based on search query (barcode filtering is now done server-side)
  const filteredAssets = useMemo(() => {
    let filtered = assets;

    // Note: Barcode filtering is now handled server-side via loadAssetsByBarcode
    // The assets state already contains only matching assets when barcodeFilter is set

    // Filter by search query (asset name, asset number, serial number, or barcode)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((asset) => {
        // Check asset name
        const nameMatch = asset.asset_name?.toLowerCase().includes(query);
        
        // Check asset number
        const numberMatch = asset.asset_number?.toLowerCase().includes(query);
        
        // Check serial numbers in batch allocations
        const serialMatch = asset.assignments?.some((assignment: any) =>
          assignment.batch_allocations?.some((alloc: any) =>
            alloc.serial_number?.toLowerCase().includes(query)
          )
        ) || false;

        // Check barcodes in batch allocations
        const barcodeMatch = asset.assignments?.some((assignment: any) =>
          assignment.batch_allocations?.some((alloc: any) =>
            alloc.barcode?.toLowerCase().includes(query)
          )
        ) || false;

        return nameMatch || numberMatch || serialMatch || barcodeMatch;
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

  // Load assets filtered by barcode
  const loadAssetsByBarcode = async (barcode: string) => {
    setBarcodeSearchLoading(true);
    try {
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(
        `${API_BASE}/api/assets/search/barcode?barcode=${encodeURIComponent(barcode)}`,
        {
          credentials: "include",
          headers: {
            ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
          },
        }
      );
      if (!res.ok) {
        throw new Error("Failed to search by barcode");
      }
      const data = await res.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error searching by barcode:", err);
      alert("Error searching by barcode. Please try again.");
    } finally {
      setBarcodeSearchLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  // Handle barcode filter changes
  useEffect(() => {
    if (barcodeFilter) {
      loadAssetsByBarcode(barcodeFilter);
    } else {
      // Reload all assets when barcode filter is cleared
      loadAssets();
    }
  }, [barcodeFilter]);

  // 📥 Handle Excel file import
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert("Please select a valid Excel file (.xlsx, .xls, or .csv)");
      return;
    }

    // Load categories if not already loaded
    let categoriesToUse = cats;
    if (categoriesToUse.length === 0) {
      try {
        const r2 = await fetch(`${API_BASE}/api/categories`, { credentials: "include" });
        const categoriesData = await r2.json();
        categoriesToUse = Array.isArray(categoriesData) ? categoriesData : [];
        setCats(categoriesToUse);
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    }

    setImportFile(file);
    setImportErrors([]);
    setImportPreview([]);

    // Read and preview the file
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
          alert("Excel file must have at least a header row and one data row");
          return;
        }

        // Parse header row
        const headers = jsonData[0].map((h: any) => String(h || '').toLowerCase().trim());
        
        // Find column indices
        const nameIndex = headers.findIndex(h => 
          h.includes('name') || h.includes('asset name')
        );
        const numberIndex = headers.findIndex(h => 
          h.includes('number') || h.includes('asset number') || h.includes('asset #')
        );
        const categoryIndex = headers.findIndex(h => 
          h.includes('category')
        );

        if (nameIndex === -1) {
          alert("Excel file must have an 'Asset Name' column (or similar: Name)");
          return;
        }

        if (numberIndex === -1) {
          alert("Excel file must have an 'Asset Number' column (or similar: Asset #, Number)");
          return;
        }

        // Parse data rows
        const preview: any[] = [];
        const errors: string[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const rowNum = i + 1;

          if (!row || row.length === 0) continue; // Skip empty rows

          const assetName = row[nameIndex] ? String(row[nameIndex]).trim() : '';
          const assetNumber = row[numberIndex] ? String(row[numberIndex]).trim() : '';
          const categoryName = row[categoryIndex] ? String(row[categoryIndex]).trim() : null;

          if (!assetName) {
            errors.push(`Row ${rowNum}: Asset name is required`);
            continue;
          }

          if (!assetNumber) {
            errors.push(`Row ${rowNum}: Asset number is required`);
            continue;
          }

          // Find category ID by name (use loaded categories)
          let categoryId = null;
          if (categoryName) {
            const category = categoriesToUse.find(c => 
              c.name.toLowerCase() === categoryName.toLowerCase()
            );
            if (category) {
              categoryId = category.id;
            } else {
              errors.push(`Row ${rowNum}: Category "${categoryName}" not found`);
            }
          }

          preview.push({
            asset_name: assetName,
            asset_number: assetNumber,
            category_id: categoryId,
            category_name: categoryName,
          });
        }

        setImportPreview(preview);
        setImportErrors(errors);
      } catch (error) {
        console.error("Error reading Excel file:", error);
        alert("Failed to read Excel file. Please ensure it's a valid Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 📥 Import assets from preview
  const handleImportAssets = async () => {
    if (importPreview.length === 0) {
      alert("No valid assets to import");
      return;
    }

    try {
      setImportLoading(true);
      const storedToken = localStorage.getItem("auth_token");
      
      const assetsToImport = importPreview.map(asset => ({
        asset_name: asset.asset_name,
        asset_number: asset.asset_number,
        category_id: asset.category_id || null,
      }));

      const res = await fetch(`${API_BASE}/api/assets/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ assets: assetsToImport }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`Failed to import assets: ${errorData.message || errorData.errors?.join(', ') || 'Unknown error'}`);
        return;
      }

      const data = await res.json();
      alert(`✅ Successfully imported ${data.count} asset(s)!`);
      
      // Reset and close
      setImportFile(null);
      setImportPreview([]);
      setImportErrors([]);
      setImportOpen(false);
      
      // Reload assets
      loadAssets();
    } catch (err) {
      console.error("Import error:", err);
      alert("Failed to import assets");
    } finally {
      setImportLoading(false);
    }
  };

  // 🟢 Handle URL parameters for navigation from charts
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.split('?')[1] || '');
    const assetId = params.get('assetId');
    
    if (assetId && assets.length > 0) {
      const asset = assets.find(a => a.id === Number(assetId));
      if (asset) {
        setSelected(asset);
        setEditMode(false);
        setOpen(true);
        fetchBatchAssignments(asset);
      }
    }
  }, [assets]);

  // Refresh batch assignments when selected asset changes
  useEffect(() => {
    if (selected && open && selected.batches && selected.batches.length > 0) {
      fetchBatchAssignments(selected);
    }
  }, [selected?.id, open]);

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

  // Fetch batch assignments for display
  const fetchBatchAssignments = async (asset: AssetRow) => {
    if (!asset || !asset.batches || asset.batches.length === 0) {
      setBatchAssignments(new Map());
      return;
    }

    setLoadingBatchAssignments(true);
    try {
      const assignmentsMap = new Map<number, Array<{serial_number: string | null, assigned_to: string, type: 'station' | 'employee'}>>();

      // Get station assignments from asset.assignments
      if (asset.assignments && Array.isArray(asset.assignments)) {
        asset.assignments.forEach((assignment: any) => {
          if (assignment.batch_allocations && Array.isArray(assignment.batch_allocations)) {
            assignment.batch_allocations.forEach((alloc: any) => {
              if (!assignmentsMap.has(alloc.batch_id)) {
                assignmentsMap.set(alloc.batch_id, []);
              }
              const list = assignmentsMap.get(alloc.batch_id)!;
              list.push({
                serial_number: alloc.serial_number || null,
                assigned_to: assignment.pump_name || `Station #${assignment.pump_id}`,
                type: 'station'
              });
            });
          }
        });
      }

      // Fetch employee assignments for all batches (fetch one by one or use asset_id)
      const batchIds = asset.batches.map((b: any) => b.id);
      if (batchIds.length > 0) {
        try {
          // Fetch employee assignments by asset_id (which will get all batches for this asset)
          const storedToken = localStorage.getItem("auth_token");
          const res = await fetch(`${API_BASE}/api/assignments/history?asset_id=${asset.id}`, {
            credentials: "include",
            headers: {
              ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
            },
          });
          if (res.ok) {
            const employeeAssignments = await res.json();
            if (Array.isArray(employeeAssignments)) {
              employeeAssignments.forEach((ea: any) => {
                // Backend already filters for active assignments, but double-check
                const isActive = ea.is_active === true || ea.is_active === null || ea.is_active === undefined;
                if (isActive && batchIds.includes(ea.batch_id)) {
                  // Check if employee data exists
                  const employee = ea.employee;
                  if (employee && employee.name) {
                    if (!assignmentsMap.has(ea.batch_id)) {
                      assignmentsMap.set(ea.batch_id, []);
                    }
                    const list = assignmentsMap.get(ea.batch_id)!;
                    list.push({
                      serial_number: ea.serial_number || null,
                      assigned_to: `${employee.name}${employee.employee_id ? ` (${employee.employee_id})` : ''}`,
                      type: 'employee'
                    });
                  } else {
                    console.warn("Employee assignment missing employee data:", ea);
                  }
                }
              });
            } else {
              console.warn("Employee assignments response is not an array:", employeeAssignments);
            }
          } else {
            const errorText = await res.text().catch(() => 'Unknown error');
            console.error("Failed to fetch employee assignments:", res.status, res.statusText, errorText);
          }
        } catch (err) {
          console.error("Error fetching employee assignments:", err);
        }
      }

      setBatchAssignments(assignmentsMap);
    } catch (err) {
      console.error("Error fetching batch assignments:", err);
      setBatchAssignments(new Map());
    } finally {
      setLoadingBatchAssignments(false);
    }
  };

  // Open asset details
  const openDetails = (asset: Asset) => {
    setSelected(asset);
    setEditMode(false);
    setOpen(true);
    fetchBatchAssignments(asset);
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
                <th>Assigned to Stations</th>
                <th>Assigned to Employees</th>
                <th>Units</th>
                <th>Total Value</th>
                <th>Remarks</th>
                <th>Category</th>
                <th>Station</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAssets.length === 0 
                ? `<tr><td colspan="11" style="text-align: center; padding: 20px; color: #999;">No assets found</td></tr>`
                : filteredAssets
                .map((a: any) => {
                    const totalItems = (a.batches || []).reduce((sum: number, batch: any) => sum + (batch.quantity || 0), 0);
                    const assignedToStations = a.totalAssignedToStations || 0;
                    const assignedToEmployees = a.totalAssignedToEmployees || 0;
                    const formatNumber = (num: number) => String(num).padStart(2, '0');
                    return `
                  <tr>
                    <td>${a.id}</td>
                    <td>${a.asset_name ?? ""}</td>
                    <td>${a.asset_number ?? ""}</td>
                    <td>${a.barcode ?? ""}</td>
                    <td>${totalItems > 0 ? `${formatNumber(assignedToStations)}/${formatNumber(totalItems)}` : "—"}</td>
                    <td>${totalItems > 0 ? `${formatNumber(assignedToEmployees)}/${formatNumber(totalItems)}` : "—"}</td>
                    <td>${a.units ?? ""}</td>
                    <td>${a.totalValue ?? 0}</td>
                    <td>${a.remarks ?? ""}</td>
                    <td>${a.categoryName ?? "-"}</td>
                    <td>${
                      a.assignments && a.assignments.length > 0
                        ? a.assignments
                            .map(
                              (as: any) =>
                                `${as.pump_name || `Station/Department #${as.pump_id}`}: ${as.quantity}`
                            )
                            .join("<br/>")
                        : "-"
                    }</td>
                  </tr>`;
                  })
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
          <div className="space-y-2">
            <BackToDashboardButton />
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              All Assets
            </h1>
            <div className="px-4 py-2 rounded-xl bg-primary/10 border-2 border-primary/20 inline-block">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                Total Inventory Value
              </p>
              <p className="text-xl font-bold text-primary">
                SAR {totalInventoryValue.toLocaleString()}
              </p>
            </div>
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
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowAssetForm(true)} 
                  className="gap-2 bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300 font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
                <Button 
                  onClick={() => setImportOpen(true)} 
                  variant="outline"
                  className="gap-2 border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300 font-medium"
                >
                  <Upload className="w-4 h-4" />
                  Import from Excel
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Search and Barcode Scanner */}
        <div className="flex flex-col sm:flex-row gap-3">
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
              className="pl-10 h-11 border-2 focus:border-primary transition-colors bg-card/80 backdrop-blur-sm"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setIsScanningMode(true);
              setShowBarcodeScanner(false); // Close camera modal if open
              // Focus will be handled by useEffect
            }}
            className={`border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300 shrink-0 h-11 ${isScanningMode ? "ring-2 ring-primary ring-offset-2" : ""}`}
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

      {barcodeSearchLoading && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Searching...</strong> Please wait while we search for assets with barcode: {barcodeFilter}
          </p>
        </div>
      )}

      {barcodeFilter && !barcodeSearchLoading && (
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

      <Card className="border-2 border-card-border bg-card/80 backdrop-blur-sm shadow-lg">
        <div className="overflow-x-auto rounded-lg">
          <Table className="w-full min-w-[1200px] sm:min-w-0">
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Asset Name</TableHead>
                <TableHead>Asset #</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Assigned to Stations</TableHead>
                <TableHead>Assigned to Employees</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    {searchQuery || barcodeFilter
                      ? "No assets found matching your search criteria."
                      : "No assets available."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssets.map((a) => (
                <TableRow key={a.id} className="hover:bg-card/60 transition">
                  <TableCell>{a.id}</TableCell>
                  <TableCell>{a.asset_name}</TableCell>
                  <TableCell>{a.asset_number}</TableCell>
                  <TableCell>{a.totalValue ?? 0}</TableCell>
                  <TableCell>{a.categoryName ?? "-"}</TableCell>
                  <TableCell>
                    {(() => {
                      const assignedToStations = (a as any).totalAssignedToStations || 0;
                      const totalItems = (a.batches || []).reduce(
                        (sum: number, batch: any) => sum + (batch.quantity || 0),
                        0
                      );
                      const formatNumber = (num: number) => String(num).padStart(2, '0');
                      return totalItems > 0 
                        ? `${formatNumber(assignedToStations)}/${formatNumber(totalItems)}`
                        : "—";
                    })()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const assignedToEmployees = (a as any).totalAssignedToEmployees || 0;
                      const totalItems = (a.batches || []).reduce(
                        (sum: number, batch: any) => sum + (batch.quantity || 0),
                        0
                      );
                      const formatNumber = (num: number) => String(num).padStart(2, '0');
                      return totalItems > 0 
                        ? `${formatNumber(assignedToEmployees)}/${formatNumber(totalItems)}`
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
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setSelectedAssetForBatches(a);
                        setShowViewBatches(true);
                      }} 
                      className="text-xs whitespace-nowrap"
                      title="View Purchase Batches"
                    >
                      Batches
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openDetails(a)} className="text-xs whitespace-nowrap">Details</Button>
                    {canAssign && !isViewingUser && (
                      <>
                    <Button variant="outline" size="sm" onClick={() => openAssign(a)} className="text-xs whitespace-nowrap">Assign</Button>
                    <Button variant="outline" size="sm" onClick={() => openEmployeeAssign(a)} className="text-xs whitespace-nowrap">Assign to Employee</Button>
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
      </Card>

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
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto border-2 border-card-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{editMode ? "Edit Asset" : "Asset Details"}</DialogTitle>
            <DialogDescription className="text-base">
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
                      {isAdmin && !isViewingUser && !isAssigningUser && (
                        <>
                          <Button type="button" variant="outline" onClick={() => setEditMode(false)} className="w-full sm:w-auto">Cancel</Button>
                          <Button type="button" onClick={saveEdit} className="w-full sm:w-auto">💾 Save</Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </form>

              {/* Show Batches Section */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">Purchase Batches</h3>
                  {selected && selected.batches && selected.batches.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Capture current batchAssignments state
                        const currentAssignments = batchAssignments;
                        const html = `
                          <html>
                            <head>
                              <title>Asset Details - ${selected.asset_name}</title>
                              <style>
                                body { font-family: Arial, sans-serif; margin: 20px; background: #f8f9fa; }
                                h1 { text-align: center; color: #333; }
                                .asset-info { background: #fff; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                                .asset-info p { margin: 5px 0; }
                                h2 { color: #333; margin-top: 20px; margin-bottom: 10px; }
                                .batch-section { margin-bottom: 30px; background: #fff; padding: 15px; border-radius: 5px; border: 1px solid #ddd; }
                                .batch-header { font-weight: bold; font-size: 16px; color: #333; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2px solid #f97316; }
                                .batch-details { margin-bottom: 10px; }
                                .batch-details p { margin: 3px 0; font-size: 14px; }
                                .assignments { margin-top: 10px; padding-left: 15px; border-left: 3px solid #f97316; }
                                .assignment-item { font-family: monospace; font-size: 13px; margin: 5px 0; color: #555; }
                                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                                th { background: #f0f0f0; font-weight: bold; }
                              </style>
                            </head>
                            <body>
                              <h1>Asset Details Report</h1>
                              <div class="asset-info">
                                <p><strong>Asset Name:</strong> ${selected.asset_name}</p>
                                <p><strong>Asset Number:</strong> ${selected.asset_number || "—"}</p>
                                <p><strong>Category:</strong> ${selected.categoryName || "—"}</p>
                                <p><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
                              </div>
                              <h2>Purchase Batches</h2>
                              ${selected.batches.map((batch: any) => {
                                const used = batch.quantity - batch.remaining_quantity;
                                const batchValue = batch.quantity * batch.purchase_price;
                                const remainingValue = batch.remaining_quantity * batch.purchase_price;
                                const assignments = currentAssignments.get(batch.id) || [];
                                
                                return `
                                  <div class="batch-section">
                                    <div class="batch-header">${batch.batch_name || "Unnamed Batch"}</div>
                                    <div class="batch-details">
                                      <p><strong>Purchase Date:</strong> ${new Date(batch.purchase_date).toLocaleDateString()}</p>
                                      <p><strong>Price:</strong> ${batch.purchase_price.toLocaleString()} SAR</p>
                                      <p><strong>Quantity:</strong> ${batch.quantity}</p>
                                      <p><strong>Remaining:</strong> ${batch.remaining_quantity}</p>
                                      <p><strong>Remarks:</strong> ${batch.remarks || "—"}</p>
                                      <p><strong>Total Value:</strong> ${batchValue.toLocaleString()} SAR (Used: ${used}, Remaining Value: ${remainingValue.toLocaleString()} SAR)</p>
                                    </div>
                                    ${assignments.length > 0 ? `
                                      <div class="assignments">
                                        <p style="font-weight: bold; margin-bottom: 8px;">Item Assignments:</p>
                                        ${assignments.map((assignment: any, idx: number) => `
                                          <div class="assignment-item">${assignment.serial_number || `Item ${idx + 1}`} → ${assignment.assigned_to}</div>
                                        `).join("")}
                                      </div>
                                    ` : '<p style="color: #999; font-style: italic; margin-top: 10px;">No items assigned from this batch.</p>'}
                                  </div>
                                `;
                              }).join("")}
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
                      Print Details
                    </Button>
                  )}
                </div>
                {selected.batches && selected.batches.length > 0 ? (
                  <div className="space-y-2 overflow-x-auto">
                    <div className="grid grid-cols-10 gap-3 text-xs font-semibold text-muted-foreground pb-2 border-b min-w-[800px]">
                      <div className="col-span-2">Name</div>
                      <div className="col-span-1">Date</div>
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
                      const assignments = batchAssignments.get(batch.id) || [];
                      
                      return (
                        <div key={batch.id} className="space-y-2">
                          <div className="grid grid-cols-10 gap-3 text-sm py-2 border-b items-center min-w-[800px]">
                            <div className="col-span-2 font-semibold break-words">{batch.batch_name || "Unnamed Batch"}</div>
                            <div className="col-span-1 font-mono text-xs">{new Date(batch.purchase_date).toLocaleDateString()}</div>
                            <div className="col-span-1 font-semibold">{batch.purchase_price.toLocaleString()}</div>
                            <div className="col-span-1">{batch.quantity}</div>
                            <div className={`col-span-1 ${batch.remaining_quantity === 0 ? "text-muted-foreground" : ""}`}>{batch.remaining_quantity}</div>
                            <div className="col-span-1 text-sm text-muted-foreground break-words">{batch.remarks || "—"}</div>
                            <div className="col-span-2">
                              <div className="font-semibold">{batchValue.toLocaleString()}</div>
                              <div className="text-xs text-muted-foreground">
                                Used: {used} · Remaining Value: {remainingValue.toLocaleString()}
                              </div>
                            </div>
                            <div className="col-span-1 text-right">
                              {isAdmin && !isViewingUser && !isAssigningUser && (
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
                                        fetchBatchAssignments(updatedAsset);
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
                              )}
                            </div>
                          </div>
                          {/* Show assignments under each batch */}
                          {loadingBatchAssignments ? (
                            <div className="pl-4 pb-2 text-xs text-muted-foreground">Loading assignments...</div>
                          ) : assignments.length > 0 ? (
                            <div className="pl-4 pb-2 border-l-2 border-muted">
                              <div className="text-xs text-muted-foreground space-y-1">
                                {assignments.map((assignment, idx) => (
                                  <div key={idx} className="font-mono text-xs">
                                    {assignment.serial_number || `Item ${idx + 1}`} → {assignment.assigned_to}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
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

      {/* ADD ASSET FORM */}
      <AssetForm
        open={showAssetForm}
        onClose={() => setShowAssetForm(false)}
        onSubmit={async (data: AssetFormData) => {
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
            const newAsset = await res.json();
            setAssets((prev) => [newAsset, ...prev]);
            setShowAssetForm(false);
            alert("✅ Asset added successfully!");
          } catch (err: any) {
            alert(err?.message || "Error adding asset");
          }
        }}
        title="Add Asset"
      />

      {/* Import Assets Modal */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Assets from Excel</DialogTitle>
            <DialogDescription>
              Upload an Excel file (.xlsx, .xls, or .csv) with asset data. 
              Required columns: Asset Name, Asset Number. Optional: Category
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* File Upload */}
            <div>
              <Label htmlFor="excel-file-assets" className="text-sm font-semibold mb-2 block">
                Select Excel File
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="excel-file-assets"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="flex-1"
                />
                {importFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{importFile.name}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Excel format: Column A = Asset Name (required), Column B = Asset Number (required), Column C = Category (optional)
              </p>
            </div>

            {/* Errors */}
            {importErrors.length > 0 && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm font-semibold text-destructive mb-1">Validation Errors:</p>
                <ul className="text-xs text-destructive list-disc list-inside space-y-1">
                  {importErrors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview */}
            {importPreview.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">
                    Preview ({importPreview.length} asset(s) ready to import)
                  </Label>
                </div>
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="p-2 text-left border-b">Asset Name</th>
                        <th className="p-2 text-left border-b">Asset Number</th>
                        <th className="p-2 text-left border-b">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((asset, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2">{asset.asset_name}</td>
                          <td className="p-2">{asset.asset_number}</td>
                          <td className="p-2">{asset.category_name || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setImportOpen(false);
                  setImportFile(null);
                  setImportPreview([]);
                  setImportErrors([]);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImportAssets}
                disabled={importLoading || importPreview.length === 0}
                className="bg-primary hover:bg-primary/90"
              >
                {importLoading ? "Importing..." : `Import ${importPreview.length} Asset(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ASSIGN dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto border-2 border-card-border">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-2xl font-bold">Assign Asset</DialogTitle>
            <DialogDescription className="text-base">
              Assign assets from specific batches to stations. Each assignment must specify which batch to use.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                <div className="flex-1">
                  <Label className="text-base font-semibold">Station Allocations</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Assign quantities to one or more Stations/Departments.
                  </p>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addAssignmentRow} 
                  className="shrink-0 border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300 font-medium"
                >
                  + Add Station
                </Button>
              </div>

              {assignmentRows.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No stations selected. Asset will remain unassigned.
                </p>
              )}

              {assignmentRows.map((row, index) => {
                return (
                  <div key={index} className="space-y-4 p-5 border-2 border-card-border rounded-xl bg-card/50 backdrop-blur-sm shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <Label className="text-sm font-semibold mb-2 block">Station/Department</Label>
                        <Select
                          value={row.pump_id?.toString() ?? "none"}
                          onValueChange={(val) =>
                            updateAssignmentRow(index, {
                              pump_id: val === "none" ? null : Number(val),
                            })
                          }
                        >
                          <SelectTrigger className="h-11 border-2 focus:border-primary">
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
                          className="text-destructive hover:bg-destructive/10 w-full sm:w-auto"
                          onClick={() => removeAssignmentRow(index)}
                        >
                          Remove Station
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">Items ({row.items.length})</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addItemToAssignment(index, { batch_id: 0, serial_number: "", barcode: "" })}
                          className="border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300"
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
                          <div key={itemIndex} className="p-4 border-2 border-border rounded-lg bg-muted/20 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-2">
                                <Label className="text-sm font-semibold mb-2 block">Batch *</Label>
                                <Select
                                  value={item.batch_id?.toString() ?? "none"}
                                  onValueChange={(val) =>
                                    updateItemInAssignment(index, itemIndex, {
                                      batch_id: val === "none" ? 0 : Number(val),
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-11 border-2 focus:border-primary">
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
                                  <p className="text-xs text-muted-foreground mt-2 px-2 py-1 bg-primary/10 rounded border border-primary/20 inline-block">
                                    {maxAvailable} available
                                  </p>
                                )}
                              </div>
                              <div className="flex items-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:bg-destructive/10 w-full sm:w-auto"
                                  onClick={() => removeItemFromAssignment(index, itemIndex)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-sm font-semibold mb-2 block">Serial Number *</Label>
                                <Input
                                  value={item.serial_number || ""}
                                  onChange={(e) =>
                                    updateItemInAssignment(index, itemIndex, {
                                      serial_number: e.target.value,
                                    })
                                  }
                                  placeholder="Enter serial number"
                                  required
                                  className="h-11 border-2 focus:border-primary"
                                />
                              </div>
                              <div>
                                <Label className="text-sm font-semibold mb-2 block">Barcode (optional)</Label>
                                <Input
                                  value={item.barcode || ""}
                                  onChange={(e) =>
                                    updateItemInAssignment(index, itemIndex, {
                                      barcode: e.target.value,
                                    })
                                  }
                                  placeholder="Enter barcode"
                                  className="h-11 border-2 focus:border-primary"
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

              <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total assigned: </span>
                    <span className="font-semibold text-foreground">{totalAssignedDraft}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Remaining: </span>
                    <span
                      className={`font-semibold ${
                        remainingDraft < 0 ? "text-destructive" : "text-primary"
                      }`}
                    >
                      {remainingDraft}
                    </span>
                  </div>
                </div>
              </div>
              {assignmentError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive font-medium">{assignmentError}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <Label className="text-sm font-semibold mb-2 block">Category</Label>
              <Select value={assignCatId || "none"} onValueChange={setAssignCatId}>
                <SelectTrigger className="h-11 border-2 focus:border-primary">
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

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-border">
              <Button 
                variant="outline" 
                onClick={() => setAssignOpen(false)} 
                className="w-full sm:w-auto border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300"
              >
                Cancel
              </Button>
              <Button 
                onClick={saveAssign} 
                disabled={!!assignmentError} 
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300 font-semibold"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* EMPLOYEE ASSIGN dialog */}
      <Dialog open={employeeAssignOpen} onOpenChange={setEmployeeAssignOpen}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto border-2 border-card-border">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-2xl font-bold">Assign Asset to Employee</DialogTitle>
            <DialogDescription className="text-base">
              Assign assets from specific batches to employees. Each assignment must specify which batch to use.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                <div className="flex-1">
                  <Label className="text-base font-semibold">Employee Assignments</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Assign quantities to one or more employees.
                  </p>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addEmployeeAssignmentRow} 
                  className="shrink-0 border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300 font-medium"
                >
                  + Add Employee
                </Button>
              </div>

              {employeeAssignmentRows.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No employees selected. Click "Add Employee" to assign assets.
                </p>
              )}

              {employeeAssignmentRows.map((row, index) => {
                return (
                  <div key={index} className="space-y-4 p-5 border-2 border-card-border rounded-xl bg-card/50 backdrop-blur-sm shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-1">
                        <Label className="text-sm font-semibold mb-2 block">Employee</Label>
                        <Select
                          value={row.employee_id?.toString() ?? "none"}
                          onValueChange={(val) =>
                            updateEmployeeAssignmentRow(index, {
                              employee_id: val === "none" ? null : Number(val),
                            })
                          }
                        >
                          <SelectTrigger className="h-11 border-2 focus:border-primary">
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
                      <div className="sm:col-span-1">
                        <Label className="text-sm font-semibold mb-2 block">Assignment Date</Label>
                        <Input
                          type="date"
                          value={row.assignment_date ?? new Date().toISOString().split("T")[0]}
                          onChange={(e) =>
                          updateEmployeeAssignmentRow(index, {
                              assignment_date: e.target.value,
                            })
                          }
                          className="h-11 border-2 focus:border-primary"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 w-full sm:w-auto"
                          onClick={() => removeEmployeeAssignmentRow(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">Items ({row.items.length})</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newItems = [...(row.items || []), { batch_id: 0, serial_number: "", barcode: "" }];
                            updateEmployeeAssignmentRow(index, { items: newItems });
                          }}
                          className="border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300"
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
                          <div key={itemIndex} className="p-4 border-2 border-border rounded-lg bg-muted/20 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-2">
                                <Label className="text-sm font-semibold mb-2 block">Batch *</Label>
                                <Select
                                  value={item.batch_id?.toString() ?? "none"}
                                  onValueChange={(val) => {
                                    const newItems = [...row.items];
                                    newItems[itemIndex] = { ...item, batch_id: val === "none" ? 0 : Number(val) };
                                    updateEmployeeAssignmentRow(index, { items: newItems });
                                  }}
                        >
                          <SelectTrigger className="h-11 border-2 focus:border-primary">
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
                          <p className="text-xs text-muted-foreground mt-2 px-2 py-1 bg-primary/10 rounded border border-primary/20 inline-block">
                                    {employeeRemaining} available for employee assignment (Total: {selectedBatch.quantity}, Assigned to employees: {selectedBatch.employee_assigned_count || 0})
                          </p>
                        )}
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 w-full sm:w-auto"
                                  onClick={() => {
                                    const newItems = row.items.filter((_, idx) => idx !== itemIndex);
                                    updateEmployeeAssignmentRow(index, { items: newItems });
                                  }}
                        >
                          Remove
                        </Button>
                      </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-sm font-semibold mb-2 block">Serial Number *</Label>
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
                                <Label className="text-sm font-semibold mb-2 block">Barcode (optional)</Label>
                                <Input
                                  value={item.barcode || ""}
                                  onChange={(e) => {
                                    const newItems = [...row.items];
                                    newItems[itemIndex] = { ...item, barcode: e.target.value };
                                    updateEmployeeAssignmentRow(index, { items: newItems });
                                  }}
                                  placeholder="Enter barcode"
                                  className="h-11 border-2 focus:border-primary"
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
    </div>
  );
}