import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.Supabase_URL;
const supabaseKey = process.env.Supabase_API_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

export function supabaseWithAuth(req) {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${req.cookies.access_token}`, // ✅ user’s JWT
      },
    },
  });
}

const supabaseServiceRoleKey = process.env.Supabase_Service_Role_Key;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
