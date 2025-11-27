import { useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export type AssetFormData = {
  asset_name: string;
  asset_number: string;
  units?: string;
  category_id?: string | null;
};

interface AssetFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AssetFormData) => void;
  title?: string;
  initialData?: Partial<AssetFormData>;
}

export default function AssetForm({
  open,
  onClose,
  onSubmit,
  title = "Add Asset",
  initialData,
}: AssetFormProps) {
  const { register, handleSubmit, reset, setValue, watch } = useForm<AssetFormData>({
    defaultValues: {
      asset_name: "",
      asset_number: "",
      units: "",
      category_id: null,
    },
  });

  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const categoryRes = await fetch(`${API_BASE}/api/categories`);
        const categoryData = await categoryRes.json();
        if (Array.isArray(categoryData)) setCategories(categoryData);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    }

    if (open) fetchCategories();
  }, [open]);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }

    reset({
      asset_name: initialData?.asset_name ?? "",
      asset_number: initialData?.asset_number ?? "",
      units: initialData?.units ?? "",
      category_id: initialData?.category_id ?? null,
    });
  }, [open, initialData, reset]);

  const submit = (data: AssetFormData) => {
    onSubmit({
      ...data,
      category_id: data.category_id === "none" ? null : data.category_id,
    });
    reset();
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

          {/* ✅ Units */}
          <div className="col-span-1 sm:col-span-1">
            <Label>Units</Label>
            <Input {...register("units")} />
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
