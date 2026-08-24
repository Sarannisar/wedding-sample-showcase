import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BackgroundCanvas, FloatingPetals } from "@/components/invite/Atmosphere";
import { Countdown } from "@/components/invite/Countdown";
import { Loader } from "@/components/invite/Loader";
import { Reveal } from "@/components/invite/Reveal";
import { Rsvp } from "@/components/invite/Rsvp";
import { WhatsAppShare } from "@/components/invite/WhatsAppShare";
import { EVENT } from "@/lib/event";
import { getInviteeBySlug } from "@/lib/invitees";

export const Route = createFileRoute("/invite/$slug")({
  head: () => ({
    meta: [
      { title: "Wedding Invitation — Sharrafuth & Safiyya" },
      {
        name: "description",
        content:
          "A personal invitation to the wedding ceremony of Sharrafuth Najiullah and Safiyya Ilyas on Saturday, 12th December 2026 at Glen Reception Hall.",
      },
      { property: "og:title", content: "Wedding Invitation — Sharrafuth & Safiyya" },
      {
        property: "og:description",
        content:
          "You are warmly invited to the wedding ceremony on Saturday, 12th December 2026 at Glen Reception Hall, Dehiwala.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvitePage,
});

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`ornate ${className}`}>
      <div className="ornate-inner" />
      <span className="shimmer" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function InvitePage() {
  const { slug } = Route.useParams();
  const [loading, setLoading] = useState(true);

  const { data: invitee, isLoading } = useQuery({
    queryKey: ["invitee", slug],
    queryFn: () => getInviteeBySlug(slug),
  });

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(t);
  }, []);

  const guestName = invitee?.name ?? "";
  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay: 0.3 + i * 0.25, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <>
      <Loader show={loading || isLoading} />
      <BackgroundCanvas />
      <FloatingPetals count={28} />

      <main className="mx-auto w-full max-w-2xl px-4 pt-16 pb-24 sm:px-6">
        {!isLoading && !invitee ? (
          <Card className="px-6 py-14 text-center">
            <h1 className="font-display text-3xl text-primary">Invitation not found</h1>
            <p className="font-body mt-4 text-sm text-ink-muted">
              This invitation link does not exist. Please check with the host.
            </p>
          </Card>
        ) : (
          <>
            {/* Hero */}
            <Card className="px-5 py-12 text-center sm:px-10 sm:py-16">
              <motion.p {...stagger(0)} className="font-arabic text-xl text-primary sm:text-2xl">
                {EVENT.openingArabic}
              </motion.p>
              <motion.p {...stagger(1)} className="font-body mx-auto mt-3 max-w-sm text-[11px] italic text-ink-muted">
                {EVENT.openingTranslation}
              </motion.p>

              <motion.div {...stagger(2)} className="rule mx-auto my-8 w-32" />

              <motion.p {...stagger(3)} className="font-label text-[10px] text-ink-muted">
                Dearest
              </motion.p>
              <motion.h1 {...stagger(4)} className="font-script mt-2 text-[clamp(34px,10vw,54px)] leading-tight text-primary">
                {guestName}
              </motion.h1>

              <motion.p {...stagger(5)} className="font-display mt-8 text-lg text-ink">
                {EVENT.hosts}
              </motion.p>
              <motion.p {...stagger(6)} className="font-body mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
                {EVENT.body}
              </motion.p>

              <motion.div {...stagger(7)} className="mt-9">
                <p className="font-display text-[clamp(26px,7.5vw,40px)] leading-tight text-ink">
                  {EVENT.honoree1}
                </p>
                <p className="font-script my-1 text-3xl text-secondary">{EVENT.connector}</p>
                <p className="font-display text-[clamp(26px,7.5vw,40px)] leading-tight text-ink">
                  {EVENT.honoree2}
                </p>
                <p className="font-arabic mt-6 text-lg text-primary">{EVENT.culturalArabic}</p>
                <p className="font-body text-[11px] italic text-ink-muted">{EVENT.culturalLatin}</p>
              </motion.div>
            </Card>

            {/* Countdown */}
            <Reveal className="mt-8">
              <Card className="px-4 py-10 sm:px-10">
                <p className="font-label text-center text-[10px] text-ink-muted">
                  Counting down to the celebration
                </p>
                <div className="mt-7">
                  <Countdown dateISO={EVENT.dateISO} />
                </div>
              </Card>
            </Reveal>

            {/* Events */}
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {EVENT.events.map((e, i) => (
                <Reveal key={e.label} delay={i * 0.1}>
                  <button
                    onClick={() => window.open(e.maps, "_blank")}
                    className="ornate block w-full px-5 py-9 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="ornate-inner" />
                    <span className="shimmer" />
                    <div className="relative z-10">
                      <p className="font-label text-[10px] text-primary">{e.label}</p>
                      <div className="rule mx-auto my-4 w-16" />
                      <p className="font-display text-lg text-ink">{e.day}</p>
                      <p className="font-body mt-1 text-sm text-ink-muted">{e.time}</p>
                      <p className="font-display mt-5 text-base text-primary">{e.venue}</p>
                      <p className="font-body mt-1 text-xs text-ink-muted">{e.address}</p>
                      <p className="font-label mt-5 text-[9px] text-secondary">Tap to open maps</p>
                    </div>
                  </button>
                </Reveal>
              ))}
            </div>

            {/* RSVP */}
            {invitee && (
              <Reveal className="mt-8">
                <Rsvp invitee={invitee} />
              </Reveal>
            )}

            {/* Blessing */}
            <Reveal className="mt-8">
              <Card className="px-5 py-12 text-center sm:px-10">
                <p className="font-body mx-auto max-w-md text-sm leading-relaxed italic text-ink-muted">
                  {EVENT.blessing}
                </p>
                <p className="font-arabic mt-6 text-2xl text-primary">{EVENT.closingScript}</p>
                <p className="font-label mt-2 text-[10px] text-ink-muted">{EVENT.closingWord}</p>
              </Card>
            </Reveal>

            {/* Share */}
            {invitee && (
              <Reveal className="mt-8">
                <WhatsAppShare name={invitee.name} slug={invitee.slug} />
              </Reveal>
            )}
          </>
        )}
      </main>
    </>
  );
}
