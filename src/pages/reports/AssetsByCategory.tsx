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
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Printer, Search } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchType, setSearchType] = useState<"station" | "employee" | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);

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
  useEffect(() => {
    async function loadAssets() {
      try {
        const res = await fetch(`${API_BASE}/api/reports/assets-by-category`, { credentials: "include" });
        const data = await res.json();
        setAllAssets(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load assets:", err);
      }
    }

    loadAssets();
  }, []);

  // Fetch assets assigned to a specific employee
  const fetchAssetsByEmployee = async (employeeId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/reports/assets-by-category?employee_id=${employeeId}`, {
        credentials: "include",
      });
      const data = await res.json();
      
      // Enhance assets with employee name
      const employee = employees.find(e => e.id === employeeId);
      const enhancedAssets = (Array.isArray(data) ? data : []).map((asset: Asset) => ({
        ...asset,
        employeeName: employee?.name || null,
        employee_id: employeeId,
      }));
      
      setAssets(enhancedAssets);
    } catch (err) {
      console.error("Failed to load assets by employee:", err);
      setAssets([]);
    }
  };

  // Filter assets based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setAssets(allAssets);
      setSearchType(null);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    
    // Check if search matches a station
    const matchedStation = pumps.find(p => 
      p.name.toLowerCase().includes(query)
    );
    
    // Check if search matches an employee
    const matchedEmployee = employees.find(e => 
      e.name.toLowerCase().includes(query) ||
      e.employee_id?.toLowerCase().includes(query)
    );

    if (matchedStation) {
      setSearchType("station");
      // Filter assets by station
      const filtered = allAssets.filter(a => 
        a.pump_id === matchedStation.id
      );
      setAssets(filtered);
    } else if (matchedEmployee) {
      setSearchType("employee");
      // Fetch and filter assets by employee
      fetchAssetsByEmployee(matchedEmployee.id);
    } else {
      // No match found, show empty or all assets
      setSearchType(null);
      setAssets([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, allAssets, pumps, employees]);

  // Determine search context for display
  const searchContext = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase().trim();
    const matchedStation = pumps.find(p => p.name.toLowerCase().includes(query));
    const matchedEmployee = employees.find(e => 
      e.name.toLowerCase().includes(query) || e.employee_id?.toLowerCase().includes(query)
    );
    return matchedStation ? { type: "station", name: matchedStation.name } :
           matchedEmployee ? { type: "employee", name: matchedEmployee.name } : null;
  }, [searchQuery, pumps, employees]);

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

    const html = `
      <html>
        <head>
          <title>Assets by Category Report</title>
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
          <h1>Assets by Category</h1>
          <h2>${searchContext ? `${searchContext.type === "station" ? "Station" : "Employee"}: ${searchContext.name}` : "All Assets"}</h2>
          <h2 style="margin-top: 8px; margin-bottom: 16px;">Total Inventory Value: ${totalInventoryValue.toLocaleString()}</h2>
          <table>
            <thead>
              <tr>
                <th>Asset Name</th>
                <th>Asset #</th>
                ${searchType !== "station" ? "<th>Category</th>" : ""}
                ${searchType !== "station" && searchType !== "employee" ? "<th>Station</th>" : ""}
                ${searchType === "employee" ? "<th>Employee</th>" : ""}
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
                    ${searchType !== "station" ? `<td>${a.categoryName ?? "-"}</td>` : ""}
                    ${searchType !== "station" && searchType !== "employee" ? `<td>${a.pumpName ?? "-"}</td>` : ""}
                    ${searchType === "employee" ? `<td>${a.employeeName ?? "-"}</td>` : ""}
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
              Assets by Category
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
        <Card className="border-2 border-card-border bg-card/80 backdrop-blur-sm shadow-lg p-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 justify-between">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by station or employee name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 border-2 focus:border-primary transition-colors bg-card/80 backdrop-blur-sm"
              />
              {searchContext && (
                <p className="text-sm text-muted-foreground mt-2">
                  Showing results for: <span className="font-semibold text-primary">
                    {searchContext.type === "station" ? "Station" : "Employee"}: {searchContext.name}
                  </span>
                </p>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={handlePrint}
              className="border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300 font-medium shrink-0"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </Card>

      {/* Assets Table */}
      <Card className="border-2 border-card-border bg-card/80 backdrop-blur-sm shadow-lg">
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[800px] sm:min-w-0">
          <TableHeader>
          <TableRow>
            <TableHead>Asset Name</TableHead>
            <TableHead>Asset #</TableHead>
            {searchType !== "station" && <TableHead>Category</TableHead>}
            {searchType !== "station" && searchType !== "employee" && <TableHead>Station</TableHead>}
            {searchType === "employee" && <TableHead>Employee</TableHead>}
            <TableHead>Assigned Qty</TableHead>
            <TableHead>Total Value</TableHead>
          </TableRow>
          </TableHeader>

          <TableBody>
            {assets.length > 0 ? (
              assets.map((a) => (
                <TableRow
                  key={`${a.id}-${a.pump_id || a.employee_id || "unassigned"}`}
                  className="hover:bg-white/80 transition"
                >
                  <TableCell>{a.asset_name}</TableCell>
                  <TableCell>{a.asset_number}</TableCell>
                  {searchType !== "station" && <TableCell>{a.categoryName ?? "-"}</TableCell>}
                  {searchType !== "station" && searchType !== "employee" && <TableCell>{a.pumpName ?? "-"}</TableCell>}
                  {searchType === "employee" && <TableCell>{a.employeeName ?? "-"}</TableCell>}
                  <TableCell>{a.assignmentQuantity ?? 0}</TableCell>
                  <TableCell>{(a.assignmentValue ?? 0).toFixed(2)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={searchType === "station" ? 5 : searchType === "employee" ? 6 : 6} className="text-center text-gray-500">
                  {searchQuery.trim()
                    ? searchContext 
                      ? `No assets found for ${searchContext.type === "station" ? "station" : "employee"}: ${searchContext.name}`
                      : "No matching station or employee found."
                    : "No assets found."}
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
