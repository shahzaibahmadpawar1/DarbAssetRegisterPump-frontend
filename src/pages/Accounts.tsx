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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Trash2, Plus } from "lucide-react";
import BackToDashboardButton from "@/components/BackToDashboardButton";

type Account = {
  id: number;
  username: string;
  role: "admin" | "viewing_user" | "assigning_user";
  created_at: string;
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "viewing_user" | "assigning_user">("viewing_user");
  const [error, setError] = useState("");

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/accounts`, {
        credentials: "include",
        headers: storedToken ? { "Authorization": `Bearer ${storedToken}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch accounts");
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading accounts:", err);
      alert("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!username || !password) {
      setError("Username and password are required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setError("");
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ username, password, role }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create account");
      }

      await loadAccounts();
      setOpen(false);
      setUsername("");
      setPassword("");
      setRole("viewing_user");
      alert("✅ Account created successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this account?")) return;

    try {
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/accounts/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: storedToken ? { "Authorization": `Bearer ${storedToken}` } : {},
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete account");
      }

      await loadAccounts();
      alert("✅ Account deleted successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to delete account");
    }
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "viewing_user":
        return "Viewing User";
      case "assigning_user":
        return "Assigning User";
      default:
        return role;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
        <BackToDashboardButton />
        <div className="w-full sm:w-auto">
          <h1 className="text-2xl sm:text-3xl font-bold">Account Management</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage user accounts with different privileges
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="w-full sm:w-auto shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Account
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading accounts...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow-md bg-white/60 backdrop-blur-md">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No accounts found. Create your first account.
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>{account.id}</TableCell>
                    <TableCell className="font-medium">{account.username}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                        {getRoleDisplay(account.role)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(account.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(account.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Account Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
            <DialogDescription>
              Create a new user account with specific privileges
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Username *</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>

            <div>
              <Label>Password *</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (min 6 characters)"
              />
            </div>

            <div>
              <Label>Role *</Label>
              <Select value={role} onValueChange={(val: any) => setRole(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Full access, can manage accounts</SelectItem>
                  <SelectItem value="viewing_user">Viewing User - Can only view and print assets</SelectItem>
                  <SelectItem value="assigning_user">Assigning User - Can assign assets and view/print</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => {
                setOpen(false);
                setError("");
                setUsername("");
                setPassword("");
                setRole("viewing_user");
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create Account</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

