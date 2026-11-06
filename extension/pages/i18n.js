"use strict";

// Fills [data-i18n] text and [data-i18n-label] aria-labels from _locales.
const t = (key, ...subs) => browser.i18n.getMessage(key, subs);

document.documentElement.lang = browser.i18n.getUILanguage();
for (const el of document.querySelectorAll("[data-i18n]")) {
  el.textContent = t(el.dataset.i18n);
}
for (const el of document.querySelectorAll("[data-i18n-label]")) {
  el.setAttribute("aria-label", t(el.dataset.i18nLabel));
}
