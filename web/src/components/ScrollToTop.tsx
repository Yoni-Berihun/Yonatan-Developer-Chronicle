import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Restores the top of the page on navigation, but leaves in-page anchor links
 * (#projects, #contact) to the browser's native smooth scrolling.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, hash]);

  return null;
}
