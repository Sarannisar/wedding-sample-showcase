import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { respond, type Invitee } from "@/lib/invitees";

type Step = "choose" | "yes" | "no" | "done";

export function Rsvp({ invitee }: { invitee: Invitee }) {
  const [step, setStep] = useState<Step>(
    invitee.rsvp === "pending" ? "choose" : "done",
  );
  const [result, setResult] = useState<"attending" | "declined">(
    invitee.rsvp === "declined" ? "declined" : "attending",
  );
  const [count, setCount] = useState(invitee.guest_count || 1);
  const [busy, setBusy] = useState(false);

  const confirm = async (status: "attending" | "declined") => {
    setBusy(true);
    try {
      await respond(invitee.id, status, status === "attending" ? count : 0);
      setResult(status);
      setStep("done");
    } finally {
      setBusy(false);
    }
  };

  const frame = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -14 },
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <div className="ornate px-5 py-8 sm:px-10">
      <div className="ornate-inner" />
      <span className="shimmer" />
      <div className="relative z-10 text-center">
        <p className="font-label text-[10px] text-ink-muted">Kindly Respond</p>
        <div className="rule mx-auto mt-3 w-24" />

        <AnimatePresence mode="wait">
          {step === "choose" && (
            <motion.div key="choose" {...frame} className="mt-6">
              <p className="font-body text-sm text-ink-muted">
                Will you be joining us, {invitee.name}?
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  onClick={() => setStep("yes")}
                  className="font-label rounded-sm bg-primary px-8 py-3 text-[11px] text-primary-foreground transition-transform hover:-translate-y-0.5"
                >
                  Joyfully Accept 💐
                </button>
                <button
                  onClick={() => setStep("no")}
                  className="font-label rounded-sm border border-primary/30 px-8 py-3 text-[11px] text-primary transition-transform hover:-translate-y-0.5"
                >
                  Regretfully Decline 🤍
                </button>
              </div>
            </motion.div>
          )}

          {step === "yes" && (
            <motion.div key="yes" {...frame} className="mt-6">
              <p className="font-body text-sm text-ink-muted">
                How many guests will attend?
              </p>
              <div className="mt-6 flex items-center justify-center gap-6">
                <button
                  onClick={() => setCount((c) => Math.max(1, c - 1))}
                  className="h-11 w-11 rounded-full border border-primary/30 text-xl text-primary"
                >
                  −
                </button>
                <span className="countdown-num min-w-[70px]">{count}</span>
                <button
                  onClick={() => setCount((c) => Math.min(20, c + 1))}
                  className="h-11 w-11 rounded-full border border-primary/30 text-xl text-primary"
                >
                  +
                </button>
              </div>
              <div className="mt-7 flex justify-center gap-3">
                <button
                  onClick={() => setStep("choose")}
                  className="font-label rounded-sm border border-primary/30 px-6 py-3 text-[11px] text-primary"
                >
                  Back
                </button>
                <button
                  disabled={busy}
                  onClick={() => confirm("attending")}
                  className="font-label rounded-sm bg-primary px-8 py-3 text-[11px] text-primary-foreground disabled:opacity-60"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          )}

          {step === "no" && (
            <motion.div key="no" {...frame} className="mt-6">
              <p className="font-body text-sm text-ink-muted">
                We will miss you dearly. Shall we mark you as unable to attend?
              </p>
              <div className="mt-7 flex justify-center gap-3">
                <button
                  onClick={() => setStep("choose")}
                  className="font-label rounded-sm border border-primary/30 px-6 py-3 text-[11px] text-primary"
                >
                  Back
                </button>
                <button
                  disabled={busy}
                  onClick={() => confirm("declined")}
                  className="font-label rounded-sm bg-primary px-8 py-3 text-[11px] text-primary-foreground disabled:opacity-60"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div key="done" {...frame} className="mt-6">
              {result === "attending" ? (
                <>
                  <p className="font-display text-2xl text-primary">
                    Thank you, {invitee.name}
                  </p>
                  <p className="font-body mt-3 text-sm text-ink-muted">
                    We are delighted that you will be joining us. Your presence
                    will make our celebration complete.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-2xl text-primary">
                    You will be missed
                  </p>
                  <p className="font-body mt-3 text-sm text-ink-muted">
                    Thank you for letting us know, {invitee.name}. We keep you
                    in our prayers and hope to see you soon.
                  </p>
                </>
              )}
              <button
                onClick={() => setStep("choose")}
                className="font-label mt-6 text-[10px] text-ink-muted underline"
              >
                Change response
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
