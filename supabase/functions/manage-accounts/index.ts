import { createClient } from "npm:@supabase/supabase-js@2.105.0";

const roles = ["referent", "cableur", "terrain"];
const rights = ["folders", "upload", "annotate", "send", "review"];
const cors = {
  "Access-Control-Allow-Origin": "https://cwikalexandrecaille-eng.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

function reply(status: number, data: Record<string, unknown>) {
  return Response.json(data, { status, headers: cors });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return reply(405, { error: "Méthode non autorisée." });

  const token = request.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return reply(401, { error: "Reconnectez-vous pour gérer les comptes." });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return reply(503, { error: "Service de comptes indisponible." });

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const session = await admin.auth.getUser(token);
  if (session.error || !session.data.user) return reply(401, { error: "Session invalide ou expirée." });

  const actor = await admin.from("profiles").select("role,active").eq("id", session.data.user.id).maybeSingle();
  if (actor.error) return reply(503, { error: "Impossible de vérifier les droits du compte." });
  if (!actor.data?.active || actor.data.role !== "admin") {
    return reply(403, { error: "Gestion des comptes réservée à l’administrateur." });
  }

  let input;
  try { input = await request.json(); } catch {
    return reply(400, { error: "Formulaire illisible." });
  }
  if (!input || typeof input !== "object") return reply(400, { error: "Formulaire incomplet." });
  const name = typeof input.full_name === "string" ? input.full_name.trim() : "";
  const role = input.role;
  const permissions = input.permissions;
  if (!name || name.length > 100 || !roles.includes(role) || !Array.isArray(permissions) ||
      permissions.length > rights.length || !permissions.every((item) => rights.includes(item)) ||
      new Set(permissions).size !== permissions.length) {
    return reply(400, { error: "Vérifiez le nom, le profil et les droits sélectionnés." });
  }

  const profile = { full_name: name, role, permissions };
  if (input.action === "update") {
    if (typeof input.id !== "string" || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(input.id) ||
        typeof input.active !== "boolean") return reply(400, { error: "Compte ou état invalide." });
    const saved = await admin.from("profiles").update({ ...profile, active: input.active })
      .eq("id", input.id).in("role", roles).select("id").maybeSingle();
    if (saved.error) return reply(500, { error: "Les modifications du compte n’ont pas été enregistrées." });
    if (!saved.data) return reply(404, { error: "Ce compte ne peut pas être modifié ici." });
    return reply(200, { id: saved.data.id });
  }

  if (input.action !== "create") return reply(400, { error: "Action inconnue." });
  const username = typeof input.username === "string" ? input.username.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (!/^[a-z0-9._-]{3,40}$/.test(username) || password.length < 10 || new TextEncoder().encode(password).length > 72) {
    return reply(400, { error: "Utilisez un identifiant de 3 à 40 caractères et un mot de passe de 10 caractères minimum (72 octets maximum)." });
  }

  const created = await admin.auth.admin.createUser({
    email: username + "@elecworkshop.invalid",
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    const exists = ["email_exists", "user_already_exists"].includes(created.error?.code || "");
    return reply(exists ? 409 : 400, {
      error: exists ? "Cet identifiant est déjà utilisé." :
        created.error?.code === "weak_password" ? "Choisissez un mot de passe moins facile à deviner." :
        "Le compte n’a pas pu être créé. Vérifiez l’identifiant et le mot de passe.",
    });
  }

  const id = created.data.user.id;
  const saved = await admin.from("profiles").insert({ ...profile, id, username, active: true });
  if (saved.error) {
    const cleanup = await admin.auth.admin.deleteUser(id);
    if (cleanup.error) console.error("Account cleanup failed", id, cleanup.error.code);
    return reply(saved.error.code === "23505" ? 409 : 500, {
      error: saved.error.code === "23505" ? "Cet identifiant est déjà utilisé." :
        "Impossible d’enregistrer le profil du compte. Réessayez.",
    });
  }
  return reply(201, { id });
});
