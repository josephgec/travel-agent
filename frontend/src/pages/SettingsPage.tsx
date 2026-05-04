import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Mail, Plus, Trash2, XCircle } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-10 max-w-4xl">
      <GoogleSection />
      <PreferencesSection />
      <MemoriesSection />
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

  // Clear redirect query params after we render once.
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
      <h2 className="text-lg font-semibold mb-3">Google account</h2>
      <p className="text-sm text-neutral-400 mb-4">
        Connect your Google account so the agent can read travel emails (Gmail) and
        manage events (Calendar).
      </p>
      {successFlag === "connected" && (
        <div className="mb-3 text-sm text-emerald-400 bg-emerald-950/30 border border-emerald-900 rounded px-3 py-2">
          Google account connected.
        </div>
      )}
      {errorFlag && (
        <div className="mb-3 text-sm text-rose-400 bg-rose-950/30 border border-rose-900 rounded px-3 py-2">
          Google connection error: {errorFlag}
        </div>
      )}
      <div className="rounded-md border border-neutral-800 px-4 py-3 text-sm">
        {status?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-neutral-100">
              <CheckCircle2 size={16} className="text-emerald-400" />
              Connected as <span className="font-medium">{status.account_email ?? "unknown"}</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(status.capabilities).map(([name, granted]) => (
                <span
                  key={name}
                  className={`flex items-center gap-1 px-2 py-1 rounded font-mono ${
                    granted
                      ? "bg-emerald-950/30 text-emerald-300"
                      : "bg-neutral-900 text-neutral-500"
                  }`}
                >
                  {granted ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {name}
                </span>
              ))}
            </div>
            <div className="flex gap-2 text-xs">
              <a
                href={googleConnectUrl(["gmail", "calendar"])}
                className="rounded border border-neutral-700 px-3 py-1.5 hover:bg-neutral-800"
              >
                Re-authorize / add scopes
              </a>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Disconnect Google account? Stored token will be deleted."))
                    disconnectMut.mutate();
                }}
                className="rounded border border-rose-900 text-rose-400 px-3 py-1.5 hover:bg-rose-950/30"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-neutral-400">
              <XCircle size={16} className="text-neutral-600" />
              Not connected.
            </div>
            <a
              href={googleConnectUrl(["gmail"])}
              className="inline-flex items-center gap-2 rounded bg-neutral-100 text-neutral-900 px-3 py-1.5 text-xs font-medium hover:bg-white"
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
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      upsertPreference(key, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["preferences"] }),
  });
  const deleteMut = useMutation({
    mutationFn: deletePreference,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["preferences"] }),
  });

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">Preferences</h2>
      <p className="text-sm text-neutral-400 mb-4">
        Auto-extracted from conversations. Edit values inline; the agent reads these on every turn.
      </p>
      <div className="rounded-md border border-neutral-800 divide-y divide-neutral-800">
        {prefs.map((p) => (
          <PreferenceRow
            key={p.id}
            preference={p}
            onSave={(value) => upsertMut.mutate({ key: p.key, value })}
            onDelete={() => deleteMut.mutate(p.key)}
          />
        ))}
        {prefs.length === 0 && (
          <div className="px-4 py-6 text-center text-neutral-500 text-sm">
            No preferences yet. Tell the agent things like "I always fly aisle" and they'll appear here.
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
      // not valid JSON — store as raw string
      onSave(draft);
      setTouched(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 text-sm">
      <span className="font-mono text-neutral-300 w-64 truncate">{preference.key}</span>
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
        className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-neutral-100 font-mono"
      />
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete preference"
        className="text-neutral-500 hover:text-rose-400"
      >
        <Trash2 size={14} />
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
      // fall through, keep as string
    }
    onSave(key.trim(), parsed);
    setKey("");
    setValue("");
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-3 px-4 py-2 text-sm bg-neutral-950">
      <input
        type="text"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="key (e.g. flights.seat)"
        className="w-64 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-neutral-100 font-mono placeholder-neutral-600"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder='value (JSON, e.g. "aisle")'
        className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-neutral-100 font-mono placeholder-neutral-600"
      />
      <button
        type="submit"
        disabled={!key.trim()}
        className="rounded bg-neutral-100 text-neutral-900 px-3 py-1 disabled:opacity-50 flex items-center gap-1"
      >
        <Plus size={12} />
        Add
      </button>
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
      <h2 className="text-lg font-semibold mb-3">Memories</h2>
      <p className="text-sm text-neutral-400 mb-4">
        Episodic memory — the agent searches these by similarity when relevant.
      </p>
      <div className="space-y-2">
        {memories.map((m) => (
          <div
            key={m.id}
            className="rounded-md border border-neutral-800 px-4 py-3 text-sm flex items-start gap-3"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
                <span className="rounded bg-neutral-900 px-2 py-0.5 font-mono">{m.kind}</span>
                <span>importance {m.importance}/5</span>
                <span>· {new Date(m.created_at).toLocaleDateString()}</span>
              </div>
              <div className="text-neutral-100 font-medium">{m.title}</div>
              <div className="text-neutral-300 mt-1">{m.content}</div>
            </div>
            <button
              type="button"
              onClick={() => deleteMut.mutate(m.id)}
              aria-label="Delete memory"
              className="text-neutral-500 hover:text-rose-400"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {memories.length === 0 && (
          <div className="text-center text-neutral-500 text-sm py-6">
            No memories yet. Have a conversation about a trip and they'll be extracted automatically.
          </div>
        )}
      </div>
    </section>
  );
}
