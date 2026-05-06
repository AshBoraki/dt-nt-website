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
            ...detail
        };

        window.dataLayer.push(payload);
        sendGaEvent(eventName, payload);
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

        push("dtnt_page_view");
    }

    init();

    window.DTNTAnalytics = {
        containerId,
        gaMeasurementId,
        loadGtm,
        loadGtag,
        push
    };
})();
