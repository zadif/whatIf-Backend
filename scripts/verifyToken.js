import jwt from "jsonwebtoken";

export function verifyToken(req, res, next) {
  const token = req.cookies.access_token;
  if (!token) {
    let refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token is not present" });
    }

    return res.status(401).json({ message: "Access token is not present" });
  }

  try {
    const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Access token is invalid" });
  }
}
