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
import like from "./routes/like.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use(
  cors({
    origin: ["http://localhost:5173", "https://whatif-pied.vercel.app"],
    credentials: true,
  })
);
app.use(helmet());
app.use(cookieParser());

app.use(loginRouter);
app.use(refresh);
app.use(generate);
app.use(fetching);
app.use(like);

app.get("/hello", verifyToken, (req, res) => {
  console.log("hello");
  return res.status(200).json({ message: "Secure path" });
});

app.listen(port, () => {
  console.log("Listening on port ", port);
});
