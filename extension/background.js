"use strict";

/*
 * VPN Kill Switch for Firefox.
 *
 * How it works:
 * Firefox's built-in VPN ("IP Protection") is a Gecko proxy channel filter
 * (IPPChannelFilter) that is registered when the VPN turns on and removed when
 * it turns off. This extension registers its own filter (proxy.onRequest) that
 * sends EVERYTHING to a dead proxy on 127.0.0.1 (a "black hole").
 *
 * Filters with the same position run in registration order. The VPN registers
 * its filter every time it turns on, so it runs AFTER ours and replaces the
 * black hole with its real proxy. If the VPN is off, paused, or the site is
 * excluded, the request keeps the black hole and fails without ever reaching
 * the network (not even a DNS lookup).
 */

const BLACKHOLE = Object.freeze({
  type: "http",
  host: "127.0.0.1",
  port: 9, // "discard" port: nothing listens here
  failoverTimeout: 1,
});
// The trailing `null` ends the failover chain. Without it Firefox appends the
// default proxy as failover, which can be DIRECT with a PAC or system proxy
// (leak reproduced with a PAC returning "PROXY x; DIRECT", see tests/e2e.py).
const BLOCK = Object.freeze([BLACKHOLE, null]);

// Services the VPN itself needs to connect. Firefox always keeps them out of
// the VPN too; blocking them would stop the VPN from starting.
const INFRA_HOSTS = new Set([
  "vpn.mozilla.org",
  "vpn.mozilla.com",
  "accounts.firefox.com",
  "api.accounts.firefox.com",
  "oauth.accounts.firefox.com",
  "profile.accounts.firefox.com",
  "firefox.settings.services.mozilla.com",
  "firefox-settings-attachments.cdn.mozilla.net",
  "firefox-portal-detection.com",
  "detectportal.firefox.com",
  // DNS over HTTPS: Firefox bypasses the VPN for it to avoid breaking DNS.
  "mozilla.cloudflare-dns.com",
  "firefox.dns.nextdns.io",
  "doh.xfinity.com",
  "private.canadianshield.cira.ca",
  "dns.shaw.ca",
  "dns.quad9.net",
]);

const state = {
  enabled: true,
  blocked: 0,
  vpnSeenAt: 0,
  // Set after an install or update until VPN traffic is seen. If the VPN was
  // already on, its filter now runs before ours and everything is blocked
  // until the VPN restarts; the blocked page then says so first.
  reordered: false,
};

const ready = browser.storage.local.get({ enabled: true }).then((stored) => {
  state.enabled = stored.enabled;
  applyPrivacySettings();
  updateUi();
});
let loaded = false;
ready.then(() => { loaded = true; });

// --- Per-request decision ----------------------------------------------------

function isLocalHost(host) {
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return true;
  }
  if (host.startsWith("[")) {
    const h = host.slice(1, -1).toLowerCase();
    return h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd");
  }
  const m = /^(\d+)\.(\d+)\.\d+\.\d+$/.exec(host);
  if (!m) return false;
  const a = +m[1], b = +m[2];
  return a === 127 || a === 10 || (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254);
}

function decide(details) {
  if (!state.enabled) return null; // no opinion: Firefox decides
  let url;
  try {
    url = new URL(details.url);
  } catch {
    return BLOCK;
  }
  if (INFRA_HOSTS.has(url.hostname) || isLocalHost(url.hostname)) return null;
  // Firefox keeps every DNS-over-HTTPS request out of the VPN, including
  // custom providers. Those are internal requests (no tab) to /dns-query.
  if (details.tabId === -1 && url.pathname.startsWith("/dns-query")) return null;
  return BLOCK;
}

// Registered synchronously at load so Firefox holds startup requests until the
// extension is ready (fail closed).
browser.proxy.onRequest.addListener(
  (details) => (loaded ? decide(details) : ready.then(() => decide(details))),
  { urls: ["<all_urls>"] }
);

browser.proxy.onError.addListener((error) => {
  console.warn("[kill-switch] proxy error:", error.message);
});

// --- Observation (non-blocking) ----------------------------------------------

function isBlackhole(p) {
  return !!p && p.host === BLACKHOLE.host && p.port === BLACKHOLE.port;
}

// The VPN is working when a page loads through a proxy that isn't ours.
browser.webRequest.onHeadersReceived.addListener(
  (d) => {
    if (d.proxyInfo && !isBlackhole(d.proxyInfo)) {
      state.vpnSeenAt = Date.now();
      state.reordered = false;
    }
  },
  { urls: ["<all_urls>"], types: ["main_frame"] }
);

browser.webRequest.onErrorOccurred.addListener(
  (d) => {
    // Only count requests from tabs: Firefox's own background requests would
    // make the number grow even when you aren't browsing.
    if (!isBlackhole(d.proxyInfo) || d.tabId < 0) return;
    state.blocked++;
    updateBadge();
    if (d.type === "main_frame") {
      const page = browser.runtime.getURL("pages/blocked.html") +
        "?u=" + encodeURIComponent(d.url) + (state.reordered ? "&r=1" : "");
      browser.tabs.update(d.tabId, { url: page }).catch(() => {});
    }
  },
  { urls: ["<all_urls>"] }
);

// --- Complementary privacy settings ------------------------------------------

// WebRTC (UDP) and network prediction (DNS prefetch, preconnect) don't go
// through proxy.onRequest, so they're closed while the kill switch is on.
async function applyPrivacySettings() {
  const net = browser.privacy?.network;
  if (!net) return;
  const settings = [
    [net.webRTCIPHandlingPolicy, "disable_non_proxied_udp"],
    [net.networkPredictionEnabled, false],
  ];
  for (const [setting, value] of settings) {
    try {
      if (!setting) continue;
      if (state.enabled) await setting.set({ value });
      else await setting.clear({});
    } catch (e) {
      console.warn("[kill-switch] privacy setting:", e);
    }
  }
}

// --- UI ----------------------------------------------------------------------

function updateBadge() {
  const action = browser.browserAction;
  try {
    action.setBadgeText?.({ text: state.enabled && state.blocked ? String(Math.min(state.blocked, 999)) : "" });
    action.setBadgeBackgroundColor?.({ color: "#d7264f" });
  } catch {}
}

function updateUi() {
  const action = browser.browserAction;
  try {
    action.setIcon?.({ path: state.enabled ? "icons/on.svg" : "icons/off.svg" });
    action.setTitle?.({ title: browser.i18n.getMessage(state.enabled ? "actionTitleOn" : "actionTitleOff") });
  } catch {}
  updateBadge();
}

async function setEnabled(enabled) {
  state.enabled = !!enabled;
  state.blocked = 0;
  await browser.storage.local.set({ enabled: state.enabled });
  await applyPrivacySettings();
  updateUi();
}

browser.runtime.onMessage.addListener(async (msg) => {
  await ready;
  switch (msg?.type) {
    case "get":
      return {
        enabled: state.enabled,
        blocked: state.blocked,
        vpnSeenAt: state.vpnSeenAt,
        privateAllowed: await browser.extension.isAllowedIncognitoAccess(),
      };
    case "set":
      await setEnabled(msg.enabled);
      return { enabled: state.enabled };
  }
});

browser.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install" || reason === "update") state.reordered = true;
  if (reason === "install") {
    browser.tabs.create({ url: browser.runtime.getURL("pages/welcome.html") });
  }
});
