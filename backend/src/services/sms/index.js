const mockProvider = require("./providers/mock.provider");
const msg91Provider = require("./providers/msg91.provider");

const providers = { mock: mockProvider, msg91: msg91Provider };

function getProviderName() {
  return String(process.env.SMS_PROVIDER || "mock").trim().toLowerCase();
}

function getProvider() {
  const name = getProviderName();
  if (!providers[name]) throw new Error(`Unsupported SMS_PROVIDER: ${name}`);
  return providers[name];
}

module.exports = {
  getProviderName,
  sendOtp: (payload) => getProvider().sendOtp(payload),
  verifyOtp: (payload) => getProvider().verifyOtp(payload),
  sendMessage: (payload) => getProvider().sendMessage(payload),
};
