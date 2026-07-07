"use client";

/**
 * The signature interaction (BUILD_PROMPT art direction): a breathing
 * interviewer orb that subtly scales while "listening". No robot imagery,
 * no purple gradients — a calm brass ring on navy, per "executive calm".
 * Respects prefers-reduced-motion (PLAYBOOK 1.4).
 */
import { motion, useReducedMotion } from "framer-motion";

export function InterviewerOrb({ state }: { state: "speaking" | "listening" | "thinking" }) {
  const reduce = useReducedMotion();

  const scale =
    state === "listening" ? [1, 1.08, 1] : state === "speaking" ? [1, 1.04, 1] : [1, 1.02, 1];
  const duration = state === "listening" ? 1.6 : state === "speaking" ? 0.9 : 2.4;

  return (
    <div className="flex flex-col items-center">
      <motion.div
        className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-navy)]"
        animate={reduce ? undefined : { scale }}
        transition={{ repeat: Infinity, duration, ease: "easeInOut" }}
      >
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-[var(--color-brass)]"
          animate={reduce ? undefined : { opacity: [0.4, 0.9, 0.4], scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: duration * 1.3, ease: "easeInOut" }}
        />
        <span className="tnum text-xs font-medium uppercase tracking-wide text-[var(--color-brass)]">
          {state === "speaking" ? "Asking" : state === "thinking" ? "Scoring" : "Listening"}
        </span>
      </motion.div>
    </div>
  );
}
