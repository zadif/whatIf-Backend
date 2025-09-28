import express from "express";
import validator from "validator";
import sanitizeHtml from "sanitize-html";
import { supabase, supabaseAdmin } from "../scripts/supabase-client.js";
import cookie from "cookie";
import { verifyToken } from "../scripts/verifyToken.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../scripts/sendPulse.js";
let router = express.Router();

router.post("/signup", async (req, res) => {
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
      return res
        .status(400)
        .json({ error: "User already exists with these credentials" });
    }

    //auth signup
    const { data, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: false, // Ensures the user starts unconfirmed
        user_metadata: {
          username: username,
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
    const { data: emailData, error: emailError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "signup",
        email,
      });
    if (emailError) {
      console.error("Error generating email confirmation link: ", emailError);
      return res.status(500).json({ error: "Internal server error" });
    }
    //sending email via Send Pulse
    sendEmail(username, email, emailData?.properties?.action_link);

    return res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    console.error("Error in signup middleware: ", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
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

router.post("/resendOTP", async (req, res) => {
  let { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  try {
    await supabase.auth.resend({
      type: "signup",
      email,
    });
    return res.status(200).json({ message: "OTP resent successfully" });
  } catch (err) {
    console.error("Error in resend OTP middleware: ", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/logout", async (req, res) => {
  await supabase.auth.signOut();
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

router.post("/setCookies", (req, res) => {
  try {
    console.log("Inside setCookies");
    let { accessToken, refreshToken } = req.body;
    res.setHeader("Set-Cookie", [
      cookie.serialize("access_token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 60 * 60, // 1 hour
        path: "/",
      }),
      cookie.serialize("refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 60 * 60 * 24 * 30, // ~30 days
        path: "/",
      }),
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error in setCookies middleware: ", err);
  }
});

export default router;
