import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../analytics.js", import.meta.url), "utf8");
const pref = (analytics, advertising, savedAt = Date.now()) =>
    JSON.stringify({ version: 1, savedAt, analytics, advertising });

function page({ url = "https://dt-nt.com/?utm_source=search", stored = {}, gpc = false, brokenStorage = false } = {}) {
    const data = new Map(Object.entries(stored));
    const reads = [], writes = [], scripts = [], nodes = [], documentEvents = {}, windowEvents = {};
    let reloads = 0;
    function node(tag) {
        const value = { tag, children: [], listeners: {}, checked: false,
            appendChild(child) { this.children.push(child); if (child.tag === "script") scripts.push(child); return child; },
            setAttribute(key, val) { this[key] = val; },
            addEventListener(name, fn) { this.listeners[name] = fn; },
            focus() { this.focused = true; }
        };
        nodes.push(value); return value;
    }
    const document = {
        title: "DTNT", referrer: "https://example.com/path?private=1", cookie: "",
        readyState: "complete", head: node("head"), body: node("body"),
        createElement: node, createTextNode: text => ({ text }),
        addEventListener(name, callback) { documentEvents[name] = callback; }
    };
    const location = new URL(url);
    location.reload = () => { reloads++; };
    const window = {
        location, navigator: { globalPrivacyControl: gpc },
        DTNTAnalyticsConfig: { gaMeasurementId: "G-TEST", microsoftUetTagId: "123", gtmContainerId: "" },
        localStorage: {
            get length() { return data.size; },
            key(i) { return [...data.keys()][i]; },
            getItem(key) { if (brokenStorage) throw Error("denied"); reads.push(key); return data.get(key) ?? null; },
            setItem(key, value) { if (brokenStorage) throw Error("denied"); writes.push(key); data.set(key, value); },
            removeItem(key) { if (brokenStorage) throw Error("denied"); data.delete(key); }
        },
        addEventListener(name, callback) { windowEvents[name] = callback; }
    };
    vm.runInNewContext(source, { window, document, URL, URLSearchParams, Date, JSON, Number, String });
    return { window, document, data, reads, writes, scripts, nodes, documentEvents, windowEvents,
        api: window.DTNTAnalytics, get reloads() { return reloads; },
        click(text) { const button = nodes.find(n => n.tag === "button" && n.textContent === text); assert.ok(button, text); button.listeners.click(); }
    };
}

test("no trackers, attribution reads/writes or event queue before explicit consent", () => {
    const p = page();
    p.api.push("before_choice", { email: "private@example.com" });
    p.api.loadGtag(); p.api.loadMicrosoftUet(); p.api.loadGtm();
    p.documentEvents.click({ target: null });
    assert.equal(p.scripts.length, 0);
    assert.ok(!p.reads.includes("dtnt_attribution"));
    assert.ok(!p.writes.includes("dtnt_attribution"));
    assert.equal(p.window.dataLayer, undefined);
    assert.equal(p.window.uetq, undefined);
    assert.equal(p.nodes.filter(n => n.tag === "input").every(n => !n.checked), true);
});

test("reject is persistent and checkout APIs remain available", () => {
    const p = page();
    p.click("Reject optional");
    assert.equal(p.scripts.length, 0);
    const next = page({ stored: Object.fromEntries(p.data) });
    next.api.push("dtnt_buy_click");
    assert.equal(next.scripts.length, 0);
    assert.equal(typeof next.api.push, "function");
});

test("analytics-only consent loads Google but no advertising", () => {
    const p = page();
    p.api.setPreferences({ analytics: true, advertising: false });
    assert.equal(p.scripts.length, 1);
    assert.match(p.scripts[0].src, /googletagmanager/);
    assert.equal(p.window.uetq, undefined);
    assert.ok(p.writes.includes("dtnt_attribution"));
    assert.ok(!JSON.stringify(p.window.dataLayer).includes("before_choice"));
});

test("advertising-only consent loads UET with consent but no Google", () => {
    const p = page();
    p.api.setPreferences({ analytics: false, advertising: true });
    assert.equal(p.scripts.length, 1);
    assert.match(p.scripts[0].src, /bat\.bing\.com/);
    assert.equal(p.window.dataLayer, undefined);
    assert.ok(JSON.stringify(p.window.uetq).includes('"ad_storage":"granted"'));
});

test("accept all permits both purposes; saved preference restores them", () => {
    const p = page();
    p.click("Accept all");
    assert.equal(p.scripts.length, 2);
    const next = page({ stored: Object.fromEntries(p.data) });
    assert.equal(next.scripts.length, 2);
    assert.equal(next.nodes.find(n => n.tag === "section").hidden, true);
});

test("GPC overrides previously granted and newly requested consent", () => {
    const p = page({ stored: { dtnt_privacy_v1: pref(true, true) }, gpc: true });
    p.api.setPreferences({ analytics: true, advertising: true });
    p.api.push("any");
    assert.equal(p.scripts.length, 0);
    assert.ok(!p.writes.includes("dtnt_attribution"));
    assert.ok(p.nodes.filter(n => n.tag === "input").every(n => n.disabled));
});

for (const path of ["/success/?session_id=cs_secret", "/activation/", "/cancel/",
    "/?email=private", "/?token=private", "/?checkout_session_id=private", "/#activation_code=private"]) {
    test("sensitive page excludes all tracking: " + path, () => {
        const p = page({ url: "https://dt-nt.com" + path, stored: { dtnt_privacy_v1: pref(true, true) } });
        p.api.setPreferences({ analytics: true, advertising: true });
        p.api.push("purchase", { value: 59 });
        assert.equal(p.scripts.length, 0);
        assert.ok(!p.writes.includes("dtnt_attribution"));
        assert.equal(p.window.dataLayer, undefined);
    });
}

test("withdrawal clears attribution, disables existing tags and reloads", () => {
    const p = page();
    p.click("Accept all");
    p.api.setPreferences({ analytics: false, advertising: false });
    assert.equal(p.reloads, 1);
    assert.equal(p.data.has("dtnt_attribution"), false);
    assert.equal(p.window["ga-disable-G-TEST"], true);
    const next = page({ stored: Object.fromEntries(p.data) });
    assert.equal(next.scripts.length, 0);
});

test("category withdrawal reloads even while the other purpose stays granted", () => {
    const p = page();
    p.click("Accept all");
    p.api.setPreferences({ analytics: true, advertising: false });
    assert.equal(p.reloads, 1);
    const next = page({ stored: Object.fromEntries(p.data) });
    assert.equal(next.scripts.length, 1);
    assert.match(next.scripts[0].src, /googletagmanager/);
});

for (const value of ["invalid", pref(true, true, Date.now() - 181 * 86400000), pref(true, true, Date.now() + 86400000)]) {
    test("invalid, expired or future preference fails closed: " + value.slice(0, 35), () => {
        const p = page({ stored: { dtnt_privacy_v1: value } });
        assert.equal(p.scripts.length, 0);
    });
}

test("blocked browser storage never breaks the page or silently enables analytics", () => {
    const p = page({ brokenStorage: true });
    assert.equal(p.scripts.length, 0);
    p.click("Reject optional");
    assert.equal(p.scripts.length, 0);
});

test("payload strips credential fields and URL query strings/fragments", () => {
    const p = page();
    p.api.setPreferences({ analytics: true, advertising: false });
    p.api.push("outbound", { destination_url: "https://example.com/buy?session=PRIVATE#SECRET",
        email: "PERSONAL", token: "TOKEN" });
    const output = JSON.stringify(p.window.dataLayer);
    assert.ok(!output.includes("PRIVATE") && !output.includes("SECRET"));
    assert.ok(!output.includes("PERSONAL") && !output.includes("TOKEN"));
    assert.ok(!output.includes("private=1"));
});

test("changed consent in another tab reloads current page", () => {
    const p = page({ stored: { dtnt_privacy_v1: pref(true, true) } });
    p.data.set("dtnt_privacy_v1", pref(false, false));
    p.windowEvents.storage({ key: "dtnt_privacy_v1" });
    assert.equal(p.reloads, 1);
});

test("privacy choices can be reopened and saved through visible controls", () => {
    const p = page();
    p.click("Reject optional");
    p.click("Privacy choices");
    assert.equal(p.nodes.find(n => n.tag === "section").hidden, false);
    p.nodes.filter(n => n.tag === "input")[0].checked = true;
    p.click("Save choices");
    assert.equal(p.scripts.length, 1);
});
