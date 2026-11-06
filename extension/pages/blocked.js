"use strict";

const params = new URLSearchParams(location.search);
const target = params.get("u") || "";
const safe = /^(https?|wss?):/i.test(target) ? target : "";

let host = "";
try { host = new URL(safe).host; } catch {}
const hostEl = document.getElementById("host");
hostEl.textContent = host;
hostEl.title = safe;
hostEl.hidden = !host;
if (host) document.title = t("blockedTitle", host);
document.getElementById("reordered").hidden = !params.has("r");

document.getElementById("retry").addEventListener("click", () => {
  if (safe) location.replace(safe);
});
