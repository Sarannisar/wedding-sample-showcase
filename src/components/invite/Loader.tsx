import { AnimatePresence, motion } from "framer-motion";

const PETALS = [
  "M60 60c0-16 8-28 0-44-8 16 0 28 0 44z",
  "M60 60c11-11 24-15 30-32-17 6-21 19-30 32z",
  "M60 60c16 0 28 8 44 0-16-8-28 0-44 0z",
  "M60 60c11 11 15 24 32 30-6-17-19-21-32-30z",
  "M60 60c0 16-8 28 0 44 8-16 0-28 0-44z",
  "M60 60c-11 11-24 15-30 32 17-6 21-19 30-32z",
  "M60 60c-16 0-28-8-44 0 16 8 28 0 44 0z",
  "M60 60c-11-11-15-24-32-30 6 17 19 21 32 30z",
];

export function Loader({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ backgroundColor: "#fdf9f5" }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <svg width="150" height="150" viewBox="0 0 120 120" fill="none">
            {PETALS.map((d, i) => (
              <motion.path
                key={i}
                d={d}
                stroke="#b05570"
                strokeWidth="1.4"
                strokeLinecap="round"
                fill="rgba(232,164,180,0.12)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  duration: 1.1,
                  delay: i * 0.18,
                  ease: "easeInOut",
                }}
              />
            ))}
            <motion.circle
              cx="60"
              cy="60"
              r="7"
              stroke="#b05570"
              strokeWidth="1.4"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 1.6 }}
            />
          </svg>
          <motion.p
            className="font-label mt-8 text-[11px] text-primary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.9, duration: 0.6 }}
          >
            Wedding Invitation
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
