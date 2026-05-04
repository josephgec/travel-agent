import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { BedDouble, Car, Plane, RefreshCw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { D_DISPLAY, D_MONO, D_PAL, D_SERIF } from "../design/postcard/tokens";
import { Banner, Button, EmptyState, PageHeader, PostcardPage } from "../design/postcard/primitives";
import { type Trip, deleteTrip, listTrips, triggerTripScan } from "../lib/api";

const KIND_ICON: Record<Trip["kind"], ReactNode> = {
  flight: <Plane size={14} />,
  hotel: <BedDouble size={14} />,
  rental: <Car size={14} />,
  other: <Plane size={14} />,
};

export function TripsPage() {
  const qc = useQueryClient();
  const { data: trips = [], isLoading } = useQuery<Trip[]>({
    queryKey: ["trips"],
    queryFn: listTrips,
  });
  const scanMut = useMutation({
    mutationFn: triggerTripScan,
    onSuccess: () => {
      setTimeout(() => qc.invalidateQueries({ queryKey: ["trips"] }), 3000);
    },
  });
  const deleteMut = useMutation({
    mutationFn: deleteTrip,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trips"] }),
  });

  return (
    <PostcardPage>
      <PageHeader
        eyebrow="from your inbox —"
        title="Trips"
        subtitle="Auto-extracted from Gmail. Connect Google in Settings, then scan to populate."
        rightSlot={
          <Button
            variant="secondary"
            onClick={() => scanMut.mutate()}
            disabled={scanMut.isPending}
          >
            <RefreshCw size={12} className={scanMut.isPending ? "animate-spin" : ""} />
            {scanMut.isPending ? "Scanning…" : "Scan Gmail now"}
          </Button>
        }
      />

      {scanMut.isSuccess && (
        <div style={{ marginBottom: 14 }}>
          <Banner tone="success">Scan queued. New trips appear here once extraction finishes.</Banner>
        </div>
      )}

      {isLoading ? (
        <div style={{ fontFamily: D_SERIF, fontStyle: "italic", color: D_PAL.muted }}>Loading…</div>
      ) : trips.length === 0 ? (
        <EmptyState
          title="no trips yet"
          hint='Try "Scan Gmail now" if you have travel confirmations there.'
        />
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {trips.map((t) => (
            <li key={t.id}>
              <div
                style={{
                  background: D_PAL.paper,
                  border: `0.5px solid ${D_PAL.rule}`,
                  boxShadow: `2px 2px 0 ${D_PAL.ruleSoft}`,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <span style={{ color: D_PAL.accent, marginTop: 2 }}>{KIND_ICON[t.kind] ?? KIND_ICON.other}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: D_DISPLAY, fontSize: 16, fontWeight: 600, letterSpacing: -0.3 }}>
                      {t.title ?? "Untitled trip"}
                    </span>
                    <span
                      style={{
                        fontFamily: D_MONO,
                        fontSize: 9,
                        color: D_PAL.muted,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                      }}
                    >
                      {t.kind}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      display: "flex",
                      gap: 14,
                      flexWrap: "wrap",
                      fontFamily: D_SERIF,
                      fontStyle: "italic",
                      fontSize: 13,
                      color: D_PAL.ink2,
                    }}
                  >
                    {t.origin && t.destination && (
                      <span>
                        {t.origin} → {t.destination}
                      </span>
                    )}
                    {t.departure_date && <span>{fmtDate(t.departure_date)}</span>}
                    {t.return_date && <span>↩ {fmtDate(t.return_date)}</span>}
                    {t.confirmation_numbers.length > 0 && (
                      <span style={{ fontFamily: D_MONO, fontSize: 11 }}>
                        <span style={{ color: D_PAL.muted, marginRight: 4 }}>CONF</span>
                        {(t.confirmation_numbers as string[]).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Delete this trip record?")) deleteMut.mutate(t.id);
                  }}
                  aria-label="Delete trip"
                  style={{ background: "transparent", border: "none", color: D_PAL.muted, cursor: "pointer" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PostcardPage>
  );
}

function fmtDate(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}
