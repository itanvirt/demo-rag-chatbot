import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

// Mock product knowledge base (simulates RAG retrieval)
const knowledgeBase = [
  { id: "returns", content: "Returns policy: Items can be returned within 30 days of purchase. Items must be unused and in original packaging. Refunds are processed within 5-7 business days. Digital products are non-refundable." },
  { id: "shipping", content: "Shipping: Standard delivery 3-5 business days (£3.99). Express delivery 1-2 business days (£8.99). Free standard shipping on orders over £50. International shipping available to 40+ countries." },
  { id: "payment", content: "Payment methods: Visa, Mastercard, Amex, PayPal, Apple Pay, Google Pay, and Klarna buy-now-pay-later. All transactions are secured with 256-bit SSL encryption." },
  { id: "account", content: "Account: Create an account to track orders, save addresses, and view order history. Password reset via email. Two-factor authentication available for security." },
  { id: "products", content: "Products: We sell premium home office equipment including monitors, keyboards, mice, desk accessories, and cable management solutions. All products come with a minimum 1-year warranty." },
];

function retrieveContext(query: string): string {
  const q = query.toLowerCase();
  const relevant = knowledgeBase.filter(doc =>
    q.includes("return") && doc.id === "returns" ||
    q.includes("ship") || q.includes("deliver") && doc.id === "shipping" ||
    q.includes("pay") || q.includes("card") && doc.id === "payment" ||
    q.includes("account") || q.includes("password") && doc.id === "account" ||
    q.includes("product") || q.includes("warranty") && doc.id === "products"
  );
  const docs = relevant.length > 0 ? relevant : knowledgeBase.slice(0, 2);
  return docs.map(d => d.content).join("\n\n");
}

const SYSTEM_PROMPT = (context: string) => `You are a helpful customer support assistant for HomeOffice Co., a premium home office equipment retailer.

Use the following retrieved knowledge base context to answer the user's question accurately:

--- RETRIEVED CONTEXT ---
${context}
--- END CONTEXT ---

Guidelines:
- Answer concisely and helpfully based on the context above
- If the answer isn't in the context, say so honestly and offer to escalate to a human agent
- Be friendly but professional
- Do not make up information not present in the context`;

// Demo responses when no OpenAI key is configured
const demoResponses: Record<string, string> = {
  default: "Hi! I'm the HomeOffice Co. support assistant. I can help with returns, shipping, payments, and product questions. What can I help you with today?\n\n*(Demo mode — connect an OpenAI API key for real AI responses)*",
  return: "Our **returns policy** allows returns within **30 days** of purchase. Items must be unused and in original packaging. Refunds are processed in **5-7 business days**. Digital products are non-refundable.\n\nWould you like help starting a return?",
  ship: "We offer:\n- **Standard delivery** (3-5 days) — £3.99\n- **Express delivery** (1-2 days) — £8.99\n- **Free standard shipping** on orders over £50\n- International shipping to 40+ countries\n\nAnything else I can help with?",
  pay: "We accept **Visa, Mastercard, Amex, PayPal, Apple Pay, Google Pay**, and **Klarna**. All transactions use 256-bit SSL encryption. Is there an issue with your payment?",
  product: "All our products come with a **minimum 1-year warranty**. We specialise in premium home office equipment — monitors, keyboards, mice, desk accessories, and cable management. What product are you asking about?",
};

function getDemoResponse(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("return") || m.includes("refund")) return demoResponses.return;
  if (m.includes("ship") || m.includes("deliver")) return demoResponses.ship;
  if (m.includes("pay") || m.includes("card") || m.includes("klarna")) return demoResponses.pay;
  if (m.includes("product") || m.includes("warranty")) return demoResponses.product;
  return demoResponses.default;
}

export async function POST(req: Request) {
  const { messages } = await req.json();
  // AI SDK v6: messages use parts[] not content string
  const lastMsg = messages[messages.length - 1];
  const lastMessage: string = Array.isArray(lastMsg?.parts)
    ? lastMsg.parts.filter((p: { type: string }) => p.type === "text").map((p: { text: string }) => p.text).join(" ")
    : (lastMsg?.content ?? "");
  const context = retrieveContext(lastMessage);

  // If no API key, stream a demo response
  if (!process.env.OPENAI_API_KEY) {
    const demoText = getDemoResponse(lastMessage);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const words = demoText.split(" ");
        for (const word of words) {
          controller.enqueue(encoder.encode(`0:"${word.replace(/"/g, '\\"')} "\n`));
          await new Promise(r => setTimeout(r, 30));
        }
        controller.enqueue(encoder.encode('d:{"finishReason":"stop"}\n'));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "X-Demo-Mode": "true" },
    });
  }

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: SYSTEM_PROMPT(context),
    messages,
  });

  return result.toTextStreamResponse();
}
