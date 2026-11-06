# addons.mozilla.org listing

Texts to paste when submitting or updating the listing. English is the default locale; Spanish goes in the listing's "es-ES" translation.

## Basics

| Field | Value |
|---|---|
| Name | Kill Switch for Firefox VPN |
| Add-on URL slug | `kill-switch-for-firefox-vpn` |
| Categories | Privacy & Security |
| Platforms | Firefox, Firefox for Android |
| Tags | vpn, kill switch, privacy, ip leak, proxy |
| Homepage | https://github.com/agsola/firefox-vpn-kill-switch |
| Support site | https://github.com/agsola/firefox-vpn-kill-switch/issues |
| License | MIT |
| Privacy policy | Paste the English section of [PRIVACY.md](../PRIVACY.md) (and the Spanish one in the es-ES translation) |
| Source code | Not needed: the package isn't minified, bundled or transpiled |
| Screenshots | `docs/screenshots/*-en.png` (and `*-es.png` for es-ES), 1280×800 |

## Summary (en, max 250 characters)

Blocks every page that doesn't go through Firefox's built-in VPN, so your real IP doesn't leak when the VPN turns off, pauses or hits its data limit. One switch, no data collection.

## Description (en)

```
Firefox's built-in VPN protects you only while it's on. If it turns off — you reach the monthly data limit, sign out, hit a network error or switch it off by accident — Firefox keeps browsing with your real IP and doesn't warn you.

This extension is a kill switch: while it's on, pages load only through the VPN. Without the VPN, they don't load at all, and you see a page explaining what happened and how to fix it.

<b>What it does</b>
• Blocks requests before anything leaves the browser, including the DNS lookup
• Turns off WebRTC and DNS prefetching while it's on, since neither goes through the VPN
• Never blocks your local network or the Mozilla services the VPN needs to connect
• Shows when the VPN was last used and how many requests were blocked
• Works on Firefox for desktop and Android

<b>After installing</b>
1. If the VPN was already on, turn it off and on once.
2. Allow the extension in private windows (Add-ons → Kill Switch for Firefox VPN → Run in Private Windows). Without it, private windows aren't protected.

<b>Privacy</b>
No data collection, no analytics, no remote code. Open source: https://github.com/agsola/firefox-vpn-kill-switch

Not affiliated with or endorsed by Mozilla.
```

## Summary (es)

Bloquea toda página que no pase por la VPN integrada de Firefox, para que tu IP real no se filtre si la VPN se apaga, se pausa o llega a su límite de datos. Un solo interruptor, sin recogida de datos.

## Description (es)

```
La VPN integrada de Firefox solo te protege mientras está encendida. Si se apaga —llegas al límite mensual de datos, cierras sesión, hay un error de red o la desactivas sin querer—, Firefox sigue navegando con tu IP real y no te avisa.

Esta extensión es un kill switch: mientras está activada, las páginas solo cargan a través de la VPN. Sin VPN no cargan, y ves una página que explica qué ha pasado y cómo solucionarlo.

<b>Qué hace</b>
• Bloquea las peticiones antes de que nada salga del navegador, incluida la consulta DNS
• Desactiva WebRTC y el prefetch de DNS mientras está activada, porque ninguno de los dos pasa por la VPN
• Nunca bloquea tu red local ni los servicios de Mozilla que la VPN necesita para conectarse
• Muestra cuándo se usó la VPN por última vez y cuántas peticiones se han bloqueado
• Funciona en Firefox para escritorio y Android

<b>Después de instalarla</b>
1. Si la VPN ya estaba encendida, apágala y enciéndela una vez.
2. Permite la extensión en ventanas privadas (Complementos → Kill Switch for Firefox VPN → Ejecutar en ventanas privadas). Sin ese permiso, las ventanas privadas no están protegidas.

<b>Privacidad</b>
No recoge datos, no tiene analíticas ni carga código remoto. Código abierto: https://github.com/agsola/firefox-vpn-kill-switch

No está afiliada a Mozilla ni cuenta con su respaldo.
```

## Notes for reviewers

```
This extension is a kill switch for Firefox's built-in VPN (IP Protection).

How it works: background.js registers proxy.onRequest for <all_urls> and returns a dead proxy (http 127.0.0.1:9, followed by null to end the failover chain) for every request. Firefox's built-in VPN registers its own proxy channel filter when it turns on; it runs after ours and replaces the dead proxy with the real VPN proxy. When the VPN is off, requests keep the dead proxy and fail locally, before any DNS lookup. Mozilla infrastructure needed by the VPN (vpn.mozilla.org, Firefox accounts, remote settings, captive portal detection, DoH resolvers) and local network addresses are never blocked.

Permissions:
- proxy + <all_urls>: the blocking itself.
- webRequest: onErrorOccurred shows an explanation page for blocked top-level loads; onHeadersReceived (main_frame only) detects that the VPN is in use. Non-blocking, observation only.
- privacy: sets webRTCIPHandlingPolicy=disable_non_proxied_udp and networkPredictionEnabled=false while on; cleared when off.
- tabs: open the welcome page, show the blocked page in the blocked tab.
- storage: on/off state.

No data collection, no remote code, no minification, no build step. To test: install, turn the built-in VPN off and open any site (blocked page appears); turn the VPN on and retry (loads). If the VPN was already on during install, turn it off and on once (documented limitation: filter order). Automated tests: tests/e2e.py in the repository.
```
