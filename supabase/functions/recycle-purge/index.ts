import { createClient } from "npm:@supabase/supabase-js@2.105.0";

type Job = { id: string; kind: "file" | "account"; bucket: string | null; target: string };

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const nonce = request.headers.get("x-recycle-nonce");
  const timestamp = request.headers.get("x-recycle-timestamp");
  const signature = request.headers.get("x-recycle-signature");
  if (!nonce || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(nonce) ||
      !timestamp || !/^[0-9]{10}$/.test(timestamp) ||
      !signature || !/^[a-f0-9]{64}$/.test(signature)) return new Response(null, { status: 401 });

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return new Response(null, { status: 503 });

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const claim = await admin.rpc("recycle_purge_signed", {
    p_nonce: nonce, p_timestamp: Number(timestamp), p_signature: signature,
  });
  if (claim.error) {
    if (claim.error.code === "42501") return new Response(null, { status: 403 });
    console.error("Recycle batch failed", claim.error.code);
    return new Response(null, { status: 500 });
  }

  const jobs: Job[] = claim.data || [];
  let processed = 0;
  let retry = 0;
  for (let index = 0; index < jobs.length; index += 5) {
    await Promise.all(jobs.slice(index, index + 5).map(async (job) => {
      const result = job.kind === "account"
        ? await admin.auth.admin.deleteUser(job.target, true)
        : await admin.storage.from(job.bucket!).remove([job.target]);
      if (result.error && (job.kind !== "account" || !["user_not_found"].includes(result.error.code || ""))) {
        console.error("Recycle item will retry", job.id, result.error.message);
        retry++;
        return;
      }
      const finished = await admin.rpc("recycle_purge_finish", { p_id: job.id });
      if (finished.error) {
        console.error("Recycle completion will retry", job.id, finished.error.code);
        retry++;
        return;
      }
      processed++;
    }));
  }
  return Response.json({ processed, retry }, { status: retry ? 503 : 200 });
});
