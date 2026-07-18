import React, { useState } from "react";
import api from "../api/client";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", role: "customer", otp: "" });
  const [message, setMessage] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const sendOtp = async () => {
    setMessage("");
    setDevOtp("");
    if (!form.phone.trim()) return setMessage("Enter your phone number first");
    try {
      setSending(true);
      const { data } = await api.post("/auth/request-otp", { destination: form.phone, purpose: "register" });
      setMessage(data.message);
      setDevOtp(data.devOtp || "");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to send OTP");
    } finally { setSending(false); }
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      setSubmitting(true);
      const { data } = await api.post("/auth/register", form);
      localStorage.setItem("pocketstore_token", data.token);
      navigate(form.role === "shop_owner" ? "/owner" : "/customer");
      window.location.reload();
    } catch (error) {
      setMessage(error.response?.data?.message || "Registration failed");
    } finally { setSubmitting(false); }
  };

  return <main className="auth auth-page"><section className="auth-promo"><span>JOIN POCKETSTORE</span><h2>Start shopping locally or bring your shop online.</h2><p>One account gives you a responsive marketplace, digital bills and role-specific workspaces.</p><div><b>OTP verified</b><b>Location aware</b><b>Mobile ready</b></div></section><form className="auth-card auth-register-card" onSubmit={submit}><div className="auth-mobile-brand"><strong>P</strong><span>PocketStore</span></div>
    <h1>Create account</h1>
    <p>Verify your mobile number with an SMS OTP.</p>
    {message && <div className="notice">{message}</div>}
    {devOtp && <div className="dev-otp-card" role="status"><span>Development mode OTP</span><strong>{devOtp}</strong><small>Use this code to register. It disappears automatically when SMS_PROVIDER is changed to msg91.</small></div>}
    <label>Name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label>
    <label>Mobile number<input required inputMode="tel" placeholder="10-digit number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/></label>
    <label>Email (optional)<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/></label>
    <label>Password<input required minLength="8" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/></label>
    <label>Account type<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="customer">Customer</option><option value="shop_owner">Shop owner</option></select></label>
    <button type="button" className="secondary" disabled={sending} onClick={sendOtp}>{sending ? "Sending OTP…" : "Send OTP by SMS"}</button>
    <label>OTP<input required inputMode="numeric" maxLength="6" value={form.otp} onChange={e => setForm({ ...form, otp: e.target.value.replace(/\D/g, "") })}/></label>
    <button className="primary" disabled={submitting}>{submitting ? "Creating account…" : "Register"}</button>
    <Link to="/login">Already have an account? Login</Link>
  </form></main>;
}
