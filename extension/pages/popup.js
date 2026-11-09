"use strict";

const $ = (id) => document.getElementById(id);

function used(ts) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return t("vpnSeconds", s);
  const m = Math.round(s / 60);
  return m < 60 ? t("vpnMinutes", m) : t("vpnHours", Math.round(m / 60));
}

function render(st) {
  document.body.classList.toggle("is-off", !st.enabled);
  $("toggle").setAttribute("aria-checked", String(st.enabled));
  $("state").textContent = t(st.enabled ? "stateOn" : "stateOff");

  $("facts").hidden = !st.enabled;
  $("offNote").hidden = st.enabled;

  const vpn = $("vpn");
  vpn.replaceChildren();
  const dot = document.createElement("span");
  dot.className = "dot" + (st.vpnSeenAt ? " ok" : "");
  vpn.append(dot, st.vpnSeenAt ? used(st.vpnSeenAt) : t("vpnNone"));

  const blocked = $("blocked");
  blocked.textContent = String(st.blocked);
  blocked.classList.toggle("count-hot", st.blocked > 0);

  $("private").hidden = st.privateAllowed;
  $("showCount").checked = st.showCount;
  $("blockedRow").hidden = !st.showCount;
}

$("showCount").addEventListener("change", async (e) => {
  await browser.runtime.sendMessage({ type: "showCount", value: e.target.checked });
  render(await browser.runtime.sendMessage({ type: "get" }));
});

$("toggle").addEventListener("click", async () => {
  const enabled = $("toggle").getAttribute("aria-checked") !== "true";
  await browser.runtime.sendMessage({ type: "set", enabled });
  render(await browser.runtime.sendMessage({ type: "get" }));
});

browser.runtime.getPlatformInfo().then(({ os }) => {
  document.documentElement.classList.toggle("android", os === "android");
});
browser.runtime.sendMessage({ type: "get" }).then(render);
