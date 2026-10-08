import type { EmailBlock, EmailBlockType, EmailDesign } from "@/types/message-template";

let seq = 0;
export const blockId = () => `b${Date.now().toString(36)}${(++seq).toString(36)}`;

/** Placeholders agents can drop into text; filled in when the email is sent. */
export const EMAIL_VARIABLES = ["customer_name", "ticket_number", "agent_name"] as const;

export function newBlock(type: EmailBlockType): EmailBlock {
  const id = blockId();
  switch (type) {
    case "heading":
      return { id, type, text: "Your heading", level: 2, align: "left" };
    case "text":
      return { id, type, text: "Write your message here. Use **bold**, *italic* and [links](https://uparima.lk).", align: "left" };
    case "image":
      return { id, type, url: "", alt: "", width: 100, href: "", align: "center" };
    case "button":
      return { id, type, label: "Open Uparima", url: "https://uparima.lk", align: "center" };
    case "divider":
      return { id, type };
    case "spacer":
      return { id, type, height: 24 };
  }
}

export function defaultDesign(): EmailDesign {
  return {
    settings: {
      font: "sans",
      accent: "#6d28d9",
      background: "#f3f4f6",
      card: "#ffffff",
      text: "#1f2937",
      preheader: "",
      footer: "Uparima Support · You are receiving this because you contacted us.",
    },
    blocks: [
      { id: blockId(), type: "heading", text: "Hi {{customer_name}},", level: 2, align: "left" },
      {
        id: blockId(),
        type: "text",
        text: "Thanks for reaching out to **Uparima Support**. We have received your request and a member of our team will get back to you shortly.\n\nYour ticket number is **{{ticket_number}}**.",
        align: "left",
      },
      { id: blockId(), type: "button", label: "Visit Uparima", url: "https://uparima.lk", align: "left" },
      { id: blockId(), type: "text", text: "Best regards,\n{{agent_name}}", align: "left" },
    ],
  };
}
