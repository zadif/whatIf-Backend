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

const app = express();
const port = 3000;

app.use(express.json());

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(helmet());
app.use(cookieParser());

app.use(loginRouter);
app.use(refresh);

app.get("/hello", verifyToken, (req, res) => {
  return res.status(200).json({ message: "Secure path" });
});

app.post("/generate", verifyToken, async (req, res) => {
  let { prompt, option, tone } = req.body;

  if (!prompt || !option || !tone) {
    return res.status(400).json({ message: "Credentials are incomplete" });
  }
  prompt = validator.escape(prompt);
  prompt = sanitizeHtml(prompt);
  try {
    let response = await checker(prompt, option, tone);
    if (response != "fishy" && response != "error") {
      const decoded = jwt.decode(req.cookies.access_token);
      const userId = decoded.sub;
      //get uuid here

      let supabase2 = supabaseWithAuth(req);
      let { error } = await supabase2.from("whatifs").insert({
        prompt: prompt,
        tone: tone,
        type: option,
        response: response,
        userID: userId,
        public: false,
      });

      if (error) {
        console.error("Error inserting whatif in supabase: ", error);
      }
    }
    return res.status(200).json({ message: response });
  } catch (err) {
    console.error("Error in generate middleware: ", err);
    return res.status(400).json({ message: "Error in generating" });
  }
});

app.listen(port, () => {
  console.log("Listening on port ", port);
});
