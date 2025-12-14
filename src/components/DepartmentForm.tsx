import { useState } from "react";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface DepartmentFormData {
  name: string;
  manager: string;
}

interface DepartmentFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: DepartmentFormData;
  title?: string;
}

export default function DepartmentForm({
  open,
  onClose,
  onSuccess,
  initialData,
  title = "Add Department",
}: DepartmentFormProps) {
  const [formData, setFormData] = useState<DepartmentFormData>(
    initialData || {
      name: "",
      manager: "",
    }
  );

  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof DepartmentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = initialData 
        ? `${API_BASE}/api/departments/${(initialData as any).id}`
        : `${API_BASE}/api/departments`;
      const method = initialData ? "PUT" : "POST";

      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          manager: formData.manager,
        }),
      });

      if (!res.ok) throw new Error("Failed to save department");
      alert("✅ Department saved successfully!");
      onSuccess?.();
      onClose();
      setFormData({ name: "", manager: "" });
    } catch (err: any) {
      alert(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Fill in the details for the department
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Department Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g., IT Department"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager" className="text-sm font-medium">
                Manager Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="manager"
                required
                value={formData.manager}
                onChange={(e) => handleChange("manager", e.target.value)}
                placeholder="e.g., John Smith"
                className="h-10"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 flex-col-reverse sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Saving..." : "Save Department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

