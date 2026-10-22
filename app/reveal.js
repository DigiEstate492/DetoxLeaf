"use client";
import { useEffect, useRef } from "react";
import { motion, useAnimationControls, useInView, useReducedMotion } from "framer-motion";
const elements = { div: motion.div, section: motion.section, article: motion.article };
export default function Reveal({ children, as = "div", delay = 0, immediate = false, ...props }) {
  const ref = useRef(null);
  const controls = useAnimationControls();
  const inView = useInView(ref, { once: true, amount: 0.08 });
  const reduced = useReducedMotion();
  const shown = useRef(false);
  useEffect(() => {
    if (!(immediate || inView) || shown.current) return;
    shown.current = true;
    if (reduced) return;
    // The server renders visible content; animations never block the no-JS page.
    controls.start({ opacity: [0.35, 1], y: [20, 0], transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] } });
  }, [controls, inView, immediate, reduced, delay]);
  const Element = elements[as] || elements.div;
  return <Element ref={ref} initial={false} animate={controls} {...props}>{children}</Element>;
}
