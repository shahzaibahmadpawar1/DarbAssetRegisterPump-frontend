import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import BackToDashboardButton from "@/components/BackToDashboardButton";

type AssetAssignment = {
  asset_id: number;
  asset_name: string;
  asset_number: string;
  batches: Array<{
    batch_id: number;
    batch_name: string | null;
    purchase_date: string | null;
    quantity: number;
    items: Array<{
      id: number;
      serial_number: string | null;
      barcode: string | null;
    }>;
  }>;
};

type Employee = {
  id: number;
  name: string;
  employee_id?: string | null;
  department_name?: string | null;
  asset_assignments?: AssetAssignment[];
};
type Department = { id: number; name: string; manager: string };

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Transfer assets modal state
  const [transferAssetsOpen, setTransferAssetsOpen] = useState(false);
  const [sourceEmployeeId, setSourceEmployeeId] = useState<string>("");
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>("");
  const [selectedAssignments, setSelectedAssignments] = useState<Set<number>>(new Set());
  const [transferAllAssets, setTransferAllAssets] = useState(false);
  
  // Transfer department modal state
  const [transferDeptOpen, setTransferDeptOpen] = useState(false);
  const [transferEmployeeId, setTransferEmployeeId] = useState<string>("");
  const [targetDepartmentId, setTargetDepartmentId] = useState<string>("");

  // Debug: Log when component mounts
  useEffect(() => {
    console.log("Employees component mounted");
  }, []);

  // 🟢 Load all employees
  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/api/employees`, {
        credentials: "include",
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to load employees");
      }
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
      setError("");
    } catch (e: any) {
      console.error("Error loading employees:", e);
      setError(e.message || "Failed to load employees");
      setEmployees([]);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  // 🟢 Load all departments
  useEffect(() => {
    async function loadDepartments() {
      try {
        const res = await fetch(`${API_BASE}/api/departments`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setDepartments(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to load departments:", err);
        // Set empty array on error so page still renders
        setDepartments([]);
      }
    }
    loadDepartments();
  }, []);

  // 🟢 Add an employee
  const addEmployee = async () => {
    if (!name.trim()) {
      setError("Employee name is required");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/api/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: name.trim(),
          employee_id: employeeId.trim() || null,
          department_id: departmentId ? Number(departmentId) : null
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to add employee" }));
        throw new Error(errorData.message || "Failed to add employee");
      }
      setName("");
      setEmployeeId("");
      setDepartmentId("");
      await loadEmployees();
      alert("✅ Employee added successfully!");
    } catch (e: any) {
      setError(e.message || "Failed to add employee");
    } finally {
      setLoading(false);
    }
  };

  // 🗑️ Delete employee
  const deleteEmployee = async (id: number) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/employees/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());

      // ✅ Remove deleted employee locally without reload
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      alert("🗑️ Employee deleted successfully!");
    } catch (e: any) {
      console.error("Delete employee error:", e);
      alert("❌ Failed to delete employee");
    }
  };

  // 🔄 Open transfer assets modal
  const openTransferAssets = (employeeId: number) => {
    setSourceEmployeeId(employeeId.toString());
    setTargetEmployeeId("");
    setSelectedAssignments(new Set());
    setTransferAllAssets(false);
    setTransferAssetsOpen(true);
  };

  // 🔄 Transfer assets between employees
  const handleTransferAssets = async () => {
    if (!sourceEmployeeId || !targetEmployeeId) {
      alert("Please select both source and target employees");
      return;
    }

    if (sourceEmployeeId === targetEmployeeId) {
      alert("Cannot transfer assets to the same employee");
      return;
    }

    try {
      setLoading(true);
      const payload: any = {};
      
      if (transferAllAssets) {
        // Transfer all assets
        payload.assignment_ids = [];
      } else {
        // Transfer selected assignments only
        if (selectedAssignments.size === 0) {
          alert("Please select at least one asset to transfer");
          return;
        }
        payload.assignment_ids = Array.from(selectedAssignments);
      }

      const res = await fetch(
        `${API_BASE}/api/employees/${sourceEmployeeId}/transfer-assets/${targetEmployeeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to transfer assets");
      }

      await loadEmployees();
      setTransferAssetsOpen(false);
      alert("✅ Assets transferred successfully!");
    } catch (e: any) {
      console.error("Transfer assets error:", e);
      alert(e.message || "❌ Failed to transfer assets");
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Open transfer department modal
  const openTransferDepartment = (employeeId: number) => {
    const employee = employees.find((e) => e.id === employeeId);
    setTransferEmployeeId(employeeId.toString());
    // Find current department ID if exists
    const currentDept = departments.find((d) => d.name === employee?.department_name);
    setTargetDepartmentId(currentDept?.id.toString() || "");
    setTransferDeptOpen(true);
  };

  // 🔄 Transfer employee to different department
  const handleTransferDepartment = async () => {
    if (!transferEmployeeId) {
      alert("Please select an employee");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE}/api/employees/${transferEmployeeId}/transfer-department`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            department_id: targetDepartmentId === "none" || targetDepartmentId === "" ? null : Number(targetDepartmentId),
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to transfer employee");
      }

      await loadEmployees();
      setTransferDeptOpen(false);
      alert("✅ Employee transferred successfully!");
    } catch (e: any) {
      console.error("Transfer department error:", e);
      alert(e.message || "❌ Failed to transfer employee");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // Always render the page, even if loading or error
  return (
    <div className="min-h-screen bg-white/60 dark:bg-black/40">
      <div className="max-w-5xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        <BackToDashboardButton />
        <h1 className="text-2xl sm:text-3xl font-bold">Employees</h1>
      
      {/* Add Employee */}
      <Card className="bg-white/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle>Add Employee</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="employee-name">Employee Name <span className="text-destructive">*</span></Label>
            <Input
              id="employee-name"
              placeholder="Enter employee name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="employee-id">Employee ID (optional)</Label>
            <Input
              id="employee-id"
              placeholder="Enter employee ID"
              value={employeeId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmployeeId(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="department">Department (optional)</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger id="department">
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && !loading && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button onClick={addEmployee} disabled={loading || !name.trim()} className="w-full sm:w-auto">
            {loading ? "Adding..." : "Add Employee"}
          </Button>
        </CardContent>
      </Card>

      {/* All Employees */}
      <Card className="bg-white/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && initialLoad ? (
            <p className="text-muted-foreground">Loading employees...</p>
          ) : error && initialLoad ? (
            <div className="space-y-2">
              <p className="text-destructive">{error}</p>
              <Button onClick={loadEmployees} variant="outline" size="sm">
                Retry
              </Button>
            </div>
          ) : employees.length === 0 ? (
            <p className="text-muted-foreground">No employees yet. Add one above to get started.</p>
          ) : (
            <ul className="divide-y">
              {employees.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-col gap-3 py-4"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="break-words font-medium">{e.name}</span>
                      {e.employee_id && (
                        <span className="text-sm text-muted-foreground">
                          (ID: {e.employee_id})
                        </span>
                      )}
                      {e.department_name && (
                        <span className="text-sm text-blue-600 font-medium">
                          • {e.department_name}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openTransferAssets(e.id)}
                        className="w-full sm:w-auto shrink-0"
                        disabled={!e.asset_assignments || e.asset_assignments.length === 0}
                      >
                        Transfer Assets
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openTransferDepartment(e.id)}
                        className="w-full sm:w-auto shrink-0"
                      >
                        Transfer Dept
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteEmployee(e.id)}
                        className="w-full sm:w-auto shrink-0"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  {e.asset_assignments && e.asset_assignments.length > 0 && (
                    <div className="mt-1 space-y-2 pl-2 border-l-2 border-orange-300 bg-orange-50/50 rounded-r p-2">
                      <div className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                        Assigned Assets:
                      </div>
                      <div className="space-y-2">
                        {e.asset_assignments.map((asset) => (
                          <div key={asset.asset_id} className="text-sm">
                            <div className="font-semibold text-foreground mb-1">
                              {asset.asset_name} <span className="text-muted-foreground font-normal">({asset.asset_number})</span>
                            </div>
                            <div className="ml-2 space-y-1">
                              {asset.batches.map((batch) => (
                                <div key={batch.batch_id} className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-medium">
                                    Batch: {batch.batch_name || `#${batch.batch_id}`}
                                  </span>
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
                                    Qty: {batch.quantity}
                                  </span>
                                  {batch.purchase_date && (
                                    <span className="text-muted-foreground">
                                      {new Date(batch.purchase_date).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Transfer Assets Modal */}
      <Dialog open={transferAssetsOpen} onOpenChange={setTransferAssetsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfer Assets Between Employees</DialogTitle>
            <DialogDescription>
              Select assets to transfer from one employee to another
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>From Employee</Label>
              <Select value={sourceEmployeeId} onValueChange={setSourceEmployeeId} disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Select source employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name} {emp.employee_id ? `(${emp.employee_id})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>To Employee</Label>
              <Select value={targetEmployeeId} onValueChange={setTargetEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((emp) => emp.id.toString() !== sourceEmployeeId)
                    .map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name} {emp.employee_id ? `(${emp.employee_id})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {sourceEmployeeId && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="transfer-all"
                    checked={transferAllAssets}
                    onCheckedChange={(checked: boolean) => {
                      setTransferAllAssets(checked === true);
                      if (checked) {
                        setSelectedAssignments(new Set());
                      }
                    }}
                  />
                  <Label htmlFor="transfer-all" className="font-semibold cursor-pointer">
                    Transfer All Assets
                  </Label>
                </div>

                {!transferAllAssets && (
                  <div className="border rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
                    <div className="text-sm font-semibold text-muted-foreground">
                      Select Assets to Transfer:
                    </div>
                    {(() => {
                      const sourceEmployee = employees.find(
                        (e) => e.id.toString() === sourceEmployeeId
                      );
                      if (!sourceEmployee?.asset_assignments || sourceEmployee.asset_assignments.length === 0) {
                        return <p className="text-sm text-muted-foreground">No assets assigned</p>;
                      }
                      return sourceEmployee.asset_assignments.map((asset) => (
                        <div key={asset.asset_id} className="space-y-2 border-b pb-2 last:border-0">
                          <div className="font-medium text-sm">
                            {asset.asset_name} ({asset.asset_number})
                          </div>
                          {asset.batches.map((batch) => (
                            <div key={batch.batch_id} className="ml-4 space-y-1">
                              <div className="text-xs text-muted-foreground">
                                Batch: {batch.batch_name || `#${batch.batch_id}`} • Qty: {batch.quantity}
                              </div>
                              {batch.items.map((item) => (
                                <div key={item.id} className="ml-4 flex items-center space-x-2">
                                  <Checkbox
                                    id={`item-${item.id}`}
                                    checked={selectedAssignments.has(item.id)}
                                    onCheckedChange={(checked: boolean) => {
                                      const newSet = new Set(selectedAssignments);
                                      if (checked) {
                                        newSet.add(item.id);
                                      } else {
                                        newSet.delete(item.id);
                                      }
                                      setSelectedAssignments(newSet);
                                    }}
                                  />
                                  <Label
                                    htmlFor={`item-${item.id}`}
                                    className="text-xs cursor-pointer flex-1"
                                  >
                                    {item.serial_number || item.barcode || `Item #${item.id}`}
                                    {item.serial_number && item.barcode && ` • ${item.barcode}`}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTransferAssetsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleTransferAssets}
                disabled={!sourceEmployeeId || !targetEmployeeId || loading}
              >
                {loading ? "Transferring..." : "Transfer Assets"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Department Modal */}
      <Dialog open={transferDeptOpen} onOpenChange={setTransferDeptOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transfer Employee to Department</DialogTitle>
            <DialogDescription>
              Move employee to a different department
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Employee</Label>
              <Select value={transferEmployeeId} onValueChange={setTransferEmployeeId} disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name} {emp.employee_id ? `(${emp.employee_id})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Target Department</Label>
              <Select value={targetDepartmentId} onValueChange={setTargetDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Department (Remove from current)</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTransferDeptOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleTransferDepartment}
                disabled={!transferEmployeeId || loading}
              >
                {loading ? "Transferring..." : "Transfer Employee"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

