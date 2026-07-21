import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDailyClosingWhatsappUrl } from "@/features/admin/reports/build-daily-closing-whatsapp-url";

describe("buildDailyClosingWhatsappUrl", () => {
  it("prefixes wa.me without a destination number", () => {
    const url = buildDailyClosingWhatsappUrl("olá mundo");
    assert.equal(url.startsWith("https://wa.me/?text="), true);
    assert.equal(url.includes("wa.me/55"), false);
    assert.equal(/wa\.me\/\d+/.test(url), false);
  });

  it("round-trips spaces, markdown, accents, emoji and newlines", () => {
    const text =
      "🔥 *FECHAMENTO*\nData: 21/07/2026\n#NB1234\nAção — café\nlinha 2\n";
    const url = buildDailyClosingWhatsappUrl(text);
    const encoded = url.slice("https://wa.me/?text=".length);
    assert.equal(decodeURIComponent(encoded), text);
    assert.equal(encoded.includes(" "), false);
    assert.equal(encoded.includes("\n"), false);
    assert.equal(encoded.includes("#"), false);
    assert.match(encoded, /%/);
  });
});

