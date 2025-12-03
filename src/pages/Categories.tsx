import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BackToDashboardButton from "@/components/BackToDashboardButton";

type Category = { id: string; name: string };

export default function Categories() {
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
      const res = await fetch(`${API_BASE}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch(`${API_BASE}/api/categories/${id}`, {
        method: "DELETE",
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
    <div className="max-w-5xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <BackToDashboardButton />
      <h1 className="text-2xl sm:text-3xl font-bold">Categories</h1>

      {/* Add Category */}
      <Card>
        <CardHeader>
          <CardTitle>Add Category</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
          />
          <Button onClick={addCategory} disabled={loading} className="w-full sm:w-auto shrink-0">
            {loading ? "Adding..." : "Add"}
          </Button>
        </CardContent>
      </Card>

      {/* All Categories */}
      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : categories.length === 0 ? (
            <p>No categories yet.</p>
          ) : (
            <ul className="divide-y">
              {categories.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 py-2"
                >
                  <span className="break-words flex-1">{c.name}</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteCategory(c.id)}
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
  );
}
