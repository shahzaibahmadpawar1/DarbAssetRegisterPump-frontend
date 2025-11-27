import { useState } from "react";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface PumpFormData {
  name: string;
  location: string;
  manager: string;
  contact_number?: string;
  remarks?: string;
}

interface PumpFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: PumpFormData;
  title?: string;
}

export default function PumpForm({
  open,
  onClose,
  onSuccess,
  initialData,
  title = "Add Station",
}: PumpFormProps) {
  const [formData, setFormData] = useState<PumpFormData>(
    initialData || {
      name: "",
      location: "",
      manager: "",
      contact_number: "",
      remarks: "",
    }
  );

  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof PumpFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/pumps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          location: formData.location,
          manager: formData.manager,
          contact_number: formData.contact_number,
          remarks: formData.remarks,
        }),
      });

      if (!res.ok) throw new Error("Failed to add Station");
      alert("✅ Station added successfully!");
      onSuccess?.();
      onClose();
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
            Fill in the details for the station
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Station Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g., Al-Kharj Station"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium">
                Location <span className="text-destructive">*</span>
              </Label>
              <Input
                id="location"
                required
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="e.g., Riyadh Road"
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
                placeholder="e.g., Ahmed Al-Rashid"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_number" className="text-sm font-medium">
                Contact Number
              </Label>
              <Input
                id="contact_number"
                value={formData.contact_number}
                onChange={(e) => handleChange("contact_number", e.target.value)}
                placeholder="e.g., +966 50 123 4567"
                className="h-10"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="remarks" className="text-sm font-medium">
                Remarks
              </Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => handleChange("remarks", e.target.value)}
                placeholder="Any additional information..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 flex-col-reverse sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Saving..." : "Save Station"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
