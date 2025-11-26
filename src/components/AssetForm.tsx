import { useForm } from "react-hook-form";
import { useEffect, useState, useRef } from "react";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export type AssetAssignmentInput = {
  id?: number;
  pump_id: number | null;
  pump_name?: string | null;
  quantity: number | null;
};

export type AssetFormData = {
  asset_name: string;
  asset_number: string;
  serial_number: string;
  barcode?: string;
  quantity?: number;
  units?: string;
  remarks?: string;
  category_id?: string | null;
  asset_value?: number;
  assignments?: AssetAssignmentInput[];
};

interface AssetFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AssetFormData) => void;
  onScanBarcode?: () => void;
  title?: string;
  initialData?: Partial<AssetFormData>;
  initialAssignments?: AssetAssignmentInput[];
  defaultPumpId?: number | null;
}

export default function AssetForm({
  open,
  onClose,
  onSubmit,
  title = "Add Asset",
  initialData,
  initialAssignments = [],
  defaultPumpId = null,
}: AssetFormProps) {
  const { register, handleSubmit, reset, setValue, watch } = useForm<AssetFormData>({
    defaultValues: {
      asset_name: "",
      asset_number: "",
      serial_number: "",
      barcode: "",
      quantity: undefined,
      units: "",
      remarks: "",
      category_id: null,
      asset_value: undefined,
    },
  });

  const [pumps, setPumps] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [assignmentRows, setAssignmentRows] = useState<AssetAssignmentInput[]>([]);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const barcodeRef = useRef<HTMLInputElement | null>(null);
  const barcodeRegistration = register("barcode");
  const quantityValue = watch("quantity");
  const totalAssigned = assignmentRows.reduce(
    (sum, row) => sum + (row.quantity ? Number(row.quantity) : 0),
    0
  );
  const numericQuantity = quantityValue ? Number(quantityValue) : 0;
  const remainingQuantity = numericQuantity - totalAssigned;

  useEffect(() => {
    async function fetchData() {
      try {
        const pumpRes = await fetch(`${API_BASE}/api/pumps`);
        const categoryRes = await fetch(`${API_BASE}/api/categories`);
        const [pumpData, categoryData] = await Promise.all([
          pumpRes.json(),
          categoryRes.json(),
        ]);

        if (Array.isArray(pumpData)) setPumps(pumpData);
        if (Array.isArray(categoryData)) setCategories(categoryData);
      } catch (err) {
        console.error("Error fetching pump/category data:", err);
      }
    }

    if (open) fetchData();
  }, [open]);

  useEffect(() => {
    if (!open) {
      reset();
      setAssignmentRows([]);
      setAssignmentError(null);
      return;
    }

    reset({
      asset_name: initialData?.asset_name ?? "",
      asset_number: initialData?.asset_number ?? "",
      serial_number: initialData?.serial_number ?? "",
      barcode: initialData?.barcode ?? "",
      quantity: initialData?.quantity,
      units: initialData?.units ?? "",
      remarks: initialData?.remarks ?? "",
      category_id: initialData?.category_id ?? null,
      asset_value: initialData?.asset_value,
    });

    if (initialAssignments.length > 0) {
      setAssignmentRows(
        initialAssignments.map((assignment) => ({
          id: assignment.id,
          pump_id: assignment.pump_id,
          pump_name: assignment.pump_name,
          quantity: assignment.quantity ?? null,
        }))
      );
    } else if (defaultPumpId != null) {
      setAssignmentRows([{ pump_id: defaultPumpId, quantity: null }]);
    } else {
      setAssignmentRows([]);
    }
  }, [open, reset]);

  useEffect(() => {
    if (remainingQuantity < 0) {
      setAssignmentError("Assigned quantity exceeds available stock.");
    } else {
      setAssignmentError(null);
    }
  }, [remainingQuantity]);

  const upsertAssignmentRow = (index: number, next: Partial<AssetAssignmentInput>) => {
    setAssignmentRows((rows) =>
      rows.map((row, idx) => (idx === index ? { ...row, ...next } : row))
    );
  };

  const addAssignmentRow = () => {
    setAssignmentRows((rows) => [...rows, { pump_id: null, quantity: null }]);
  };

  const removeAssignmentRow = (index: number) => {
    setAssignmentRows((rows) => rows.filter((_, idx) => idx !== index));
  };

  const sanitizedAssignments = () =>
    assignmentRows
      .filter(
        (row) =>
          row.pump_id != null &&
          row.quantity != null &&
          !Number.isNaN(Number(row.quantity)) &&
          Number(row.quantity) > 0
      )
      .map((row) => ({
        pump_id: Number(row.pump_id),
        quantity: Number(row.quantity),
        id: row.id,
      }));

  const submit = (data: AssetFormData) => {
    const assignments = sanitizedAssignments();
    if (assignments.length > 0 && (!data.quantity || Number(data.quantity) <= 0)) {
      setAssignmentError("Set a total quantity before assigning to stations.");
      return;
    }

    if (assignmentError) return;

    onSubmit({
      ...data,
      quantity: data.quantity ? Number(data.quantity) : undefined,
      category_id: data.category_id === "none" ? null : data.category_id,
      asset_value: data.asset_value ? Number(data.asset_value) : 0,
      assignments,
    });
    reset();
    setAssignmentRows([]);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Fill in the asset details. Fields marked optional can be left empty.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {/* ✅ Asset Name */}
          <div className="col-span-1 sm:col-span-2">
            <Label>Asset Name</Label>
            <Input {...register("asset_name", { required: true })} />
          </div>

          {/* ✅ Asset Number */}
          <div className="col-span-1 sm:col-span-1">
            <Label>Asset Number</Label>
            <Input {...register("asset_number", { required: true })} />
          </div>

          {/* ✅ Serial Number */}
          <div className="col-span-1 sm:col-span-1">
            <Label>Serial Number</Label>
            <Input {...register("serial_number", { required: true })} />
          </div>

          {/* ✅ Barcode (hardware scanner ready) */}
          <div className="col-span-1 sm:col-span-2">
            <Label>Barcode</Label>
            <div className="flex gap-2">
              <Input
                {...barcodeRegistration}
                ref={(el) => {
                  barcodeRegistration.ref(el);
                  barcodeRef.current = el;
                }}
                placeholder="Scan barcode here"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => barcodeRef.current?.focus()}
                className="shrink-0"
              >
                Scan
              </Button>
            </div>
          </div>

          {/* ✅ Quantity */}
          <div className="col-span-1 sm:col-span-1">
            <Label>Quantity</Label>
            <Input type="number" {...register("quantity")} />
          </div>

          {/* ✅ Units */}
          <div className="col-span-1 sm:col-span-1">
            <Label>Units</Label>
            <Input {...register("units")} />
          </div>

          {/* ✅ Asset Value */}
          <div className="col-span-1 sm:col-span-1">
            <Label>Asset Value</Label>
            <Input type="number" step="0.01" {...register("asset_value")} />
          </div>

          {/* ✅ Category Dropdown */}
          <div className="col-span-1 sm:col-span-1">
            <Label>Category (optional)</Label>
            <Select
              value={watch("category_id") || "none"}
              onValueChange={(val) =>
                setValue("category_id", val === "none" ? null : val)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ✅ Remarks */}
          <div className="col-span-1 sm:col-span-2">
            <Label>Remarks</Label>
            <Input {...register("remarks")} />
          </div>

          {/* ✅ Station Assignments */}
          <div className="col-span-1 sm:col-span-2 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <Label>Station Allocations</Label>
                <p className="text-xs text-muted-foreground">
                  Distribute the asset quantity across Stations.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addAssignmentRow} className="shrink-0">
                Assign Station
              </Button>
            </div>

            {assignmentRows.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No stations assigned. Asset will remain in inventory.
              </p>
            )}

            {assignmentRows.map((row, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
                <div className="col-span-1 sm:col-span-3">
                  <Label className="text-xs uppercase tracking-wide">Pump</Label>
                  <Select
                    value={row.pump_id?.toString() ?? "none"}
                    onValueChange={(val) =>
                      upsertAssignmentRow(index, {
                        pump_id: val === "none" ? null : Number(val),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Pump" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {pumps.map((pump) => (
                        <SelectItem key={pump.id} value={pump.id.toString()}>
                          {pump.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1">
                  <Label className="text-xs uppercase tracking-wide">Quantity</Label>
                  <Input
                    type="number"
                    min={0}
                    value={row.quantity ?? ""}
                    onChange={(e) =>
                      upsertAssignmentRow(index, {
                        quantity: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="col-span-1 sm:col-span-1 flex justify-start sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAssignmentRow(index)}
                    className="text-destructive"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}

            <div className="text-sm">
              <span>Total assigned: </span>
              <span className="font-semibold">{totalAssigned}</span>
              <span className="ml-3">Remaining: </span>
              <span className={`font-semibold ${remainingQuantity < 0 ? "text-destructive" : ""}`}>
                {remainingQuantity}
              </span>
            </div>
            {assignmentError && (
              <p className="text-sm text-destructive">{assignmentError}</p>
            )}
          </div>

          {/* ✅ Buttons */}
          <div className="col-span-1 sm:col-span-2 flex flex-col-reverse sm:flex-row justify-end gap-3 mt-4">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto">Save Asset</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
