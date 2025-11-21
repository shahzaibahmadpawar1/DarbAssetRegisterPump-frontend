import { useEffect, useState } from "react";
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
import BackToDashboardButton from "@/components/BackToDashboardButton";

type Pump = {
  id: number;
  name: string;
  location: string;
  manager: string;
  assetCount: number;
};

export default function AllStationsPage() {
  const [stations, setStations] = useState<Pump[]>([]);
  const [selected, setSelected] = useState<Pump | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [open, setOpen] = useState(false);

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
  const openDetails = (pump: Pump) => {
    setSelected(pump);
    setEditMode(false);
    setOpen(true);
  };

  // 🟢 Save edits
  const saveEdit = async () => {
    if (!selected) return;
    try {
      const res = await fetch(`${API_BASE}/api/pumps/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
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
      const res = await fetch(`${API_BASE}/api/pumps/${id}`, { method: "DELETE" });
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
        <h1 className="text-3xl font-bold">All Stations</h1>
        <Button 
          onClick={handlePrint} 
          variant="outline"
          className="bg-white/60 backdrop-blur-md hover:bg-white/80"
        >
          🖨️ Print
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg shadow-md">
        <Table className="w-full">
          <TableHeader className="bg-white/60 backdrop-blur-md">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Assets</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {stations.map((s) => (
              <TableRow
                key={s.id}
                className="bg-white/60 hover:bg-white/80 transition"
              >
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.location}</TableCell>
                <TableCell>{s.manager}</TableCell>
                <TableCell>{s.assetCount}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDetails(s)}
                  >
                    Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 🧩 Modal for Details/Edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
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
              {Object.entries({
                name: "Name",
                location: "Location",
                manager: "Manager",
              }).map(([key, label]) => (
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

              <div className="col-span-2 flex justify-between mt-4">
                {!editMode ? (
                  <>
                    <Button variant="outline" onClick={() => setEditMode(true)}>
                      ✏️ Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => deleteStation(selected.id)}
                    >
                      🗑️ Delete
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setEditMode(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={saveEdit}>💾 Save</Button>
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
