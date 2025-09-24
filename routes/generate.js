import { supabase, supabaseWithAuth } from "../scripts/supabase-client.js";
import validator from "validator";
import sanitizeHtml from "sanitize-html";
import jwt from "jsonwebtoken";
import { checker } from "../scripts/gemini.js";
import { verifyToken } from "../scripts/verifyToken.js";

import express from "express";
let router = express.Router();

router.post("/generate", verifyToken, async (req, res) => {
  let { prompt, option, tone, publi, username } = req.body;
  let id;
  if (!prompt || !option || !tone) {
    return res.status(400).json({ message: "Credentials are incomplete" });
  }
  prompt = validator.escape(prompt);
  prompt = sanitizeHtml(prompt);
  try {
    let response = await checker(prompt, option, tone);

    if (response == "Model is overloaded. Try again in few seconds") {
      return res.status(401).json({ message: response });
    }

    if (response != "fishy" && response != "error" && response != "fishy.") {
      const decoded = jwt.decode(req.cookies.access_token);
      const userId = decoded.sub;
      //get uuid here

      let supabase2 = supabaseWithAuth(req);
      let { error, data } = await supabase2
        .from("whatifs")
        .insert({
          prompt: prompt,
          tone: tone,
          type: option,
          response: response,
          userID: userId,
          public: publi,
          username: username,
        })
        .select();

      if (error) {
        console.error("Error inserting whatif in supabase: ", error);
      }
      if (data[0]) {
        id = data[0].id;
      }
    }
    if (response == "fishy" || response == "fishy.") {
      console.log("Inside fishy");
      return res.status(400).json({ message: "Glitch in the matrix" });
    }
    if (response == "error") {
      return res.status(400).json({ message: response });
    }

    return res.status(200).json({ postId: id });
  } catch (err) {
    console.error("Error in generate middleware: ", err);
    return res.status(400).json({ message: "Error in generating" });
  }
});

export default router;
