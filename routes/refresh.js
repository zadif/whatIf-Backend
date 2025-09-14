import express from "express";
import { supabase } from "../scripts/supabase-client.js";

import cookie from "cookie";

let router = express.Router();

router.get("/refresh", async (req, res) => {
  console.log("Refresh endpoint hit");
  const refresh_token = req.cookies.refresh_token;
  if (!refresh_token) return res.sendStatus(401);

  const { data, error } = await supabase.auth.refreshSession({ refresh_token });

  if (error) return res.status(400).json({ error: error.message });

  const { session } = data;
  res.setHeader("Set-Cookie", [
    cookie.serialize("access_token", session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60,
      path: "/",
    }),
    cookie.serialize("refresh_token", session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    }),
  ]);

  res.json({ user: session.user });
});

export default router;
