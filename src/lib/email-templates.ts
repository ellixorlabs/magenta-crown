import type { TransactionalEmailEvent } from "@/lib/transactional-email-queue";

/** Plain HTML fragments for transactional mail — consumer replaces tokens at send time. */
export function transactionalEmailTemplate(
  event: TransactionalEmailEvent,
  vars: Record<string, string | number | undefined | null>
): { subject: string; html: string } {
  const ref = String(vars.publicOrderRef ?? vars.orderId ?? "your order");
  const brand = "Magenta Crown";

  switch (event) {
    case "ORDER_PLACED":
      return {
        subject: `We received ${ref} — ${brand}`,
        html: `<p>Hi ${vars.name ?? ""},</p><p>Your order <strong>${ref}</strong> is confirmed. We will notify you when it ships.</p><p>— ${brand}</p>`
      };
    case "PAYMENT_SUCCESS":
      return {
        subject: `Payment received for ${ref} — ${brand}`,
        html: `<p>Hi ${vars.name ?? ""},</p><p>Payment for <strong>${ref}</strong> was received. Thank you.</p><p>— ${brand}</p>`
      };
    case "ORDER_SHIPPED":
      return {
        subject: `${ref} has shipped — ${brand}`,
        html: `<p>Hi ${vars.name ?? ""},</p><p>Order <strong>${ref}</strong> is on the way.</p><p>— ${brand}</p>`
      };
    case "ORDER_DELIVERED":
      return {
        subject: `${ref} delivered — ${brand}`,
        html: `<p>Hi ${vars.name ?? ""},</p><p>Order <strong>${ref}</strong> shows as delivered. We hope you love it.</p><p>— ${brand}</p>`
      };
    case "RETURN_APPROVED":
      return {
        subject: `Return approved — ${brand}`,
        html: `<p>Hi ${vars.name ?? ""},</p><p>Your return for <strong>${ref}</strong> was approved. Follow the instructions in your account.</p><p>— ${brand}</p>`
      };
    case "REFUND_PROCESSED":
      return {
        subject: `Refund processed — ${brand}`,
        html: `<p>Hi ${vars.name ?? ""},</p><p>A refund related to <strong>${ref}</strong> has been processed.</p><p>— ${brand}</p>`
      };
    default:
      return { subject: `${brand} update`, html: `<p>Update regarding ${ref}.</p>` };
  }
}
