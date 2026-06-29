import { notFound } from "next/navigation";
import { getSession } from "@/auth";
import { getClaimDetail } from "@/modules/claims/interface";
import { ClaimDetail } from "./claim-detail";

export default async function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSession();
  if (!user) notFound();

  const claim = await getClaimDetail(id, user);
  if (!claim) notFound();

  return <ClaimDetail initialClaim={claim} claimId={id} />;
}
