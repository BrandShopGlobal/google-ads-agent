import { createClient } from "@supabase/supabase-js";
import { isDemo } from "./env";
import type { UserRole } from "./types";

export type AuthUser = { id: string; email: string; role: UserRole };

export async function requireUser(request: Request): Promise<AuthUser> {
  if (isDemo())
    return { id: "demo-admin", email: "demo@brandshop.local", role: "admin" };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!url || !serviceKey || !token) throw new Error("UNAUTHORIZED");
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();
  return {
    id: data.user.id,
    email: data.user.email || "",
    role: profile?.role === "admin" ? "admin" : "member",
  };
}

export async function requireAdmin(request: Request): Promise<AuthUser> {
  const user = await requireUser(request);
  if (user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}

export function apiError(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const status =
    message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
  return Response.json(
    { error: status >= 500 ? "Unexpected server error" : message },
    { status },
  );
}
