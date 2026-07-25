import { useEffect } from "react";

/**
 * Marks home-page sections for a one-shot ink fade as they enter the viewport.
 * Safe to call after data loads — re-runs when the section list changes.
 */
export function useRevealSections(ready: boolean) {
  useEffect(() => {
    if (!ready) return;

    const root = document.querySelector(".container");
    if (!root) return;

    const nodes = Array.from(
      root.querySelectorAll<HTMLElement>("section, .main-content, .site-footer"),
    );
    for (const node of nodes) node.classList.add("reveal-on-scroll");

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      for (const node of nodes) node.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [ready]);
}
