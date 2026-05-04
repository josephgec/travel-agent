import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Mail, Plus, Trash2, XCircle } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { D_DISPLAY, D_MONO, D_PAL, D_SCRIPT, D_SERIF } from "../design/postcard/tokens";
import { Banner, Button, EmptyState, PageHeader, PostcardPage, ScriptLabel } from "../design/postcard/primitives";
import {
  type GoogleStatus,
  type Memory,
  type Preference,
  deleteMemory,
  deletePreference,
  disconnectGoogle,
  getGoogleStatus,
  googleConnectUrl,
  listMemories,
  listPreferences,
  upsertPreference,
} from "../lib/api";

export function SettingsPage() {
  return (
    <PostcardPage>
      <PageHeader
        eyebrow="your agent's notebook —"
        title="Settings"
        subtitle="Connect Google for Gmail + Calendar, manage preferences and what the agent remembers."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 36, marginTop: 8 }}>
        <GoogleSection />
        <PreferencesSection />
        <MemoriesSection />
      </div>
    </PostcardPage>
  );
}

function SectionTitle({ children, script }: { children: React.ReactNode; script?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontFamily: D_DISPLAY, fontSize: 22, fontWeight: 600, letterSpacing: -0.4 }}>{children}</span>
        {script && <ScriptLabel size={16}>{script}</ScriptLabel>}
      </div>
      <div style={{ height: 1, borderTop: `0.5px dashed ${D_PAL.rule}`, marginTop: 8 }} />
    </div>
  );
}

function GoogleSection() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const successFlag = params.get("google");
  const errorFlag = params.get("google_error");

  const { data: status } = useQuery<GoogleStatus>({
    queryKey: ["google_status"],
    queryFn: getGoogleStatus,
  });

  const disconnectMut = useMutation({
    mutationFn: disconnectGoogle,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["google_status"] }),
  });

  useEffect(() => {
    if (successFlag || errorFlag) {
      const t = setTimeout(() => {
        params.delete("google");
        params.delete("google_error");
        setParams(params, { replace: true });
      }, 6000);
      return () => clearTimeout(t);
    }
  }, [successFlag, errorFlag, params, setParams]);

  return (
    <section>
      <SectionTitle script="connect your account">Google</SectionTitle>
      <p style={{ fontFamily: D_SERIF, fontStyle: "italic", color: D_PAL.ink3, fontSize: 14, marginTop: -4, marginBottom: 14 }}>
        Connect Google so the agent can read travel emails (Gmail) and manage events (Calendar).
      </p>
      {successFlag === "connected" && (
        <div style={{ marginBottom: 12 }}>
          <Banner tone="success">Google account connected.</Banner>
        </div>
      )}
      {errorFlag && (
        <div style={{ marginBottom: 12 }}>
          <Banner tone="error">Google connection error: {errorFlag}</Banner>
        </div>
      )}
      <div
        style={{
          background: D_PAL.paper,
          border: `0.5px solid ${D_PAL.rule}`,
          boxShadow: `2px 2px 0 ${D_PAL.ruleSoft}`,
          padding: "16px 18px",
        }}
      >
        {status?.connected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={16} style={{ color: D_PAL.green }} />
              <span style={{ fontFamily: D_SERIF, fontSize: 14 }}>
                Connected as <strong style={{ color: D_PAL.ink }}>{status.account_email ?? "unknown"}</strong>
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(status.capabilities).map(([name, granted]) => (
                <span
                  key={name}
                  style={{
                    fontFamily: D_MONO,
                    fontSize: 9.5,
                    letterSpacing: 0.6,
                    padding: "3px 8px",
                    background: granted ? "#e9f0e3" : D_PAL.paperHi,
                    color: granted ? D_PAL.green : D_PAL.muted,
                    border: `0.5px solid ${granted ? D_PAL.green : D_PAL.rule}`,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {granted ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                  {name.toUpperCase()}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <a
                href={googleConnectUrl(["gmail", "calendar"])}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "transparent",
                  color: D_PAL.ink,
                  border: `0.5px solid ${D_PAL.rule}`,
                  padding: "6px 12px",
                  fontFamily: D_DISPLAY,
                  fontSize: 11,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Re-authorize
              </a>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (confirm("Disconnect Google account? Stored token will be deleted."))
                    disconnectMut.mutate();
                }}
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <XCircle size={16} style={{ color: D_PAL.muted }} />
              <span style={{ fontFamily: D_SERIF, fontStyle: "italic", color: D_PAL.muted, fontSize: 14 }}>
                Not connected.
              </span>
            </div>
            <a
              href={googleConnectUrl(["gmail"])}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: D_PAL.ink,
                color: D_PAL.cream,
                border: "none",
                padding: "8px 14px",
                fontFamily: D_DISPLAY,
                fontSize: 11.5,
                letterSpacing: 1.4,
                textTransform: "uppercase",
                fontWeight: 600,
                textDecoration: "none",
                width: "fit-content",
              }}
            >
              <Mail size={14} />
              Connect Gmail (read-only)
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

function PreferencesSection() {
  const qc = useQueryClient();
  const { data: prefs = [] } = useQuery<Preference[]>({
    queryKey: ["preferences"],
    queryFn: listPreferences,
  });

  const upsertMut = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => upsertPreference(key, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["preferences"] }),
  });
  const deleteMut = useMutation({
    mutationFn: deletePreference,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["preferences"] }),
  });

  return (
    <section>
      <SectionTitle script="auto-extracted">Preferences</SectionTitle>
      <p style={{ fontFamily: D_SERIF, fontStyle: "italic", color: D_PAL.ink3, fontSize: 14, marginTop: -4, marginBottom: 14 }}>
        Auto-extracted from conversations. Edit values inline; the agent reads these on every turn.
      </p>
      <div
        style={{
          background: D_PAL.paper,
          border: `0.5px solid ${D_PAL.rule}`,
          boxShadow: `2px 2px 0 ${D_PAL.ruleSoft}`,
        }}
      >
        {prefs.map((p, i) => (
          <PreferenceRow
            key={p.id}
            preference={p}
            last={i === prefs.length - 1 && false}
            onSave={(value) => upsertMut.mutate({ key: p.key, value })}
            onDelete={() => deleteMut.mutate(p.key)}
          />
        ))}
        {prefs.length === 0 && (
          <div style={{ padding: "20px 18px", textAlign: "center", fontFamily: D_SERIF, fontStyle: "italic", color: D_PAL.muted, fontSize: 13 }}>
            <ScriptLabel size={15}>nothing yet —</ScriptLabel> Tell the agent things like "I always fly aisle" and they'll appear here.
          </div>
        )}
        <NewPreferenceRow onSave={(key, value) => upsertMut.mutate({ key, value })} />
      </div>
    </section>
  );
}

function PreferenceRow({
  preference,
  onSave,
  onDelete,
}: {
  preference: Preference;
  last: boolean;
  onSave: (value: unknown) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(JSON.stringify(preference.value));
  const [touched, setTouched] = useState(false);

  const commit = () => {
    if (!touched) return;
    try {
      onSave(JSON.parse(draft));
      setTouched(false);
    } catch {
      onSave(draft);
      setTouched(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderBottom: `0.5px dashed ${D_PAL.rule}`,
      }}
    >
      <span
        style={{
          fontFamily: D_MONO,
          fontSize: 11,
          color: D_PAL.ink2,
          width: 240,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {preference.key}
      </span>
      <input
        type="text"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setTouched(true);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        style={{
          flex: 1,
          background: D_PAL.paperHi,
          border: `0.5px solid ${D_PAL.ruleSoft}`,
          padding: "5px 8px",
          fontFamily: D_MONO,
          fontSize: 12,
          color: D_PAL.ink,
          outline: "none",
        }}
      />
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete preference"
        style={{ background: "transparent", border: "none", color: D_PAL.muted, cursor: "pointer" }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function NewPreferenceRow({ onSave }: { onSave: (key: string, value: unknown) => void }) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    let parsed: unknown = value;
    try {
      parsed = JSON.parse(value);
    } catch {
      // keep as string
    }
    onSave(key.trim(), parsed);
    setKey("");
    setValue("");
  };

  return (
    <form
      onSubmit={submit}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        background: D_PAL.paperWarm,
      }}
    >
      <input
        type="text"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="key (e.g. flights.seat)"
        style={{
          width: 240,
          background: D_PAL.paper,
          border: `0.5px solid ${D_PAL.ruleSoft}`,
          padding: "5px 8px",
          fontFamily: D_MONO,
          fontSize: 12,
          outline: "none",
          color: D_PAL.ink,
        }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder='value (JSON, e.g. "aisle")'
        style={{
          flex: 1,
          background: D_PAL.paper,
          border: `0.5px solid ${D_PAL.ruleSoft}`,
          padding: "5px 8px",
          fontFamily: D_MONO,
          fontSize: 12,
          outline: "none",
          color: D_PAL.ink,
        }}
      />
      <Button type="submit" size="sm" disabled={!key.trim()}>
        <Plus size={11} />
        Add
      </Button>
    </form>
  );
}

function MemoriesSection() {
  const qc = useQueryClient();
  const { data: memories = [] } = useQuery<Memory[]>({
    queryKey: ["memories"],
    queryFn: listMemories,
  });
  const deleteMut = useMutation({
    mutationFn: deleteMemory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memories"] }),
  });

  return (
    <section>
      <SectionTitle script="episodic memory">Memories</SectionTitle>
      <p style={{ fontFamily: D_SERIF, fontStyle: "italic", color: D_PAL.ink3, fontSize: 14, marginTop: -4, marginBottom: 14 }}>
        The agent searches these by similarity when relevant.
      </p>
      {memories.length === 0 ? (
        <EmptyState
          title="no memories yet"
          hint="Have a conversation about a trip and they'll be extracted automatically."
        />
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {memories.map((m) => (
            <li key={m.id}>
              <div
                style={{
                  background: D_PAL.paper,
                  border: `0.5px solid ${D_PAL.rule}`,
                  boxShadow: `2px 2px 0 ${D_PAL.ruleSoft}`,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, marginBottom: 4 }}>
                    <span
                      style={{
                        fontFamily: D_MONO,
                        fontSize: 9.5,
                        letterSpacing: 0.6,
                        padding: "2px 6px",
                        background: D_PAL.paperHi,
                        border: `0.5px solid ${D_PAL.rule}`,
                        textTransform: "uppercase",
                        color: D_PAL.ink2,
                      }}
                    >
                      {m.kind}
                    </span>
                    <span style={{ fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 0.5 }}>
                      IMPORTANCE {m.importance}/5
                    </span>
                    <span style={{ fontFamily: D_SERIF, fontStyle: "italic", fontSize: 12, color: D_PAL.muted }}>
                      · {new Date(m.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ fontFamily: D_DISPLAY, fontSize: 16, fontWeight: 600 }}>{m.title}</div>
                  <div style={{ fontFamily: D_SERIF, fontSize: 13.5, color: D_PAL.ink2, marginTop: 4, lineHeight: 1.55 }}>
                    {m.content}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteMut.mutate(m.id)}
                  aria-label="Delete memory"
                  style={{ background: "transparent", border: "none", color: D_PAL.muted, cursor: "pointer" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
