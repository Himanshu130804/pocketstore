import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await login(form.identifier, form.password);
      navigate("/");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Login failed");
    }
  };

  return (
    <main className="auth auth-page">
      <section className="auth-promo"><span>POCKETSTORE</span><h2>Local commerce, one connected workspace.</h2><p>Shop nearby, manage a store, fulfil orders and keep digital records from any screen.</p><div><b>Customer</b><b>Shop owner</b><b>Delivery</b><b>Admin</b></div></section><form className="auth-card" onSubmit={submit}><div className="auth-mobile-brand"><strong>P</strong><span>PocketStore</span></div>
        <h1>Welcome back</h1>
        <p>Sign in to continue to your PocketStore workspace.</p>
        {error && <div className="error">{error}</div>}
        <label>
          Email or phone
          <input
            value={form.identifier}
            required
            autoComplete="username"
            onChange={(event) => setForm({ ...form, identifier: event.target.value })}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            required
            autoComplete="current-password"
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </label>
        <button className="primary">Login</button>
        <div className="auth-links"><Link to="/forgot-password">Forgot password?</Link><Link to="/register">Create account</Link></div>
      </form>
    </main>
  );
}
