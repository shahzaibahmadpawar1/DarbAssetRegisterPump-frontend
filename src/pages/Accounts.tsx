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
import { Card } from "@/components/ui/card";
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
          <div className="space-y-2">
            <BackToDashboardButton />
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Account Management
            </h1>
            <p className="text-muted-foreground text-lg">
              Create and manage user accounts with different privileges
            </p>
          </div>
          <Button
            onClick={() => setOpen(true)}
            className="w-full sm:w-auto shrink-0 bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300 font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Account
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-muted-foreground text-lg">Loading accounts...</p>
          </div>
        ) : (
          <Card className="border-2 border-card-border bg-card/80 backdrop-blur-sm shadow-lg">
            <div className="overflow-x-auto">
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
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        account.role === "admin" 
                          ? "bg-primary/20 text-primary border border-primary/30" 
                          : account.role === "assigning_user"
                          ? "bg-blue-500/20 text-blue-600 border border-blue-500/30"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}>
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
          </Card>
        )}

      {/* Create Account Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-2 border-card-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Create New Account</DialogTitle>
            <DialogDescription className="text-base">
              Create a new user account with specific privileges
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <Label className="text-sm font-semibold">Username *</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="h-11 border-2 focus:border-primary transition-colors mt-2"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold">Password *</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (min 6 characters)"
                className="h-11 border-2 focus:border-primary transition-colors mt-2"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold">Role *</Label>
              <Select value={role} onValueChange={(val: any) => setRole(val)}>
                <SelectTrigger className="h-11 border-2 focus:border-primary mt-2">
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
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setOpen(false);
                  setError("");
                  setUsername("");
                  setPassword("");
                  setRole("viewing_user");
                }}
                className="border-2 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-300"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreate}
                className="bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300 font-semibold"
              >
                Create Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}

