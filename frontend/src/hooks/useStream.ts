import { useCallback, useRef, useState } from "react";
import { API_BASE } from "../lib/api";

export type StreamEvent =
  | { type: "iteration"; data: { n: number } }
  | { type: "text_delta"; data: { text: string } }
  | {
      type: "tool_use_start";
      data: { id?: string; name?: string; arguments?: unknown };
    }
  | {
      type: "tool_result";
      data: {
        tool_call_id?: string;
        tool_name?: string;
        result: Record<string, unknown>;
      };
    }
  | { type: "error"; data: { message: string } }
  | { type: "done"; data: Record<string, never> };

type Options = {
  onEvent: (event: StreamEvent) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
};

/**
 * POSTs to /api/chat and streams the SSE response.
 * EventSource doesn't support POST, so we parse the SSE format manually.
 */
export function useStream(opts: Options) {
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(
    async (body: { conversation_id: string; message: string }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);

      try {
        const res = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          // SSE records are separated by blank lines.
          let idx;
          while ((idx = buf.indexOf("\n\n")) !== -1) {
            const raw = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            for (const line of raw.split("\n")) {
              if (!line.startsWith("data:")) continue;
              const json = line.slice(5).trim();
              if (!json) continue;
              try {
                opts.onEvent(JSON.parse(json) as StreamEvent);
              } catch (e) {
                console.error("bad SSE chunk", json, e);
              }
            }
          }
        }
        opts.onDone?.();
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        opts.onError?.(e as Error);
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [opts],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { start, stop, streaming };
}
