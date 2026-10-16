"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { NewTestSheet } from "@/components/mobile/new-test-sheet";
import type { ReactNode } from "react";

type Site = { id: string; name: string };

export function DraftNewTest({ sites, children }: { sites: Site[]; children?: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const newType = searchParams.get("new");

  return (
    <>
      {children}
      <NewTestSheet
        open={Boolean(newType)}
        onClose={() => router.replace("/m/drafts")}
        initialType={newType ?? undefined}
        sites={sites}
      />
    </>
  );
}