// src/lib/api.ts

// ✅ Automatically pull base URL from environment
// Make sure your .env contains:
// VITE_API_BASE_URL=https://your-vercel-backend.vercel.app
export const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "https://darb-asset-register-pump-backend.vercel.app";


// ✅ Enable this temporarily for debugging network issues
const DEBUG = false;

/**
 * Universal API helper for frontend → backend requests.
 * - Automatically prefixes with API_BASE.
 * - Includes credentials (cookies) for auth sessions.
 * - Throws detailed errors for better UX in production.
 */
export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  if (!API_BASE) {
    throw new Error(
      "VITE_API_BASE_URL is not defined. Please set it in your .env file."
    );
  }

  // Build full request URL safely
  const url = `${API_BASE}${
    endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  }`;

  const config: RequestInit = {
    credentials: "include", // ✅ required for cookies (sessions)
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    if (DEBUG) console.log(`[apiFetch] ${response.status}: ${url}`);

    // ✅ Handle non-successful responses
    if (!response.ok) {
      const text = await response.text();
      const msg = text || `Request failed (${response.status})`;
      throw new Error(msg);
    }

    // ✅ Parse JSON safely
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }

    return response.text();
  } catch (err: any) {
    // ✅ Friendly error logging in production
    if (DEBUG) console.error("apiFetch error:", err);
    throw new Error(err.message || "Network request failed");
  }
};
