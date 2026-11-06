"use strict";

const target = new URLSearchParams(location.search).get("u") || "";
const safe = /^(https?|wss?):/i.test(target) ? target : "";

let host = "";
try { host = new URL(safe).host; } catch {}
const hostEl = document.getElementById("host");
hostEl.textContent = host;
hostEl.title = safe;
hostEl.hidden = !host;
if (host) document.title = t("blockedTitle", host);

document.getElementById("retry").addEventListener("click", () => {
  if (safe) location.replace(safe);
});
