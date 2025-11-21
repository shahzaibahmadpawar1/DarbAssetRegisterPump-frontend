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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BackToDashboardButton from "@/components/BackToDashboardButton";

type Category = {
  id: string;
  name: string;
};

type Pump = {
  id: number;
  name: string;
};

type Asset = {
  id: number;
  asset_name: string;
  asset_number: string;
  serial_number: string;
  categoryName?: string;
  pumpName?: string;
  pump_id?: number | null;
  assignmentQuantity?: number;
  assignmentValue?: number;
  quantity?: number | null;
  asset_value?: number | null;
  totalValue?: number | null;
};

export default function AssetsByCategoryReport() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [categoryId, setCategoryId] = useState<string>("all");
  const [pumpId, setPumpId] = useState<string>("all");
  const [assets, setAssets] = useState<Asset[]>([]);

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

  // Load assets (filtered by category and/or pump)
  useEffect(() => {
    async function loadAssets() {
      try {
        let url = `${API_BASE}/api/reports/assets-by-category`;

        const params = new URLSearchParams();
        if (categoryId !== "all") params.append("category_id", categoryId);
        if (pumpId !== "all") params.append("pump_id", pumpId);

        if (params.toString()) url += `?${params.toString()}`;

        const res = await fetch(url, { credentials: "include" });
        const data = await res.json();
        // Trust the API response - backend already handles all filtering
        setAssets(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load assets:", err);
      }
    }

    loadAssets();
  }, [categoryId, pumpId]);

  const selectedPumpName =
    pumpId === "all"
      ? "All Stations"
      : pumps.find((p) => p.id.toString() === pumpId)?.name ?? "Station";
  const selectedCategoryName =
    categoryId === "all"
      ? "All Categories"
      : categories.find((c) => c.id === categoryId)?.name ?? "Category";

  // Calculate total value: sum of (assigned quantity × unit value) for each row
  const totalInventoryValue = useMemo(() => {
    return assets.reduce(
      (sum, asset) => {
        const assignedQty = asset.assignmentQuantity ?? 0;
        const unitValue = asset.asset_value ?? 0;
        return sum + (assignedQty * unitValue);
      },
      0
    );
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
          <h2>Category: ${selectedCategoryName} | Station: ${selectedPumpName}</h2>
          <h2 style="margin-top: 8px; margin-bottom: 16px;">Total Inventory Value: ${totalInventoryValue.toLocaleString()}</h2>
          <table>
            <thead>
              <tr>
                <th>Asset Name</th>
                <th>Asset #</th>
                <th>Serial #</th>
                <th>Category</th>
                <th>Station</th>
                <th>Assigned Qty</th>
                <th>Unit Value</th>
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
                    <td>${a.serial_number ?? ""}</td>
                    <td>${a.categoryName ?? "-"}</td>
                    <td>${a.pumpName ?? "-"}</td>
                    <td>${a.assignmentQuantity ?? 0}</td>
                    <td>${a.asset_value ?? 0}</td>
                    <td>${(a.assignmentQuantity ?? 0) * (a.asset_value ?? 0)}</td>
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
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <BackToDashboardButton />
        <div>
          <h1 className="text-3xl font-bold">Assets by Category</h1>
          <p className="text-sm text-muted-foreground">
            Total inventory value:{" "}
            <span className="font-semibold">
              {totalInventoryValue.toLocaleString()}
            </span>
          </p>
        </div>
      </div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-6 justify-between">
        <div className="flex flex-wrap items-center gap-6">
        {/* Category Filter */}
        <div className="flex items-center gap-3">
          <span className="font-semibold">Category:</span>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pump Filter */}
        <div className="flex items-center gap-3">
          <span className="font-semibold">Station:</span>
          <Select value={pumpId} onValueChange={setPumpId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select pump" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stations</SelectItem>
              {pumps.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        </div>
        <Button 
          variant="outline" 
          onClick={handlePrint}
          className="bg-white/60 backdrop-blur-md hover:bg-white/80"
        >
          🖨️ Print
        </Button>
      </div>

      {/* Assets Table */}
      <div className="overflow-x-auto rounded-lg shadow-md bg-white/60 backdrop-blur-md">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Asset Name</TableHead>
              <TableHead>Asset #</TableHead>
              <TableHead>Serial #</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Station</TableHead>
              <TableHead>Assigned Qty</TableHead>
              <TableHead>Unit Value</TableHead>
              <TableHead>Total Value</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {assets.length > 0 ? (
              assets.map((a) => (
                <TableRow
                  key={`${a.id}-${a.pump_id || 'unassigned'}`}
                  className="hover:bg-white/80 transition"
                >
                  <TableCell>{a.asset_name}</TableCell>
                  <TableCell>{a.asset_number}</TableCell>
                  <TableCell>{a.serial_number}</TableCell>
                  <TableCell>{a.categoryName ?? "-"}</TableCell>
                  <TableCell>{a.pumpName ?? "-"}</TableCell>
                  <TableCell>{a.assignmentQuantity ?? 0}</TableCell>
                  <TableCell>{a.asset_value ?? 0}</TableCell>
                  <TableCell>{((a.assignmentQuantity ?? 0) * (a.asset_value ?? 0))}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500">
                  {categoryId !== "all" || pumpId !== "all"
                    ? "No assets found for the selected filters."
                    : "No assets found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
