import jwt from "jsonwebtoken";

//token= req.cookies.access_token

export function getId(token) {
  const decoded = jwt.decode(token);
  const userId = decoded.sub;
  return userId;
}
