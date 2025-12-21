import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BackToDashboardButton from "@/components/BackToDashboardButton";

type Category = { id: string; name: string };

export default function Categories() {
  const { isAdmin, isViewingUser, isAssigningUser } = useUserRole();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🟢 Load all categories
  const loadCategories = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/api/categories`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCategories(data);
    } catch (e: any) {
      setError(e.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  // 🟢 Add a category
  const addCategory = async () => {
    if (!name.trim()) return;
    try {
      setLoading(true);
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/categories`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
        body: JSON.stringify({ name }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      setName("");
      await loadCategories();
    } catch (e: any) {
      setError(e.message || "Failed to add category");
    } finally {
      setLoading(false);
    }
  };

  // 🗑️ Delete category
  const deleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const storedToken = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/categories/${id}`, {
        method: "DELETE",
        headers: {
          ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());

      // ✅ Remove deleted category locally without reload
      setCategories((prev) => prev.filter((c) => c.id !== id));
      alert("🗑️ Category deleted successfully!");
    } catch (e: any) {
      console.error("Delete category error:", e);
      alert("❌ Failed to delete category");
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <BackToDashboardButton />
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Categories
            </h1>
            <p className="text-muted-foreground text-lg">
              Organize and manage asset categories
            </p>
          </div>
        </div>

        {/* Add Category */}
        {isAdmin && !isViewingUser && !isAssigningUser && (
        <Card className="border-2 border-card-border bg-card/80 backdrop-blur-sm shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <span className="text-2xl">+</span>
              Add Category
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 h-11 border-2 focus:border-primary transition-colors"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCategory();
              }
            }}
          />
          <Button 
            onClick={addCategory} 
            disabled={loading} 
            className="w-full sm:w-auto shrink-0 bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300 font-semibold h-11"
          >
            {loading ? "Adding..." : "Add Category"}
          </Button>
        </CardContent>
      </Card>
      )}

      {/* All Categories */}
      <Card className="border-2 border-card-border bg-card/80 backdrop-blur-sm shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">All Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading categories...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-destructive font-medium">{error}</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground text-lg">No categories yet. {isAdmin && "Add one above to get started."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="group relative p-4 rounded-xl border-2 border-card-border bg-card/60 hover:border-primary/50 hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors duration-300">
                        {c.name}
                      </h3>
                    </div>
                    {isAdmin && !isViewingUser && !isAssigningUser && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteCategory(c.id)}
                        className="shrink-0 shadow-sm hover:shadow-md transition-all duration-300"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </div>
  );
}
