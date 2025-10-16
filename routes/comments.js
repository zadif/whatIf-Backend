import { supabase, supabaseWithAuth } from "../scripts/supabase-client.js";
import express from "express";
import { getId } from "../scripts/getUserId.js";
import { parseId } from "../scripts/parseId.js";
import { verifyToken } from "../scripts/verifyToken.js";
import sanitizeHtml from "sanitize-html";
import validator from "validator";

let router = express.Router();

router.post("/comment", verifyToken, async (req, res) => {
  try {
    let { comment, postId, parentCommentId } = req.body;
    //  console.log(comment, postId, parentCommentId);
    if (!postId || !comment || parentCommentId === null) {
      return res.status(400).json({ message: "Missing" });
    }
    const parsedId = parseId(postId);
    if (parsedId == "error") {
      return res
        .status(400)
        .json({ message: "ID must be a non-negative integer" });
    }
    let parsedCommentId;
    if (parentCommentId !== undefined) {
      parsedCommentId = parseId(parentCommentId);
      if (parsedCommentId == "error") {
        return res
          .status(400)
          .json({ message: "ID must be a non-negative integer" });
      }
    }

    comment = validator.escape(comment);
    comment = sanitizeHtml(comment);
    let token = req.cookies.access_token;
    let userId = getId(token);
    let supabase2 = supabaseWithAuth(req);
    const { data, error } = await supabase2
      .from("comments")
      .insert({
        comment,
        postId: parsedId,
        userId,

        parentCommentId: parsedCommentId,
      })
      .select()
      // specify you want a single value returned, otherwise it returns a list.
      .single();
    if (error) {
      console.error("Error while inserting comment in supabase: ", error);
      return res.status(500).json({ message: "Server side error" });
    }
    res.status(200).json({ id: data.id });
  } catch (err) {
    console.error("Error in post Comment middleware: ", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/comment/:postId", async (req, res) => {
  try {
    let { postId } = req.params;
    if (!postId) {
      return res.status(400).json({ message: "Post Id is missing" });
    }
    const parsedId = parseId(postId);
    if (parsedId == "error") {
      return res
        .status(400)
        .json({ message: "ID must be a non-negative integer" });
    }
    const { data, error } = await supabase.rpc("get_post_comments", {
      p_post_id: parsedId,
    });

    if (error) {
      console.error(
        "Error while fetching comments from supabase via rpc: ",
        error
      );
      return res.status(500).json({ message: "Internal server error" });
    }
    let comments = data ?? [];
    return res.json({ comments });
  } catch (err) {
    console.error("Error in post Comment middleware: ", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
