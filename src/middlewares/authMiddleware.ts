// authMiddleware.ts
import { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.user) {
    // user logged in
    next();
  } else {
    // user logged out
    return res.status(401).json({ message: "Unauthorized" });
  }
}
