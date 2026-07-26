import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { ContactMessage } from "../../lib/types";
import { useAdminAuth } from "../useAdminAuth";
import { Icon, type IconName } from "./icons";

const links: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: "/admin", label: "Overview", icon: "overview", end: true },
  { to: "/admin/sections", label: "Sections", icon: "sections" },
  { to: "/admin/blog", label: "The Edition", icon: "edition" },
  { to: "/admin/media", label: "Media", icon: "media" },
  { to: "/admin/inbox", label: "Inbox", icon: "inbox" },
  { to: "/admin/settings", label: "Settings", icon: "settings" },
];

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  const inbox = useQuery({
    queryKey: ["admin", "inbox", "count"],
    queryFn: () => api.get<{ messages: ContactMessage[]; unreadCount: number }>("/admin/inbox"),
    staleTime: 60_000,
  });

  return (
    <div className={`admin-shell${navOpen ? " is-nav-open" : ""}`}>
      <button
        type="button"
        className="admin-scrim"
        aria-label="Close navigation"
        onClick={() => setNavOpen(false)}
      />

      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-title">The Yonatan Times</span>
          <span className="admin-brand-sub">Newsroom</span>
        </div>

        <nav className="admin-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? "is-active" : undefined)}
            >
              <span className="admin-nav-icon">
                <Icon name={link.icon} size={18} />
              </span>
              <span className="admin-nav-label">{link.label}</span>
              {link.label === "Inbox" && inbox.data && inbox.data.unreadCount > 0 ? (
                <span className="admin-badge">{inbox.data.unreadCount}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <a href="/" target="_blank" rel="noreferrer" className="admin-view-site">
            View the site ↗
          </a>
          <p className="admin-user">{admin?.email}</p>
          <button
            type="button"
            className="admin-button admin-button--ghost"
            onClick={async () => {
              await logout();
              navigate("/admin/login", { replace: true });
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="admin-content">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-menu-btn"
            aria-label="Open navigation"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((open) => !open)}
          >
            <Icon name={navOpen ? "close" : "menu"} size={22} />
          </button>
          <span className="admin-topbar-brand">
            The Yonatan Times <span className="admin-topbar-sep">·</span> Newsroom
          </span>
          <a href="/" target="_blank" rel="noreferrer" className="admin-topbar-link">
            <Icon name="external" size={16} />
            <span>View site</span>
          </a>
        </header>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
