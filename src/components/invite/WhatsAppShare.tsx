import { whatsappMessage } from "@/lib/event";

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor">
      <path d="M16 3C8.8 3 3 8.8 3 16c0 2.3.6 4.5 1.7 6.4L3 29l6.8-1.8A13 13 0 1 0 16 3zm0 23.6c-2.1 0-4.1-.6-5.9-1.6l-.4-.2-4 1 1.1-3.9-.3-.4A10.6 10.6 0 1 1 16 26.6zm5.9-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1a8.6 8.6 0 0 1-4.3-3.7c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.6l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-1.3 1.4-1.2 3.2.1 5.2a13 13 0 0 0 5.4 4.9c2 .8 2.8.9 3.8.8.6-.1 1.9-.8 2.2-1.6s.3-1.4.2-1.5-.3-.2-.5-.3z" />
    </svg>
  );
}

export function WhatsAppShare({ name, slug }: { name: string; slug: string }) {
  const share = () => {
    const text = encodeURIComponent(whatsappMessage(name, slug));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <button
      onClick={share}
      className="font-label flex w-full items-center justify-center gap-3 rounded-sm px-6 py-4 text-[11px] text-white shadow-lg transition-transform hover:-translate-y-0.5"
      style={{
        background: "linear-gradient(135deg, #25d366 0%, #128c7e 100%)",
      }}
    >
      <WhatsAppIcon className="h-5 w-5" />
      Share this invitation
    </button>
  );
}
