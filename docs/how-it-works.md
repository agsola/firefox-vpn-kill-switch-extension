# How it works

This document explains how Firefox's built-in VPN routes traffic, why the kill switch hooks into proxy resolution, and which cases are covered. Source references point to [mozilla-firefox/firefox](https://github.com/mozilla-firefox/firefox).

## Firefox's built-in VPN

Firefox's VPN, called *IP Protection* in the code, launched in Firefox 149 on desktop and later rolled out on Android. It covers only traffic inside Firefox.

- **It's a proxy, not a network tunnel.** `toolkit/components/ipprotection/IPPChannelFilter.sys.mjs` implements an `nsIProtocolProxyChannelFilter`. While the VPN is on, it gives each request a `proxyInfo` that points to Mozilla's proxy servers (operated by Fastly). The protocol is HTTP CONNECT over HTTP/2, with MASQUE as an option, and requests are authenticated with a token from `vpn.mozilla.org`. The proxy resolves host names (`TRANSPARENT_PROXY_RESOLVES_HOST`), so DNS lookups go through it too.
- **Desktop and Android share this code.** It lives in Gecko, the engine both use, so one extension works on both.
- **The filter exists only while the VPN is on.** `IPPProxyManager` registers it on activation and unregisters it when the VPN stops. While the VPN is on but failing, the filter holds or cancels requests itself, so it fails closed. Leaks happen once the VPN is *not* active: you turn it off, the monthly data cap pauses it, you sign out, or a site is in the VPN's exclusions.
- **Some traffic never goes through the VPN:** local network addresses, non-http(s) schemes, DNS over HTTPS, and the VPN's own infrastructure (`vpn.mozilla.org`, Firefox accounts, captive portal detection). See `IPPSiteRuleProviders.sys.mjs`.
- **WebRTC isn't covered** ([bug 2056579](https://bugzilla.mozilla.org/show_bug.cgi?id=2056579)).

## Why `proxy.onRequest`

Blocking has to happen before Firefox resolves the host name. In `netwerk/protocol/http/nsHttpChannel.cpp`, the order is:

1. `AsyncOpen` fires `webRequest.onBeforeRequest`. The proxy isn't known yet.
2. `ResolveProxy` runs the proxy filters, including `proxy.onRequest` and the VPN's filter.
3. `BeginConnect` starts a DNS prefetch when the request has no proxy.
4. Then come the `http-on-modify-request` observers (`webRequest.onBeforeSendHeaders`, the first event that exposes `proxyInfo`) and the connection.

A blocker based on `webRequest` sees whether a request went through the VPN only after step 3, so the DNS lookup has already gone out. A proxy filter acts at step 2.

`proxy.settings` would be simpler, but Firefox for Android doesn't support it (it throws).

## The black hole

For every request, the extension returns `[{type: "http", host: "127.0.0.1", port: 9}, null]`:

- **Port 9 is the "discard" port.** Nothing listens on it, so the connection is refused at once, without touching the network.
- **The trailing `null` ends the failover chain.** Without it, `ProxyChannelFilter.createProxyInfoFromData` appends the *default* proxy as failover. With a PAC file or system proxy, that default can be `DIRECT`, so a refused black hole would fail over to a direct connection. This leak is reproduced in `tests/e2e.py` (case 6).
- **A failed proxy isn't skipped.** When every non-direct proxy in a list has failed, `nsProtocolProxyService::PruneProxyInfo` keeps them if `network.proxy.retry_failed_proxies` is `true` (the default), instead of falling back to direct.

## What is never blocked

The same traffic Firefox keeps out of the VPN:

- **The VPN's own services:** `vpn.mozilla.org`, Firefox accounts, remote settings (the VPN server list) and captive portal detection.
- **DNS over HTTPS:** the known Firefox resolvers, plus any internal request (one with no tab) to a `/dns-query` path, so custom DoH providers keep working.
- **Your local network:** `localhost`, `.local`, and private IP ranges.

## Filter order

Filters registered with the same position run in insertion order (`nsProtocolProxyService::InsertFilterLink`). The extension's filter and the VPN's filter both use position 0:

- **Extension registered first (the normal case).** The VPN's filter runs second. When the VPN proxies a request, it ignores the incoming result and returns its own proxy, which replaces the black hole. When the VPN doesn't proxy a request, it passes the black hole on unchanged.
- **VPN registered first.** This happens when the extension is installed, updated or reloaded while the VPN is on. The extension's black hole runs last and wins, so everything is blocked, which fails closed. Turning the VPN off and on registers its filter again, after the extension's. After an install or update, the blocked page says this first, until the extension sees traffic through the VPN again.

The extension's filter is always registered, and only its answer changes with the switch. Turning the kill switch on or off therefore doesn't change the order.

## Other leak paths

| Path | Mitigation |
|---|---|
| WebRTC (UDP) | `privacy.network.webRTCIPHandlingPolicy = "disable_non_proxied_udp"` while on |
| DNS prefetch, preconnect | `privacy.network.networkPredictionEnabled = false` while on |
| Private windows | The extension sees them only with private browsing access; the popup warns when it's missing |
| Startup | The listener is registered synchronously in a persistent background page, so Firefox holds early requests until the extension is ready |
| Firefox's own background requests | `network.proxy.failover_direct` may send them direct after a proxy failure. Browsing is not affected |

## Detecting the VPN

The popup shows when the VPN was last used. The extension watches `webRequest.onHeadersReceived` for top-level pages and records when a page loaded through a proxy that isn't the black hole. This is observation only and doesn't affect blocking.
