import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";

export function useUserRole() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const storedToken = localStorage.getItem("auth_token");
        const res = await fetch(`${API_BASE}/api/me`, {
          credentials: "include",
          headers: storedToken ? { "Authorization": `Bearer ${storedToken}` } : {},
        });
        const data = await res.json();
        if (data?.authenticated && data?.user) {
          setUserRole(data.user.role);
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserRole();
  }, []);

  const canAssign = userRole === "admin" || userRole === "assigning_user";
  const isAdmin = userRole === "admin";
  const canView = userRole !== null; // Any authenticated user can view

  return { userRole, loading, canAssign, isAdmin, canView };
}

