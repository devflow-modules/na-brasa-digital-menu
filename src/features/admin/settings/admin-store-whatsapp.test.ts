import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatWhatsappForDisplay,
  getWhatsappInputStatus,
  normalizeWhatsappDigits,
  whatsappStatusMessage,
} from "@/features/admin/settings/admin-store-whatsapp";

describe("admin-store-whatsapp", () => {
  it("normalizes to digits only", () => {
    assert.equal(
      normalizeWhatsappDigits("+55 (13) 98109-1971"),
      "5513981091971",
    );
  });

  it("formats Brazilian numbers with country code for display", () => {
    assert.equal(
      formatWhatsappForDisplay("5513981091971"),
      "+55 (13) 98109-1971",
    );
  });

  it("formats local DDD numbers without inventing country code", () => {
    assert.equal(formatWhatsappForDisplay("13981091971"), "(13) 98109-1971");
  });

  it("reports incomplete and valid statuses", () => {
    assert.equal(getWhatsappInputStatus(""), "empty");
    assert.equal(getWhatsappInputStatus("55139"), "incomplete");
    assert.equal(getWhatsappInputStatus("5513981091971"), "valid");
    assert.equal(getWhatsappInputStatus("551398109197199"), "too_long");
  });

  it("exposes operator-facing status copy", () => {
    assert.match(
      whatsappStatusMessage("incomplete") ?? "",
      /incompleto|DDD|país/i,
    );
    assert.equal(whatsappStatusMessage("valid"), "Número válido");
  });
});
