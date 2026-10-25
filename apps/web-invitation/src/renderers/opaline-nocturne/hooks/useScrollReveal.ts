"use client";
import { useEffect, type RefObject } from "react";
export function useScrollReveal(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
) {
  useEffect(() => {
    const root = ref.current;
    if (!root || !active) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const selector = "[data-reveal], section, [data-scene]";
    const prepare = (node: HTMLElement) => {
      if (node.hasAttribute("data-reveal") && (!node.dataset.reveal || node.dataset.reveal === "true")) {
        node.dataset.reveal = node.tagName === "FORM" ? "form" : "focus";
      }
    };
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector));
    nodes.forEach(prepare);
    if (!("IntersectionObserver" in window) || media.matches) {
      nodes.forEach((n) => (n.dataset.visible = "true"));
      return;
    }
    root.dataset.motion = "true";
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const node = entry.target as HTMLElement;
          node.dataset.inView = String(entry.isIntersecting);
          if (entry.isIntersecting) node.dataset.visible = "true";
        }
      },
      { threshold: 0.06, rootMargin: "0px 0px -18px 0px" },
    );
    nodes.forEach((n) => observer.observe(n));
    const mutation = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (node.matches(selector)) { prepare(node); observer.observe(node); }
            node
              .querySelectorAll<HTMLElement>(selector)
              .forEach((n) => { prepare(n); observer.observe(n); });
          }
        });
        record.removedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            observer.unobserve(node);
            node
              .querySelectorAll(selector)
              .forEach((n) => observer.unobserve(n));
          }
        });
      }
    });
    mutation.observe(root, { childList: true, subtree: true });
    const reduce = () => {
      if (media.matches) {
        root.dataset.motion = "false";
        nodes.forEach((n) => (n.dataset.visible = "true"));
      }
    };
    media.addEventListener("change", reduce);
    return () => {
      observer.disconnect();
      mutation.disconnect();
      media.removeEventListener("change", reduce);
      delete root.dataset.motion;
    };
  }, [ref, active]);
}
