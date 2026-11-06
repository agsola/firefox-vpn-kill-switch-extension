# Contributing

Bug reports and pull requests are welcome. For anything larger than a small fix, open an issue first so we can agree on the approach.

## Project layout

```
extension/            the add-on (this folder is what gets packaged)
  manifest.json
  background.js       proxy filter, privacy settings, popup messages
  pages/              popup, blocked page, welcome page, shared CSS, i18n helper
  _locales/           translations (en is the default)
  icons/
tests/
  e2e.py              end-to-end tests in a real headless Firefox
  fake-vpn/           test extension that simulates the built-in VPN
docs/                 technical notes, store listing, screenshots
```

## Ground rules

- **Fail closed.** If you're unsure whether a change could let a request out without the VPN, it shouldn't ship. Add a case to `tests/e2e.py`.
- **Stay light.** No runtime dependencies, no build step, no remote code.
- Keep `npm run lint` clean and `tests/e2e.py` passing.

## Translations

1. Copy `extension/_locales/en/messages.json` to `extension/_locales/<code>/messages.json` (for example `fr`, `pt_BR`).
2. Translate each `message`. Keep keys and `$PLACEHOLDERS$` unchanged.
3. Keep the extension name, "Kill Switch for Firefox VPN", in English.
4. Use Firefox's own wording for its menus and settings in your language (for example "Run in Private Windows").

## Releasing

1. Update `version` in `extension/manifest.json` and `package.json`, and add an entry to `CHANGELOG.md`.
2. `npm run lint && npm run build`.
3. Upload `web-ext-artifacts/*.zip` to addons.mozilla.org. Listing texts and reviewer notes are in [docs/amo-listing.md](docs/amo-listing.md).
