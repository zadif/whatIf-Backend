import { supabase, supabaseWithAuth } from "../scripts/supabase-client.js";

import jwt from "jsonwebtoken";

import { verifyToken } from "../scripts/verifyToken.js";

import express from "express";
let router = express.Router();

router.get("/self/:name", verifyToken, async (req, res) => {
  try {
    let { name } = req.params;

    let supabase2 = supabaseWithAuth(req);
    const { data: whatIfData, error: whatIfError } = await supabase2
      .from("whatifs")
      .select("*")
      .eq("username", name);
    if (whatIfError) {
      console.error("Error from supabase while fetching feeds: ", whatIfError);
      return res.status(400).json({ message: "Error while fetching feed" });
    }
    let { data: userData, error: userError } = await supabase
      .from("users")
      .select("email")
      .eq("username", name)
      .single();

    if (userError) {
      console.error("Error from supabase while fetching user: ", userError);
      return res.status(400).json({ message: "Error while fetching feed" });
    }
    res.json({ data: whatIfData, email: userData.email });
  } catch (err) {
    console.error("Error in feed middleware: ", err);
  }
});
router.get("/feed", verifyToken, async (req, res) => {
  try {
    const decoded = jwt.decode(req.cookies.access_token);
    const userId = decoded.sub;
    let supabase2 = supabaseWithAuth(req);
    const { data, error } = await supabase2
      .from("whatifs")
      .select("*")
      .neq("userID", userId) // exclude my own posts
      .eq("public", true); // only public posts
    if (error) {
      console.error("Error from supabase while fetching feeds: ", error);
    }
    res.json(data);
  } catch (err) {
    console.error("Error in feed middleware: ", err);
  }
});

export default router;
