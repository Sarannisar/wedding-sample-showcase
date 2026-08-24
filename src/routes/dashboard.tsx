import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { WhatsAppIcon } from "@/components/invite/WhatsAppShare";
import { EVENT, inviteUrl, whatsappMessage } from "@/lib/event";
import {
  createInvitee,
  deleteInvitee,
  listInvitees,
  type Invitee,
} from "@/lib/invitees";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Host Dashboard — Ilyas Wedding Invitations" },
      {
        name: "description",
        content:
          "Manage invitees, track RSVPs and share personalised wedding invitations over WhatsApp.",
      },
      { property: "og:title", content: "Host Dashboard — Ilyas Wedding Invitations" },
      {
        property: "og:description",
        content: "Track RSVPs and share personalised invitations in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type Tab = "overview" | "invitees" | "add";

function copy(text: string) {
  navigator.clipboard.writeText(text);
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="ornate px-5 py-6">
      <div className="ornate-inner" />
      <div className="relative z-10">
        <p className="font-label text-[9px] text-ink-muted">{label}</p>
        <p
          className="font-display mt-2 text-4xl leading-none"
          style={{ color }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function Dashboard() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const { data: invitees = [] } = useQuery({
    queryKey: ["invitees"],
    queryFn: listInvitees,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["invitees"] });

  const stats = useMemo(() => {
    const total = invitees.length;
    const attending = invitees.filter((i) => i.rsvp === "attending").length;
    const declined = invitees.filter((i) => i.rsvp === "declined").length;
    const pending = total - attending - declined;
    const guests = invitees.reduce((s, i) => s + (i.guest_count || 0), 0);
    const pct = (n: number) => (total ? (n / total) * 100 : 0);
    return { total, attending, declined, pending, guests, pct };
  }, [invitees]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-shell px-4 py-5 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-label text-[10px] text-secondary">{EVENT.type}</p>
            <h1 className="font-display text-xl text-white sm:text-2xl">
              {EVENT.honoree1} &amp; {EVENT.honoree2}
            </h1>
          </div>
          <p className="font-body text-sm text-secondary">
            {EVENT.events[0]!.day}
          </p>
        </div>
      </header>

      <nav className="border-b border-primary/15 bg-surface px-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto">
          {(
            [
              ["overview", "Overview"],
              ["invitees", "All Invitees"],
              ["add", "Add and Import"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`font-label border-b-2 px-4 py-4 text-[10px] whitespace-nowrap transition-colors ${
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-ink-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        {tab === "overview" && <Overview invitees={invitees} stats={stats} />}
        {tab === "invitees" && (
          <AllInvitees invitees={invitees} onChange={refresh} />
        )}
        {tab === "add" && <AddImport onChange={refresh} />}
      </main>
    </div>
  );
}

function Overview({
  invitees,
  stats,
}: {
  invitees: Invitee[];
  stats: {
    total: number;
    attending: number;
    declined: number;
    pending: number;
    guests: number;
    pct: (n: number) => number;
  };
}) {
  const recent = invitees
    .filter((i) => i.responded_at)
    .sort((a, b) => (a.responded_at! < b.responded_at! ? 1 : -1))
    .slice(0, 8);

  const segments = [
    { key: "attending", value: stats.attending, color: "var(--success)" },
    { key: "declined", value: stats.declined, color: "var(--danger)" },
    { key: "pending", value: stats.pending, color: "var(--warning)" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total Invited" value={stats.total} color="var(--ink)" />
        <StatCard label="Attending" value={stats.attending} color="var(--success)" />
        <StatCard label="Declined" value={stats.declined} color="var(--danger)" />
        <StatCard label="Pending" value={stats.pending} color="var(--warning)" />
        <StatCard label="Total Guest Count" value={stats.guests} color="var(--primary)" />
      </div>

      <div className="ornate px-5 py-6">
        <div className="ornate-inner" />
        <div className="relative z-10">
          <p className="font-label text-[9px] text-ink-muted">Response Rate</p>
          <div className="mt-4 flex h-4 w-full overflow-hidden rounded-full bg-muted">
            {segments.map((s) => (
              <motion.div
                key={s.key}
                initial={{ width: 0 }}
                animate={{ width: `${stats.pct(s.value)}%` }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                style={{ background: s.color }}
              />
            ))}
          </div>
          <div className="font-label mt-3 flex flex-wrap gap-4 text-[9px] text-ink-muted">
            {segments.map((s) => (
              <span key={s.key} className="flex items-center gap-2">
                <i
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: s.color }}
                />
                {s.key} {Math.round(stats.pct(s.value))}%
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="ornate px-5 py-6">
        <div className="ornate-inner" />
        <div className="relative z-10">
          <p className="font-label text-[9px] text-ink-muted">Recent Responses</p>
          <ul className="mt-4 divide-y divide-primary/10">
            {recent.length === 0 && (
              <li className="font-body py-4 text-sm text-ink-muted">
                No responses yet.
              </li>
            )}
            {recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-display text-base text-ink">{r.name}</p>
                  <p className="font-body text-xs text-ink-muted">
                    {new Date(r.responded_at!).toLocaleString()}
                  </p>
                </div>
                <StatusPill status={r.rsvp} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Invitee["rsvp"] }) {
  const map: Record<Invitee["rsvp"], string> = {
    attending: "var(--success)",
    declined: "var(--danger)",
    pending: "var(--warning)",
  };
  return (
    <span
      className="font-label rounded-full px-3 py-1 text-[9px]"
      style={{ background: `${map[status]}1a`, color: map[status] }}
    >
      {status}
    </span>
  );
}

function AllInvitees({
  invitees,
  onChange,
}: {
  invitees: Invitee[];
  onChange: () => void;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | Invitee["rsvp"]>("all");

  const rows = invitees.filter((i) => {
    const matches =
      i.name.toLowerCase().includes(q.toLowerCase()) ||
      i.slug.toLowerCase().includes(q.toLowerCase());
    return matches && (filter === "all" || i.rsvp === filter);
  });

  const remove = async (i: Invitee) => {
    if (!window.confirm(`Delete invitation for ${i.name}?`)) return;
    await deleteInvitee(i.id);
    onChange();
  };

  return (
    <div className="space-y-5">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or link slug"
        className="font-body w-full rounded-sm border border-primary/25 bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
      />

      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "attending", "declined"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`font-label rounded-full px-4 py-2 text-[9px] transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "border border-primary/25 text-ink-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="ornate overflow-x-auto">
        <table className="relative z-10 w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-primary/15">
              {["Name", "Invitation Link", "RSVP", "Guests", "Responded", "Actions"].map(
                (h) => (
                  <th key={h} className="font-label px-4 py-3 text-[9px] text-ink-muted">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} className="border-b border-primary/10">
                <td className="font-display px-4 py-3 text-base text-ink">{i.name}</td>
                <td className="font-body px-4 py-3 text-xs text-ink-muted">
                  /invite/{i.slug}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={i.rsvp} />
                </td>
                <td className="font-body px-4 py-3 text-sm">{i.guest_count}</td>
                <td className="font-body px-4 py-3 text-xs text-ink-muted">
                  {i.responded_at
                    ? new Date(i.responded_at).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        window.open(
                          `https://wa.me/${(i.phone ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage(i.name, i.slug))}`,
                          "_blank",
                        )
                      }
                      className="font-label flex items-center gap-1 rounded-sm px-3 py-2 text-[9px] text-white"
                      style={{ background: "#25d366" }}
                    >
                      <WhatsAppIcon className="h-3 w-3" /> WA
                    </button>
                    <button
                      onClick={() => window.open(`/invite/${i.slug}`, "_blank")}
                      className="font-label rounded-sm border border-primary/25 px-3 py-2 text-[9px] text-primary"
                    >
                      View
                    </button>
                    <button
                      onClick={() => copy(inviteUrl(i.slug))}
                      className="font-label rounded-sm border border-primary/25 px-3 py-2 text-[9px] text-primary"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => remove(i)}
                      className="font-label rounded-sm px-3 py-2 text-[9px] text-white"
                      style={{ background: "var(--danger)" }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="font-label text-[9px] text-ink-muted">
        {rows.length} of {invitees.length} invitees
      </p>
    </div>
  );
}

function AddImport({ onChange }: { onChange: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [created, setCreated] = useState<Invitee | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const inv = await createInvitee(name, phone);
      setCreated(inv);
      setName("");
      setPhone("");
      onChange();
    } finally {
      setBusy(false);
    }
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const header = (lines[0] ?? "").toLowerCase().split(",").map((h) => h.trim());
    const nameIdx = Math.max(0, header.indexOf("name"));
    const phoneIdx = header.indexOf("phone");
    const body = header.includes("name") ? lines.slice(1) : lines;
    let done = 0;
    for (const line of body) {
      const cols = line.split(",").map((c) => c.trim());
      const n = cols[nameIdx];
      if (!n) continue;
      await createInvitee(n, phoneIdx >= 0 ? cols[phoneIdx] : undefined);
      done += 1;
      setProgress(`Imported ${done} of ${body.length}`);
    }
    setProgress(`Done — imported ${done} invitees`);
    onChange();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="ornate px-5 py-7">
        <div className="ornate-inner" />
        <div className="relative z-10 space-y-4">
          <p className="font-label text-[9px] text-ink-muted">Add a single invitee</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Guest name (required)"
            className="font-body w-full rounded-sm border border-primary/25 px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="WhatsApp number (optional)"
            className="font-body w-full rounded-sm border border-primary/25 px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={add}
            disabled={busy || !name.trim()}
            className="font-label w-full rounded-sm bg-primary px-6 py-3 text-[10px] text-primary-foreground disabled:opacity-50"
          >
            Create Invitation
          </button>

          {created && (
            <div className="rounded-sm bg-muted px-4 py-3">
              <p className="font-label text-[9px] text-ink-muted">
                Link for {created.name}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="font-body flex-1 truncate text-xs text-primary">
                  {inviteUrl(created.slug)}
                </code>
                <button
                  onClick={() => copy(inviteUrl(created.slug))}
                  className="font-label rounded-sm border border-primary/25 px-3 py-2 text-[9px] text-primary"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="ornate px-5 py-7">
        <div className="ornate-inner" />
        <div className="relative z-10 space-y-4">
          <p className="font-label text-[9px] text-ink-muted">Bulk import from CSV</p>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed border-primary/30 px-6 py-10 text-center">
            <span className="font-display text-lg text-primary">
              Drop or choose a CSV file
            </span>
            <span className="font-body mt-1 text-xs text-ink-muted">
              Columns: name, phone
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importCsv(f);
              }}
            />
          </label>
          {progress && (
            <p className="font-label text-[9px] text-primary">{progress}</p>
          )}
          <pre className="overflow-x-auto rounded-sm bg-muted px-4 py-3 text-xs text-ink-muted">
{`name,phone
Mohammed Rizwan,94771234567
Fathima Nazeer,94777654321`}
          </pre>
        </div>
      </div>
    </div>
  );
}
