"""End-to-end test of the kill switch in a real (headless) Firefox.

The "VPN" is the tests/fake-vpn extension. Like Firefox's built-in VPN, it
registers a proxy filter after the kill switch, and sends everything to a local
HTTP proxy on 127.0.0.1:8899 that answers VIA-FAKE-VPN. The target uses the
reserved .invalid TLD, so a request that escaped directly would fail with a DNS
error instead of loading.

Usage:  python tests/e2e.py            (needs: pip install selenium)
        FIREFOX_BIN=/path/to/firefox python tests/e2e.py
"""
import http.server
import os
import sys
import threading
import time

from selenium import webdriver
from selenium.webdriver.firefox.options import Options

ROOT = os.path.dirname(os.path.abspath(__file__))
EXT = os.path.join(ROOT, "..", "extension")
FAKE = os.path.join(ROOT, "fake-vpn")
TARGET = "http://killswitch-test.invalid/"
MAC_FIREFOX = "/Applications/Firefox.app/Contents/MacOS/firefox"
hits = []


class Proxy(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        hits.append(self.path)
        body = b"<html><body>VIA-FAKE-VPN</body></html>"
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


def browser(prefs=None):
    opts = Options()
    opts.add_argument("-headless")
    binary = os.environ.get("FIREFOX_BIN") or (MAC_FIREFOX if os.path.exists(MAC_FIREFOX) else None)
    if binary:
        opts.binary_location = binary
    for key, value in (prefs or {}).items():
        opts.set_preference(key, value)
    driver = webdriver.Firefox(options=opts)
    driver.set_page_load_timeout(15)
    return driver


def load(driver, label):
    """Load the target and classify the outcome: VPN, BLOCKED or OTHER."""
    driver.switch_to.window(driver.window_handles[0])
    try:
        driver.get(f"{TARGET}?t={time.time()}")  # unique URL: no cache hits
    except Exception:
        pass
    time.sleep(1.5)
    url = driver.current_url
    if url.startswith("moz-extension:") and "blocked.html" in url:
        result = "BLOCKED"
    elif "VIA-FAKE-VPN" in driver.page_source:
        result = "VPN"
    else:
        result = f"OTHER({url[:60]})"
    print(f"{label:<48} -> {result}  (requests through VPN: {len(hits)})")
    return result


def main():
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 8899), Proxy)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    results = []

    d = browser()
    try:
        ks = d.install_addon(EXT, temporary=True)
        time.sleep(1)
        results.append(load(d, "1. Kill switch on, no VPN") == "BLOCKED")

        vpn = d.install_addon(FAKE, temporary=True)
        time.sleep(1)
        results.append(load(d, "2. Kill switch on, VPN connected") == "VPN")

        d.uninstall_addon(vpn)
        time.sleep(1)
        before = len(hits)
        results.append(load(d, "3. Kill switch on, VPN drops") == "BLOCKED")
        results.append(len(hits) == before)

        # Known limitation: if the VPN registered first, everything is blocked
        # (fail closed) until the VPN is turned off and on again.
        d.get("about:blank")  # uninstalling closes tabs showing the extension's pages
        d.uninstall_addon(ks)
        vpn = d.install_addon(FAKE, temporary=True)
        d.install_addon(EXT, temporary=True)
        time.sleep(1)
        results.append(load(d, "4. VPN registered first (fails closed)") == "BLOCKED")
        results.append("&r=1" in d.current_url)  # page explains the reinstall
        d.uninstall_addon(vpn)
        vpn = d.install_addon(FAKE, temporary=True)
        time.sleep(1)
        results.append(load(d, "5. ...after turning the VPN off and on") == "VPN")
        d.uninstall_addon(vpn)
        time.sleep(1)
        results.append(load(d, "6. VPN drops again (no reinstall notice)") == "BLOCKED")
        results.append("&r=1" not in d.current_url)
    finally:
        d.quit()

    # A PAC or system proxy with a DIRECT fallback must not leak.
    d = browser({
        "network.proxy.type": 2,
        "network.proxy.autoconfig_url":
            "data:text/plain,function FindProxyForURL(u,h){return 'PROXY 127.0.0.1:7; DIRECT';}",
    })
    try:
        d.install_addon(EXT, temporary=True)
        time.sleep(2)
        results.append(load(d, "7. PAC 'PROXY dead; DIRECT', no VPN") == "BLOCKED")
    finally:
        d.quit()
        server.shutdown()

    print("OK" if all(results) else f"FAILED {results}")
    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main())
