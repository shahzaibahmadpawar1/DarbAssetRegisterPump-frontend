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

interface Batch {
  id: number;
  purchase_date: string;
  purchase_price: number;
  quantity: number;
  remaining_quantity: number;
  created_at: string;
}

interface ViewBatchesModalProps {
  open: boolean;
  onClose: () => void;
  assetId: number;
  assetName: string;
}

export default function ViewBatchesModal({
  open,
  onClose,
  assetId,
  assetName,
}: ViewBatchesModalProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

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
          <DialogTitle>Purchase Batches - {assetName}</DialogTitle>
          <DialogDescription>
            View all purchase batches and their prices for this asset.
          </DialogDescription>
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
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Purchase Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Used</TableHead>
                    <TableHead>Batch Value</TableHead>
                    <TableHead>Remaining Value</TableHead>
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
    </Dialog>
  );
}

