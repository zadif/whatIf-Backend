import express from "express";
import { supabase } from "./supabase-client.js";
import cors from "cors";
import validator from "validator";
import sanitizeHtml from "sanitize-html";
import helmet from "helmet";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
const app = express();
const port = 3000;

app.use(express.json());

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(helmet());
app.use(cookieParser());

function verifyToken(req, res, next) {
  const token = req.cookies.access_token;
  if (!token)
    return res.status(401).json({ message: "Access token is not present" });

  try {
    const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Access token is invalid" });
  }
}

app.post("/signup", async (req, res) => {
  let { email, username, password } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ error: "Credentials are incomplete" });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }
  username = validator.escape(username);
  username = sanitizeHtml(username);

  try {
    //check if user exists
    let { data: existingUser, error } = await supabase
      .from("users")
      .select("username, email")
      .or(`username.eq.${username},email.eq.${email}`)
      .maybeSingle(); // returns 1 row or null

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    //auth signup
    let { data, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          username: username,
        },
      },
    });

    if (authError) {
      if (authError.code == "email_address_invalid") {
        return res.status(400).json({ error: "Invalid email address" });
      }

      console.error("Error authenticating user to supabase: ", authError);
      return res.status(500).json({ error: "Internal server error" });
    }

    //add in users table
    let { error: dbError } = await supabase.from("users").insert({
      username: username,
      uuid: data.user.id,
      email: email,
    });
    if (dbError) {
      await supabase.auth.admin.deleteUser(data.user.id);
      console.error("Error signing up user to supabase: ", dbError);
      return res.status(500).json({ error: "Internal server error" });
    }
    return res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    console.error("Error in signup middleware: ", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/login", async (req, res) => {
  let { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Credentials are incomplete" });
  }
  email = validator.escape(email);
  email = sanitizeHtml(email);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      if (error.message == "Email not confirmed") {
        return res
          .status(403)
          .json({ error: "Email not confirmed by user yet" });
      }
      if (error.message == "Invalid login credentials") {
        return res.status(401).json({
          error: "Wrong credentials, No user with such credentitals exits",
        });
      }
      console.error("Login failed:", error.message);
      return res.status(400).json({ error: "Login failed" });
    }
    //setting access token and refresh token
    res.setHeader("Set-Cookie", [
      cookie.serialize("access_token", data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 60 * 60, // 1 hour
        path: "/",
      }),
      cookie.serialize("refresh_token", data.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 60 * 60 * 24 * 30, // ~30 days
        path: "/",
      }),
    ]);
    console.log("User logged in");
    return res.status(200).json({
      message: "User Logged in successfully",
      email: data.user.email,
      username: data.user.user_metadata.username,
    });
  } catch (err) {
    console.error("Error in login middleware: ", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/logout", async (req, res) => {
  res.setHeader("Set-Cookie", [
    cookie.serialize("access_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 0, // 1 hour
      path: "/",
    }),
    cookie.serialize("refresh_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 0, // ~30 days
      path: "/",
    }),
  ]);
  console.log("User logged out");
  return res.status(200).json({ message: "User logged out" });
});

app.get("/refresh", async (req, res) => {
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

app.get("/hello", verifyToken, (req, res) => {
  return res.status(200).json({ message: "Secure path" });
});

app.listen(port, () => {
  console.log("Listening on port ", port);
});
