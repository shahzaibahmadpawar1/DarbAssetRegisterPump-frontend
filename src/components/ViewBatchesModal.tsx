import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { useUserRole } from "@/hooks/useUserRole";
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
  const { isAdmin, isViewingUser, isAssigningUser } = useUserRole();
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
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/assets/${assetId}/batches/${batchId}`, {
        method: "DELETE",
        headers: {
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
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
    batchName: string
  ) => {
    try {
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/assets/${assetId}/batches/${batchId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          purchase_price: purchasePrice,
          purchase_date: purchaseDate ? new Date(purchaseDate).toISOString() : undefined,
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-2 border-card-border">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl font-bold">Purchase Batches - {assetName}</DialogTitle>
              <DialogDescription className="text-base mt-2">
                View all purchase batches and their prices for this asset.
              </DialogDescription>
            </div>
            {isAdmin && !isViewingUser && !isAssigningUser && (
              <Button
                onClick={() => setShowAddBatch(true)}
                size="sm"
                className="gap-2 bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300 font-semibold"
              >
                <Plus className="w-4 h-4" />
                Add Batch
              </Button>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground text-lg">Loading batches...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-destructive font-medium">{error}</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground text-lg">No purchase batches found for this asset.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border-2 border-card-border rounded-xl p-4 bg-card/60 backdrop-blur-sm hover:border-primary/50 transition-all duration-300">
                <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Total Batches</div>
                <div className="text-2xl font-bold text-primary">{batches.length}</div>
              </div>
              <div className="border-2 border-card-border rounded-xl p-4 bg-card/60 backdrop-blur-sm hover:border-primary/50 transition-all duration-300">
                <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Total Quantity</div>
                <div className="text-2xl font-bold text-foreground">{totalQuantity}</div>
              </div>
              <div className="border-2 border-card-border rounded-xl p-4 bg-card/60 backdrop-blur-sm hover:border-primary/50 transition-all duration-300">
                <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Remaining</div>
                <div className="text-2xl font-bold text-foreground">{totalRemaining}</div>
              </div>
              <div className="border-2 border-card-border rounded-xl p-4 bg-card/60 backdrop-blur-sm hover:border-primary/50 transition-all duration-300">
                <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Total Value</div>
                <div className="text-2xl font-bold text-primary">
                  ${totalValue.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Batches Table */}
            <div className="border-2 border-card-border rounded-lg overflow-hidden bg-card/60 backdrop-blur-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Purchase Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Used</TableHead>
                    <TableHead>Batch Value</TableHead>
                    <TableHead>Remaining Value</TableHead>
                    {isAdmin && <TableHead>Actions</TableHead>}
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
                        <TableCell className="font-semibold">
                          {batch.purchase_price.toLocaleString()}
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
                          {isAdmin && !isViewingUser && !isAssigningUser && (
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
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Footer Summary */}
            <div className="flex justify-between items-center pt-4 border-t-2 border-card-border">
              <div className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
                <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Total Remaining Value</div>
                <div className="text-lg font-bold text-primary">
                  ${totalRemainingValue.toLocaleString()}
                </div>
              </div>
              <div className="px-4 py-2 rounded-lg bg-muted/50 border border-border">
                <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Total Used Value</div>
                <div className="text-lg font-bold text-foreground">
                  ${(totalValue - totalRemainingValue).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-6 border-t-2 border-card-border mt-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300 font-medium"
          >
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
          onSave={(price, date, batchName) =>
            handleUpdateBatch(editingBatch.id, price, date, batchName)
          }
        />
      )}

      {/* Delete Confirmation */}
      {deletingBatchId && (
        <Dialog open={!!deletingBatchId} onOpenChange={() => setDeletingBatchId(null)}>
          <DialogContent className="border-2 border-card-border">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Delete Batch</DialogTitle>
              <DialogDescription className="text-base">
                Are you sure you want to delete this batch? This action cannot be undone.
                You can only delete batches that haven't been used (remaining quantity equals total quantity).
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 pt-6">
              <Button 
                variant="outline" 
                onClick={() => setDeletingBatchId(null)}
                className="border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteBatch(deletingBatchId)}
                className="shadow-md hover:shadow-lg transition-all duration-300 font-semibold"
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
  onSave: (price: number, date: string, batchName: string) => void;
}

function EditBatchModal({ open, onClose, batch, onSave }: EditBatchModalProps) {
  const [price, setPrice] = useState(batch.purchase_price.toString());
  const [date, setDate] = useState(
    new Date(batch.purchase_date).toISOString().split("T")[0]
  );
  const [batchName, setBatchName] = useState(batch.batch_name ?? "");

  useEffect(() => {
    if (open) {
      setPrice(batch.purchase_price.toString());
      setDate(new Date(batch.purchase_date).toISOString().split("T")[0]);
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
    onSave(numPrice, date, batchName.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-2 border-card-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Edit Batch</DialogTitle>
          <DialogDescription className="text-base">
            Update the purchase price, date, or batch name for this batch. Note: Quantity cannot change.
            Serial numbers and barcodes are tracked at the assignment level.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-6">
          <div>
            <Label className="text-sm font-semibold">Batch Name (optional)</Label>
            <Input 
              value={batchName} 
              onChange={(e) => setBatchName(e.target.value)} 
              placeholder="Enter a name for this batch"
              className="h-11 border-2 focus:border-primary transition-colors mt-2"
            />
          </div>
          <div>
            <Label className="text-sm font-semibold">Purchase Price (per unit) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="h-11 border-2 focus:border-primary transition-colors mt-2"
            />
          </div>
          <div>
            <Label className="text-sm font-semibold">Purchase Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 border-2 focus:border-primary transition-colors mt-2"
            />
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm font-semibold text-foreground">Quantity: <span className="text-primary">{batch.quantity}</span> (cannot be changed)</p>
            <p className="text-sm font-semibold text-foreground mt-1">Remaining: <span className="text-primary">{batch.remaining_quantity}</span></p>
          </div>
          <div className="flex justify-end gap-3 pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300 font-semibold"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

