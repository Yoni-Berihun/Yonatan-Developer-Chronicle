import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../../lib/api";
import { useAdminAuth } from "../useAdminAuth";

export default function LoginPage() {
  const { login, admin, isLoading } = useAdminAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isLoading && admin) return <Navigate to="/admin" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    setBusy(true);
    setError("");

    try {
      await login(String(data.get("email") ?? ""), String(data.get("password") ?? ""));
      navigate("/admin", { replace: true });
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Could not sign in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <p className="admin-login-kicker">The Yonatan Times</p>
        <h1 className="admin-login-title">Newsroom Access</h1>
        <p className="admin-login-note">Sign in to edit the publication.</p>

        <label className="admin-field">
          <span>Email</span>
          <input type="email" name="email" required autoComplete="username" autoFocus />
        </label>

        <label className="admin-field">
          <span>Password</span>
          <input type="password" name="password" required autoComplete="current-password" />
        </label>

        {error ? <p className="admin-error">{error}</p> : null}

        <button type="submit" className="admin-button admin-button--primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
