import express from "express";
import { supabase } from "./supabase-client.js";
import cors from "cors";
const app = express();
const port = 3000;

app.use(express.json());

// Allow all origins (for dev)
app.use(cors());
app.post("/signup", async (req, res) => {
  let { email, username, password } = req.body;

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
    console.error("Error authenticating user to supabase: ", error.message);
    return;
  }

  let { error: dbError } = await supabase.from("users").insert({
    username: username,
    uuid: data.user.id,
  });
  if (dbError) {
    console.error("Error signing up user to supabase: ", error.message);
    return;
  }
  return res.status(200).json({ message: "User created successfully" });
});

app.listen(port, () => {
  console.log("Listening on port ", port);
});
