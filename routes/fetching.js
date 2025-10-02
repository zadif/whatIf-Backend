import { supabase, supabaseWithAuth } from "../scripts/supabase-client.js";

import jwt from "jsonwebtoken";

import { verifyToken } from "../scripts/verifyToken.js";

import express from "express";
import { getId } from "../scripts/getUserId.js";

let router = express.Router();

router.get("/self/:name", verifyToken, async (req, res) => {
  try {
    let { name } = req.params;
    if (!name) {
      return res.status(400).json({ message: "username is missing" });
    }
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
      return res.status(400).json({ message: userError.details });
    }
    res.json({ data: whatIfData, email: userData.email });
  } catch (err) {
    console.error("Error in feed middleware: ", err);
  }
});
router.get("/feed/:offset", verifyToken, async (req, res) => {
  let { offset } = req.params;
  if (offset) {
    offset = Number(offset);
  } else {
    offset = 0;
  }
  try {
    const decoded = jwt.decode(req.cookies.access_token);
    const userId = decoded.sub;
    let supabase2 = supabaseWithAuth(req);
    const { data, error } = await supabase2.rpc("get_feed", {
      user_uuid: userId,
      limit_count: 10, // fetch 20 posts
      offset_count: offset * 10, // skip first 0 posts (first page)
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

router.get("/whatIf/:postId", async (req, res) => {
  let { postId } = req.params;

  if (!postId) {
    return res.status(400).json({ message: " postID  is missing" });
  }
  const parsedId = Number(postId);
  if (
    isNaN(parsedId) || // not a number
    parsedId < 0 || // negative
    !Number.isInteger(parsedId) // fraction/decimal
  ) {
    return res
      .status(400)
      .json({ message: "postID must be a non-negative integer" });
  }
  try {
    //fetching for whatif
    const { data, error } = await supabase
      .from("whatifs")
      .select("*")
      .eq("id", parsedId);
    if (error) {
      console.error("Error fetching whatif from server:", error);
      return res.status(500).json({ message: "Server side error" });
    }
    if (!data[0]) {
      return res.status(404).json({ message: "WhatIf not Founded" });
    }

    if (req.cookies.access_token) {
      let userId = getId(req.cookies.access_token);

      if (userId) {
        let supabase2 = supabaseWithAuth(req);

        let { data: likeData, error: likeError } = await supabase2
          .from("likes")
          .select("*")
          .eq("whatifID", parsedId)
          .eq("userID", userId)
          .maybeSingle();

        if (likeError) {
          console.error(
            "Error while fetching likes for a single post view: ",
            likeError
          );
          //yaha return nhi kia , kiu ky agr yaha error aata ha
          //usky begair bhi post show kr skty hain
        }
        let has_Liked = false;
        if (likeData) {
          has_Liked = true;
        }
        data[0].has_liked = has_Liked;
      }
    }

    // fetching like status of user

    res.json(data[0]);
  } catch (err) {
    console.error("Error in whatif middleware: ", err);
    return res.status(500).json({ message: "Server error" });
  }
});
router.post("/update", verifyToken, async (req, res) => {
  let { postId, publi } = req.body;
  if (!postId) {
    return res.status(400).json({ message: " postID  is missing" });
  }
  const parsedId = Number(postId);
  if (
    isNaN(parsedId) || // not a number
    parsedId < 0 || // negative
    !Number.isInteger(parsedId) // fraction/decimal
  ) {
    return res
      .status(400)
      .json({ message: "postID must be a non-negative integer" });
  }

  try {
    let supabase2 = supabaseWithAuth(req);

    let { error } = await supabase2
      .from("whatifs")
      .update({ public: publi })
      .eq("id", parsedId);
    if (error) {
      console.error("Error while updating public feild from supabase: ", error);
      return res.status(500).json({ message: "Server side error" });
    }
    return res.status(200).json({ message: "updated" });
  } catch (err) {
    console.error("Error in updating public feild middleware: ", err);
  }
});

router.delete("/whatIf", verifyToken, async (req, res) => {
  let { postId } = req.body;

  if (!postId) {
    return res.status(400).json({ message: " postID  is missing" });
  }
  const parsedId = Number(postId);
  if (
    isNaN(parsedId) || // not a number
    parsedId < 0 || // negative
    !Number.isInteger(parsedId) // fraction/decimal
  ) {
    return res
      .status(400)
      .json({ message: "postID must be a non-negative integer" });
  }

  try {
    let supabase2 = supabaseWithAuth(req);

    let { error } = await supabase2.from("whatifs").delete().eq("id", parsedId);
    if (error) {
      console.error("Error while deleting whatif from supabase: ", error);
      return res.status(500).json({ message: "Server side error" });
    }
    return res.status(200).json({ message: "deleted" });
  } catch (err) {
    console.error("Error in deleting whatif middleware: ", err);
  }
});
export default router;
