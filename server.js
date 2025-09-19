import express from "express";
import { supabase, supabaseWithAuth } from "./scripts/supabase-client.js";
import cors from "cors";
import validator from "validator";
import sanitizeHtml from "sanitize-html";
import helmet, { crossOriginEmbedderPolicy } from "helmet";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { checker } from "./scripts/gemini.js";
import { verifyToken } from "./scripts/verifyToken.js";

//routes
import loginRouter from "./routes/loginFunctionalites.js";
import refresh from "./routes/refresh.js";
import generate from "./routes/generate.js";
import fetching from "./routes/fetching.js";

const app = express();
const port = 3000;

app.use(express.json());

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:4173"],
    credentials: true,
  })
);
app.use(helmet());
app.use(cookieParser());

app.use(loginRouter);
app.use(refresh);
app.use(generate);
app.use(fetching);

app.get("/hello", verifyToken, (req, res) => {
  console.log("hello");
  return res.status(200).json({ message: "Secure path" });
});

app.post("/like", verifyToken, async (req, res) => {
  let { postID, action } = req.body;

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

app.listen(port, () => {
  console.log("Listening on port ", port);
});
