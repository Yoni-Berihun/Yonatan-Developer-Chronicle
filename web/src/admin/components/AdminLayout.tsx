import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { ContactMessage } from "../../lib/types";
import { useAdminAuth } from "../useAdminAuth";

const links = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/sections", label: "Sections" },
  { to: "/admin/blog", label: "The Edition" },
  { to: "/admin/media", label: "Media" },
  { to: "/admin/inbox", label: "Inbox" },
  { to: "/admin/settings", label: "Settings" },
];

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const inbox = useQuery({
    queryKey: ["admin", "inbox", "count"],
    queryFn: () => api.get<{ messages: ContactMessage[]; unreadCount: number }>("/admin/inbox"),
    staleTime: 60_000,
  });

  return (
    <div className="admin-shell">
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
              {link.label}
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

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
