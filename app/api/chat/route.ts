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
    (q.includes("return") || q.includes("refund")) && doc.id === "returns" ||
    (q.includes("ship") || q.includes("deliver")) && doc.id === "shipping" ||
    (q.includes("pay") || q.includes("card") || q.includes("klarna")) && doc.id === "payment" ||
    (q.includes("account") || q.includes("password")) && doc.id === "account" ||
    (q.includes("product") || q.includes("warranty")) && doc.id === "products"
  );
  return (relevant.length > 0 ? relevant : knowledgeBase.slice(0, 2)).map(d => d.content).join("\n\n");
}

const demoResponses: Record<string, string> = {
  return: "Our returns policy allows returns within **30 days** of purchase. Items must be unused and in original packaging. Refunds are processed in **5–7 business days**. Digital products are non-refundable.\n\nWould you like help starting a return?",
  ship: "We offer:\n• **Standard delivery** (3–5 days) — £3.99\n• **Express delivery** (1–2 days) — £8.99\n• **Free standard shipping** on orders over £50\n• International shipping to 40+ countries",
  pay: "We accept **Visa, Mastercard, Amex, PayPal, Apple Pay, Google Pay**, and **Klarna** buy-now-pay-later. All transactions use 256-bit SSL encryption.",
  product: "All our products come with a **minimum 1-year warranty**. We specialise in premium home office equipment — monitors, keyboards, mice, desk accessories, and cable management.",
  default: "Hi! I'm the HomeOffice Co. support assistant. I can help with **returns**, **shipping**, **payments**, and **product** questions.\n\n*This is a RAG demo — try asking about returns or shipping.*",
};

function getDemoResponse(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("return") || m.includes("refund")) return demoResponses.return;
  if (m.includes("ship") || m.includes("deliver")) return demoResponses.ship;
  if (m.includes("pay") || m.includes("card") || m.includes("klarna")) return demoResponses.pay;
  if (m.includes("product") || m.includes("warranty")) return demoResponses.product;
  return demoResponses.default;
}

function streamText(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Stream word by word with a small delay
      const words = text.split(/(\s+)/);
      for (const chunk of words) {
        controller.enqueue(encoder.encode(chunk));
        if (chunk.trim()) await new Promise(r => setTimeout(r, 25));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" },
  });
}

export async function POST(req: Request) {
  const { messages } = await req.json();
  const lastMessage: string = messages[messages.length - 1]?.content ?? "";
  const context = retrieveContext(lastMessage);

  if (!process.env.OPENAI_API_KEY) {
    return streamText(getDemoResponse(lastMessage));
  }

  // Real OpenAI path
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      stream: true,
      messages: [
        {
          role: "system",
          content: `You are a helpful customer support assistant for HomeOffice Co.\n\nContext:\n${context}\n\nAnswer based on context only. Be concise and friendly.`,
        },
        ...messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
      ],
    }),
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body!.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n").filter(l => l.startsWith("data: "));
        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") { controller.close(); return; }
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          } catch { /* skip malformed chunks */ }
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
