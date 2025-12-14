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
import { Check, ChevronsUpDown } from "lucide-react";
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
  const { canAssign, isAdmin } = useUserRole();
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
                {canAssign && (
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
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editMode ? "Edit Department" : "Department Details"}
            </DialogTitle>
            <DialogDescription>
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
                    {isAdmin && (
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
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Employee Modal */}
      <Dialog open={assignEmployeeOpen} onOpenChange={setAssignEmployeeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Assign Employee to {selectedDepartmentForAssign?.name}
            </DialogTitle>
            <DialogDescription>
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
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Employee Asset Assignments
            </DialogTitle>
            <DialogDescription>
              {selectedEmployeeForDetails 
                ? `Assets assigned to ${selectedEmployeeForDetails.name}${selectedEmployeeForDetails.employee_id ? ` (${selectedEmployeeForDetails.employee_id})` : ""}`
                : "View employee asset assignments"}
            </DialogDescription>
          </DialogHeader>

          {selectedEmployeeForDetails && (
            <div className="space-y-4">
              {loadingEmployeeAssignments ? (
                <p className="text-sm text-muted-foreground">Loading assignments...</p>
              ) : employeeAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assets assigned to this employee.</p>
              ) : (
                <div className="space-y-4">
                  {employeeAssignments.map((assignment: any) => {
                    const batch = assignment.batch;
                    if (!batch) return null;
                    
                    const asset = batch.asset;
                    const value = batch.purchase_price || 0;
                    
                    return (
                      <div key={assignment.id} className="border rounded-lg p-4 space-y-2">
                        <div className="font-semibold text-base">
                          {asset?.asset_name || "Unknown Asset"}
                        </div>
                        {asset?.asset_number && (
                          <div className="text-sm text-muted-foreground">Asset #: {asset.asset_number}</div>
                        )}
                        
                        <div className="mt-3 p-3 bg-gray-50 rounded">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                Batch: {batch.batch_name || `Batch #${batch.id}`}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Date: {new Date(batch.purchase_date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-orange-600">
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'SAR',
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }).format(value)}
                              </div>
                              <div className="text-xs text-muted-foreground">Quantity: 1</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

