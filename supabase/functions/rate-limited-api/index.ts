import { Redis } from "https://esm.sh/@upstash/redis@1.22.0";
import { Ratelimit } from "https://esm.sh/@upstash/ratelimit@0.4.3";

// 1. Conecta ao banco Redis da Upstash
const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});

// 2. Configura a regra: máximo de 5 requisições a cada 10 segundos por IP
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "10 s"),
});

// 3. Servidor nativo do Deno
Deno.serve(async (req: Request) => {
  // Captura o IP do cliente
  const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";

  // Consulta o contador no Redis
  const { success, limit, remaining } = await ratelimit.limit(clientIp);

  if (!success) {
    return new Response(
      JSON.stringify({
        error: "Limite de requisições excedido.",
        message: "Muitas solicitações enviadas. Aguarde alguns segundos.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
        },
      }
    );
  }

  return new Response(
    JSON.stringify({ success: true, message: "Requisição autorizada e processada com sucesso!" }),
    { headers: { "Content-Type": "application/json" } }
  );
});