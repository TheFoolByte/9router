import { Suspense } from "react";
import { CardSkeleton } from "@/shared/components/Loading";
import MonitorClient from "./components/MonitorClient";

export default function MonitorPage() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <MonitorClient />
    </Suspense>
  );
}
