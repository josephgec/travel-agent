export const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

export type Conversation = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type StoredMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: Record<string, unknown>;
  created_at: string;
};

export async function listConversations(): Promise<Conversation[]> {
  const r = await fetch(`${API_BASE}/conversations`);
  if (!r.ok) throw new Error(`listConversations: HTTP ${r.status}`);
  return r.json();
}

export async function createConversation(title?: string): Promise<Conversation> {
  const r = await fetch(`${API_BASE}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title ?? null }),
  });
  if (!r.ok) throw new Error(`createConversation: HTTP ${r.status}`);
  return r.json();
}

export async function getMessages(conversationId: string): Promise<StoredMessage[]> {
  const r = await fetch(`${API_BASE}/conversations/${conversationId}/messages`);
  if (!r.ok) throw new Error(`getMessages: HTTP ${r.status}`);
  return r.json();
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const r = await fetch(`${API_BASE}/conversations/${conversationId}`, {
    method: "DELETE",
  });
  if (!r.ok && r.status !== 204) throw new Error(`deleteConversation: HTTP ${r.status}`);
}

// --- Preferences ---

export type Preference = {
  id: string;
  key: string;
  value: unknown;
  updated_at: string;
};

export async function listPreferences(): Promise<Preference[]> {
  const r = await fetch(`${API_BASE}/preferences`);
  if (!r.ok) throw new Error(`listPreferences: HTTP ${r.status}`);
  return r.json();
}

export async function upsertPreference(key: string, value: unknown): Promise<Preference> {
  const r = await fetch(`${API_BASE}/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  if (!r.ok) throw new Error(`upsertPreference: HTTP ${r.status}`);
  return r.json();
}

export async function deletePreference(key: string): Promise<void> {
  const r = await fetch(`${API_BASE}/preferences/${encodeURIComponent(key)}`, {
    method: "DELETE",
  });
  if (!r.ok && r.status !== 204) throw new Error(`deletePreference: HTTP ${r.status}`);
}

// --- Memories ---

export type Memory = {
  id: string;
  kind: "trip" | "fact" | "pattern";
  title: string;
  content: string;
  importance: number;
  created_at: string;
  last_used_at: string | null;
};

export async function listMemories(): Promise<Memory[]> {
  const r = await fetch(`${API_BASE}/memories`);
  if (!r.ok) throw new Error(`listMemories: HTTP ${r.status}`);
  return r.json();
}

export async function deleteMemory(id: string): Promise<void> {
  const r = await fetch(`${API_BASE}/memories/${id}`, { method: "DELETE" });
  if (!r.ok && r.status !== 204) throw new Error(`deleteMemory: HTTP ${r.status}`);
}

// --- Google OAuth status ---

export type GoogleStatus =
  | { connected: false }
  | {
      connected: true;
      account_email: string | null;
      scopes: string[];
      capabilities: Record<string, boolean>;
      updated_at: string;
    };

export async function getGoogleStatus(): Promise<GoogleStatus> {
  const r = await fetch(`${API_BASE}/auth/google/status`);
  if (!r.ok) throw new Error(`getGoogleStatus: HTTP ${r.status}`);
  return r.json();
}

export function googleConnectUrl(scopes: string[]): string {
  const qs = scopes.map((s) => `scopes=${encodeURIComponent(s)}`).join("&");
  return `${API_BASE}/auth/google/start?${qs}`;
}

export async function disconnectGoogle(): Promise<void> {
  const r = await fetch(`${API_BASE}/auth/google/disconnect`, { method: "DELETE" });
  if (!r.ok && r.status !== 204) throw new Error(`disconnectGoogle: HTTP ${r.status}`);
}

// --- Trips ---

export type Trip = {
  id: string;
  source: string;
  source_ref: string | null;
  kind: "flight" | "hotel" | "rental" | "other";
  title: string | null;
  origin: string | null;
  destination: string | null;
  departure_date: string | null;
  return_date: string | null;
  confirmation_numbers: unknown[];
  extra: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export async function listTrips(): Promise<Trip[]> {
  const r = await fetch(`${API_BASE}/trips`);
  if (!r.ok) throw new Error(`listTrips: HTTP ${r.status}`);
  return r.json();
}

export async function deleteTrip(id: string): Promise<void> {
  const r = await fetch(`${API_BASE}/trips/${id}`, { method: "DELETE" });
  if (!r.ok && r.status !== 204) throw new Error(`deleteTrip: HTTP ${r.status}`);
}

export async function triggerTripScan(): Promise<void> {
  const r = await fetch(`${API_BASE}/trips/scan`, { method: "POST" });
  if (!r.ok && r.status !== 202) throw new Error(`triggerTripScan: HTTP ${r.status}`);
}

// --- Plans ---

export type Plan = {
  id: string;
  conversation_id: string | null;
  title: string;
  status: "draft" | "saved" | "booked";
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type PlanExportResult = {
  created: number;
  skipped: number;
  event_links: string[];
  errors: string[];
};

export async function getPlan(id: string): Promise<Plan> {
  const r = await fetch(`${API_BASE}/plans/${id}`);
  if (!r.ok) throw new Error(`getPlan: HTTP ${r.status}`);
  return r.json();
}

export async function updatePlan(
  id: string,
  body: { title?: string; status?: Plan["status"]; data?: unknown; patch?: unknown },
): Promise<Plan> {
  const r = await fetch(`${API_BASE}/plans/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`updatePlan: HTTP ${r.status}`);
  return r.json();
}

export async function exportPlanToCalendar(id: string): Promise<PlanExportResult> {
  const r = await fetch(`${API_BASE}/plans/${id}/export-to-calendar`, { method: "POST" });
  if (!r.ok) throw new Error(`exportPlanToCalendar: HTTP ${r.status}`);
  return r.json();
}

export async function listPlans(): Promise<Plan[]> {
  const r = await fetch(`${API_BASE}/plans`);
  if (!r.ok) throw new Error(`listPlans: HTTP ${r.status}`);
  return r.json();
}

export async function deletePlan(id: string): Promise<void> {
  const r = await fetch(`${API_BASE}/plans/${id}`, { method: "DELETE" });
  if (!r.ok && r.status !== 204) throw new Error(`deletePlan: HTTP ${r.status}`);
}
