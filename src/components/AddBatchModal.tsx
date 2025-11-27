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
  serial_number: string;
  barcode: string;
  purchase_price: number;
  quantity: number;
  purchase_date: string;
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
      serial_number: "",
      barcode: "",
      purchase_price: 0,
      quantity: 1,
      purchase_date: new Date().toISOString().split("T")[0],
      remarks: "",
    },
  });

  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: BatchFormData) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/assets/${assetId}/batches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          serial_number: data.serial_number.trim(),
          barcode: data.barcode.trim(),
          purchase_price: Number(data.purchase_price),
          quantity: Number(data.quantity),
          purchase_date: data.purchase_date ? new Date(data.purchase_date).toISOString() : undefined,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Inventory</DialogTitle>
          <DialogDescription>
            Add more units to <strong>{assetName}</strong> at a different purchase price.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="serial_number">Serial Number *</Label>
            <Input
              id="serial_number"
              {...register("serial_number", {
                required: "Serial number is required",
                minLength: { value: 3, message: "Serial number must be at least 3 characters" },
              })}
            />
            {errors.serial_number && (
              <p className="text-sm text-destructive mt-1">
                {errors.serial_number.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="barcode">Barcode *</Label>
            <Input
              id="barcode"
              {...register("barcode", {
                required: "Barcode is required",
                minLength: { value: 3, message: "Barcode must be at least 3 characters" },
              })}
            />
            {errors.barcode && (
              <p className="text-sm text-destructive mt-1">
                {errors.barcode.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="purchase_price">
              Purchase Price (per unit) *
            </Label>
            <Input
              id="purchase_price"
              type="number"
              step="0.01"
              min="0"
              {...register("purchase_price", {
                required: "Purchase price is required",
                min: { value: 0.01, message: "Price must be greater than 0" },
              })}
            />
            {errors.purchase_price && (
              <p className="text-sm text-destructive mt-1">
                {errors.purchase_price.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              {...register("quantity", {
                required: "Quantity is required",
                min: { value: 1, message: "Quantity must be at least 1" },
              })}
            />
            {errors.quantity && (
              <p className="text-sm text-destructive mt-1">
                {errors.quantity.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="purchase_date">Purchase Date</Label>
            <Input
              id="purchase_date"
              type="date"
              {...register("purchase_date")}
            />
          </div>

          <div>
            <Label htmlFor="remarks">Remarks (optional)</Label>
            <Input
              id="remarks"
              type="text"
              {...register("remarks")}
              placeholder="Add notes about this batch"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Inventory"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

