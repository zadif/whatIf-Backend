import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.Supabase_URL;
const supabaseKey = process.env.Supabase_API_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);
