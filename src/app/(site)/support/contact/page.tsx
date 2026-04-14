import { ContactForm } from "@/components/support/ContactForm";

export const metadata = {
  title: "Contact | Magenta Crown"
};

export default function ContactPage() {
  return (
    <main className="bg-[#f8f5f6] py-12">
      <div className="section-shell max-w-xl">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold text-zinc-900">Contact us</h1>
        <p className="mt-4 text-zinc-600">
          Email:{" "}
          <a href="mailto:care@magentacrown.com" className="text-crown-800 underline">
            care@magentacrown.com
          </a>
          <br />
          Phone: +91 80 1234 5678
          <br />
          WhatsApp:{" "}
          <a href="https://wa.me/918012345678" className="text-crown-800 underline" target="_blank" rel="noreferrer">
            +91 80 1234 5678
          </a>
        </p>
        <ContactForm />
      </div>
    </main>
  );
}
