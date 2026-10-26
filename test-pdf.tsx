import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { PowerTrDocument } from "./src/lib/power-tr-pdf";
import { buildPowerTrDefaultPayload } from "./src/lib/power-tr-types";

async function main() {
  const payload = buildPowerTrDefaultPayload();
  const doc = React.createElement(PowerTrDocument, {
    reportNumber: "TEST/001",
    companyName: "Test Co",
    payload,
    meta: { siteName: "Site A", testingDate: "2026-01-01", testedByName: "Tester" },
  } as any);
  const buf = await renderToBuffer(doc as any);
  console.log("PDF OK bytes=", buf.length);
}
main().catch((e) => {
  console.error("PDF FAIL:", e && e.stack ? e.stack : e);
  process.exit(1);
});
