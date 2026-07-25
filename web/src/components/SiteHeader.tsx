import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";
import { navigableSections, placeFromDateline, toNavLabel } from "../lib/sections";
import { useLivingClock } from "../lib/useLivingClock";
import type { Section, SiteSettings } from "../lib/types";

interface NavItem {
  label: string;
  href: string;
  isRoute?: boolean;
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
  const clock = useLivingClock();
  const place = placeFromDateline(settings.datelineText);

  useEffect(() => setNavOpen(false), [location.pathname, location.hash]);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  useEffect(() => {
    document.body.classList.toggle("nav-open", navOpen);
    return () => document.body.classList.remove("nav-open");
  }, [navOpen]);

  const prefix = anchorsAreLocal ? "" : "/";

  const navItems: NavItem[] = [
    { label: "Home", href: anchorsAreLocal ? "#" : "/", isRoute: !anchorsAreLocal },
    ...navigableSections(sections).map((section) => ({
      label: toNavLabel(section),
      href: `${prefix}#${section.slug}`,
    })),
    { label: "Edition", href: "/edition", isRoute: true },
    { label: "Contact", href: `${prefix}#contact` },
  ];

  return (
    <>
      <div className="dateline-bar">
        <div className="dateline-left">
          <p className="dateline-volume">{settings.volumeLabel}</p>
          <p className="free-edition">{settings.editionLabel}</p>
        </div>

        <div className="dateline-right living-dateline" aria-live="polite">
          <p className="living-dateline-full">
            <span className="living-date">
              {clock.weekday}, {clock.date}
            </span>
            <span className="living-sep" aria-hidden="true">
              ·
            </span>
            <span className="living-time" title="East Africa Time">
              {clock.time}
            </span>
            <span className="living-sep" aria-hidden="true">
              ·
            </span>
            <span className="living-place">{place}</span>
          </p>

          <div className="living-dateline-compact">
            <span className="living-time" title="East Africa Time">
              {clock.timeShort}
            </span>
            <span className="living-place">{place}</span>
          </div>
        </div>

        <button
          type="button"
          className={clsx("mobile-nav-toggle-label", navOpen && "is-open")}
          aria-label={navOpen ? "Close menu" : "Open menu"}
          aria-expanded={navOpen}
          aria-controls="site-navigation"
          onClick={() => setNavOpen((open) => !open)}
        >
          <span aria-hidden="true" />
        </button>
      </div>

      <nav className="sticky-navigation" aria-label="Main" id="site-navigation">
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
          <p className="navigation-title">Sections</p>
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
