"use client";

import Link from "next/link";
import {
  addSupportInquiryNote,
  assignSupportInquiry,
  deleteSupportInquiry,
  setSupportInquiryStatus
} from "@/app/admin/(dashboard)/support/actions";
import { SaveSubmitButton } from "@/components/ui/SaveSubmitButton";

export type SupportInquiryNoteRow = {
  id: string;
  body: string;
  staffName: string;
  staffUserId: string | null;
  createdAt: string;
};

export type SupportInquiryDetailRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  assignedStaffId: string | null;
  assignedStaffName: string | null;
  assignedAt: string | null;
};

export function SupportInquiryDetail({
  inquiry,
  notes
}: {
  inquiry: SupportInquiryDetailRow;
  notes: SupportInquiryNoteRow[];
}) {
  return (
    <div className="space-y-6">
      <Link href="/admin/support" className="text-sm text-crown-800 underline">
        ← All inquiries
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">{inquiry.name}</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Opened {new Date(inquiry.createdAt).toLocaleString()}
            {inquiry.resolvedAt ? ` · Resolved ${new Date(inquiry.resolvedAt).toLocaleString()}` : ""}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
            inquiry.status === "RESOLVED" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
          }`}
        >
          {inquiry.status}
        </span>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Customer</h3>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Email</dt>
            <dd>
              <a href={`mailto:${inquiry.email}`} className="font-medium text-crown-800 underline">
                {inquiry.email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Phone</dt>
            <dd className="font-medium text-zinc-900">{inquiry.phone ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">Assigned staff</dt>
            <dd className="font-medium text-zinc-900">
              {inquiry.assignedStaffName ? (
                <>
                  {inquiry.assignedStaffName}
                  {inquiry.assignedAt ? (
                    <span className="ml-1 font-normal text-zinc-500">
                      · {new Date(inquiry.assignedAt).toLocaleString()}
                    </span>
                  ) : null}
                </>
              ) : (
                "Unassigned"
              )}
            </dd>
          </div>
        </dl>
        <h3 className="mt-5 text-xs font-bold uppercase tracking-wide text-zinc-500">Original message</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{inquiry.message}</p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Internal notes</h3>
        <ul className="mt-4 space-y-3">
          {notes.length === 0 ? (
            <li className="text-sm text-zinc-500">No notes yet.</li>
          ) : (
            notes.map((n) => (
              <li key={n.id} className="rounded-xl bg-zinc-50 px-4 py-3 text-sm">
                <p className="whitespace-pre-wrap text-zinc-800">{n.body}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  {n.staffName} · {new Date(n.createdAt).toLocaleString()}
                </p>
              </li>
            ))
          )}
        </ul>
        <form action={addSupportInquiryNote} className="mt-4 space-y-3">
          <input type="hidden" name="inquiryId" value={inquiry.id} />
          <textarea
            name="body"
            rows={3}
            required
            placeholder="Add an internal note…"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <SaveSubmitButton
            idleLabel="Add note"
            savingLabel="Saving…"
            className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black"
          />
        </form>
      </section>

      <div className="flex flex-wrap gap-2">
        <form action={assignSupportInquiry}>
          <input type="hidden" name="id" value={inquiry.id} />
          <SaveSubmitButton
            idleLabel="Assign to me"
            savingLabel="Assigning…"
            className="rounded-full bg-crown-800 px-4 py-2 text-xs font-semibold text-white hover:bg-crown-900"
          />
        </form>
        {inquiry.status !== "RESOLVED" ? (
          <form action={setSupportInquiryStatus}>
            <input type="hidden" name="id" value={inquiry.id} />
            <input type="hidden" name="status" value="RESOLVED" />
            <SaveSubmitButton
              idleLabel="Mark resolved"
              savingLabel="Updating…"
              className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            />
          </form>
        ) : (
          <form action={setSupportInquiryStatus}>
            <input type="hidden" name="id" value={inquiry.id} />
            <input type="hidden" name="status" value="OPEN" />
            <SaveSubmitButton
              idleLabel="Reopen"
              savingLabel="Updating…"
              className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-200"
            />
          </form>
        )}
        <form action={deleteSupportInquiry}>
          <input type="hidden" name="id" value={inquiry.id} />
          <SaveSubmitButton
            idleLabel="Delete"
            savingLabel="Deleting…"
            className="rounded-full bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-800 ring-1 ring-rose-200 hover:bg-rose-100"
          />
        </form>
      </div>
    </div>
  );
}
