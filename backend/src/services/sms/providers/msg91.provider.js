const axios = require("axios");
const Otp = require("../../../models/Otp");

const SEND_OTP_URL = "https://control.msg91.com/api/v5/otp";
const VERIFY_OTP_URL = "https://control.msg91.com/api/v5/otp/verify";
const FLOW_URL = "https://control.msg91.com/api/v5/flow";

const config = () => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  if (!authKey || !templateId) {
    throw Object.assign(new Error("MSG91 is selected but MSG91_AUTH_KEY or MSG91_TEMPLATE_ID is missing"), { status: 503 });
  }
  return { authKey, templateId };
};

const failMessage = (error, fallback) =>
  error.response?.data?.message || error.response?.data?.error || error.message || fallback;

const assertSuccess = (data, fallback) => {
  const type = String(data?.type || data?.status || "").toLowerCase();
  const message = String(data?.message || "").toLowerCase();
  if (["error", "failed", "failure"].includes(type) || message.includes("invalid") || message.includes("failed")) {
    throw new Error(data?.message || fallback);
  }
};

async function sendOtp({ to, purpose, expiresInMinutes = 10 }) {
  const { authKey, templateId } = config();
  try {
    const { data } = await axios.post(
      SEND_OTP_URL,
      {
        mobile: String(to).replace(/^\+/, ""),
        template_id: templateId,
        otp_length: Number(process.env.OTP_LENGTH || 6),
        otp_expiry: expiresInMinutes,
      },
      { headers: { authkey: authKey, accept: "application/json" }, timeout: 15000 }
    );
    assertSuccess(data, "MSG91 could not send OTP");
    await Otp.create({
      destination: to,
      purpose,
      codeHash: "msg91-provider-managed",
      expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000),
    });
    return { provider: "msg91", message: "OTP sent by SMS" };
  } catch (error) {
    throw Object.assign(new Error(failMessage(error, "Unable to send OTP")), { status: 502 });
  }
}

async function verifyOtp({ to, purpose, otp }) {
  const { authKey } = config();
  try {
    const { data } = await axios.get(VERIFY_OTP_URL, {
      params: { otp: String(otp), mobile: String(to).replace(/^\+/, "") },
      headers: { authkey: authKey, accept: "application/json" },
      timeout: 15000,
    });
    assertSuccess(data, "Invalid or expired OTP");
    const text = `${data?.type || ""} ${data?.status || ""} ${data?.message || ""}`.toLowerCase();
    const valid = text.includes("success") || text.includes("verified");
    if (valid) {
      await Otp.updateMany({ destination: to, purpose, usedAt: null }, { $set: { usedAt: new Date() } });
    }
    return valid;
  } catch {
    return false;
  }
}

async function sendMessage({ to, message, type = "notification", variables = {} }) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const flowId = process.env.MSG91_FLOW_ID;
  if (!authKey || !flowId) {
    console.warn(`[PocketStore SMS] MSG91 transactional Flow is not configured; skipped ${type} SMS to ${to}`);
    return { provider: "msg91", status: "skipped" };
  }
  try {
    const { data } = await axios.post(
      FLOW_URL,
      {
        flow_id: flowId,
        recipients: [{ mobiles: String(to).replace(/^\+/, ""), message, ...variables }],
      },
      { headers: { authkey: authKey, accept: "application/json", "content-type": "application/json" }, timeout: 15000 }
    );
    assertSuccess(data, "MSG91 could not send notification");
    return { provider: "msg91", status: "sent", response: data };
  } catch (error) {
    console.error(`[PocketStore SMS] ${type} failed:`, failMessage(error, "Unable to send notification"));
    return { provider: "msg91", status: "failed" };
  }
}

module.exports = { sendOtp, verifyOtp, sendMessage };
