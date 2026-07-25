import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";
import type { Section, SiteSettings } from "../lib/types";

interface NavItem {
  label: string;
  href: string;
  isRoute?: boolean;
}

const NAV_EXCLUDED_TYPES = new Set(["CTA", "BLOG_TEASER"]);

function toNavLabel(section: Section): string {
  const configured = section.config?.navLabel;
  if (typeof configured === "string" && configured.trim()) return configured.trim();
  return section.slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface Props {
  settings: SiteSettings;
  sections: Section[];
  /** Anchor links only resolve on the home page; elsewhere they need a prefix. */
  anchorsAreLocal?: boolean;
}

export default function SiteHeader({ settings, sections, anchorsAreLocal = true }: Props) {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setNavOpen(false), [location.pathname]);

  // A menu that stays open behind the Escape key feels broken on mobile.
  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  const prefix = anchorsAreLocal ? "" : "/";

  const navItems: NavItem[] = [
    { label: "Home", href: anchorsAreLocal ? "#" : "/", isRoute: !anchorsAreLocal },
    ...sections
      .filter((section) => section.isPublished && !NAV_EXCLUDED_TYPES.has(section.type))
      .map((section) => ({ label: toNavLabel(section), href: `${prefix}#${section.slug}` })),
    { label: "Edition", href: "/edition", isRoute: true },
    { label: "Contact", href: `${prefix}#contact` },
  ];

  return (
    <>
      <div className="dateline-bar">
        <div className="dateline-left">
          <p>{settings.volumeLabel}</p>
          <p className="free-edition">{settings.editionLabel}</p>
        </div>
        <div className="dateline-right">
          <p>{settings.datelineText}</p>
        </div>
        <button
          type="button"
          className={clsx("mobile-nav-toggle-label", navOpen && "is-open")}
          aria-label={navOpen ? "Close menu" : "Open menu"}
          aria-expanded={navOpen}
          onClick={() => setNavOpen((open) => !open)}
        >
          <span />
        </button>
      </div>

      <nav className="sticky-navigation" aria-label="Main">
        {/* Kept so the original sibling-combinator CSS keeps driving the mobile
            drawer; React owns the state, the checkbox just reflects it. */}
        <input
          type="checkbox"
          id="nav-toggle"
          className="nav-toggle"
          checked={navOpen}
          onChange={(event) => setNavOpen(event.target.checked)}
          tabIndex={-1}
          aria-hidden="true"
        />

        <div className="main-navigation">
          <ul>
            {navItems.map((item) => (
              <li key={`${item.label}-${item.href}`}>
                {item.isRoute ? (
                  <Link to={item.href} className="nav-link" onClick={() => setNavOpen(false)}>
                    {item.label}
                  </Link>
                ) : (
                  <a href={item.href} className="nav-link" onClick={() => setNavOpen(false)}>
                    {item.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          className="nav-overlay"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => setNavOpen(false)}
        />
      </nav>
    </>
  );
}
