"use client";

import { useState } from "react";
import { Flag, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/shared/modal";
import { NoAccess, PageShell } from "@/components/shared/page-shell";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge, TonePill } from "@/components/shared/status-badge";
import { getErrorMessage } from "@/lib/api";
import { formatDate, formatLkr } from "@/lib/format";
import { useCan } from "@/lib/hooks/use-desk";
import { useFlagRating, useHideRating, useRatings, useResolveRatingDispute } from "@/lib/hooks/use-ratings";
import { cn } from "@/lib/utils";
import type { DisputeStatus, Rating } from "@/types/rating";

const PER_PAGE = 20;

const RATED_BY_TABS: Array<{ key: "all" | "rider" | "driver"; label: string }> = [
  { key: "all", label: "All" },
  { key: "rider", label: "Rated by riders" },
  { key: "driver", label: "Rated by drivers" },
];

const DISPUTE_LABEL: Record<DisputeStatus, string> = {
  none: "—",
  disputed: "Disputed",
  resolved: "Resolved",
};
const DISPUTE_TONE = { none: "neutral", disputed: "amber", resolved: "neutral" } as const;

function Stars({ value }: { value: number }) {
  return <span title={`${value} star${value === 1 ? "" : "s"}`}>{"★".repeat(value)}{"☆".repeat(5 - value)}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

const pillClass = (active: boolean) =>
  cn(
    "rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
    active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card hover:border-ring hover:bg-accent",
  );

/**
 * Reviews & ratings: every rating left after a ride, in both directions, with search/filters and
 * a moderation panel (flag a dispute, resolve it, hide a rating). Staff can never edit the stars
 * or comment a rider/driver actually submitted — see RatingModerationModal.
 */
export function ReviewsList() {
  const canView = useCan("rating.view");
  const canModerate = useCan("rating.moderate");

  const [ratedBy, setRatedBy] = useState<"all" | "rider" | "driver">("all");
  const [stars, setStars] = useState<string>("all");
  const [disputeStatus, setDisputeStatus] = useState<DisputeStatus | "all">("all");
  const [withComment, setWithComment] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Rating | null>(null);

  const { data, isLoading, error, isFetching } = useRatings({
    page,
    perPage: PER_PAGE,
    ...(ratedBy !== "all" ? { ratedBy } : {}),
    ...(stars !== "all" ? { stars: Number(stars) } : {}),
    ...(disputeStatus !== "all" ? { disputeStatus } : {}),
    ...(withComment ? { withComment: true } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
  });

  if (!canView) return <NoAccess what="reviews & ratings" />;

  const ratings = data?.data ?? [];
  const meta = data?.meta;
  const hasFilters = ratedBy !== "all" || stars !== "all" || disputeStatus !== "all" || withComment || !!search.trim();

  const filter =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };

  return (
    <PageShell title="Reviews & Ratings" description="Search ratings, investigate disputes, and hide abusive reviews.">
      {meta && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Driver ratings (avg)" value={meta.summary.ofDrivers.average?.toFixed(2) ?? "—"} />
          <Stat label="Driver ratings (count)" value={meta.summary.ofDrivers.count.toLocaleString()} />
          <Stat label="Rider ratings (avg)" value={meta.summary.ofRiders.average?.toFixed(2) ?? "—"} />
          <Stat label="Rider ratings (count)" value={meta.summary.ofRiders.count.toLocaleString()} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3">
        <span className="mr-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Rated by</span>
        {RATED_BY_TABS.map((tab) => (
          <button key={tab.key} onClick={() => filter(setRatedBy)(tab.key)} aria-pressed={ratedBy === tab.key} className={pillClass(ratedBy === tab.key)}>
            {tab.label}
          </button>
        ))}

        <span className="mx-2 hidden h-6 w-px bg-border sm:block" />

        <label className="flex items-center gap-2 text-sm font-medium">
          Stars
          <select
            value={stars}
            onChange={(e) => filter(setStars)(e.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="all">All</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm font-medium">
          Dispute
          <select
            value={disputeStatus}
            onChange={(e) => filter(setDisputeStatus)(e.target.value as DisputeStatus | "all")}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="all">All</option>
            <option value="disputed">Needs attention</option>
            <option value="resolved">Resolved</option>
            <option value="none">Not disputed</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={withComment} onChange={(e) => filter(setWithComment)(e.target.checked)} />
          Has comment
        </label>

        <Input
          placeholder="Search comment, rider or driver…"
          value={search}
          onChange={(e) => filter(setSearch)(e.target.value)}
          className="ml-auto w-64"
        />
      </div>

      {error && <p className="text-sm text-destructive">{getErrorMessage(error)}</p>}

      <div className={cn("rounded-2xl border bg-card p-2 transition-opacity", isFetching && !isLoading && "opacity-60")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stars</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead>Rated by</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Rider</TableHead>
              <TableHead>Ride</TableHead>
              <TableHead>Dispute</TableHead>
              <TableHead>Date</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : ratings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground">
                  {hasFilters ? "No ratings match your filters." : "No ratings found."}
                </TableCell>
              </TableRow>
            ) : (
              ratings.map((r) => (
                <TableRow key={r.id} className={cn(r.deleted_at && "opacity-50")}>
                  <TableCell><Stars value={r.stars} /></TableCell>
                  <TableCell className="max-w-[220px] truncate" title={r.comment ?? undefined}>
                    {r.comment || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="capitalize">{r.rated_by}</TableCell>
                  <TableCell>
                    {r.driver_missing ? (
                      <span className="text-muted-foreground italic">Removed driver #{r.driver_id}</span>
                    ) : (
                      r.driver_name?.trim() || "—"
                    )}
                    {r.driver_phone && <p className="text-xs text-muted-foreground">{r.driver_phone}</p>}
                  </TableCell>
                  <TableCell>
                    {r.rider_display_name?.trim() || (r.rider_user_id ? `Rider #${r.rider_user_id}` : "—")}
                    {r.rider_phone && <p className="text-xs text-muted-foreground">{r.rider_phone}</p>}
                  </TableCell>
                  <TableCell>
                    {r.fare_lkr ? formatLkr(r.fare_lkr) : "—"}
                    <div className="text-xs text-muted-foreground">{formatDate(r.ride_created_at)}</div>
                  </TableCell>
                  <TableCell>
                    <TonePill tone={DISPUTE_TONE[r.dispute_status]}>{DISPUTE_LABEL[r.dispute_status]}</TonePill>
                    {r.deleted_at && <TonePill tone="red" className="ml-1">Hidden</TonePill>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setSelected(r)}>
                      {canModerate ? "Review" : "View"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {meta && <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPage={setPage} />}
      </div>

      <RatingModerationModal rating={selected} canModerate={canModerate} onClose={() => setSelected(null)} />
    </PageShell>
  );
}

/** Full context for one rating plus its moderation actions (flag / resolve / hide). */
function RatingModerationModal({
  rating,
  canModerate,
  onClose,
}: {
  rating: Rating | null;
  canModerate: boolean;
  onClose: () => void;
}) {
  const flag = useFlagRating();
  const resolve = useResolveRatingDispute();
  const hide = useHideRating();

  const [mode, setMode] = useState<"view" | "flag" | "resolve" | "hide">("view");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState<"upheld" | "dismissed">("dismissed");
  const [hideOnUphold, setHideOnUphold] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  function reset() {
    setMode("view");
    setReason("");
    setNote("");
    setOutcome("dismissed");
    setHideOnUphold(true);
    setActionError(null);
  }

  function close() {
    reset();
    onClose();
  }

  async function submitFlag() {
    if (!rating || reason.trim().length < 3) return;
    setActionError(null);
    try {
      await flag.mutateAsync({ id: rating.id, body: { reason: reason.trim() } });
      close();
    } catch (e) {
      setActionError(getErrorMessage(e));
    }
  }

  async function submitResolve() {
    if (!rating || note.trim().length < 3) return;
    setActionError(null);
    try {
      await resolve.mutateAsync({
        id: rating.id,
        body: { outcome, note: note.trim(), hide: outcome === "upheld" ? hideOnUphold : false },
      });
      close();
    } catch (e) {
      setActionError(getErrorMessage(e));
    }
  }

  async function submitHide() {
    if (!rating || reason.trim().length < 3) return;
    setActionError(null);
    try {
      await hide.mutateAsync({ id: rating.id, body: { reason: reason.trim() } });
      close();
    } catch (e) {
      setActionError(getErrorMessage(e));
    }
  }

  const busy = flag.isPending || resolve.isPending || hide.isPending;

  return (
    <Modal open={!!rating} onClose={() => !busy && close()} title="Rating details">
      {rating && (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stars"><p><Stars value={rating.stars} /></p></Field>
            <Field label="Rated by"><p className="capitalize">{rating.rated_by}</p></Field>
            <Field label="Driver">
              <p>{rating.driver_name?.trim() || (rating.driver_id ? `Driver #${rating.driver_id}` : "—")}</p>
            </Field>
            <Field label="Rider">
              <p>{rating.rider_display_name?.trim() || (rating.rider_user_id ? `Rider #${rating.rider_user_id}` : "—")}</p>
            </Field>
            <Field label="Ride"><p className="font-mono text-xs">{rating.ride_id}</p></Field>
            <Field label="Ride status"><p><StatusBadge value={rating.ride_status} /></p></Field>
          </div>

          <Field label="Comment">
            <p className="rounded-lg bg-muted px-3 py-2">{rating.comment || "No comment left."}</p>
          </Field>

          {rating.deleted_at ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
              This rating is hidden and excluded from the driver&apos;s average.
            </p>
          ) : (
            <>
              {rating.dispute_status !== "none" && (
                <div className="space-y-1 rounded-lg bg-muted px-3 py-2">
                  <p>
                    <span className="font-medium">Dispute:</span> {DISPUTE_LABEL[rating.dispute_status]}
                  </p>
                  {rating.dispute_reason && <p className="text-muted-foreground">Reason: {rating.dispute_reason}</p>}
                  {rating.resolution_note && <p className="text-muted-foreground">Resolution: {rating.resolution_note}</p>}
                </div>
              )}

              {canModerate && mode === "view" && (
                <div className="flex flex-wrap gap-2">
                  {rating.dispute_status !== "disputed" && (
                    <Button size="sm" variant="outline" onClick={() => setMode("flag")}>
                      <Flag /> Flag as disputed
                    </Button>
                  )}
                  {rating.dispute_status === "disputed" && (
                    <Button size="sm" variant="outline" onClick={() => setMode("resolve")}>
                      Resolve dispute
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => setMode("hide")}>
                    <ShieldOff /> Hide rating
                  </Button>
                </div>
              )}

              {mode === "flag" && (
                <div className="space-y-3 rounded-lg border p-3">
                  <Field label="Why is this being disputed?">
                    <Input value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy} autoFocus />
                  </Field>
                  {actionError && <p className="text-destructive">{actionError}</p>}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setMode("view")} disabled={busy}>Cancel</Button>
                    <Button size="sm" onClick={submitFlag} disabled={busy || reason.trim().length < 3}>
                      {busy ? "Saving…" : "Flag"}
                    </Button>
                  </div>
                </div>
              )}

              {mode === "resolve" && (
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant={outcome === "dismissed" ? "default" : "outline"} onClick={() => setOutcome("dismissed")} disabled={busy}>
                      Dismiss — rating stands
                    </Button>
                    <Button size="sm" variant={outcome === "upheld" ? "default" : "outline"} onClick={() => setOutcome("upheld")} disabled={busy}>
                      Uphold
                    </Button>
                  </div>
                  {outcome === "upheld" && (
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={hideOnUphold} onChange={(e) => setHideOnUphold(e.target.checked)} disabled={busy} />
                      Also hide this rating
                    </label>
                  )}
                  <Field label="Resolution note (recorded in audit log)">
                    <Input value={note} onChange={(e) => setNote(e.target.value)} disabled={busy} autoFocus />
                  </Field>
                  {actionError && <p className="text-destructive">{actionError}</p>}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setMode("view")} disabled={busy}>Cancel</Button>
                    <Button size="sm" onClick={submitResolve} disabled={busy || note.trim().length < 3}>
                      {busy ? "Saving…" : "Resolve"}
                    </Button>
                  </div>
                </div>
              )}

              {mode === "hide" && (
                <div className="space-y-3 rounded-lg border p-3">
                  <Field label="Why is this rating being hidden?">
                    <Input value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy} autoFocus />
                  </Field>
                  {actionError && <p className="text-destructive">{actionError}</p>}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setMode("view")} disabled={busy}>Cancel</Button>
                    <Button variant="destructive" size="sm" onClick={submitHide} disabled={busy || reason.trim().length < 3}>
                      {busy ? "Saving…" : "Hide"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
