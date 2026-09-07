(() => {
    "use strict";
    const config = window.DTNTAnalyticsConfig || {};
    const containerId = String(config.gtmContainerId || "").trim();
    const gaMeasurementId = String(config.gaMeasurementId || "").trim();
    const microsoftUetTagId = String(config.microsoftUetTagId || "").trim();
    const preferenceKey = "dtnt_privacy_v1";
    const attributionKey = "dtnt_attribution";
    const preferenceTtl = 180 * 86400000;
    const attributionTtl = 30 * 86400000;
    const params = new URLSearchParams(window.location.search);
    // Order and activation pages must never load third-party measurement code.
    const sensitivePage = /^\/(success|activation|cancel)(\/|$)/i.test(window.location.pathname)
        || [...params.keys()].some(key => /session|token|email|license|activation|code/i.test(key))
        || /session|token|email|license|activation|code/i.test(window.location.hash);
    let preferences = readPreferences();
    let attribution = {};
    let collected = false;
    let started = false;
    let gtmLoaded = false;
    let gtagLoaded = false;
    let microsoftUetLoaded = false;
    let panel, analyticsBox, advertisingBox;

    function globalOptOut() { return window.navigator.globalPrivacyControl === true; }
    function allowed(purpose) {
        return !sensitivePage && !globalOptOut() && preferences?.[purpose] === true;
    }
    function readPreferences() {
        try {
            const value = JSON.parse(window.localStorage.getItem(preferenceKey));
            const age = Date.now() - value?.savedAt;
            if (value?.version === 1 && typeof value.analytics === "boolean"
                && typeof value.advertising === "boolean"
                && Number.isFinite(age) && age >= 0 && age < preferenceTtl) return value;
            window.localStorage.removeItem(preferenceKey);
        } catch { /* Unavailable storage keeps optional tracking off. */ }
        return null;
    }
    function safeUrl(value) {
        if (!value) return "";
        try {
            const url = new URL(value, window.location.origin);
            return /^https?:$/.test(url.protocol) ? url.origin + url.pathname : "";
        } catch { return ""; }
    }
    function collectAttribution() {
        if (collected || (!allowed("analytics") && !allowed("advertising"))) return;
        collected = true;
        try {
            const stored = JSON.parse(window.localStorage.getItem(attributionKey));
            const age = Date.now() - stored?.captured_at;
            if (Number.isFinite(age) && age >= 0 && age < attributionTtl) attribution = stored;
            else window.localStorage.removeItem(attributionKey);
        } catch {}
        const fresh = {};
        ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(key => {
            if (params.get(key)) fresh[key] = params.get(key).slice(0, 160);
        });
        try {
            const referrer = new URL(document.referrer);
            if (/^https?:$/.test(referrer.protocol) && referrer.origin !== window.location.origin) {
                fresh.referrer = referrer.origin;
            }
        } catch {}
        if (Object.keys(fresh).length) {
            attribution = { ...fresh, landing_page: safeUrl(window.location.href), captured_at: Date.now() };
            try { window.localStorage.setItem(attributionKey, JSON.stringify(attribution)); } catch {}
        }
    }
    function attributionPayload() {
        const result = {};
        ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "referrer", "landing_page"].forEach(key => {
            if (typeof attribution[key] === "string") result[key] = attribution[key].slice(0, 300);
        });
        return result;
    }
    function addScript(src, onload) {
        const script = document.createElement("script");
        script.async = true;
        script.src = src;
        if (onload) script.onload = onload;
        document.head.appendChild(script);
    }
    function loadGtag() {
        if (!allowed("analytics") || gtagLoaded || !gaMeasurementId) return;
        gtagLoaded = true;
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
        window.gtag("consent", "default", {
            analytics_storage: "granted", ad_storage: "denied",
            ad_user_data: "denied", ad_personalization: "denied"
        });
        window.gtag("js", new Date());
        window.gtag("config", gaMeasurementId, {
            send_page_view: false, page_location: safeUrl(window.location.href),
            page_referrer: safeUrl(document.referrer), allow_google_signals: false,
            allow_ad_personalization_signals: false
        });
        addScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(gaMeasurementId));
    }
    function loadGtm() {
        // A future GTM container could contain either purpose; require both.
        if (!allowed("analytics") || !allowed("advertising") || gtmLoaded || !containerId) return;
        gtmLoaded = true;
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
        addScript("https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(containerId));
    }
    function loadMicrosoftUet() {
        if (!allowed("advertising") || microsoftUetLoaded || !microsoftUetTagId) return;
        microsoftUetLoaded = true;
        window.uetq = window.uetq || [];
        window.uetq.push("consent", "default", { ad_storage: "denied" });
        window.uetq.push("consent", "update", { ad_storage: "granted" });
        addScript("https://bat.bing.com/bat.js", () => {
            if (!allowed("advertising") || typeof window.UET !== "function") return;
            window.uetq = new window.UET({ ti: microsoftUetTagId, q: window.uetq });
            window.uetq.push("pageLoad");
        });
    }
    function cleanDetail(detail) {
        const result = {};
        ["event_category", "download_label", "download_mode", "buy_label", "buy_mode",
            "action_label", "checkout_mode", "support_channel", "release_version",
            "reference_type", "currency", "value", "price", "destination_url"].forEach(key => {
            if (typeof detail[key] === "number" && Number.isFinite(detail[key])) result[key] = detail[key];
            else if (typeof detail[key] === "string") {
                result[key] = key === "destination_url" ? safeUrl(detail[key]) : detail[key].slice(0, 160);
            }
        });
        return result;
    }
    function push(eventName, detail = {}) {
        if (!allowed("analytics") && !allowed("advertising")) return;
        const name = String(eventName || "").replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 64);
        const payload = { page_path: window.location.pathname, page_title: document.title,
            page_location: safeUrl(window.location.href), ...attributionPayload(), ...cleanDetail(detail) };
        if (allowed("analytics")) {
            loadGtag();
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event: name, ...payload });
            if (typeof window.gtag === "function") window.gtag("event", name, payload);
        }
        if (allowed("advertising") && microsoftUetTagId) {
            loadMicrosoftUet();
            window.uetq = window.uetq || [];
            window.uetq.push("event", name, { event_category: "DTNT",
                event_label: payload.download_label || payload.buy_label || name,
                page_path: window.location.pathname });
        }
    }
    function sendPageView() { push("page_view"); }
    function startTracking() {
        if (!allowed("analytics") && !allowed("advertising")) return;
        collectAttribution();
        loadGtm();
        loadGtag();
        loadMicrosoftUet();
        if (!started) { started = true; sendPageView(); push("dtnt_page_view"); }
    }
    function clearTrackingStorage() {
        attribution = {};
        collected = false;
        try {
            window.localStorage.removeItem(attributionKey);
            for (let i = window.localStorage.length - 1; i >= 0; i--) {
                const key = window.localStorage.key(i);
                if (/^(_uet|_ga|_gcl)/i.test(key)) window.localStorage.removeItem(key);
            }
        } catch {}
        const hosts = window.location.hostname.split(".");
        const domains = ["", window.location.hostname, "." + window.location.hostname];
        while (hosts.length > 2) { hosts.shift(); domains.push("." + hosts.join(".")); }
        (document.cookie || "").split(";").forEach(item => {
            const name = item.split("=")[0].trim();
            if (!/^(_ga|_gid|_gat|_gcl|_uet)/i.test(name)) return;
            domains.forEach(domain => {
                document.cookie = name + "=; Max-Age=0; path=/; SameSite=Lax"
                    + (domain ? "; domain=" + domain : "");
            });
        });
    }
    function setPreferences(value) {
        const previousAnalytics = allowed("analytics");
        const previousAdvertising = allowed("advertising");
        preferences = { version: 1, savedAt: Date.now(),
            analytics: value?.analytics === true && !globalOptOut(),
            advertising: value?.advertising === true && !globalOptOut() };
        try { window.localStorage.setItem(preferenceKey, JSON.stringify(preferences)); } catch {}
        const withdrawn = (previousAnalytics && !allowed("analytics"))
            || (previousAdvertising && !allowed("advertising"));
        if (withdrawn || (!preferences.analytics && !preferences.advertising)) clearTrackingStorage();
        if (panel) panel.hidden = true;
        if (withdrawn && (gtmLoaded || gtagLoaded || microsoftUetLoaded)) {
            // Reload stops already loaded scripts, including their background timers.
            window["ga-disable-" + gaMeasurementId] = true;
            if (typeof window.gtag === "function") window.gtag("consent", "update", {
                analytics_storage: "denied", ad_storage: "denied",
                ad_user_data: "denied", ad_personalization: "denied"
            });
            if (window.uetq) window.uetq.push("consent", "update", { ad_storage: "denied" });
            window.location.reload();
            return;
        }
        startTracking();
    }
    function showChoices() {
        if (!panel) return;
        analyticsBox.checked = preferences?.analytics === true && !globalOptOut();
        advertisingBox.checked = preferences?.advertising === true && !globalOptOut();
        panel.hidden = false;
        panel.focus();
    }
    function mountChoices() {
        if (!document.body) return;
        const style = document.createElement("style");
        style.textContent = ".dtnt-privacy{position:fixed;z-index:10000;bottom:16px;left:16px;max-width:520px;width:calc(100% - 32px);box-sizing:border-box;padding:20px;background:#101c2c;color:#f3f6fb;border:1px solid #8191a5;border-radius:12px;box-shadow:0 8px 32px #0006;font:15px/1.5 system-ui,sans-serif;max-height:80vh;overflow:auto}.dtnt-privacy[hidden]{display:none}.dtnt-privacy h2{font:600 20px/1.3 system-ui;margin:0 0 8px;color:#fff}.dtnt-privacy p{margin:8px 0}.dtnt-privacy a{color:#a8d8ff;text-decoration:underline}.dtnt-privacy label{display:block;margin:10px 0}.dtnt-privacy input{margin-right:8px;accent-color:#58c4e6}.dtnt-privacy button,.dtnt-privacy-link{font:600 14px/1.4 system-ui;padding:10px 14px;border:1px solid #8191a5;border-radius:6px;background:#152e44;color:#fff;cursor:pointer}.dtnt-privacy-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.dtnt-privacy-link{position:fixed;z-index:9999;bottom:12px;left:12px;box-shadow:0 2px 10px #0004}.dtnt-privacy :focus-visible,.dtnt-privacy-link:focus-visible{outline:3px solid #75d7ef;outline-offset:3px}";
        document.head.appendChild(style);
        const reopen = document.createElement("button");
        reopen.type = "button"; reopen.className = "dtnt-privacy-link";
        reopen.textContent = "Privacy choices";
        reopen.addEventListener("click", showChoices);
        document.body.appendChild(reopen);
        panel = document.createElement("section");
        panel.className = "dtnt-privacy"; panel.tabIndex = -1;
        panel.setAttribute("aria-label", "Privacy choices");
        const title = document.createElement("h2");
        title.textContent = "Your privacy choices"; panel.appendChild(title);
        const text = document.createElement("p");
        text.textContent = "Optional analytics help us understand visits. Optional advertising helps Microsoft measure ads. Both are off until you choose. The site and checkout work without either.";
        panel.appendChild(text);
        const link = document.createElement("a");
        link.href = "/legal/#privacy"; link.textContent = "Read the Privacy Notice";
        panel.appendChild(link);
        function checkbox(labelText) {
            const label = document.createElement("label");
            const input = document.createElement("input");
            input.type = "checkbox"; input.disabled = globalOptOut();
            label.appendChild(input); label.appendChild(document.createTextNode(labelText));
            panel.appendChild(label); return input;
        }
        analyticsBox = checkbox("Allow Google Analytics and 30-day campaign attribution");
        advertisingBox = checkbox("Allow Microsoft Advertising measurement and 30-day campaign attribution");
        if (globalOptOut()) {
            const notice = document.createElement("p");
            notice.textContent = "Your browser's Global Privacy Control signal keeps optional tracking off.";
            panel.appendChild(notice);
        }
        const actions = document.createElement("div"); actions.className = "dtnt-privacy-actions";
        function button(label, action) {
            const control = document.createElement("button");
            control.type = "button"; control.textContent = label;
            control.addEventListener("click", () => { action(); reopen.focus(); });
            actions.appendChild(control);
        }
        button("Reject optional", () => setPreferences({ analytics: false, advertising: false }));
        button("Save choices", () => setPreferences({ analytics: analyticsBox.checked, advertising: advertisingBox.checked }));
        if (!globalOptOut()) button("Accept all", () => setPreferences({ analytics: true, advertising: true }));
        panel.appendChild(actions); document.body.appendChild(panel);
        analyticsBox.checked = preferences?.analytics === true && !globalOptOut();
        advertisingBox.checked = preferences?.advertising === true && !globalOptOut();
        panel.hidden = preferences !== null || sensitivePage || globalOptOut();
    }
    window.DTNTAnalytics = { containerId, gaMeasurementId, microsoftUetTagId,
        loadGtm, loadGtag, loadMicrosoftUet, sendPageView, push, setPreferences, showChoices };
    if (globalOptOut() || (!allowed("analytics") && !allowed("advertising"))) clearTrackingStorage();
    startTracking();
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountChoices, { once: true });
    else mountChoices();
    document.addEventListener("click", event => {
        if (event.target?.closest?.("a[href^='mailto:']")) {
            push("dtnt_support_click", { event_category: "support", support_channel: "email" });
        }
    });
    window.addEventListener("storage", event => {
        if (event.key !== preferenceKey && event.key !== null) return;
        if (JSON.stringify(readPreferences()) !== JSON.stringify(preferences)) window.location.reload();
    });
})();
