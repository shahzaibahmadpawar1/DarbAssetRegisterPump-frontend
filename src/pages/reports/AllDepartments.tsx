import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Printer } from "lucide-react";
import { cn } from "@/lib/utils";

type Department = {
  id: number;
  name: string;
  manager: string;
  employeeCount?: number;
  totalAssetValue?: number;
};

type Employee = {
  id: number;
  name: string;
  employee_id?: string | null;
};

type DepartmentEmployee = {
  id: number;
  employee_id: number;
  department_id: number;
  employee: Employee;
};

export default function AllDepartmentsComponent() {
  const { canAssign, isAdmin, isViewingUser, isAssigningUser } = useUserRole();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selected, setSelected] = useState<Department | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [open, setOpen] = useState(false);
  const [assignEmployeeOpen, setAssignEmployeeOpen] = useState(false);
  const [selectedDepartmentForAssign, setSelectedDepartmentForAssign] = useState<Department | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departmentEmployees, setDepartmentEmployees] = useState<DepartmentEmployee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [employeeDetailsOpen, setEmployeeDetailsOpen] = useState(false);
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<Employee | null>(null);
  const [employeeAssignments, setEmployeeAssignments] = useState<any[]>([]);
  const [loadingEmployeeAssignments, setLoadingEmployeeAssignments] = useState(false);

  // Fetch all departments
  useEffect(() => {
    async function fetchDepartments() {
      try {
        const res = await fetch(`${API_BASE}/api/departments`, { credentials: "include" });
        const data = await res.json();
        setDepartments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching departments:", err);
      }
    }
    fetchDepartments();
  }, []);

  // Fetch all employees
  useEffect(() => {
    async function fetchEmployees() {
      try {
        const res = await fetch(`${API_BASE}/api/employees`, { credentials: "include" });
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    }
    fetchEmployees();
  }, []);

  // 🟢 Handle URL parameters for navigation from charts
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.split('?')[1] || '');
    const deptId = params.get('deptId');
    
    if (deptId && departments.length > 0) {
      const dept = departments.find(d => d.id === Number(deptId));
      if (dept) {
        openDetails(dept);
      }
    }
  }, [departments]);

  // Fetch employees for a department
  const fetchDepartmentEmployees = async (departmentId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/departments/${departmentId}/employees`, {
        credentials: "include",
      });
      const data = await res.json();
      setDepartmentEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching department employees:", err);
    }
  };

  // Open details/edit
  const openDetails = async (dept: Department) => {
    setSelected(dept);
    setEditMode(false);
    setOpen(true);
    // Fetch employees for this department
    await fetchDepartmentEmployees(dept.id);
  };
  
  // Open employee details
  const openEmployeeDetails = async (employee: Employee) => {
    setSelectedEmployeeForDetails(employee);
    setLoadingEmployeeAssignments(true);
    setEmployeeDetailsOpen(true);
    
    try {
      const res = await fetch(`${API_BASE}/api/employees/${employee.id}/assignments`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch employee assignments");
      const data = await res.json();
      setEmployeeAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching employee assignments:", err);
      setEmployeeAssignments([]);
    } finally {
      setLoadingEmployeeAssignments(false);
    }
  };

  // Save edits
  const saveEdit = async () => {
    if (!selected) return;
    try {
      const payload = {
        name: selected.name,
        manager: selected.manager,
      };
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/departments/${selected.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update Department");
      const updated = await res.json();
      setDepartments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setEditMode(false);
      alert("✅ Department updated successfully!");
    } catch (err) {
      console.error("Update error:", err);
      alert("❌ Failed to update department");
    }
  };

  // Delete department
  const deleteDepartment = async (id: number) => {
    if (!confirm("Are you sure you want to delete this department?")) return;

    try {
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/departments/${id}`, {
        method: "DELETE",
        headers: {
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      setOpen(false);
      alert("🗑️ Department deleted successfully.");
    } catch (err) {
      console.error("Delete error:", err);
      alert("❌ Failed to delete department.");
    }
  };

  // Open assign employee dialog
  const openAssignEmployee = async (dept: Department) => {
    setSelectedDepartmentForAssign(dept);
    await fetchDepartmentEmployees(dept.id);
    setSelectedEmployeeId("");
    setAssignEmployeeOpen(true);
  };

  // Assign employee to department
  const assignEmployee = async () => {
    if (!selectedDepartmentForAssign || !selectedEmployeeId) return;
    try {
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(
        `${API_BASE}/api/departments/${selectedDepartmentForAssign.id}/employees`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ employee_id: Number(selectedEmployeeId) }),
        }
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to assign employee");
      }
      await fetchDepartmentEmployees(selectedDepartmentForAssign.id);
      setSelectedEmployeeId("");
      alert("✅ Employee assigned successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to assign employee");
    }
  };

  // Remove employee from department
  const removeEmployee = async (assignmentId: number) => {
    if (!confirm("Are you sure you want to remove this employee from the department?")) return;
    if (!selectedDepartmentForAssign) return;

    try {
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(
        `${API_BASE}/api/departments/${selectedDepartmentForAssign.id}/employees/${assignmentId}`,
        {
          method: "DELETE",
          headers: {
            ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
          },
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error("Failed to remove employee");
      await fetchDepartmentEmployees(selectedDepartmentForAssign.id);
      alert("✅ Employee removed successfully!");
    } catch (err) {
      console.error("Remove error:", err);
      alert("❌ Failed to remove employee");
    }
  };

  // Get employees not yet assigned to this department
  const availableEmployees = employees.filter(
    (emp) => !departmentEmployees.some((de) => de.employee_id === emp.id)
  );

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((d) => (
          <Card
            key={d.id}
            className="bg-white/60 backdrop-blur-md hover:bg-white/80 transition hover:shadow-lg"
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{d.name}</CardTitle>
                {d.totalAssetValue !== undefined && d.totalAssetValue > 0 && (
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Total Value</div>
                    <div className="text-lg font-bold text-orange-600">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'SAR',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(d.totalAssetValue)}
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm font-semibold">Manager: </span>
                <span className="text-sm text-muted-foreground">{d.manager}</span>
              </div>
              <div>
                <span className="text-sm font-semibold">Employees: </span>
                <span className="text-sm text-muted-foreground">{d.employeeCount || 0}</span>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDetails(d)}
                  className="flex-1"
                >
                  Details
                </Button>
                {canAssign && !isViewingUser && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAssignEmployee(d)}
                    className="flex-1"
                  >
                    Assign Employee
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Details/Edit Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto border-2 border-card-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editMode ? "Edit Department" : "Department Details"}
            </DialogTitle>
            <DialogDescription className="text-base">
              {editMode
                ? "Update department information below."
                : "View department details."}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <form 
              className="grid grid-cols-2 gap-4"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="col-span-2 sm:col-span-1">
                <Label>Department Name</Label>
                <Input
                  value={selected.name}
                  disabled={!editMode}
                  onChange={(e) =>
                    setSelected({ ...selected, name: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label>Manager</Label>
                <Input
                  value={selected.manager}
                  disabled={!editMode}
                  onChange={(e) =>
                    setSelected({ ...selected, manager: e.target.value })
                  }
                />
              </div>

              {/* Employees Section */}
              {!editMode && (
                <div className="col-span-2 mt-6 pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-3">Employees</h3>
                  {departmentEmployees.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No employees assigned to this department.</p>
                  ) : (
                    <div className="space-y-2">
                      {departmentEmployees.map((de) => (
                        <div
                          key={de.id}
                          className="flex justify-between items-center p-3 border rounded-lg"
                        >
                          <span className="font-medium">
                            {de.employee.name}{" "}
                            {de.employee.employee_id && `(${de.employee.employee_id})`}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openEmployeeDetails(de.employee);
                            }}
                          >
                            Details
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="col-span-2 flex justify-between mt-4">
                {!editMode ? (
                  <>
                    {isAdmin && !isViewingUser && !isAssigningUser && (
                      <>
                        <Button type="button" variant="outline" onClick={() => setEditMode(true)}>
                          ✏️ Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => deleteDepartment(selected.id)}
                        >
                          🗑️ Delete
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {isAdmin && !isViewingUser && !isAssigningUser && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditMode(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="button" onClick={saveEdit}>
                          💾 Save
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Employee Modal */}
      <Dialog open={assignEmployeeOpen} onOpenChange={setAssignEmployeeOpen}>
        <DialogContent className="max-w-lg border-2 border-card-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Assign Employee to {selectedDepartmentForAssign?.name}
            </DialogTitle>
            <DialogDescription className="text-base">
              Select an employee to assign to this department
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Select Employee</Label>
              <Popover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={employeeSearchOpen}
                    className="w-full justify-between"
                  >
                    {selectedEmployeeId
                      ? availableEmployees.find((emp) => emp.id.toString() === selectedEmployeeId)?.name +
                        (availableEmployees.find((emp) => emp.id.toString() === selectedEmployeeId)?.employee_id
                          ? ` (${availableEmployees.find((emp) => emp.id.toString() === selectedEmployeeId)?.employee_id})`
                          : "")
                      : "Choose an employee..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search employee by name or ID..." />
                    <CommandList>
                      <CommandEmpty>No employee found.</CommandEmpty>
                      <CommandGroup>
                        {availableEmployees.length === 0 ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            No available employees
                          </div>
                        ) : (
                          availableEmployees.map((emp) => (
                            <CommandItem
                              key={emp.id}
                              value={`${emp.name} ${emp.employee_id || ""}`}
                              onSelect={() => {
                                setSelectedEmployeeId(emp.id.toString());
                                setEmployeeSearchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedEmployeeId === emp.id.toString()
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {emp.name} {emp.employee_id ? `(${emp.employee_id})` : ""}
                            </CommandItem>
                          ))
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <Button
              onClick={assignEmployee}
              disabled={!selectedEmployeeId || availableEmployees.length === 0}
              className="w-full"
            >
              Assign Employee
            </Button>

            {departmentEmployees.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-3">Assigned Employees</h3>
                <div className="space-y-2">
                  {departmentEmployees.map((de) => (
                    <div
                      key={de.id}
                      className="flex justify-between items-center p-2 border rounded"
                    >
                      <span>
                        {de.employee.name}{" "}
                        {de.employee.employee_id && `(${de.employee.employee_id})`}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEmployee(de.id)}
                        className="text-destructive"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Employee Details Modal */}
      <Dialog open={employeeDetailsOpen} onOpenChange={setEmployeeDetailsOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto border-2 border-card-border">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  Employee Asset Assignments
                </DialogTitle>
                <DialogDescription className="text-base">
                  {selectedEmployeeForDetails 
                    ? `Assets assigned to ${selectedEmployeeForDetails.name}${selectedEmployeeForDetails.employee_id ? ` (${selectedEmployeeForDetails.employee_id})` : ""}`
                    : "View employee asset assignments"}
                </DialogDescription>
              </div>
              {selectedEmployeeForDetails && employeeAssignments.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const html = `
                      <html>
                        <head>
                          <title>Employee Assets - ${selectedEmployeeForDetails.name}</title>
                          <style>
                            body { font-family: Arial, sans-serif; margin: 20px; background: #f8f9fa; }
                            h1 { text-align: center; color: #333; }
                            .employee-info { background: #fff; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                            .employee-info p { margin: 5px 0; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #fff; }
                            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                            th { background: #f0f0f0; font-weight: bold; }
                            tr:nth-child(even) { background: #fafafa; }
                            .asset-section { margin-bottom: 30px; }
                            .asset-name { font-weight: bold; font-size: 16px; color: #333; }
                            .asset-number { color: #666; font-size: 14px; }
                          </style>
                        </head>
                        <body>
                          <h1>Employee Assets Report</h1>
                          <div class="employee-info">
                            <p><strong>Employee Name:</strong> ${selectedEmployeeForDetails.name}</p>
                            <p><strong>Employee ID:</strong> ${selectedEmployeeForDetails.employee_id || "—"}</p>
                            <p><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
                          </div>
                          <h2>Assigned Assets</h2>
                          <table>
                            <thead>
                              <tr>
                                <th>Asset Name</th>
                                <th>Asset Number</th>
                                <th>Batch Name</th>
                                <th>Purchase Date</th>
                                <th>Serial Number</th>
                                <th>Assignment Date</th>
                                <th>Value</th>
                                <th>Quantity</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${employeeAssignments.map((assignment: any) => {
                                const batch = assignment.batch;
                                if (!batch) return "";
                                const asset = batch.asset;
                                const value = batch.purchase_price || 0;
                                return `
                                  <tr>
                                    <td>${asset?.asset_name || "Unknown Asset"}</td>
                                    <td>${asset?.asset_number || "—"}</td>
                                    <td>${batch.batch_name || `Batch #${batch.id}`}</td>
                                    <td>${new Date(batch.purchase_date).toLocaleDateString()}</td>
                                    <td>${assignment.serial_number || "—"}</td>
                                    <td>${assignment.assignment_date ? new Date(assignment.assignment_date).toLocaleDateString() : "—"}</td>
                                    <td>${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(value)}</td>
                                    <td>1</td>
                                  </tr>
                                `;
                              }).join("")}
                            </tbody>
                          </table>
                        </body>
                      </html>`;
                    const win = window.open("", "_blank");
                    win!.document.write(html);
                    win!.document.close();
                    win!.print();
                  }}
                  className="gap-2 border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300 font-medium"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
              )}
            </div>
          </DialogHeader>

          {selectedEmployeeForDetails && (() => {
            // Transform flat assignments array to grouped structure (by asset, then batch, then items)
            const assetSummary = new Map<string, {
              asset_id: number;
              asset_name: string;
              asset_number: string;
              batches: Map<number, {
                batch_id: number;
                batch_name: string | null;
                purchase_date: string | null;
                items: any[];
              }>;
            }>();
            
            employeeAssignments.forEach((assignment: any) => {
              const batch = assignment.batch;
              if (!batch || !batch.asset) return;
              
              const asset = batch.asset;
              const assetKey = `${asset.id}`;
              
              if (!assetSummary.has(assetKey)) {
                assetSummary.set(assetKey, {
                  asset_id: asset.id,
                  asset_name: asset.asset_name,
                  asset_number: asset.asset_number || "",
                  batches: new Map(),
                });
              }
              
              const assetData = assetSummary.get(assetKey)!;
              const batchKey = batch.id;
              
              if (!assetData.batches.has(batchKey)) {
                assetData.batches.set(batchKey, {
                  batch_id: batch.id,
                  batch_name: batch.batch_name,
                  purchase_date: batch.purchase_date,
                  items: [],
                });
              }
              
              const batchData = assetData.batches.get(batchKey)!;
              batchData.items.push({
                id: assignment.id,
                serial_number: assignment.serial_number,
                assignment_date: assignment.assignment_date,
              });
            });
            
            const groupedAssignments = Array.from(assetSummary.values()).map(asset => ({
              asset_id: asset.asset_id,
              asset_name: asset.asset_name,
              asset_number: asset.asset_number,
              batches: Array.from(asset.batches.values()),
            }));
            
            return (
              <div className="space-y-4">
                {loadingEmployeeAssignments ? (
                  <p className="text-sm text-muted-foreground">Loading assignments...</p>
                ) : groupedAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assets assigned to this employee.</p>
                ) : (
                  <div className="mt-1 space-y-2 pl-2 border-l-2 border-orange-300 bg-orange-50/50 rounded-r p-2">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                        Assigned Assets:
                      </div>
                      {groupedAssignments.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const html = `
                              <html>
                                <head>
                                  <title>Employee Assets - ${selectedEmployeeForDetails.name}</title>
                                  <style>
                                    body { font-family: Arial, sans-serif; margin: 20px; background: #f8f9fa; }
                                    h1 { text-align: center; color: #333; }
                                    .employee-info { background: #fff; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                                    .employee-info p { margin: 5px 0; }
                                    table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #fff; }
                                    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                                    th { background: #f0f0f0; font-weight: bold; }
                                    tr:nth-child(even) { background: #fafafa; }
                                  </style>
                                </head>
                                <body>
                                  <h1>Employee Assets Report</h1>
                                  <div class="employee-info">
                                    <p><strong>Employee Name:</strong> ${selectedEmployeeForDetails.name}</p>
                                    <p><strong>Employee ID:</strong> ${selectedEmployeeForDetails.employee_id || "—"}</p>
                                    <p><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
                                  </div>
                                  <h2>Assigned Assets</h2>
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>Asset Name</th>
                                        <th>Asset Number</th>
                                        <th>Batch Name</th>
                                        <th>Purchase Date</th>
                                        <th>Serial Number</th>
                                        <th>Assignment Date</th>
                                        <th>Value</th>
                                        <th>Quantity</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      ${employeeAssignments.map((assignment: any) => {
                                        const batch = assignment.batch;
                                        if (!batch) return "";
                                        const asset = batch.asset;
                                        const value = batch.purchase_price || 0;
                                        return `
                                          <tr>
                                            <td>${asset?.asset_name || "Unknown Asset"}</td>
                                            <td>${asset?.asset_number || "—"}</td>
                                            <td>${batch.batch_name || `Batch #${batch.id}`}</td>
                                            <td>${new Date(batch.purchase_date).toLocaleDateString()}</td>
                                            <td>${assignment.serial_number || "—"}</td>
                                            <td>${assignment.assignment_date ? new Date(assignment.assignment_date).toLocaleDateString() : "—"}</td>
                                            <td>${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(value)}</td>
                                            <td>1</td>
                                          </tr>
                                        `;
                                      }).join("")}
                                    </tbody>
                                  </table>
                                </body>
                              </html>`;
                            const win = window.open("", "_blank");
                            win!.document.write(html);
                            win!.document.close();
                            win!.print();
                          }}
                          className="h-6 px-2 text-xs gap-1"
                        >
                          <Printer className="w-3 h-3" />
                          Print
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {groupedAssignments.map((asset) => (
                        <div key={asset.asset_id} className="text-sm">
                          <div className="font-semibold text-foreground mb-1">
                            {asset.asset_name} <span className="text-muted-foreground font-normal">({asset.asset_number})</span>
                          </div>
                          <div className="ml-2 space-y-2">
                            {asset.batches.map((batch) => (
                              <div key={batch.batch_id} className="text-xs space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-medium">
                                    Batch: {batch.batch_name || `#${batch.batch_id}`}
                                  </span>
                                  {batch.purchase_date && (
                                    <span className="text-muted-foreground">
                                      Purchase: {new Date(batch.purchase_date).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                {batch.items && batch.items.length > 0 && (
                                  <div className="ml-2 space-y-1">
                                    {batch.items.map((item: any, idx: number) => (
                                      <div key={item.id || idx} className="flex flex-wrap items-center gap-1.5">
                                        {item.serial_number && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-green-100 text-green-800 font-medium">
                                            Serial #: {item.serial_number}
                                          </span>
                                        )}
                                        {item.assignment_date && (
                                          <span className="text-muted-foreground">
                                            Assigned: {new Date(item.assignment_date).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}

