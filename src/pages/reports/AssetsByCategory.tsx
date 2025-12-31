import { useEffect, useMemo, useState, useRef } from "react";
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
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Printer, QrCode, Search } from "lucide-react";
import BackToDashboardButton from "@/components/BackToDashboardButton";

type Category = {
  id: string;
  name: string;
};

type Pump = {
  id: number;
  name: string;
};

type Employee = {
  id: number;
  name: string;
  employee_id?: string | null;
};

type Asset = {
  id: number;
  asset_name: string;
  asset_number: string;
  serial_number?: string | null;
  barcode?: string | null;
  categoryName?: string;
  pumpName?: string;
  pump_id?: number | null;
  employeeName?: string | null;
  employee_id?: number | null;
  assignmentQuantity?: number;
  assignmentValue?: number;
  quantity?: number | null;
  asset_value?: number | null;
  totalValue?: number | null;
};

export default function AssetsByCategoryReport() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [allSerialNumbers, setAllSerialNumbers] = useState<string[]>([]);
  
  // Filter states
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [selectedSerial, setSelectedSerial] = useState<string>("");
  
  // Searchable filter states
  const [employeeSearch, setEmployeeSearch] = useState<string>("");
  const [stationSearch, setStationSearch] = useState<string>("");
  const [serialSearch, setSerialSearch] = useState<string>("");
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [showStationDropdown, setShowStationDropdown] = useState(false);
  const [showSerialDropdown, setShowSerialDropdown] = useState(false);
  
  // Barcode scanning state
  const [barcodeFilter, setBarcodeFilter] = useState<string | null>(null);
  const [isScanningMode, setIsScanningMode] = useState(false);
  const [barcodeSearchLoading, setBarcodeSearchLoading] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Search query state (for general search bar)
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Determine active filter type for column visibility
  // Since we're using general search, show both station and employee columns
  const activeFilterType = useMemo(() => {
    if (searchQuery.trim() || barcodeFilter) return "serial_barcode";
    return null; // Show all columns when viewing all
  }, [searchQuery, barcodeFilter]);

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch(`${API_BASE}/api/categories`, {
          credentials: "include",
        });
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    }
    loadCategories();
  }, []);

  // Load pumps
  useEffect(() => {
    async function loadPumps() {
      try {
        const res = await fetch(`${API_BASE}/api/pumps`, {
          credentials: "include",
        });
        const data = await res.json();
        setPumps(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load station:", err);
      }
    }
    loadPumps();
  }, []);

  // Load employees
  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await fetch(`${API_BASE}/api/employees`, {
          credentials: "include",
        });
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load employees:", err);
      }
    }
    loadEmployees();
  }, []);

  // Load all assets
  const loadAssets = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reports/assets-by-category`, { 
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      const assetsData = Array.isArray(data) ? data : [];
      
      // Debug: Log to check if employee assignments are included
      console.log("Loaded assets:", assetsData.length);
      const withEmployeeAssignments = assetsData.filter((a: Asset) => a.employeeName);
      console.log("Assets with employee assignments:", withEmployeeAssignments.length);
      if (withEmployeeAssignments.length > 0) {
        console.log("Sample employee assignment:", withEmployeeAssignments[0]);
        console.log("Employee name in sample:", withEmployeeAssignments[0].employeeName);
        console.log("Serial number in sample:", withEmployeeAssignments[0].serial_number);
        console.log("Barcode in sample:", withEmployeeAssignments[0].barcode);
      } else {
        console.log("No employee assignments found in response");
        // Check if any assets have employee_id set
        const withEmployeeId = assetsData.filter((a: Asset) => a.employee_id);
        console.log("Assets with employee_id:", withEmployeeId.length);
      }
      
      setAllAssets(assetsData);
      
      // Set assets to allAssets if no filters are active
      if (!barcodeFilter && !searchQuery.trim()) {
        setAssets(assetsData);
      }
      
      // Extract all unique serial numbers from loaded assets
      const serialNumbers = new Set<string>();
      assetsData.forEach((asset: Asset) => {
        if (asset.serial_number) {
          serialNumbers.add(asset.serial_number);
        }
      });
      setAllSerialNumbers(Array.from(serialNumbers).sort());
    } catch (err) {
      console.error("Failed to load assets:", err);
      setAssets([]);
      setAllAssets([]);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  // Load assets filtered by barcode
  const loadAssetsByBarcode = async (barcode: string) => {
    setBarcodeSearchLoading(true);
    try {
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(
        `${API_BASE}/api/assets/search/barcode?barcode=${encodeURIComponent(barcode)}`,
        {
          credentials: "include",
          cache: "no-store",
          headers: {
            ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
          },
        }
      );
      if (!res.ok) {
        throw new Error("Failed to search by barcode");
      }
      const data = await res.json();
      
      // Transform the full asset data to match the flattened format expected by this page
      const flattenedAssets: Asset[] = [];
      
      // Create a map of batch_id -> purchase_price from asset batches for quick lookup
      const batchPriceMap = new Map<number, number>();
      
      (Array.isArray(data) ? data : []).forEach((asset: any) => {
        // Build batch price map for this asset
        if (asset.batches && Array.isArray(asset.batches)) {
          asset.batches.forEach((batch: any) => {
            if (batch.id && batch.purchase_price) {
              batchPriceMap.set(batch.id, Number(batch.purchase_price));
            }
          });
        }
        
        // Process station assignments
        if (asset.assignments && Array.isArray(asset.assignments)) {
          asset.assignments.forEach((assignment: any) => {
            if (assignment.batch_allocations && Array.isArray(assignment.batch_allocations)) {
              assignment.batch_allocations.forEach((alloc: any) => {
                // Check if this allocation has the matching barcode
                if (alloc.barcode?.toLowerCase() === barcode.toLowerCase()) {
                  const batch = alloc.asset_purchase_batches;
                  const purchasePrice = batch?.purchase_price || (alloc.batch_id ? batchPriceMap.get(alloc.batch_id) : undefined) || 0;
                  if (batch || alloc.batch_id) {
                    flattenedAssets.push({
                      id: asset.id,
                      asset_name: asset.asset_name,
                      asset_number: asset.asset_number,
                      categoryName: asset.categoryName,
                      pumpName: assignment.pumps?.name || assignment.pump_name || null,
                      pump_id: assignment.pump_id,
                      employeeName: null,
                      employee_id: null,
                      serial_number: alloc.serial_number || null,
                      barcode: alloc.barcode || null,
                      assignmentQuantity: 1,
                      assignmentValue: purchasePrice,
                    });
                  }
                }
              });
            }
          });
        }

        // Process employee assignments (NEW - using employee_assignments from asset data)
        if (asset.employee_assignments && Array.isArray(asset.employee_assignments)) {
          asset.employee_assignments.forEach((empAssign: any) => {
            if (empAssign.barcode?.toLowerCase() === barcode.toLowerCase()) {
              const purchasePrice = (empAssign.batch_id ? batchPriceMap.get(empAssign.batch_id) : undefined) ?? 0;
              flattenedAssets.push({
                id: asset.id,
                asset_name: asset.asset_name,
                asset_number: asset.asset_number,
                categoryName: asset.categoryName,
                pumpName: undefined,
                pump_id: undefined,
                employeeName: empAssign.employee_name || null,
                employee_id: empAssign.employee_id || null,
                serial_number: empAssign.serial_number || null,
                barcode: empAssign.barcode || null,
                assignmentQuantity: 1,
                assignmentValue: purchasePrice,
              });
            }
          });
        }
      });
      
      // Extract serial numbers from results
      const serialNumbers = new Set<string>(allSerialNumbers);
      flattenedAssets.forEach((asset: Asset) => {
        if (asset.serial_number) {
          serialNumbers.add(asset.serial_number);
        }
      });
      setAllSerialNumbers(Array.from(serialNumbers).sort());
      
      setAssets(flattenedAssets);
    } catch (err) {
      console.error("Error searching by barcode:", err);
      alert("Error searching by barcode. Please try again.");
    } finally {
      setBarcodeSearchLoading(false);
    }
  };

  // Load assets filtered by serial number
  const loadAssetsBySerial = async (serial: string) => {
    setBarcodeSearchLoading(true);
    try {
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(
        `${API_BASE}/api/assets/search/serial?serial=${encodeURIComponent(serial)}`,
        {
          credentials: "include",
          cache: "no-store",
          headers: {
            ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
          },
        }
      );
      if (!res.ok) {
        throw new Error("Failed to search by serial number");
      }
      const data = await res.json();
      
      // Transform the full asset data to match the flattened format expected by this page
      const flattenedAssets: Asset[] = [];
      
      // Create a map of batch_id -> purchase_price from asset batches for quick lookup
      const batchPriceMap = new Map<number, number>();
      
      (Array.isArray(data) ? data : []).forEach((asset: any) => {
        // Build batch price map for this asset
        if (asset.batches && Array.isArray(asset.batches)) {
          asset.batches.forEach((batch: any) => {
            if (batch.id && batch.purchase_price) {
              batchPriceMap.set(batch.id, Number(batch.purchase_price));
            }
          });
        }
        
        // Process station assignments
        if (asset.assignments && Array.isArray(asset.assignments)) {
          asset.assignments.forEach((assignment: any) => {
            if (assignment.batch_allocations && Array.isArray(assignment.batch_allocations)) {
              assignment.batch_allocations.forEach((alloc: any) => {
                // Check if this allocation has the matching serial number
                if (alloc.serial_number?.toLowerCase() === serial.toLowerCase()) {
                  const batch = alloc.asset_purchase_batches || alloc.batch;
                  const purchasePrice = batch?.purchase_price || (alloc.batch_id ? batchPriceMap.get(alloc.batch_id) : undefined) || 0;
                  if (batch || alloc.batch_id) {
                    flattenedAssets.push({
                      id: asset.id,
                      asset_name: asset.asset_name,
                      asset_number: asset.asset_number,
                      categoryName: asset.categoryName,
                      pumpName: assignment.pumps?.name || assignment.pump_name || null,
                      pump_id: assignment.pump_id,
                      employeeName: null,
                      employee_id: null,
                      serial_number: alloc.serial_number || null,
                      barcode: alloc.barcode || null,
                      assignmentQuantity: 1,
                      assignmentValue: purchasePrice,
                    });
                  }
                }
              });
            }
          });
        }

        // Process employee assignments (NEW - using employee_assignments from asset data)
        if (asset.employee_assignments && Array.isArray(asset.employee_assignments)) {
          asset.employee_assignments.forEach((empAssign: any) => {
            if (empAssign.serial_number?.toLowerCase() === serial.toLowerCase()) {
              const purchasePrice = (empAssign.batch_id ? batchPriceMap.get(empAssign.batch_id) : undefined) ?? 0;
              flattenedAssets.push({
                id: asset.id,
                asset_name: asset.asset_name,
                asset_number: asset.asset_number,
                categoryName: asset.categoryName,
                pumpName: undefined,
                pump_id: undefined,
                employeeName: empAssign.employee_name || null,
                employee_id: empAssign.employee_id || null,
                serial_number: empAssign.serial_number || null,
                barcode: empAssign.barcode || null,
                assignmentQuantity: 1,
                assignmentValue: purchasePrice,
              });
            }
          });
        }
      });
      
      // Extract serial numbers from results
      const serialNumbers = new Set<string>(allSerialNumbers);
      flattenedAssets.forEach((asset: Asset) => {
        if (asset.serial_number) {
          serialNumbers.add(asset.serial_number);
        }
      });
      setAllSerialNumbers(Array.from(serialNumbers).sort());
      
      setAssets(flattenedAssets);
    } catch (err) {
      console.error("Error searching by serial number:", err);
      alert("Error searching by serial number. Please try again.");
    } finally {
      setBarcodeSearchLoading(false);
    }
  };

  // Handle barcode filter changes
  useEffect(() => {
    if (barcodeFilter) {
      setSearchQuery(""); // Clear general search when barcode is scanned
      loadAssetsByBarcode(barcodeFilter);
    } else {
      // Reload all assets when barcode filter is cleared
      if (!searchQuery.trim()) {
        loadAssets();
      }
    }
  }, [barcodeFilter]);

  // Fetch assets assigned to a specific employee
  const fetchAssetsByEmployee = async (employeeId: number) => {
    try {
      setBarcodeSearchLoading(true);
      const res = await fetch(`${API_BASE}/api/reports/assets-by-category?employee_id=${employeeId}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`);
      }
      const data = await res.json();
      console.log("Employee filter response:", data);
      
      // The backend returns a flattened array when filtering by employee
      // Each item represents one asset assignment to the employee
      const enhancedAssets = (Array.isArray(data) ? data : []).map((asset: Asset) => {
        // If the asset already has employeeName from backend, use it; otherwise use the matched employee
        const employee = employees.find(e => e.id === employeeId);
        const empName = asset.employeeName || employee?.name || null;
        return {
          ...asset,
          // Explicitly set employee fields
          employeeName: empName,
          employee_id: asset.employee_id || employeeId,
          // Explicitly clear station info when showing employee assignments
          pump_id: undefined,
          pumpName: undefined,
        };
      });
      
      // Extract serial numbers from filtered results
      const serialNumbers = new Set<string>(allSerialNumbers);
      enhancedAssets.forEach((asset: Asset) => {
        if (asset.serial_number) {
          serialNumbers.add(asset.serial_number);
        }
      });
      setAllSerialNumbers(Array.from(serialNumbers).sort());
      
      console.log("Enhanced assets for employee:", enhancedAssets);
      setAssets(enhancedAssets);
    } catch (err) {
      console.error("Failed to load assets by employee:", err);
      setAssets([]);
    } finally {
      setBarcodeSearchLoading(false);
    }
  };

  // Fetch assets assigned to a specific station
  const fetchAssetsByStation = async (pumpId: number) => {
    try {
      setBarcodeSearchLoading(true);
      const res = await fetch(`${API_BASE}/api/reports/assets-by-category?pump_id=${pumpId}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`);
      }
      const data = await res.json();
      
      // Ensure station data is set correctly and employee data is cleared
      const enhancedAssets = (Array.isArray(data) ? data : []).map((asset: Asset) => {
        return {
          ...asset,
          // Explicitly clear employee info when showing station assignments
          employeeName: undefined,
          employee_id: undefined,
          // Ensure station info is set
          pump_id: asset.pump_id || pumpId,
          pumpName: asset.pumpName || undefined,
        };
      });
      
      // Extract serial numbers from filtered results
      const serialNumbers = new Set<string>(allSerialNumbers);
      enhancedAssets.forEach((asset: Asset) => {
        if (asset.serial_number) {
          serialNumbers.add(asset.serial_number);
        }
      });
      setAllSerialNumbers(Array.from(serialNumbers).sort());
      
      setAssets(enhancedAssets);
    } catch (err) {
      console.error("Failed to load assets by station:", err);
      setAssets([]);
    } finally {
      setBarcodeSearchLoading(false);
    }
  };

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

  // Update assets when allAssets changes (for default view)
  useEffect(() => {
    if (!barcodeFilter && !searchQuery.trim()) {
      setAssets(allAssets);
    }
  }, [allAssets, barcodeFilter, searchQuery]);

  // Filter assets based on search query (employee name, station name, serial number, barcode)
  // Always filter from allAssets to ensure we have all data including employee assignments
  const filteredAssets = useMemo(() => {
    let filtered = searchQuery.trim() ? allAssets : assets;
    
    // First, filter to only show items (rows with serial_number or barcode, OR employee assignments)
    // This ensures we only show individual items from batches, not assets
    // But we also include employee assignments even if they don't have serial/barcode yet
    filtered = filtered.filter((asset) => {
      // Show rows that represent individual items (have serial number or barcode)
      // OR show employee assignments (they represent items assigned to employees)
      return asset.serial_number || asset.barcode || asset.employeeName;
    });

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      
      // Create a regex for word-boundary matching (for names) or exact substring (for serial/barcode)
      // For names: match whole words only (prevents "ali" matching "khalid")
      // For serial/barcode: allow substring matching
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nameRegex = new RegExp(`\\b${escapedQuery}\\b`, 'i');
      const substringRegex = new RegExp(escapedQuery, 'i');
      
      filtered = filtered.filter((asset) => {
        // Check employee name - use word boundary matching to prevent substring matches
        const employeeMatch = asset.employeeName 
          ? nameRegex.test(asset.employeeName) 
          : false;
        
        // Check station name - use word boundary matching
        const stationMatch = asset.pumpName 
          ? nameRegex.test(asset.pumpName) 
          : false;
        
        // Check serial number - allow substring matching (user might search partial serial)
        const serialMatch = asset.serial_number 
          ? substringRegex.test(asset.serial_number.toLowerCase()) 
          : false;
        
        // Check barcode - allow substring matching (user might search partial barcode)
        const barcodeMatch = asset.barcode 
          ? substringRegex.test(asset.barcode.toLowerCase()) 
          : false;

        // Items without serial/barcode MUST match employee name exactly (word boundary)
        // They should NOT appear if they don't match - this prevents keyboard items from showing in unrelated searches
        if (!asset.serial_number && !asset.barcode) {
          // Only show if employee name matches (not station, since these are employee assignments)
          return employeeMatch;
        }
        
        // Items with serial/barcode can match any field
        return employeeMatch || stationMatch || serialMatch || barcodeMatch;
      });
      
      // Debug logging to help identify issues
      console.log(`[DEBUG] Search query: "${searchQuery}", Filtered count: ${filtered.length}`);
      if (filtered.length > 0) {
        console.log(`[DEBUG] Sample filtered items:`, filtered.slice(0, 3).map((a: Asset) => ({
          asset_name: a.asset_name,
          employeeName: a.employeeName,
          pumpName: a.pumpName,
          serial_number: a.serial_number,
          barcode: a.barcode,
          hasSerialOrBarcode: !!(a.serial_number || a.barcode)
        })));
      }
    }

    return filtered;
  }, [assets, allAssets, searchQuery]);

  // Calculate total value: sum of assignmentValue for each row
  const totalInventoryValue = useMemo(() => {
    return filteredAssets.reduce((sum, asset) => sum + (asset.assignmentValue ?? 0), 0);
  }, [filteredAssets]);

  const handlePrint = () => {
    if (filteredAssets.length === 0) {
      alert("Nothing to print for the selected filters.");
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let filterText = "All Assets";
    if (searchQuery.trim()) {
      filterText = `Search: "${searchQuery}"`;
    } else if (barcodeFilter) {
      filterText = `Barcode: ${barcodeFilter}`;
    }

    // Always show all columns since we're using general search
    const showStation = true;
    const showEmployee = true;
    const showCategory = true;

    const html = `
      <html>
        <head>
          <title>Assigned Assets Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; }
            h1 { margin-bottom: 8px; }
            h2 { margin-top: 4px; font-size: 14px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 13px; }
            th { background: #f5f5f5; }
            tr:nth-child(even) { background: #fafafa; }
          </style>
        </head>
        <body>
          <h1>Assigned Assets</h1>
          <h2>${filterText}</h2>
          <h2 style="margin-top: 8px; margin-bottom: 16px;">Total Inventory Value: ${totalInventoryValue.toLocaleString()}</h2>
          <table>
            <thead>
              <tr>
                <th>Asset Name</th>
                <th>Asset #</th>
                ${showCategory ? "<th>Category</th>" : ""}
                ${showStation ? "<th>Station</th>" : ""}
                ${showEmployee ? "<th>Employee</th>" : ""}
                <th>Serial #</th>
                <th>Barcode</th>
                <th>Assigned Qty</th>
                <th>Total Value</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAssets
                .map(
                  (a) => `
                  <tr>
                    <td>${a.asset_name ?? ""}</td>
                    <td>${a.asset_number ?? ""}</td>
                    ${showCategory ? `<td>${a.categoryName ?? "-"}</td>` : ""}
                    ${showStation ? `<td>${a.pumpName ?? "-"}</td>` : ""}
                    ${showEmployee ? `<td>${a.employeeName ?? "-"}</td>` : ""}
                    <td>${a.serial_number ?? "-"}</td>
                    <td>${a.barcode ?? "-"}</td>
                    <td>${a.assignmentQuantity ?? 0}</td>
                    <td>${(a.assignmentValue ?? 0).toFixed(2)}</td>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
          <div className="space-y-2">
        <BackToDashboardButton />
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Assigned Assets
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
        </div>
        {/* Search Bar */}
        <Card className="border-2 border-card-border bg-card/80 backdrop-blur-sm shadow-lg p-4 relative z-10">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by employee name, station name, serial number, or barcode..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setSearchQuery(e.target.value);
                  // Clear specific filters when using general search
                  if (e.target.value.trim()) {
                    setSelectedEmployee("");
                    setSelectedStation("");
                    setSelectedSerial("");
                    setBarcodeFilter(null);
                    setEmployeeSearch("");
                    setStationSearch("");
                    setSerialSearch("");
                  }
                }}
                className="pl-10 h-11 border-2 focus:border-primary transition-colors bg-card/80 backdrop-blur-sm"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setIsScanningMode(true);
              }}
              className={`border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300 shrink-0 h-11 ${isScanningMode ? "ring-2 ring-primary ring-offset-2" : ""}`}
            >
              <QrCode className="w-4 h-4 mr-2" />
              {isScanningMode ? "Scanning..." : "Scan Barcode"}
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
                className="bg-white/60 backdrop-blur-md hover:bg-white/80 shrink-0 h-11"
              >
                Cancel Scan
              </Button>
            )}
            {searchQuery && (
              <Button
                variant="outline"
                onClick={() => setSearchQuery("")}
                className="bg-white/60 backdrop-blur-md hover:bg-white/80 shrink-0 h-11"
              >
                Clear Search
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={handlePrint}
              className="border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300 font-medium shrink-0 h-11"
            >
              <Printer className="w-4 h-4" />
            </Button>
          </div>
        </Card>
        
        {/* Active Filter Display */}
        {(barcodeFilter || searchQuery.trim()) && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {barcodeFilter && (
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                Barcode: {barcodeFilter}
              </span>
            )}
            {searchQuery.trim() && (
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                Search: {searchQuery}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBarcodeFilter(null);
                setSearchQuery("");
                setIsScanningMode(false);
              }}
              className="h-7 text-xs"
            >
              Clear All
            </Button>
          </div>
        )}

        {isScanningMode && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>🔍 Scanning mode active:</strong> Scan a barcode with your barcode scanner. The page will automatically filter results.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsScanningMode(false);
                if (barcodeInputRef.current) {
                  barcodeInputRef.current.value = "";
                }
                if (barcodeTimeoutRef.current) {
                  clearTimeout(barcodeTimeoutRef.current);
                }
              }}
              className="mt-2"
            >
              Cancel Scan
        </Button>
      </div>
        )}

        {barcodeSearchLoading && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Searching...</strong> Please wait while we search for assets{barcodeFilter ? ` with barcode: ${barcodeFilter}` : searchQuery ? ` with search: ${searchQuery}` : ""}
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
                setSearchQuery(""); // Clear general search when barcode is scanned
                setIsScanningMode(false);
                if (barcodeInputRef.current) {
                  barcodeInputRef.current.value = "";
                }
              }
            }, 150);
          }}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            // Handle Enter key (barcode scanners typically send Enter at the end)
            if (e.key === "Enter" && isScanningMode && barcodeInputRef.current) {
              e.preventDefault();
              const scannedBarcode = barcodeInputRef.current.value.trim();
              if (scannedBarcode.length > 0) {
                if (barcodeTimeoutRef.current) {
                  clearTimeout(barcodeTimeoutRef.current);
                }
                setBarcodeFilter(scannedBarcode);
                setSearchQuery(""); // Clear general search when barcode is scanned
                setIsScanningMode(false);
                barcodeInputRef.current.value = "";
              }
            }
          }}
        />

      {/* Assets Table */}
      <Card className="border-2 border-card-border bg-card/80 backdrop-blur-sm shadow-lg relative z-0">
        <div className="overflow-x-auto">
        <Table className="w-full min-w-[800px] sm:min-w-0">
          <TableHeader>
          <TableRow>
            <TableHead>Asset Name</TableHead>
            <TableHead>Asset #</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Station</TableHead>
            <TableHead>Employee</TableHead>
            <TableHead>Serial #</TableHead>
            <TableHead>Barcode</TableHead>
            <TableHead>Assigned Qty</TableHead>
            <TableHead>Total Value</TableHead>
          </TableRow>
          </TableHeader>

          <TableBody>
            {filteredAssets.length > 0 ? (
              filteredAssets.map((a) => (
                <TableRow
                  key={`${a.id}-${a.pump_id || a.employee_id || "unassigned"}-${a.serial_number || a.barcode || ""}`}
                  className="hover:bg-white/80 transition"
                >
                  <TableCell>{a.asset_name}</TableCell>
                  <TableCell>{a.asset_number}</TableCell>
                  <TableCell>{a.categoryName ?? "-"}</TableCell>
                  <TableCell>{a.pumpName ?? "-"}</TableCell>
                  <TableCell>{a.employeeName ?? "-"}</TableCell>
                  <TableCell>{a.serial_number ?? "-"}</TableCell>
                  <TableCell>{a.barcode ?? "-"}</TableCell>
                  <TableCell>{a.assignmentQuantity ?? 0}</TableCell>
                  <TableCell>{(a.assignmentValue ?? 0).toFixed(2)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-500">
                  No assets found for the selected filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </Card>
      </div>
    </div>
  );
}
