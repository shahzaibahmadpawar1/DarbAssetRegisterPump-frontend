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
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto border-2 border-card-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          <DialogDescription className="text-base">
            Fill in the asset details. Fields marked optional can be left empty.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
          {/* ✅ Asset Name */}
          <div className="col-span-1 sm:col-span-2">
            <Label className="text-sm font-semibold">Asset Name *</Label>
            <Input 
              {...register("asset_name", { required: true })} 
              className="h-11 border-2 focus:border-primary transition-colors mt-2"
              placeholder="Enter asset name"
            />
          </div>

          {/* ✅ Asset Number */}
          <div className="col-span-1 sm:col-span-1">
            <Label className="text-sm font-semibold">Asset Number *</Label>
            <Input 
              {...register("asset_number", { required: true })} 
              className="h-11 border-2 focus:border-primary transition-colors mt-2"
              placeholder="e.g., AST-2024-001"
            />
          </div>

          {/* ✅ Units */}
          <div className="col-span-1 sm:col-span-1">
            <Label className="text-sm font-semibold">Units (optional)</Label>
            <Input 
              {...register("units")} 
              className="h-11 border-2 focus:border-primary transition-colors mt-2"
              placeholder="Enter units"
            />
          </div>

          {/* ✅ Category Dropdown */}
          <div className="col-span-1 sm:col-span-1">
            <Label className="text-sm font-semibold">Category (optional)</Label>
            <Select
              value={watch("category_id") || "none"}
              onValueChange={(val) =>
                setValue("category_id", val === "none" ? null : val)
              }
            >
              <SelectTrigger className="h-11 border-2 focus:border-primary mt-2">
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
          <div className="col-span-1 sm:col-span-2 flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="w-full sm:w-auto border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300 font-semibold"
            >
              Save Asset
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
