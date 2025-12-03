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
import BackToDashboardButton from "@/components/BackToDashboardButton";

type Employee = { id: number; name: string; employee_id?: string | null };
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
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="employee-id">Employee ID (optional)</Label>
            <Input
              id="employee-id"
              placeholder="Enter employee ID"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="department">Department (optional)</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger id="department">
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
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
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 py-2"
                >
                  <div className="flex-1">
                    <span className="break-words font-medium">{e.name}</span>
                    {e.employee_id && (
                      <span className="text-sm text-muted-foreground ml-2">
                        (ID: {e.employee_id})
                      </span>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteEmployee(e.id)}
                    className="w-full sm:w-auto shrink-0"
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

