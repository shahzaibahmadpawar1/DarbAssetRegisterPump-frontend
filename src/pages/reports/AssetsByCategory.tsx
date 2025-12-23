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
import { Printer, QrCode } from "lucide-react";
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
  
  // Determine active filter type for column visibility
  const activeFilterType = useMemo(() => {
    if (selectedEmployee) return "employee";
    if (selectedStation) return "station";
    if (selectedSerial || barcodeFilter) return "serial_barcode";
    return null;
  }, [selectedEmployee, selectedStation, selectedSerial, barcodeFilter]);

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
      setAllAssets(assetsData);
      
      // Set assets to allAssets if no filters are active
      if (!selectedEmployee && !selectedStation && !selectedSerial && !barcodeFilter) {
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
      
      (Array.isArray(data) ? data : []).forEach((asset: any) => {
        // Process station assignments
        if (asset.assignments && Array.isArray(asset.assignments)) {
          asset.assignments.forEach((assignment: any) => {
            if (assignment.batch_allocations && Array.isArray(assignment.batch_allocations)) {
              assignment.batch_allocations.forEach((alloc: any) => {
                // Check if this allocation has the matching barcode
                if (alloc.barcode?.toLowerCase() === barcode.toLowerCase()) {
                  const batch = alloc.asset_purchase_batches;
                  if (batch) {
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
                      assignmentValue: batch.purchase_price || 0,
                    });
                  }
                }
              });
            }
          });
        }
        
        // Note: Employee assignments are not included in the backend search response
        // They would need to be fetched separately if needed
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
      
      (Array.isArray(data) ? data : []).forEach((asset: any) => {
        // Process station assignments
        if (asset.assignments && Array.isArray(asset.assignments)) {
          asset.assignments.forEach((assignment: any) => {
            if (assignment.batch_allocations && Array.isArray(assignment.batch_allocations)) {
              assignment.batch_allocations.forEach((alloc: any) => {
                // Check if this allocation has the matching serial number
                if (alloc.serial_number?.toLowerCase() === serial.toLowerCase()) {
                  const batch = alloc.asset_purchase_batches || alloc.batch;
                  if (batch) {
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
                      assignmentValue: batch.purchase_price || 0,
                    });
                  }
                }
              });
            }
          });
        }
      });
      
      // Fetch employee assignments for this serial number
      try {
        const empRes = await fetch(
          `${API_BASE}/api/employees`,
          {
            credentials: "include",
            headers: {
              ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
            },
          }
        );
        if (empRes.ok) {
          const allEmployees = await empRes.json();
          // Check each employee's assignments
          for (const emp of (allEmployees || [])) {
            try {
              const empAssignRes = await fetch(
                `${API_BASE}/api/employees/${emp.id}/assignments`,
                {
                  credentials: "include",
                  headers: {
                    ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
                  },
                }
              );
              if (empAssignRes.ok) {
                const empAssignments = await empAssignRes.json();
                (empAssignments || []).forEach((empAssign: any) => {
                  if (empAssign.serial_number?.toLowerCase() === serial.toLowerCase()) {
                    const batch = empAssign.batch;
                    const assetFromBatch = batch?.asset;
                    if (assetFromBatch && batch) {
                      flattenedAssets.push({
                        id: assetFromBatch.id,
                        asset_name: assetFromBatch.asset_name || assetFromBatch.name || "Unknown Asset",
                        asset_number: assetFromBatch.asset_number || "—",
                        categoryName: assetFromBatch.categoryName || assetFromBatch.category?.name || null,
                        pumpName: undefined,
                        pump_id: undefined,
                        employeeName: emp.name || null,
                        employee_id: emp.id || null,
                        serial_number: empAssign.serial_number || null,
                        barcode: empAssign.barcode || null,
                        assignmentQuantity: 1,
                        assignmentValue: batch.purchase_price || 0,
                      });
                    }
                  }
                });
              }
            } catch (err) {
              // Skip this employee if there's an error
              continue;
            }
          }
        }
      } catch (empErr) {
        console.error("Error fetching employee assignments for serial:", empErr);
      }
      
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

  // Handle filter changes
  useEffect(() => {
    // Clear other filters when one is selected
    if (selectedEmployee) {
      setSelectedStation("");
      setSelectedSerial("");
      setBarcodeFilter(null);
      setStationSearch("");
      setSerialSearch("");
      fetchAssetsByEmployee(Number(selectedEmployee));
    } else if (selectedStation) {
      setSelectedEmployee("");
      setSelectedSerial("");
      setBarcodeFilter(null);
      setEmployeeSearch("");
      setSerialSearch("");
      fetchAssetsByStation(Number(selectedStation));
    } else if (selectedSerial) {
      setSelectedEmployee("");
      setSelectedStation("");
      setBarcodeFilter(null);
      setEmployeeSearch("");
      setStationSearch("");
      loadAssetsBySerial(selectedSerial);
    } else if (barcodeFilter) {
      setSelectedEmployee("");
      setSelectedStation("");
      setSelectedSerial("");
      setEmployeeSearch("");
      setStationSearch("");
      setSerialSearch("");
      loadAssetsByBarcode(barcodeFilter);
    } else {
      // Explicitly reload all assets when all filters are cleared
      loadAssets();
    }
  }, [selectedEmployee, selectedStation, selectedSerial, barcodeFilter]);

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
    if (!selectedEmployee && !selectedStation && !selectedSerial && !barcodeFilter) {
      setAssets(allAssets);
    }
  }, [allAssets, selectedEmployee, selectedStation, selectedSerial, barcodeFilter]);

  // Calculate total value: sum of assignmentValue for each row
  const totalInventoryValue = useMemo(() => {
    return assets.reduce((sum, asset) => sum + (asset.assignmentValue ?? 0), 0);
  }, [assets]);

  const handlePrint = () => {
    if (assets.length === 0) {
      alert("Nothing to print for the selected filters.");
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let filterText = "All Assets";
    if (selectedEmployee) {
      const emp = employees.find(e => e.id === Number(selectedEmployee));
      filterText = `Employee: ${emp?.name || selectedEmployee}`;
    } else if (selectedStation) {
      const station = pumps.find(p => p.id === Number(selectedStation));
      filterText = `Station: ${station?.name || selectedStation}`;
    } else if (selectedSerial) {
      filterText = `Serial Number: ${selectedSerial}`;
    } else if (barcodeFilter) {
      filterText = `Barcode: ${barcodeFilter}`;
    }

    const showStation = activeFilterType === "station" || activeFilterType === "serial_barcode";
    const showEmployee = activeFilterType === "employee" || activeFilterType === "serial_barcode";
    const showCategory = activeFilterType !== "station";

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
              ${assets
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
        {/* Filters and Barcode Scanner */}
        <Card className="border-2 border-card-border bg-card/80 backdrop-blur-sm shadow-lg p-6 relative z-10">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Employee Filter - Searchable */}
              <div className="relative z-20">
                <Input
                  type="text"
                  placeholder="Search Employee..."
                  value={employeeSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEmployeeSearch(e.target.value);
                    setShowEmployeeDropdown(true);
                  }}
                  onFocus={() => setShowEmployeeDropdown(true)}
                  onBlur={() => setTimeout(() => setShowEmployeeDropdown(false), 200)}
                  className="h-11 border-2 focus:border-primary"
                />
                {showEmployeeDropdown && (
                  <div className="absolute z-[9999] w-full mt-1 bg-white border-2 border-primary/20 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div
                      className="px-3 py-2 hover:bg-primary/10 cursor-pointer"
                      onClick={() => {
                        setSelectedEmployee("");
                        setEmployeeSearch("");
                        setShowEmployeeDropdown(false);
                      }}
                    >
                      All Employees
                    </div>
                    {employees
                      .filter((emp) =>
                        !employeeSearch ||
                        emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
                        emp.employee_id?.toLowerCase().includes(employeeSearch.toLowerCase())
                      )
                      .map((emp) => (
                        <div
                          key={emp.id}
                          className="px-3 py-2 hover:bg-primary/10 cursor-pointer"
                          onClick={() => {
                            setSelectedEmployee(String(emp.id));
                            setEmployeeSearch(`${emp.name}${emp.employee_id ? ` (${emp.employee_id})` : ""}`);
                            setShowEmployeeDropdown(false);
                          }}
                        >
                          {emp.name} {emp.employee_id ? `(${emp.employee_id})` : ""}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Station Filter - Searchable */}
              <div className="relative z-20">
                <Input
                  type="text"
                  placeholder="Search Station..."
                  value={stationSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setStationSearch(e.target.value);
                    setShowStationDropdown(true);
                  }}
                  onFocus={() => setShowStationDropdown(true)}
                  onBlur={() => setTimeout(() => setShowStationDropdown(false), 200)}
                  className="h-11 border-2 focus:border-primary"
                />
                {showStationDropdown && (
                  <div className="absolute z-[9999] w-full mt-1 bg-white border-2 border-primary/20 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div
                      className="px-3 py-2 hover:bg-primary/10 cursor-pointer"
                      onClick={() => {
                        setSelectedStation("");
                        setStationSearch("");
                        setShowStationDropdown(false);
                      }}
                    >
                      All Stations
                    </div>
                    {pumps
                      .filter((pump) =>
                        !stationSearch ||
                        pump.name.toLowerCase().includes(stationSearch.toLowerCase())
                      )
                      .map((pump) => (
                        <div
                          key={pump.id}
                          className="px-3 py-2 hover:bg-primary/10 cursor-pointer"
                          onClick={() => {
                            setSelectedStation(String(pump.id));
                            setStationSearch(pump.name);
                            setShowStationDropdown(false);
                          }}
                        >
                          {pump.name}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Serial Number Filter - Searchable */}
              <div className="relative z-20">
                <Input
                  type="text"
                  placeholder="Search Serial Number..."
                  value={serialSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setSerialSearch(e.target.value);
                    setShowSerialDropdown(true);
                  }}
                  onFocus={() => setShowSerialDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSerialDropdown(false), 200)}
                  className="h-11 border-2 focus:border-primary"
                />
                {showSerialDropdown && (
                  <div className="absolute z-[9999] w-full mt-1 bg-white border-2 border-primary/20 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div
                      className="px-3 py-2 hover:bg-primary/10 cursor-pointer"
                      onClick={() => {
                        setSelectedSerial("");
                        setSerialSearch("");
                        setShowSerialDropdown(false);
                      }}
                    >
                      All Serial Numbers
                    </div>
                    {allSerialNumbers
                      .filter((serial) =>
                        !serialSearch ||
                        serial.toLowerCase().includes(serialSearch.toLowerCase())
                      )
                      .map((serial) => (
                        <div
                          key={serial}
                          className="px-3 py-2 hover:bg-primary/10 cursor-pointer"
                          onClick={() => {
                            setSelectedSerial(serial);
                            setSerialSearch(serial);
                            setShowSerialDropdown(false);
                          }}
                        >
                          {serial}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Barcode Scanner */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsScanningMode(true);
                  }}
                  className={`flex-1 border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300 h-11 ${isScanningMode ? "ring-2 ring-primary ring-offset-2" : ""}`}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  {isScanningMode ? "Scanning..." : "Scan Barcode"}
                </Button>
        <Button 
          variant="outline" 
          onClick={handlePrint}
                  className="border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300 font-medium shrink-0 h-11"
                >
                  <Printer className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Active Filter Display */}
            {(selectedEmployee || selectedStation || selectedSerial || barcodeFilter) && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {selectedEmployee && (
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                    Employee: {employees.find(e => e.id === Number(selectedEmployee))?.name || selectedEmployee}
                  </span>
                )}
                {selectedStation && (
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                    Station: {pumps.find(p => p.id === Number(selectedStation))?.name || selectedStation}
                  </span>
                )}
                {selectedSerial && (
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                    Serial: {selectedSerial}
                  </span>
                )}
                {barcodeFilter && (
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                    Barcode: {barcodeFilter}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedEmployee("");
                    setSelectedStation("");
                    setSelectedSerial("");
                    setBarcodeFilter(null);
                    setIsScanningMode(false);
                    setEmployeeSearch("");
                    setStationSearch("");
                    setSerialSearch("");
                  }}
                  className="h-7 text-xs"
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </Card>

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
              <strong>Searching...</strong> Please wait while we search for assets{barcodeFilter ? ` with barcode: ${barcodeFilter}` : selectedSerial ? ` with serial number: ${selectedSerial}` : ""}
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
            {activeFilterType !== "station" && <TableHead>Category</TableHead>}
            {(activeFilterType === "station" || activeFilterType === "serial_barcode") && <TableHead>Station</TableHead>}
            {(activeFilterType === "employee" || activeFilterType === "serial_barcode") && <TableHead>Employee</TableHead>}
            {activeFilterType === null && <TableHead>Station</TableHead>}
            <TableHead>Serial #</TableHead>
            <TableHead>Barcode</TableHead>
            <TableHead>Assigned Qty</TableHead>
            <TableHead>Total Value</TableHead>
          </TableRow>
          </TableHeader>

          <TableBody>
            {assets.length > 0 ? (
              assets.map((a) => (
                <TableRow
                  key={`${a.id}-${a.pump_id || a.employee_id || "unassigned"}-${a.serial_number || a.barcode || ""}`}
                  className="hover:bg-white/80 transition"
                >
                  <TableCell>{a.asset_name}</TableCell>
                  <TableCell>{a.asset_number}</TableCell>
                  {activeFilterType !== "station" && <TableCell>{a.categoryName ?? "-"}</TableCell>}
                  {(activeFilterType === "station" || activeFilterType === "serial_barcode") && <TableCell>{a.pumpName ?? "-"}</TableCell>}
                  {(activeFilterType === "employee" || activeFilterType === "serial_barcode") && <TableCell>{a.employeeName ?? "-"}</TableCell>}
                  {activeFilterType === null && <TableCell>{a.pumpName ?? "-"}</TableCell>}
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
