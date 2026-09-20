import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const buyPage = fs.readFileSync(new URL("../buy/index.html", import.meta.url), "utf8");
const legalPage = fs.readFileSync(new URL("../legal/index.html", import.meta.url), "utf8");

test("checkout states the online revalidation and service-unavailable grace period", () => {
    assert.match(buyPage, /Online activation is required/);
    assert.match(buyPage, /DTNT rechecks Pro when it starts/);
    assert.match(buyPage, /up to 14 days after the last successful check/);
    assert.match(legalPage, /up to fourteen days after the last successful validation/);
});

test("checkout does not imply activation alone removes statutory refund rights", () => {
    assert.match(buyPage, /Downloading or activating DTNT does not by itself waive any statutory refund or cancellation rights/);
    assert.match(buyPage, /href="\/legal\/#refund"/);
    assert.match(legalPage, /Downloading, receiving an activation code, or using the software does not by itself waive a statutory withdrawal or cancellation right/);
});
