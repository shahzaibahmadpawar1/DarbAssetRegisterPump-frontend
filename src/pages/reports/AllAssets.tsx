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

type AssetRow = Asset & {
  asset_value?: number | null;
  category_id?: string | null;
  categoryName?: string | null;
};

type Pump = { id: number; name: string };
type Category = { id: string; name: string };

type AssignmentDraft = {
  id?: number;
  pump_id: number | null;
  quantity: number | null;
};

const sanitizeAssignmentDrafts = (rows: AssignmentDraft[]) =>
  rows
    .filter(
      (row) =>
        row.pump_id != null &&
        row.quantity != null &&
        Number(row.quantity) > 0
    )
    .map((row) => ({
      pump_id: row.pump_id!,
      quantity: Number(row.quantity),
      id: row.id,
    }));

const draftTotalQuantity = (rows: AssignmentDraft[]) =>
  rows.reduce((sum, row) => sum + (row.quantity ? Number(row.quantity) : 0), 0);

const buildAssetPayload = (asset: AssetRow) => ({
  asset_name: asset.asset_name,
  asset_number: asset.asset_number,
  serial_number: asset.serial_number,
  barcode: asset.barcode,
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

  // Assign modal state
  const [assignOpen, setAssignOpen] = useState(false);
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [assignCatId, setAssignCatId] = useState<string>("none");
  const [assignmentRows, setAssignmentRows] = useState<AssignmentDraft[]>([]);
  const [assignmentError, setAssignmentError] = useState<string>("");
  const addAssignmentRow = () =>
    setAssignmentRows((rows) => [...rows, { pump_id: null, quantity: null }]);
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

  useEffect(() => {
    if (!assignOpen) {
      setAssignmentError("");
      return;
    }
    if (remainingDraft < 0) {
      setAssignmentError("Assigned quantity exceeds available stock.");
    } else {
      setAssignmentError("");
    }
  }, [assignOpen, remainingDraft]);

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
                <th>Serial #</th>
                <th>Barcode</th>
                <th>Quantity</th>
                <th>Units</th>
                <th>Unit Value</th>
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
                    <td>${a.serial_number ?? ""}</td>
                    <td>${a.barcode ?? ""}</td>
                    <td>${a.quantity ?? ""}</td>
                    <td>${a.units ?? ""}</td>
                    <td>${a.asset_value ?? 0}</td>
                    <td>${a.totalValue ?? 0}</td>
                    <td>${a.remarks ?? ""}</td>
                    <td>${a.categoryName ?? "-"}</td>
                    <td>${
                      a.assignments && a.assignments.length > 0
                        ? a.assignments
                            .map(
                              (as) =>
                                `${as.pump_name || `Pump #${as.pump_id}`}: ${as.quantity}`
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
    setAssignmentRows(
      asset.assignments && asset.assignments.length > 0
        ? asset.assignments.map((assignment) => ({
            id: assignment.id,
            pump_id: assignment.pump_id,
            quantity: assignment.quantity,
          }))
        : [{ pump_id: null, quantity: null }]
    );
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
              <TableHead>Serial #</TableHead>
              <TableHead>Unit Value</TableHead>
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
                <TableCell>{a.serial_number}</TableCell>
                <TableCell>{a.asset_value ?? 0}</TableCell>
                <TableCell>{a.totalValue ?? 0}</TableCell>
                <TableCell>{a.categoryName ?? "-"}</TableCell>
                <TableCell>
                  {a.assignments && a.assignments.length > 0 ? (
                    <div className="flex flex-col text-sm text-muted-foreground">
                      {a.assignments.slice(0, 2).map((assignment) => (
                        <span key={assignment.id}>
                          {assignment.pump_name || `Pump #${assignment.pump_id}`} ·{" "}
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
                    <Button variant="outline" size="sm" onClick={() => openDetails(a)} className="text-xs">Details</Button>
                    <Button variant="outline" size="sm" onClick={() => openAssign(a)} className="text-xs">Assign</Button>
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
            <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={(e) => e.preventDefault()}>
              {(
                [
                  ["asset_name", "Asset Name"],
                  ["asset_number", "Asset #"],
                  ["serial_number", "Serial #"],
                  ["barcode", "Barcode"],
                  ["quantity", "Quantity"],
                  ["units", "Units"],
                  ["asset_value", "Value"], // ✅ Added
                  ["remarks", "Remarks"],
                ] as const
              ).map(([key, label]) => (
                <div className="col-span-1 sm:col-span-1" key={key}>
                  <Label>{label}</Label>
                  <Input
                    type={key === "asset_value" ? "number" : "text"}
                    step={key === "asset_value" ? "0.01" : undefined}
                    value={(selected as any)[key] ?? ""}
                    disabled={!editMode}
                    onChange={(e) => {
                      const isNumeric = key === "asset_value" || key === "quantity";
                      const nextValue = isNumeric
                        ? e.target.value === ""
                          ? null
                          : Number(e.target.value)
                        : e.target.value;
                      setSelected({ ...selected, [key]: nextValue });
                    }}
                  />
                </div>
              ))}

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
          )}
        </DialogContent>
      </Dialog>

      {/* ASSIGN dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Asset</DialogTitle>
            <DialogDescription>
              Split the asset quantity across stations and optionally update category.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex-1">
                  <Label>Station Allocations</Label>
                  <p className="text-xs text-muted-foreground">
                    Assign quantities to one or more petrol pumps.
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

              {assignmentRows.map((row, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
                  <div className="col-span-1 sm:col-span-3">
                    <Label className="text-xs uppercase tracking-wide">Pump</Label>
                    <Select
                      value={row.pump_id?.toString() ?? "none"}
                      onValueChange={(val) =>
                        updateAssignmentRow(index, {
                          pump_id: val === "none" ? null : Number(val),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Pump" />
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
                  <div className="col-span-1 sm:col-span-2">
                    <Label className="text-xs uppercase tracking-wide">Quantity</Label>
                    <Input
                      type="number"
                      min={0}
                      value={row.quantity ?? ""}
                      onChange={(e) =>
                        updateAssignmentRow(index, {
                          quantity:
                            e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="col-span-1 sm:col-span-5 flex justify-start sm:justify-end">
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
              ))}

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
    </div>
  );
}
