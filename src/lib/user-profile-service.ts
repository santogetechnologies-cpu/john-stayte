import { INITIAL_ACTIVE_AGENTS } from "./delivery-agent-service";

/**
 * Resolves the display user name from multiple auth and database sources.
 *
 * Rules:
 * 1. Active delivery agent matches (Aswin / Astin) return canonical agent full_name.
 * 2. Authoritative customer profile `full_name` from the PostgreSQL `profiles` table takes precedence.
 * 3. Supabase Auth user metadata `full_name` is used as secondary fallback.
 * 4. Email username prefix is used as final fallback.
 */
export function resolveUserName(
  email?: string | null,
  metadataName?: string | null,
  profileName?: string | null,
): string {
  const normEmail = (email || "").trim().toLowerCase();
  const matchedAgent = INITIAL_ACTIVE_AGENTS.find(
    (ag) => ag.email?.toLowerCase() === normEmail,
  );
  if (matchedAgent?.full_name) {
    return matchedAgent.full_name;
  }
  // 1. Authoritative customer profile full_name from database takes precedence
  if (profileName && profileName.trim() && profileName.trim().toLowerCase() !== normEmail) {
    return profileName.trim();
  }
  // 2. Auth user metadata full_name as secondary fallback
  if (metadataName && metadataName.trim() && metadataName.trim().toLowerCase() !== normEmail) {
    return metadataName.trim();
  }
  return email ? email.split("@")[0] : "User";
}

