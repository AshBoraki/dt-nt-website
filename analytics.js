(() => {
    const config = window.DTNTAnalyticsConfig || {};
    const containerId = typeof config.gtmContainerId === "string"
        ? config.gtmContainerId.trim()
        : "";
    const gaMeasurementId = typeof config.gaMeasurementId === "string"
        ? config.gaMeasurementId.trim()
        : "";

    window.dataLayer = window.dataLayer || [];

    let gtmLoaded = false;
    let gtagLoaded = false;
    const pendingGaEvents = [];
    const attributionStorageKey = "dtnt_attribution";
    const attributionTtlMs = 1000 * 60 * 60 * 24 * 30;

    function readStoredAttribution() {
        try {
            const raw = window.localStorage.getItem(attributionStorageKey);
            if (!raw) {
                return {};
            }

            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") {
                return {};
            }

            if (typeof parsed.captured_at === "number" && Date.now() - parsed.captured_at > attributionTtlMs) {
                window.localStorage.removeItem(attributionStorageKey);
                return {};
            }

            return parsed;
        } catch {
            return {};
        }
    }

    function collectUrlAttribution() {
        const params = new URLSearchParams(window.location.search);
        const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
        const values = {};

        keys.forEach(key => {
            const value = params.get(key);
            if (value) {
                values[key] = value.slice(0, 160);
            }
        });

        const referrer = document.referrer || "";
        if (referrer) {
            values.referrer = referrer.slice(0, 300);
        }

        if (Object.keys(values).length === 0) {
            return {};
        }

        const attribution = {
            ...values,
            landing_page: window.location.href,
            captured_at: Date.now()
        };

        try {
            window.localStorage.setItem(attributionStorageKey, JSON.stringify(attribution));
        } catch {
            // Ignore storage failures. Analytics should never block the page.
        }

        return attribution;
    }

    const attribution = {
        ...readStoredAttribution(),
        ...collectUrlAttribution()
    };

    function attributionPayload() {
        const payload = {};
        ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "referrer", "landing_page"].forEach(key => {
            if (attribution[key]) {
                payload[key] = attribution[key];
            }
        });

        return payload;
    }

    function initGtag() {
        window.gtag = window.gtag || function gtag() {
            window.dataLayer.push(arguments);
        };

        window.gtag("js", new Date());
        window.gtag("config", gaMeasurementId, { send_page_view: false });
    }

    function flushGaEvents() {
        if (typeof window.gtag !== "function" || pendingGaEvents.length === 0) {
            return;
        }

        pendingGaEvents.splice(0).forEach(({ eventName, detail }) => {
            window.gtag("event", eventName, detail);
        });
    }

    function sendGaEvent(eventName, detail = {}) {
        if (!gaMeasurementId) {
            return;
        }

        if (typeof window.gtag === "function") {
            window.gtag("event", eventName, detail);
            return;
        }

        pendingGaEvents.push({ eventName, detail });
    }

    function push(eventName, detail = {}) {
        const payload = {
            event: eventName,
            page_path: window.location.pathname,
            page_title: document.title,
            ...attributionPayload(),
            ...detail
        };

        window.dataLayer.push(payload);
        sendGaEvent(eventName, payload);
    }

    function sendPageView() {
        const pageView = {
            page_title: document.title,
            page_location: window.location.href,
            page_path: window.location.pathname,
            ...attributionPayload()
        };

        window.dataLayer.push({
            event: "page_view",
            ...pageView
        });
        sendGaEvent("page_view", pageView);
    }

    function loadGtm() {
        if (gtmLoaded || !containerId) {
            return;
        }

        gtmLoaded = true;
        window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });

        const firstScript = document.getElementsByTagName("script")[0];
        const script = document.createElement("script");
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
        firstScript.parentNode.insertBefore(script, firstScript);
    }

    function loadGtag() {
        if (gtagLoaded || !gaMeasurementId) {
            return;
        }

        gtagLoaded = true;
        initGtag();

        const firstScript = document.getElementsByTagName("script")[0];
        const script = document.createElement("script");
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`;
        script.onload = flushGaEvents;
        firstScript.parentNode.insertBefore(script, firstScript);
    }

    function init() {
        const loadWhenIdle = () => {
            if ("requestIdleCallback" in window) {
                window.requestIdleCallback(() => {
                    loadGtm();
                    loadGtag();
                }, { timeout: 2500 });
                return;
            }

            window.setTimeout(() => {
                loadGtm();
                loadGtag();
            }, 1500);
        };

        if (document.readyState === "complete") {
            loadWhenIdle();
        } else {
            window.addEventListener("load", loadWhenIdle, { once: true });
        }

        ["scroll", "click", "touchstart", "keydown"].forEach(eventName => {
            document.addEventListener(eventName, () => {
                loadGtm();
                loadGtag();
            }, { once: true, passive: true });
        });

        sendPageView();
        push("dtnt_page_view");
    }

    init();

    window.DTNTAnalytics = {
        containerId,
        gaMeasurementId,
        loadGtm,
        loadGtag,
        sendPageView,
        push
    };
})();
