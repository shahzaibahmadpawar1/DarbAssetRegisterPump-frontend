import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
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

type Department = {
  id: number;
  name: string;
  manager: string;
  employeeCount?: number;
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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selected, setSelected] = useState<Department | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [open, setOpen] = useState(false);
  const [assignEmployeeOpen, setAssignEmployeeOpen] = useState(false);
  const [selectedDepartmentForAssign, setSelectedDepartmentForAssign] = useState<Department | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departmentEmployees, setDepartmentEmployees] = useState<DepartmentEmployee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

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
  const openDetails = (dept: Department) => {
    setSelected(dept);
    setEditMode(false);
    setOpen(true);
  };

  // Save edits
  const saveEdit = async () => {
    if (!selected) return;
    try {
      const payload = {
        name: selected.name,
        manager: selected.manager,
      };
      const res = await fetch(`${API_BASE}/api/departments/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch(`${API_BASE}/api/departments/${id}`, {
        method: "DELETE",
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
      const res = await fetch(
        `${API_BASE}/api/departments/${selectedDepartmentForAssign.id}/employees`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
      const res = await fetch(
        `${API_BASE}/api/departments/${selectedDepartmentForAssign.id}/employees/${assignmentId}`,
        {
          method: "DELETE",
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
              <CardTitle className="text-lg">{d.name}</CardTitle>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openAssignEmployee(d)}
                  className="flex-1"
                >
                  Assign Employee
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Details/Edit Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
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
            <form className="grid grid-cols-2 gap-4">
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

              <div className="col-span-2 flex justify-between mt-4">
                {!editMode ? (
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
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent>
                  {availableEmployees.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No available employees
                    </SelectItem>
                  ) : (
                    availableEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name} {emp.employee_id ? `(${emp.employee_id})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
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
    </>
  );
}

