import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";

export default function ForgotPassword() {
  const [form, setForm] = useState({ phone: "", otp: "", newPassword: "", confirmPassword: "" });
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const send = async () => {
    try {
      setBusy(true); setMessage(""); setDevOtp("");
      const { data } = await api.post("/auth/request-otp", { destination: form.phone, purpose: "reset_password" });
      setMessage(data.message);
      setDevOtp(data.devOtp || "");
      setStep(2);
    } catch (error) { setMessage(error.response?.data?.message || "Unable to send OTP"); } finally { setBusy(false); }
  };
  const reset = async (event) => {
    event.preventDefault();
    if (form.newPassword !== form.confirmPassword) return setMessage("Passwords do not match");
    try {
      setBusy(true); setMessage("");
      const { data } = await api.post("/auth/reset-password", { phone: form.phone, otp: form.otp, newPassword: form.newPassword });
      setMessage(data.message);
      setTimeout(() => navigate("/login"), 1000);
    } catch (error) { setMessage(error.response?.data?.message || "Unable to reset password"); } finally { setBusy(false); }
  };
  return <main className="auth"><form onSubmit={reset}>
    <h1>Reset password</h1>
    <p>We will send a one-time verification code to your registered mobile number.</p>
    {message && <div className="notice">{message}</div>}
    {devOtp && <div className="dev-otp-card" role="status"><span>Development mode OTP</span><strong>{devOtp}</strong><small>Use this code to reset your password. It will not be shown after MSG91 is enabled.</small></div>}
    <label>Registered mobile number<input required inputMode="tel" value={form.phone} disabled={step === 2} onChange={e => setForm({ ...form, phone: e.target.value })}/></label>
    {step === 1 ? <button type="button" className="primary" disabled={busy} onClick={send}>{busy ? "Sending…" : "Send reset OTP"}</button> : <>
      <label>OTP<input required inputMode="numeric" maxLength="6" value={form.otp} onChange={e => setForm({ ...form, otp: e.target.value.replace(/\D/g, "") })}/></label>
      <label>New password<input required minLength="8" type="password" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })}/></label>
      <label>Confirm new password<input required minLength="8" type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}/></label>
      <button className="primary" disabled={busy}>{busy ? "Resetting…" : "Reset password"}</button>
      <button type="button" className="secondary" onClick={() => setStep(1)}>Change number</button>
    </>}
    <Link to="/login">Back to login</Link>
  </form></main>;
}
