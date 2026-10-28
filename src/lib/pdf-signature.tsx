import React from "react";
import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";
import { existsSync, readFileSync } from "fs";
import path from "path";

// One signature block for every PDF report.
// Power Transformer signature format: uppercase label, stamp (when available),
// a full-width rule, the name under it and an optional designation line.

const sigStyles = StyleSheet.create({
  footer: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
  },
  column: { flexGrow: 1, flexBasis: 0 },
  label: { fontSize: 6.5, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 },
  stampSlot: { height: 44, marginTop: 2, marginBottom: 2, justifyContent: "flex-end" },
  stamp: { width: 54, height: 44, objectFit: "contain" },
  rule: { borderTopWidth: 0.6, borderTopColor: "#94a3b8", marginTop: 2 },
  name: { fontSize: 8.5, marginTop: 3, color: "#0f172a" },
  designation: { fontSize: 6.5, color: "#64748b", marginTop: 1 },
  submitted: { fontSize: 7, color: "#64748b", marginTop: 6 },
});

const stampCache = new Map<string, Buffer | null>();

export function loadStampFile(publicUrl: string | null | undefined): Buffer | null {
  if (!publicUrl) return null;
  if (stampCache.has(publicUrl)) return stampCache.get(publicUrl) ?? null;
  const file = path.join(process.cwd(), "public", publicUrl.replace(/^\//, ""));
  const buffer = existsSync(file) ? readFileSync(file) : null;
  stampCache.set(publicUrl, buffer);
  return buffer;
}

export type SignatureColumn = {
  label: string;
  name?: string | null;
  designation?: string | null;
  stamp?: Buffer | null;
};

export function SignatureBlock({
  columns,
  submittedBy,
}: {
  columns: SignatureColumn[];
  submittedBy?: string | null;
}) {
  // If any column carries a stamp, reserve the same vertical slot on every
  // column so all signature rules stay on one line.
  const reserveStamp = columns.some((c) => c.stamp);

  return (
    <>
      <View style={sigStyles.footer} wrap={false}>
        {columns.map((c) => (
          <View key={c.label} style={sigStyles.column}>
            <Text style={sigStyles.label}>{c.label}</Text>
            {reserveStamp ? (
              <View style={sigStyles.stampSlot}>{c.stamp ? <Image src={c.stamp} style={sigStyles.stamp} /> : null}</View>
            ) : null}
            <View style={sigStyles.rule} />
            <Text style={sigStyles.name}>{c.name?.trim() ? c.name : " "}</Text>
            {c.designation?.trim() ? <Text style={sigStyles.designation}>{c.designation}</Text> : null}
          </View>
        ))}
      </View>
      {submittedBy?.trim() ? <Text style={sigStyles.submitted}>Submitted by: {submittedBy}</Text> : null}
    </>
  );
}
