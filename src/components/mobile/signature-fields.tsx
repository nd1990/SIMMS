"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { withBasePath } from "@/lib/employee-stamps";
import { stampForName } from "@/lib/employee-stamps";

type Employee = { id: string; name: string; stampPath: string | null };

export type SignatureValues = { testedBy: string; witnessBy: string };

// Single signature block for every report form (same layout as the Power
// Transformer "Signatures" tab): pick the tester from the employee list, show
// their stamp, and type the witness name.
export function SignatureFields({
  values,
  onChange,
  title = "Tested By / Witness By",
  hint = "Shown on every sheet of the PDF report.",
}: {
  values: SignatureValues;
  onChange: (key: "testedBy" | "witnessBy", value: string) => void;
  title?: string | null;
  hint?: string | null;
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/employees")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load employees"))))
      .then((body: { data?: { id: string; name: string; stampPath?: string | null }[] }) => {
        if (cancelled || !Array.isArray(body.data)) return;
        const names = Array.from(
          new Map(
            body.data
              .filter((e) => e.name?.trim())
              .map((e) => [e.id, { id: e.id, name: e.name.trim(), stampPath: e.stampPath ?? null }])
          ).values()
        );
        setEmployees(names);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const stamp = stampForName(
    values.testedBy,
    employees.find((e) => e.name === values.testedBy)?.stampPath ?? null
  );

  return (
    <div className="space-y-2">
      {title ? (
        <div className="rounded-t-lg border border-b-0 border-slate-300 bg-teal-700 px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-white">
          {title}
        </div>
      ) : null}
      {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className="mb-1 block text-xs font-semibold text-slate-600">Tested By</Label>
          {employees.length > 0 ? (
            <Select value={values.testedBy} onChange={(e) => onChange("testedBy", e.target.value)}>
              <option value="" disabled>
                Select employee
              </option>
              {!employees.some((emp) => emp.name === values.testedBy) && values.testedBy ? (
                <option value={values.testedBy}>{values.testedBy}</option>
              ) : null}
              {employees.map((emp) => (
                <option key={emp.id} value={emp.name}>
                  {emp.name}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              value={values.testedBy}
              onChange={(e) => onChange("testedBy", e.target.value)}
              placeholder="Name / names"
            />
          )}
          {stamp ? (
            <img src={withBasePath(stamp)} alt="Stamp" className="mt-2 h-16 w-auto object-contain" />
          ) : null}
        </div>
        <div>
          <Label className="mb-1 block text-xs font-semibold text-slate-600">Witness By</Label>
          <Input
            value={values.witnessBy}
            onChange={(e) => onChange("witnessBy", e.target.value)}
            placeholder="Witness name / company"
          />
        </div>
      </div>
    </div>
  );
}
