// Simulates the built-in VPN: a proxy filter registered AFTER the kill switch.
browser.proxy.onRequest.addListener(
  () => ({ type: "http", host: "127.0.0.1", port: 8899 }),
  { urls: ["<all_urls>"] }
);
