import express from "express";

import express from "express";
import { supabase, supabaseWithAuth } from "./scripts/supabase-client.js";

import cookie from "cookie";
import jwt from "jsonwebtoken";

import { verifyToken } from "./scripts/verifyToken.js";

let router = express.Router();

router.post("/like", verifyToken, async (req, res) => {
  let { postID, action } = req.body;

  if (!postID || !action) {
    return res
      .status(500)
      .json({ message: "Either postID or action is missing" });
  }

  const decoded = jwt.decode(req.cookies.access_token);
  const userId = decoded.sub;

  try {
    let supabase2 = supabaseWithAuth(req);

    const postIDNum = Number(postID);
    const { data, error } = await supabase2.rpc("toggle_like", {
      p_user: userId,
      p_post_id: postIDNum,
      action,
    });
    if (error) {
      console.error("Error calling increment_like:", error);
      return res.status(500).json({ message: error.message });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Error in like middleware: ", err);
  }
});

export default router;
