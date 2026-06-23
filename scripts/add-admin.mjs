import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

async function addAdmin() {
  loadEnvFile();

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const email = "primsurgicalclinic@gmail.com";
  const password = "test1234";

  console.log(`Creating user ${email}...`);

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let userId;

  if (authError) {
    if (authError.message.includes("already registered")) {
        console.log("User already exists in Auth, fetching id...");
        // find user
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
            console.error("Failed to list users:", listError);
            process.exit(1);
        }
        const existing = users.users.find(u => u.email === email);
        if (!existing) {
            console.error("User says registered but not found in list.");
            process.exit(1);
        }
        userId = existing.id;
    } else {
        console.error("Auth error:", authError);
        process.exit(1);
    }
  } else {
      userId = authData.user.id;
      console.log("Created auth user:", userId);
  }

  // 2. Insert into admin_users
  console.log("Adding to admin_users table...");
  const { error: dbError } = await supabase
    .from("admin_users")
    .upsert({ user_id: userId, email }, { onConflict: "email" });

  if (dbError) {
    console.error("Database error inserting admin:", dbError);
    process.exit(1);
  }

  console.log("Successfully created admin user!");
}

addAdmin().catch(console.error);
