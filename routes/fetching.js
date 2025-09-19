import { supabase, supabaseWithAuth } from "../scripts/supabase-client.js";

import jwt from "jsonwebtoken";

import { verifyToken } from "../scripts/verifyToken.js";

import express from "express";
let router = express.Router();

router.get("/self/:name", verifyToken, async (req, res) => {
  try {
    let { name } = req.params;
    const decoded = jwt.decode(req.cookies.access_token);
    const userId = decoded.sub;
    let supabase2 = supabaseWithAuth(req);
    const { data: whatIfData, error: whatIfError } = await supabase2.rpc(
      "get_user_posts",
      {
        viewer_uuid: userId,
        target_username: name,
        limit_count: 20,
        offset_count: 0,
      }
    );
    if (whatIfError) {
      console.error("Error from supabase while fetching feeds: ", whatIfError);
      return res.status(400).json({ message: "Error while fetching feed" });
    }

    //fetching email of the user
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
    const { data, error } = await supabase2.rpc("get_feed", {
      user_uuid: userId,
      limit_count: 20, // fetch 20 posts
      offset_count: 0, // skip first 0 posts (first page)
    });

    if (error) {
      console.error("Error fetching feed:", error);
      return res.status(500).json({ message: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error("Error in feed middleware: ", err);
  }
});

export default router;
