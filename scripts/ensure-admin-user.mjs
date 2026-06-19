import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ADMIN_EMAIL = "test1.email@test.com";
const ADMIN_PASSWORD = "test1234";

function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

async function findUserByEmail(supabase, email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );
    if (match) return match;

    if (data.users.length < 1000) break;
    page += 1;
  }
  return null;
}

async function main() {
  loadEnvFile();

  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error("Missing VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let authUser = await findUserByEmail(supabase, ADMIN_EMAIL);

  if (!authUser) {
    console.log(`Creating auth user: ${ADMIN_EMAIL}`);
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    authUser = data.user;
    console.log(`Created auth user with id: ${authUser.id}`);
  } else {
    console.log(`Auth user already exists: ${authUser.id}`);
    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (updateError) {
      console.warn(`Could not update password: ${updateError.message}`);
    } else {
      console.log("Password synced to requested value.");
    }
  }

  const { data: adminRow, error: adminError } = await supabase
    .from("admin_users")
    .upsert(
      {
        user_id: authUser.id,
        email: ADMIN_EMAIL.toLowerCase(),
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (adminError) throw adminError;

  console.log("Admin access granted in admin_users:");
  console.log(JSON.stringify(adminRow, null, 2));
  console.log("\nYou can sign in at /admin/login with:");
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
