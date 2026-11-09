# Changelog

## 0.4.0 (2026-11-09)

- New option in the popup to hide the number of blocked requests.
- Blocked internal Firefox requests are logged to the extension's console, to help troubleshoot.

## 0.3.0 (2026-11-06)

First version on [addons.mozilla.org](https://addons.mozilla.org/firefox/addon/vpn-kill-switch-for-firefox/).

- No longer asks for access to browser tabs: it was never needed.
- After an install or update, the blocked page explains that the VPN must be turned off and on once if it was already on.
- The blocked counter only counts requests from tabs, not Firefox's own background requests.
- Custom DNS-over-HTTPS providers keep working while the VPN is on, as Firefox keeps them out of the VPN.

## 0.2.0 (2026-11-06)

First public release.

- New name: VPN Kill Switch for Firefox.
- New toggle-switch icon that shows whether the kill switch is on or off.
- English and Spanish.
- Fixed: the popup could open much wider than its content, depending on where the toolbar button was clicked.

## 0.1.0

Internal preview.

- Blocks every request that doesn't go through Firefox's built-in VPN, before any DNS lookup.
- Turns off WebRTC traffic outside the proxy and DNS prefetching while on.
- Popup with an on/off switch, when the VPN was last used, and how many requests were blocked.
- Explanation page for blocked sites, and a welcome page with setup steps.
- Warns when the extension can't see private windows.
- English and Spanish.
