import { notFound } from "next/navigation";
import { requireMerchAdmin } from "@/lib/admin-auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import {
  SupportInquiryDetail,
  type SupportInquiryDetailRow,
  type SupportInquiryNoteRow
} from "@/components/admin/SupportInquiryDetail";

export const metadata = { title: "Support inquiry | Admin" };

export default async function AdminSupportInquiryDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireMerchAdmin("/admin/support");
  const { id } = await params;

  const supabase = getSupabaseServiceRoleClient();
  const { data: inquiry, error } = await (supabase.from("SupportInquiry") as any)
    .select(
      "id,name,email,phone,message,status,createdAt,resolvedAt,assignedStaffId,assignedStaffName,assignedAt"
    )
    .eq("id", id)
    .maybeSingle();

  if (error && error.code !== "42P01") throw new Error(error.message);
  if (!inquiry) notFound();

  let notes: SupportInquiryNoteRow[] = [];
  const notesRes = await (supabase.from("SupportInquiryNote") as any)
    .select("id,body,staffName,staffUserId,createdAt")
    .eq("inquiryId", id)
    .order("createdAt", { ascending: true });
  if (!notesRes.error) {
    notes = (notesRes.data ?? []) as SupportInquiryNoteRow[];
  } else if (notesRes.error.code !== "42P01") {
    throw new Error(notesRes.error.message);
  }

  return <SupportInquiryDetail inquiry={inquiry as SupportInquiryDetailRow} notes={notes} />;
}
