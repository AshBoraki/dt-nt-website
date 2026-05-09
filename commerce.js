(() => {
    const config = {
        checkoutUrl: "https://buy.stripe.com/bJeaEW4Wwfzn8F66Jt3ks01",
        checkoutMode: "live",
        autoRedirectWhenLive: false,
        latestManifestUrl: "/downloads/dtnt/latest.json",
        fulfillmentApiBaseUrl: "https://dtnt-fulfillment-a07d.azurewebsites.net",
        orderStatusBasePath: "",
        homeUrl: "/",
        buyUrl: "/buy/",
        successUrl: "/success/",
        cancelUrl: "/cancel/",
        pricingUrl: "/#pricing",
        activationUrl: "/#activation",
        supportEmail: "support@dt-nt.com",
        supportSubject: "DTNT order help",
        launchPriceLabel: "$59 one time",
        launchPriceAmountUsd: 59,
        regularPriceLabel: "$99 after launch"
    };

    let latestReleasePromise;

    function trackEvent(eventName, detail = {}) {
        if (window.DTNTAnalytics && typeof window.DTNTAnalytics.push === "function") {
            window.DTNTAnalytics.push(eventName, detail);
            return;
        }

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: eventName,
            page_path: window.location.pathname,
            page_title: document.title,
            ...detail
        });
    }

    function instrumentLinks(root = document, release = null) {
        root.querySelectorAll("[data-dtnt-download]").forEach(anchor => {
            if (anchor.dataset.dtntTracked === "true") {
                return;
            }

            anchor.dataset.dtntTracked = "true";
            anchor.addEventListener("click", () => {
                trackEvent("dtnt_download_click", {
                    download_mode: anchor.getAttribute("data-dtnt-download") || "",
                    download_label: anchor.textContent.trim(),
                    destination_url: anchor.href,
                    release_version: release?.version || ""
                });
            });
        });

        root.querySelectorAll("[data-dtnt-buy]").forEach(anchor => {
            if (anchor.dataset.dtntTracked === "true") {
                return;
            }

            anchor.dataset.dtntTracked = "true";
            anchor.addEventListener("click", () => {
                trackEvent("dtnt_buy_click", {
                    buy_mode: anchor.getAttribute("data-dtnt-buy") || "",
                    buy_label: anchor.textContent.trim(),
                    destination_url: anchor.href,
                    release_version: release?.version || ""
                });
            });
        });
    }

    async function loadLatestRelease() {
        if (!latestReleasePromise) {
            latestReleasePromise = fetch(config.latestManifestUrl, { cache: "no-store" })
                .then(async response => {
                    if (!response.ok) {
                        throw new Error(`Could not load ${config.latestManifestUrl}.`);
                    }

                    return response.json();
                })
                .catch(() => null);
        }

        return latestReleasePromise;
    }

    async function hydrateLatestRelease(root = document) {
        const release = await loadLatestRelease();
        if (!release) {
            return null;
        }

        const freeDownloadUrl = release.downloadUrl || "";
        const version = release.displayVersion || release.version || "";
        const installer = release.installer || {};
        const store = release.store || {};
        const appInstallerUrl = installer.appInstallerUrl || "";
        const msixUrl = installer.msixUrl || "";
        const storeUrl = store.webInstallerUrl || store.storeUrl || "";
        const storeSubmissionStatus = String(store.submissionStatus || "").toLowerCase();
        const releaseNotesUrl = release.releaseNotesUrl || "";
        const sha256 = release.sha256 || "";
        const installerAvailable = Boolean(installer.available && (appInstallerUrl || msixUrl));
        const storeAvailable = Boolean(store.available === true && storeUrl);
        const storeInCertification = !storeAvailable && storeSubmissionStatus === "in-certification";
        const storePreparing = !storeAvailable && !storeInCertification && Boolean(store.productId || storeSubmissionStatus);
        const installerPublicReady = Boolean(
            installerAvailable
            && installer.signingReadyForPublicLaunch === true
            && installer.requiresTrustedCertificate !== true
        );
        const preferredDownloadUrl = storeAvailable
            ? storeUrl
            : installerPublicReady
                ? (appInstallerUrl || msixUrl || freeDownloadUrl)
                : freeDownloadUrl;
        const preferredDownloadMode = storeAvailable
            ? "store"
            : installerPublicReady
                ? "installer"
                : "portable";
        const installNote = storeAvailable
            ? "Microsoft Store install is live and is the recommended path for the approved Windows build."
            : installerPublicReady
                ? "Signed Windows install is ready. Backup install support remains available when Store access is blocked."
                : storeInCertification
                ? "Microsoft Store release is in certification. Backup install support remains available while the Store path is being finished."
                : storePreparing
                ? "Backup install support is available while Microsoft Store and the signed Windows installer path are being prepared."
                : installerAvailable
                ? "Backup install support is available while the signed Windows installer path is being tightened up."
                : "Start free. Go Pro when you need saved results, exports, and activation.";
        const installDetail = storeAvailable
            ? "Microsoft Store install recommended"
            : installerPublicReady
                ? "Signed Windows install available"
                : storeInCertification
                ? "Backup path available; Store review in progress"
                : storePreparing
                ? "Backup path available; Store path preparing"
                : installerAvailable
                ? "Backup path available; signed install next"
                : "Backup install support available";
        const storeStatus = storeAvailable
            ? "Live"
            : storeInCertification
                ? "In certification"
                : storePreparing
                    ? "Preparing"
                    : "Not live yet";

        root.querySelectorAll('[data-dtnt-download="free"]').forEach(anchor => {
            if (!freeDownloadUrl) {
                anchor.hidden = true;
                return;
            }

            anchor.hidden = false;
            anchor.setAttribute("href", freeDownloadUrl);
            anchor.removeAttribute("aria-disabled");
        });

        root.querySelectorAll('[data-dtnt-download="preferred"]').forEach(anchor => {
            const storeText = anchor.getAttribute("data-dtnt-store-text") || "Install from Microsoft";
            const installerText = anchor.getAttribute("data-dtnt-installer-text") || "Install for Windows";
            const fallbackText = anchor.getAttribute("data-dtnt-fallback-text") || "Download Free";

            anchor.setAttribute("href", preferredDownloadUrl);
            anchor.textContent = preferredDownloadMode === "store"
                ? storeText
                : preferredDownloadMode === "installer"
                    ? installerText
                    : fallbackText;
            anchor.removeAttribute("aria-disabled");
        });

        root.querySelectorAll('[data-dtnt-download="store"]').forEach(anchor => {
            if (!storeAvailable) {
                anchor.hidden = true;
                return;
            }

            anchor.hidden = false;
            anchor.setAttribute("href", storeUrl);
            anchor.removeAttribute("aria-disabled");
        });

        root.querySelectorAll('[data-dtnt-download="appinstaller"]').forEach(anchor => {
            if (!installerPublicReady || !appInstallerUrl) {
                anchor.hidden = true;
                return;
            }

            anchor.hidden = false;
            anchor.setAttribute("href", appInstallerUrl);
            anchor.removeAttribute("aria-disabled");
        });

        root.querySelectorAll('[data-dtnt-download="msix"]').forEach(anchor => {
            if (!msixUrl) {
                anchor.hidden = true;
                return;
            }

            anchor.hidden = false;
            anchor.setAttribute("href", msixUrl);
            anchor.removeAttribute("aria-disabled");
        });

        root.querySelectorAll("[data-dtnt-release-notes]").forEach(anchor => {
            if (!releaseNotesUrl) {
                anchor.hidden = true;
                return;
            }

            anchor.hidden = false;
            anchor.setAttribute("href", releaseNotesUrl);
        });

        root.querySelectorAll("[data-dtnt-version]").forEach(node => {
            node.textContent = version;
        });

        root.querySelectorAll("[data-dtnt-sha256]").forEach(node => {
            node.textContent = sha256;
        });

        root.querySelectorAll("[data-dtnt-hash-details]").forEach(node => {
            node.hidden = !sha256;
        });

        root.querySelectorAll("[data-dtnt-install-note]").forEach(node => {
            node.textContent = installNote;
        });

        root.querySelectorAll("[data-dtnt-install-detail]").forEach(node => {
            node.textContent = installDetail;
        });

        root.querySelectorAll("[data-dtnt-store-status]").forEach(node => {
            node.textContent = storeStatus;
        });

        root.querySelectorAll("[data-dtnt-installer-row]").forEach(node => {
            node.hidden = !installerPublicReady;
        });

        root.querySelectorAll("[data-dtnt-store-row]").forEach(node => {
            node.hidden = false;
        });

        root.querySelectorAll("[data-dtnt-portable-row]").forEach(node => {
            node.hidden = !freeDownloadUrl;
        });

        instrumentLinks(root, release);

        return release;
    }

    function hydrateSupportEmail(root = document) {
        const mailto = `mailto:${config.supportEmail}`;
        root.querySelectorAll("[data-dtnt-support-email]").forEach(anchor => {
            anchor.textContent = config.supportEmail;
            anchor.setAttribute("href", mailto);
        });
    }

    function createSupportMailto(subject, body = "") {
        const parts = [`mailto:${config.supportEmail}`];
        const query = new URLSearchParams();
        if (subject) {
            query.set("subject", subject);
        }

        if (body) {
            query.set("body", body);
        }

        const queryString = query.toString();
        if (queryString) {
            parts.push(`?${queryString}`);
        }

        return parts.join("");
    }

    function checkoutIsConfigured() {
        return typeof config.checkoutUrl === "string" && config.checkoutUrl.trim().length > 0;
    }

    function checkoutIsLive() {
        return checkoutIsConfigured() && config.checkoutMode === "live";
    }

    function absoluteUrl(path) {
        return new URL(path, window.location.origin).toString();
    }

    function fulfillmentStatusIsConfigured() {
        return Boolean(resolveFulfillmentApiBaseUrl())
            || (typeof config.orderStatusBasePath === "string"
                && config.orderStatusBasePath.trim().length > 0);
    }

    function resolveFulfillmentApiBaseUrl() {
        if (typeof config.fulfillmentApiBaseUrl !== "string") {
            return "";
        }

        return config.fulfillmentApiBaseUrl.trim().replace(/\/+$/, "");
    }

    function resolveOrderStatusUrl(sessionId) {
        const fulfillmentApiBaseUrl = resolveFulfillmentApiBaseUrl();
        if (fulfillmentApiBaseUrl) {
            return `${fulfillmentApiBaseUrl}/api/checkout/${encodeURIComponent(sessionId)}/status`;
        }

        const basePath = config.orderStatusBasePath.replace(/\/+$/, "");
        return absoluteUrl(`${basePath}/${encodeURIComponent(sessionId)}.json`);
    }

    window.DTNTCommerce = {
        config,
        loadLatestRelease,
        hydrateLatestRelease,
        hydrateSupportEmail,
        instrumentLinks,
        trackEvent,
        createSupportMailto,
        checkoutIsConfigured,
        checkoutIsLive,
        absoluteUrl,
        fulfillmentStatusIsConfigured,
        resolveOrderStatusUrl
    };
})();
