import { supabase } from "@/lib/supabase";

export async function logAdminAuditAction(
  action: string,
  targetType?: string,
  targetId?: string,
  metadata: Record<string, any> = {}
) {
  try {
    const { data: authSession } = await supabase.auth.getSession();
    const user = authSession?.session?.user;
    const actorName = user?.email || "Admin User";
    const actorId = user?.id || null;

    const { error } = await supabase.from("audit_logs").insert({
      actor_id: actorId,
      actor_name: actorName,
      action,
      target_type: targetType || null,
      target_id: targetId || null,
      metadata,
    });

    if (error) {
      console.warn("Audit log insert notice:", error.message);
    }
  } catch (err: any) {
    console.error("Audit log error:", err?.message || err);
  }
}
