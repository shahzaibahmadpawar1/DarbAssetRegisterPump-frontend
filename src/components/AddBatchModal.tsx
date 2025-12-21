import { useState } from "react";
import { useForm } from "react-hook-form";
import { API_BASE } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddBatchModalProps {
  open: boolean;
  onClose: () => void;
  assetId: number;
  assetName: string;
  onSuccess: () => void;
}

interface BatchFormData {
  purchase_price: number;
  quantity: number;
  purchase_date: string;
  batch_name?: string;
  remarks?: string;
}

export default function AddBatchModal({
  open,
  onClose,
  assetId,
  assetName,
  onSuccess,
}: AddBatchModalProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<BatchFormData>({
    defaultValues: {
      purchase_price: 0,
      quantity: 1,
      purchase_date: new Date().toISOString().split("T")[0],
      batch_name: "",
      remarks: "",
    },
  });

  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: BatchFormData) => {
    try {
      setLoading(true);
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/assets/${assetId}/batches`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          purchase_price: Number(data.purchase_price),
          quantity: Number(data.quantity),
          purchase_date: data.purchase_date ? new Date(data.purchase_date).toISOString() : undefined,
          batch_name: data.batch_name?.trim() || null,
          remarks: data.remarks || null,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to add inventory");
      }

      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err?.message || "Error adding inventory");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-2 border-card-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Add Inventory</DialogTitle>
          <DialogDescription className="text-base">
            Add more units to <strong className="text-foreground">{assetName}</strong> at a different purchase price.
            Serial numbers and barcodes will be collected when assigning individual items.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-6">
          <div>
            <Label htmlFor="purchase_price" className="text-sm font-semibold">
              Purchase Price (per unit) *
            </Label>
            <Input
              id="purchase_price"
              type="number"
              step="0.01"
              min="0"
              className="h-11 border-2 focus:border-primary transition-colors mt-2"
              {...register("purchase_price", {
                required: "Purchase price is required",
                min: { value: 0.01, message: "Price must be greater than 0" },
              })}
            />
            {errors.purchase_price && (
              <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 mt-2">
                <p className="text-sm text-destructive font-medium">
                  {errors.purchase_price.message}
                </p>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="quantity" className="text-sm font-semibold">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              className="h-11 border-2 focus:border-primary transition-colors mt-2"
              {...register("quantity", {
                required: "Quantity is required",
                min: { value: 1, message: "Quantity must be at least 1" },
              })}
            />
            {errors.quantity && (
              <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 mt-2">
                <p className="text-sm text-destructive font-medium">
                  {errors.quantity.message}
                </p>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="batch_name" className="text-sm font-semibold">Batch Name (optional)</Label>
            <Input
              id="batch_name"
              type="text"
              className="h-11 border-2 focus:border-primary transition-colors mt-2"
              {...register("batch_name")}
              placeholder="Enter a name for this batch"
            />
          </div>

          <div>
            <Label htmlFor="purchase_date" className="text-sm font-semibold">Purchase Date</Label>
            <Input
              id="purchase_date"
              type="date"
              className="h-11 border-2 focus:border-primary transition-colors mt-2"
              {...register("purchase_date")}
            />
          </div>

          <div>
            <Label htmlFor="remarks" className="text-sm font-semibold">Remarks (optional)</Label>
            <Input
              id="remarks"
              type="text"
              className="h-11 border-2 focus:border-primary transition-colors mt-2"
              {...register("remarks")}
              placeholder="Add notes about this batch"
            />
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300 font-semibold"
            >
              {loading ? "Adding..." : "Add Inventory"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

