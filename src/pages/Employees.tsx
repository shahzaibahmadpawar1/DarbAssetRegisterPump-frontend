import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { useUserRole } from "@/hooks/useUserRole";
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
import { Printer, History, Upload, FileSpreadsheet } from "lucide-react";
import * as XLSX from 'xlsx';

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
  const { isAdmin, canAssign, isViewingUser, isAssigningUser } = useUserRole();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Transfer assets modal state
  const [transferAssetsOpen, setTransferAssetsOpen] = useState(false);
  const [sourceEmployeeId, setSourceEmployeeId] = useState<string>("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [assignmentHistory, setAssignmentHistory] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>("");
  const [selectedAssignments, setSelectedAssignments] = useState<Set<number>>(new Set());
  const [transferAllAssets, setTransferAllAssets] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  
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

  // 🟢 Handle URL parameters for navigation from charts - scroll to employee
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.split('?')[1] || '');
    const employeeId = params.get('employeeId');
    
    if (employeeId && employees.length > 0) {
      // Wait a bit for the page to render
      setTimeout(() => {
        const element = document.getElementById(`employee-${employeeId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight the element briefly
          element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 2000);
        }
      }, 500);
    }
  }, [employees]);

  // 🟢 Add an employee
  const addEmployee = async () => {
    if (!name.trim()) {
      setError("Employee name is required");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/employees`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
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
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/employees/${id}`, {
        method: "DELETE",
        headers: {
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
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

  // 📜 Fetch assignment history
  const fetchAssignmentHistory = async (batchId: number) => {
    try {
      setHistoryLoading(true);
      setAssignmentHistory([]); // Clear previous history
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/assignments/history?batch_id=${batchId}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Failed to fetch history:", res.status, errorText);
        setHistoryLoading(false);
        alert(`Failed to load assignment history: ${res.status === 401 ? "Unauthorized" : errorText}`);
        return;
      }
      
      const data = await res.json();
      setAssignmentHistory(data || []);
      setHistoryLoading(false);
    } catch (err) {
      console.error("Failed to fetch history:", err);
      setHistoryLoading(false);
      alert("Failed to load assignment history");
    }
  };

  // 📥 Handle Excel file import
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert("Please select a valid Excel file (.xlsx, .xls, or .csv)");
      return;
    }

    setImportFile(file);
    setImportErrors([]);
    setImportPreview([]);

    // Read and preview the file
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
          alert("Excel file must have at least a header row and one data row");
          return;
        }

        // Parse header row
        const headers = jsonData[0].map((h: any) => String(h || '').toLowerCase().trim());
        
        // Find column indices
        const nameIndex = headers.findIndex(h => 
          h.includes('name') || h.includes('employee name') || h.includes('full name')
        );
        const idIndex = headers.findIndex(h => 
          h.includes('id') || h.includes('employee id') || h.includes('emp id')
        );
        const deptIndex = headers.findIndex(h => 
          h.includes('department') || h.includes('dept')
        );

        if (nameIndex === -1) {
          alert("Excel file must have a 'Name' column (or similar: Employee Name, Full Name)");
          return;
        }

        // Parse data rows
        const preview: any[] = [];
        const errors: string[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const rowNum = i + 1;

          if (!row || row.length === 0) continue; // Skip empty rows

          const name = row[nameIndex] ? String(row[nameIndex]).trim() : '';
          const employeeId = row[idIndex] ? String(row[idIndex]).trim() : null;
          const deptName = row[deptIndex] ? String(row[deptIndex]).trim() : null;

          if (!name) {
            errors.push(`Row ${rowNum}: Name is required`);
            continue;
          }

          // Find department ID by name
          let departmentId = null;
          if (deptName) {
            const dept = departments.find(d => 
              d.name.toLowerCase() === deptName.toLowerCase()
            );
            if (dept) {
              departmentId = dept.id;
            } else {
              errors.push(`Row ${rowNum}: Department "${deptName}" not found`);
            }
          }

          preview.push({
            name,
            employee_id: employeeId,
            department_id: departmentId,
            department_name: deptName,
          });
        }

        setImportPreview(preview);
        setImportErrors(errors);
      } catch (error) {
        console.error("Error reading Excel file:", error);
        alert("Failed to read Excel file. Please ensure it's a valid Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 📥 Import employees from preview
  const handleImportEmployees = async () => {
    if (importPreview.length === 0) {
      alert("No valid employees to import");
      return;
    }

    try {
      setImportLoading(true);
      const storedToken = localStorage.getItem("auth_token");
      
      const employeesToImport = importPreview.map(emp => ({
        name: emp.name,
        employee_id: emp.employee_id || null,
        department_id: emp.department_id || null,
      }));

      const res = await fetch(`${API_BASE}/api/employees/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ employees: employeesToImport }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`Failed to import employees: ${errorData.message || errorData.errors?.join(', ') || 'Unknown error'}`);
        return;
      }

      const data = await res.json();
      alert(`✅ Successfully imported ${data.count} employee(s)!`);
      
      // Reset and close
      setImportFile(null);
      setImportPreview([]);
      setImportErrors([]);
      setImportOpen(false);
      
      // Reload employees
      loadEmployees();
    } catch (err) {
      console.error("Import error:", err);
      alert("Failed to import employees");
    } finally {
      setImportLoading(false);
    }
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

      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(
        `${API_BASE}/api/employees/${sourceEmployeeId}/transfer-assets/${targetEmployeeId}`,
        {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
          },
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
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(
        `${API_BASE}/api/employees/${transferEmployeeId}/transfer-department`,
        {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
          },
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
        <div className="space-y-2">
          <BackToDashboardButton />
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Employee Management
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage employees and their asset assignments
          </p>
        </div>
      
      {/* Add Employee */}
      {isAdmin && !isViewingUser && !isAssigningUser && (
        <Card className="border-2 border-card-border bg-card/80 backdrop-blur-sm shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <span className="text-2xl">+</span>
              Add Employee
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="employee-name" className="text-sm font-semibold">Employee Name <span className="text-destructive">*</span></Label>
            <Input
              id="employee-name"
              placeholder="Enter employee name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              className="h-11 border-2 focus:border-primary transition-colors"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="employee-id" className="text-sm font-semibold">Employee ID (optional)</Label>
            <Input
              id="employee-id"
              placeholder="Enter employee ID"
              value={employeeId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmployeeId(e.target.value)}
              className="h-11 border-2 focus:border-primary transition-colors"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="department" className="text-sm font-semibold">Department (optional)</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger id="department" className="h-11 border-2 focus:border-primary">
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
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={addEmployee} 
              disabled={loading || !name.trim()} 
              className="flex-1 sm:flex-initial bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300 font-semibold h-11"
            >
              {loading ? "Adding..." : "+ Add Employee"}
            </Button>
            {isAdmin && (
              <Button 
                onClick={() => setImportOpen(true)} 
                variant="outline"
                className="flex-1 sm:flex-initial border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300 font-medium h-11"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import from Excel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {/* All Employees */}
      <Card className="border-2 border-card-border bg-card/80 backdrop-blur-sm shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">All Employees</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search Input */}
          <div className="mb-6">
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 border-2 focus:border-primary transition-colors"
            />
          </div>

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
            <p className="text-muted-foreground">No employees yet. {isAdmin && "Add one above to get started."}</p>
          ) : (() => {
            // Filter employees based on search query
            const filteredEmployees = employees.filter((e) => {
              if (!searchQuery.trim()) return true;
              const query = searchQuery.toLowerCase().trim();
              const nameMatch = e.name.toLowerCase().includes(query);
              const idMatch = e.employee_id?.toLowerCase().includes(query);
              return nameMatch || idMatch;
            });

            if (filteredEmployees.length === 0) {
              return <p className="text-muted-foreground">No employees found matching "{searchQuery}"</p>;
            }

            return (
              <ul className="divide-y">
                {filteredEmployees.map((e) => (
                <li
                  key={e.id}
                  id={`employee-${e.id}`}
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
                      {canAssign && !isViewingUser && (
                        <>
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
                        </>
                      )}
                      {isAdmin && !isViewingUser && !isAssigningUser && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteEmployee(e.id)}
                          className="w-full sm:w-auto shrink-0"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                  {e.asset_assignments && e.asset_assignments.length > 0 && (
                    <div className="mt-1 space-y-2 pl-2 border-l-2 border-orange-300 bg-orange-50/50 rounded-r p-2">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                          Assigned Assets:
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const html = `
                              <html>
                                <head>
                                  <title>Employee Assets - ${e.name}</title>
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
                                    <p><strong>Employee Name:</strong> ${e.name}</p>
                                    <p><strong>Employee ID:</strong> ${e.employee_id || "—"}</p>
                                    <p><strong>Department:</strong> ${e.department_name || "—"}</p>
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
                                      ${e.asset_assignments.map((asset: any) => 
                                        asset.batches.flatMap((batch: any) => 
                                          (batch.items && batch.items.length > 0 ? batch.items : [{ id: batch.batch_id, serial_number: null, assignment_date: null, purchase_price: null }]).map((item: any) => {
                                            // purchase_price is in the item (assignment) object, not batch
                                            const value = item.purchase_price || 0;
                                            return `
                                            <tr>
                                              <td>${asset.asset_name}</td>
                                              <td>${asset.asset_number || "—"}</td>
                                              <td>${batch.batch_name || `Batch #${batch.batch_id}`}</td>
                                              <td>${batch.purchase_date ? new Date(batch.purchase_date).toLocaleDateString() : "—"}</td>
                                              <td>${item.serial_number || "—"}</td>
                                              <td>${item.assignment_date ? new Date(item.assignment_date).toLocaleDateString() : "—"}</td>
                                              <td>${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(value)}</td>
                                              <td>1</td>
                                            </tr>
                                          `;
                                          })
                                        ).join("")
                                      ).join("")}
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
                      </div>
                      <div className="space-y-2">
                        {e.asset_assignments.map((asset) => (
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
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 px-2 text-xs"
                                            onClick={async () => {
                                              setSelectedBatchId(batch.batch_id);
                                              await fetchAssignmentHistory(batch.batch_id);
                                              setHistoryOpen(true);
                                            }}
                                          >
                                            <History className="w-3 h-3 mr-1" />
                                            History
                                          </Button>
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
                </li>
                ))}
              </ul>
            );
          })()}
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

      {/* Assignment History Modal */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Assignment History</DialogTitle>
                <DialogDescription>
                  Complete transfer history for this asset batch
                </DialogDescription>
              </div>
              {assignmentHistory.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const assetName = assignmentHistory[0]?.batch?.asset?.asset_name || "Asset";
                    const assetNumber = assignmentHistory[0]?.batch?.asset?.asset_number || "";
                    const batchName = assignmentHistory[0]?.batch?.batch_name || `Batch #${selectedBatchId}`;
                    
                    const html = `
                      <html>
                        <head>
                          <title>Assignment History - ${assetName}</title>
                          <style>
                            body { font-family: Arial, sans-serif; margin: 20px; background: #fff; }
                            h1 { text-align: center; color: #333; margin-bottom: 8px; }
                            h2 { text-align: center; font-size: 14px; color: #555; margin-top: 4px; margin-bottom: 20px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
                            th { background: #f5f5f5; font-weight: bold; }
                            tr:nth-child(even) { background: #fafafa; }
                            .current { background: #fff3e0 !important; border: 2px solid #f97316; }
                            .status { font-weight: bold; color: #f97316; }
                          </style>
                        </head>
                        <body>
                          <h1>Assignment History</h1>
                          <h2>Asset: ${assetName} ${assetNumber ? `(${assetNumber})` : ""} | Batch: ${batchName}</h2>
                          <h2 style="margin-top: 8px; margin-bottom: 16px;">Report Date: ${new Date().toLocaleDateString()}</h2>
                          <table>
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Employee Name</th>
                                <th>Employee ID</th>
                                <th>Assignment Date</th>
                                <th>Assignment Time</th>
                                <th>Serial Number</th>
                                <th>Barcode</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${assignmentHistory.map((entry, idx) => {
                                const date = new Date(entry.assignment_date);
                                return `
                                  <tr class="${entry.is_active ? 'current' : ''}">
                                    <td>${idx + 1}</td>
                                    <td>${entry.employee?.name || "Unknown Employee"}</td>
                                    <td>${entry.employee?.employee_id || "—"}</td>
                                    <td>${date.toLocaleDateString()}</td>
                                    <td>${date.toLocaleTimeString()}</td>
                                    <td>${entry.serial_number || "—"}</td>
                                    <td>${entry.barcode || "—"}</td>
                                    <td class="status">${entry.is_active ? "Current Assignment" : "Previous Assignment"}</td>
                                  </tr>
                                `;
                              }).join("")}
                            </tbody>
                          </table>
                        </body>
                      </html>
                    `;
                    const printWindow = window.open("", "_blank");
                    if (printWindow) {
                      printWindow.document.write(html);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }}
                  className="gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
              )}
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            {historyLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">Loading history...</p>
              </div>
            ) : assignmentHistory.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No history available</p>
            ) : (
              assignmentHistory.map((entry, idx) => (
                <Card key={entry.id} className={entry.is_active ? "border-primary border-2" : ""}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">
                            {entry.employee?.name || "Unknown Employee"}
                          </span>
                          {entry.employee?.employee_id && (
                            <span className="text-sm text-muted-foreground">
                              ({entry.employee.employee_id})
                            </span>
                          )}
                          {entry.is_active && (
                            <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded font-medium">
                              Current Assignment
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Assigned: {new Date(entry.assignment_date).toLocaleDateString()} at {new Date(entry.assignment_date).toLocaleTimeString()}
                        </p>
                        {entry.serial_number && (
                          <p className="text-xs text-muted-foreground">
                            Serial: {entry.serial_number}
                          </p>
                        )}
                        {entry.barcode && (
                          <p className="text-xs text-muted-foreground">
                            Barcode: {entry.barcode}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {idx === 0 ? "Latest" : `Transfer #${idx + 1}`}
                        </p>
                        {entry.batch?.asset && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {entry.batch.asset.asset_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Employees Modal */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Employees from Excel</DialogTitle>
            <DialogDescription>
              Upload an Excel file (.xlsx, .xls, or .csv) with employee data. 
              Required columns: Name, Employee ID (optional), Department (optional)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* File Upload */}
            <div>
              <Label htmlFor="excel-file" className="text-sm font-semibold mb-2 block">
                Select Excel File
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="excel-file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="flex-1"
                />
                {importFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{importFile.name}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Excel format: Column A = Name (required), Column B = Employee ID (optional), Column C = Department (optional)
              </p>
            </div>

            {/* Errors */}
            {importErrors.length > 0 && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm font-semibold text-destructive mb-1">Validation Errors:</p>
                <ul className="text-xs text-destructive list-disc list-inside space-y-1">
                  {importErrors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview */}
            {importPreview.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">
                    Preview ({importPreview.length} employee(s) ready to import)
                  </Label>
                </div>
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="p-2 text-left border-b">Name</th>
                        <th className="p-2 text-left border-b">Employee ID</th>
                        <th className="p-2 text-left border-b">Department</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((emp, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2">{emp.name}</td>
                          <td className="p-2">{emp.employee_id || "—"}</td>
                          <td className="p-2">{emp.department_name || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setImportOpen(false);
                  setImportFile(null);
                  setImportPreview([]);
                  setImportErrors([]);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImportEmployees}
                disabled={importLoading || importPreview.length === 0}
                className="bg-primary hover:bg-primary/90"
              >
                {importLoading ? "Importing..." : `Import ${importPreview.length} Employee(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

