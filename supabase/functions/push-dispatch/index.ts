import { createClient } from "npm:@supabase/supabase-js@2.105.0";
import webpush from "npm:web-push@3.6.7";
const labels: Record<string, string> = {
  push_test:
    "Les notifications ElecWorkshop Plans fonctionnent sur cet appareil.",
  correction_schema: "Un schéma corrigé t’attend.",
  correction_feedback: "Le référent a répondu à tes corrections.",
  revision_published: "Une nouvelle révision officielle est disponible.",
};
Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const nonce = request.headers.get("x-push-nonce"),
    stamp = request.headers.get("x-push-timestamp"),
    signature = request.headers.get("x-push-signature");
  if (
    !nonce ||
    !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(nonce) ||
    !stamp ||
    !/^[0-9]{10}$/.test(stamp) ||
    !signature ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    return new Response(null, { status: 401 });
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await admin.rpc("push_claim", {
    p_nonce: nonce,
    p_timestamp: Number(stamp),
    p_signature: signature,
  });
  if (error) {
    console.error("Push claim", error.code);
    return new Response(null, { status: error.code === "42501" ? 403 : 500 });
  }
  let sent = 0,
    retry = 0,
    expired = 0;
  for (let index = 0; index < data.jobs.length; index += 5) {
    await Promise.all(
      data.jobs
        .slice(index, index + 5)
        .map(
          async (job: {
            id: string;
            endpoint: string;
            keys: { p256dh: string; auth: string };
            kind: string;
            url: string;
            notice: string;
          }) => {
            try {
              const details = webpush.generateRequestDetails(
                { endpoint: job.endpoint, keys: job.keys },
                JSON.stringify({
                  title: "ElecWorkshop Plans",
                  body: labels[job.kind] || "Nouvelle notification.",
                  url: job.url,
                  tag: job.notice,
                }),
                {
                  TTL: 3600,
                  urgency: "normal",
                  vapidDetails: {
                    subject:
                      "https://cwikalexandrecaille-eng.github.io/ElecWorkshop-Plans/",
                    publicKey: data.publicKey,
                    privateKey: data.privateKey,
                  },
                },
              );
              const response = await fetch(details.endpoint, {
                method: details.method,
                headers: details.headers,
                body: details.body,
                redirect: "error",
                signal: AbortSignal.timeout(12000),
              });
              await response.body?.cancel();
              const gone = [404, 410].includes(response.status);
              if (response.ok || gone) {
                const done = await admin.rpc("push_finish", {
                  p_id: job.id,
                  p_gone: gone,
                });
                if (done.error) {
                  retry++;
                  return;
                }
                if (gone) expired++;
                else sent++;
              } else {
                retry++;
                console.error("Push service status", response.status);
              }
            } catch {
              retry++;
              console.error("Push delivery will retry");
            }
          },
        ),
    );
  }
  return Response.json({ sent, retry, expired }, { status: retry ? 503 : 200 });
});
