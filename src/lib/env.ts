export const isDemo = () => process.env.DEMO_MODE !== "false";

export function publicConfig() {
  return {
    demoMode: isDemo(),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  };
}
