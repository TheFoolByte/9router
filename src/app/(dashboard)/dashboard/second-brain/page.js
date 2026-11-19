import { Suspense } from "react";
import { CardSkeleton } from "@/shared/components/Loading";
import SecondBrainClient from "./components/SecondBrainClient";

export default function SecondBrainPage() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <SecondBrainClient />
    </Suspense>
  );
}
