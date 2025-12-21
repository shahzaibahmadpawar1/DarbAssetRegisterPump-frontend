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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import DepartmentForm from "./DepartmentForm";

// Inline version of DepartmentForm for use in tabs
function DepartmentFormInline({
  onSuccess,
  onCancel,
}: {
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [formData, setFormData] = useState({ name: "", manager: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.manager.trim()) {
      alert("Please fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/departments`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name.trim(),
          manager: formData.manager.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to save department");
      setFormData({ name: "", manager: "" });
      onSuccess?.();
    } catch (err: any) {
      alert(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label htmlFor="dept-name" className="text-sm font-semibold">
            Department Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="dept-name"
            required
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., IT Department"
            className="h-11 border-2 focus:border-primary transition-colors"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dept-manager" className="text-sm font-semibold">
            Manager Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="dept-manager"
            required
            value={formData.manager}
            onChange={(e) => setFormData((prev) => ({ ...prev, manager: e.target.value }))}
            placeholder="e.g., John Smith"
            className="h-11 border-2 focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-6">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel} 
          className="w-full sm:w-auto border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={loading} 
          className="w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300 font-semibold"
        >
          {loading ? "Saving..." : "Save Department"}
        </Button>
      </div>
    </form>
  );
}

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
  onSubmit?: (data: PumpFormData) => Promise<void> | void;
  initialData?: PumpFormData;
  title?: string;
}

export default function PumpForm({
  open,
  onClose,
  onSuccess,
  onSubmit,
  initialData,
  title = "Add Station/Department",
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
  const [activeTab, setActiveTab] = useState<"station" | "department">("station");
  
  // If editing, we're always editing a station (not a department)
  const isEditing = !!initialData;

  const handleChange = (field: keyof PumpFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // If onSubmit prop is provided, use it (for editing)
      if (onSubmit) {
        await onSubmit(formData);
        onClose();
        return;
      }

      // Otherwise, handle the submission internally (for adding)
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/pumps`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
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
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto border-2 border-card-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{isEditing ? "Edit Station" : "Add Station/Department"}</DialogTitle>
            <DialogDescription className="text-base">
              {isEditing 
                ? "Fill in the details for the station"
                : "Choose to add a Station or Department"}
            </DialogDescription>
          </DialogHeader>

          {!isEditing && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "station" | "department")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-card/80 backdrop-blur-sm border-2 border-card-border shadow-sm">
                <TabsTrigger value="station" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Add Station</TabsTrigger>
                <TabsTrigger value="department" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Add Department</TabsTrigger>
              </TabsList>
              
              <TabsContent value="station" className="mt-4">
                <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 py-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold">
                Station Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g., Al-Kharj Station"
                className="h-11 border-2 focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-semibold">
                Location <span className="text-destructive">*</span>
              </Label>
              <Input
                id="location"
                required
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="e.g., Riyadh Road"
                className="h-11 border-2 focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager" className="text-sm font-semibold">
                Manager Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="manager"
                required
                value={formData.manager}
                onChange={(e) => handleChange("manager", e.target.value)}
                placeholder="e.g., Ahmed Al-Rashid"
                className="h-11 border-2 focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_number" className="text-sm font-semibold">
                Contact Number
              </Label>
              <Input
                id="contact_number"
                value={formData.contact_number}
                onChange={(e) => handleChange("contact_number", e.target.value)}
                placeholder="e.g., +966 50 123 4567"
                className="h-11 border-2 focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="remarks" className="text-sm font-semibold">
                Remarks
              </Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => handleChange("remarks", e.target.value)}
                placeholder="Any additional information..."
                rows={3}
                className="border-2 focus:border-primary transition-colors"
              />
            </div>
          </div>

                  <DialogFooter className="gap-3 flex-col-reverse sm:flex-row pt-6">
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
                      disabled={loading} 
                      className="w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300 font-semibold"
                    >
                      {loading ? "Saving..." : "Save Station"}
                    </Button>
                  </DialogFooter>
                </form>
              </TabsContent>
              
              <TabsContent value="department" className="mt-4">
                <DepartmentFormInline
                  onSuccess={() => {
                    onClose();
                    onSuccess?.();
                    alert("✅ Department added successfully!");
                  }}
                  onCancel={onClose}
                />
              </TabsContent>
            </Tabs>
          )}

          {isEditing && (
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
          )}
        </DialogContent>
      </Dialog>

    </>
  );
}
