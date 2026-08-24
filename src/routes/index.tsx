import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Wedding Invitations — Ilyas Family" },
      {
        name: "description",
        content:
          "Host dashboard for the wedding ceremony of Sharrafuth Najiullah and Safiyya Ilyas.",
      },
      { property: "og:title", content: "Wedding Invitations — Ilyas Family" },
      {
        property: "og:description",
        content: "Manage invitees, RSVPs and WhatsApp sharing in one place.",
      },
    ],
  }),
  component: () => null,
});
