import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AddBatchModal from "./AddBatchModal";

interface Batch {
  id: number;
  purchase_date: string;
  purchase_price: number;
  quantity: number;
  remaining_quantity: number;
  barcode?: string | null;
  serial_number?: string | null;
  batch_name?: string | null;
  created_at: string;
}

interface ViewBatchesModalProps {
  open: boolean;
  onClose: () => void;
  assetId: number;
  assetName: string;
  onRefresh?: () => void;
}

export default function ViewBatchesModal({
  open,
  onClose,
  assetId,
  assetName,
  onRefresh,
}: ViewBatchesModalProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingBatchId, setDeletingBatchId] = useState<number | null>(null);
  const [showAddBatch, setShowAddBatch] = useState(false);

  useEffect(() => {
    if (open && assetId) {
      fetchBatches();
    } else {
      setBatches([]);
      setError("");
    }
  }, [open, assetId]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/api/assets/${assetId}/batches`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch batches");
      const data = await res.json();
      setBatches(data || []);
    } catch (err: any) {
      console.error("Error loading batches:", err);
      setError("Failed to load purchase batches.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBatch = async (batchId: number) => {
    if (!confirm("Are you sure you want to delete this batch? This cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/assets/${assetId}/batches/${batchId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to delete batch");
      await fetchBatches();
      if (onRefresh) onRefresh();
      setDeletingBatchId(null);
    } catch (err: any) {
      alert(err?.message || "Error deleting batch");
    }
  };

  const handleUpdateBatch = async (
    batchId: number,
    purchasePrice: number,
    purchaseDate: string,
    serialNumber: string,
    barcode: string,
    batchName: string
  ) => {
    try {
      const res = await fetch(`${API_BASE}/api/assets/${assetId}/batches/${batchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          purchase_price: purchasePrice,
          purchase_date: purchaseDate ? new Date(purchaseDate).toISOString() : undefined,
          serial_number: serialNumber.trim(),
          barcode: barcode.trim(),
          batch_name: batchName?.trim() || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to update batch");
      await fetchBatches();
      if (onRefresh) onRefresh();
      setShowEditModal(false);
      setEditingBatch(null);
    } catch (err: any) {
      alert(err?.message || "Error updating batch");
    }
  };

  const handleBatchAdded = () => {
    fetchBatches();
    if (onRefresh) onRefresh();
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const totalValue = batches.reduce(
    (sum, batch) => sum + batch.quantity * batch.purchase_price,
    0
  );
  const totalRemainingValue = batches.reduce(
    (sum, batch) => sum + batch.remaining_quantity * batch.purchase_price,
    0
  );
  const totalQuantity = batches.reduce((sum, batch) => sum + batch.quantity, 0);
  const totalRemaining = batches.reduce(
    (sum, batch) => sum + batch.remaining_quantity,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle>Purchase Batches - {assetName}</DialogTitle>
              <DialogDescription>
                View all purchase batches and their prices for this asset.
              </DialogDescription>
            </div>
            <Button
              onClick={() => setShowAddBatch(true)}
              size="sm"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Batch
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading batches...
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">{error}</div>
        ) : batches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No purchase batches found for this asset.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Total Batches</div>
                <div className="text-lg font-semibold">{batches.length}</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Total Quantity</div>
                <div className="text-lg font-semibold">{totalQuantity}</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Remaining</div>
                <div className="text-lg font-semibold">{totalRemaining}</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Total Value</div>
                <div className="text-lg font-semibold">
                  {totalValue.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Batches Table */}
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Purchase Price</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Used</TableHead>
                    <TableHead>Batch Value</TableHead>
                    <TableHead>Remaining Value</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => {
                    const used = batch.quantity - batch.remaining_quantity;
                    const batchValue = batch.quantity * batch.purchase_price;
                    const remainingValue =
                      batch.remaining_quantity * batch.purchase_price;
                    return (
                      <TableRow key={batch.id}>
                        <TableCell className="font-semibold">
                          {batch.batch_name ?? "—"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatDate(batch.purchase_date)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {batch.serial_number ?? "—"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {batch.purchase_price.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {batch.barcode ?? "—"}
                        </TableCell>
                        <TableCell>{batch.quantity}</TableCell>
                        <TableCell>{batch.remaining_quantity}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {used}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {batchValue.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {remainingValue.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingBatch(batch);
                                setShowEditModal(true);
                              }}
                              title="Edit Batch"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {batch.remaining_quantity === batch.quantity && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingBatchId(batch.id)}
                                title="Delete Batch"
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Footer Summary */}
            <div className="flex justify-between items-center pt-2 border-t">
              <div className="text-sm text-muted-foreground">
                Total Remaining Value:{" "}
                <span className="font-semibold text-foreground">
                  {totalRemainingValue.toLocaleString()}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Total Used Value:{" "}
                <span className="font-semibold text-foreground">
                  {(totalValue - totalRemainingValue).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>

      {/* Edit Batch Modal */}
      {editingBatch && (
        <EditBatchModal
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingBatch(null);
          }}
          batch={editingBatch}
          onSave={(price, date, serial, barcode, batchName) =>
            handleUpdateBatch(editingBatch.id, price, date, serial, barcode, batchName)
          }
        />
      )}

      {/* Delete Confirmation */}
      {deletingBatchId && (
        <Dialog open={!!deletingBatchId} onOpenChange={() => setDeletingBatchId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Batch</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this batch? This action cannot be undone.
                You can only delete batches that haven't been used (remaining quantity equals total quantity).
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDeletingBatchId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteBatch(deletingBatchId)}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Batch Modal */}
      <AddBatchModal
        open={showAddBatch}
        onClose={() => setShowAddBatch(false)}
        assetId={assetId}
        assetName={assetName}
        onSuccess={handleBatchAdded}
      />
    </Dialog>
  );
}

// Edit Batch Modal Component
interface EditBatchModalProps {
  open: boolean;
  onClose: () => void;
  batch: Batch;
  onSave: (price: number, date: string, serial: string, barcode: string, batchName: string) => void;
}

function EditBatchModal({ open, onClose, batch, onSave }: EditBatchModalProps) {
  const [price, setPrice] = useState(batch.purchase_price.toString());
  const [date, setDate] = useState(
    new Date(batch.purchase_date).toISOString().split("T")[0]
  );
  const [serial, setSerial] = useState(batch.serial_number ?? "");
  const [barcode, setBarcode] = useState(batch.barcode ?? "");
  const [batchName, setBatchName] = useState(batch.batch_name ?? "");

  useEffect(() => {
    if (open) {
      setPrice(batch.purchase_price.toString());
      setDate(new Date(batch.purchase_date).toISOString().split("T")[0]);
      setSerial(batch.serial_number ?? "");
      setBarcode(batch.barcode ?? "");
      setBatchName(batch.batch_name ?? "");
    }
  }, [open, batch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      alert("Please enter a valid price");
      return;
    }
    if (!serial.trim()) {
      alert("Serial number is required.");
      return;
    }
    if (!barcode.trim()) {
      alert("Barcode is required.");
      return;
    }
    onSave(numPrice, date, serial.trim(), barcode.trim(), batchName.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Batch</DialogTitle>
          <DialogDescription>
            Update the purchase price, date, serial number, or batch name for this batch. Note: Quantity cannot change.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Batch Name (optional)</Label>
            <Input value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="Enter a name for this batch" />
          </div>
          <div>
            <Label>Serial Number *</Label>
            <Input value={serial} onChange={(e) => setSerial(e.target.value)} required />
          </div>
          <div>
            <Label>Barcode *</Label>
            <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} required />
          </div>
          <div>
            <Label>Purchase Price (per unit) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Purchase Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Quantity: {batch.quantity} (cannot be changed)</p>
            <p>Remaining: {batch.remaining_quantity}</p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

