import { Request, Response } from "express";
import prisma from '../config/prisma';
import {
  registerUser,
  loginUser,
  // uploadDocuments,
  userInfo,
} from "../services/auth.services";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/token";

export const register = async (req: Request, res: Response) => {
  const { email, password, confirmPassword, role, username } = req.body;
  console.log("{ email, password, role, username }", {
    email,
    password,
    confirmPassword,
    role,
    username,
  });

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    return res.status(400).json({ message: "Email is already in use" });
  }
  
   if (existingUsername) {
    return res.status(400).json({ message: "Username is already in use" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  const passwordErrors = [];
  if (password.length < 8) {
    passwordErrors.push("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    passwordErrors.push("Password must include an uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    passwordErrors.push("Password must include a lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    passwordErrors.push("Password must include a number");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    passwordErrors.push("Password must include a special character");
  }

  if (passwordErrors.length > 0) {
    return res.status(400).json({ message: passwordErrors });
  }
  
  if (!email || !password || !confirmPassword || !role || !username) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const user = await registerUser(email, password, role, username);
    res.status(201).json({ message: "User registered", userId: user.id });
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  const { identifier, password } = req.body;

  try {
    const { accessToken, refreshToken, role } = await loginUser(identifier, password);

    res.status(201).json({
      role,
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token is required" });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const newAccessToken = generateAccessToken(decoded.id, decoded.role);
    const newRefreshToken = generateRefreshToken(decoded.id);

    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return res.status(403).json({ message: "Invalid refresh token" });
  }
};

// export const uploadDocumentId = async (req: Request, res: Response) => {
//   const { validIdUrl, selfPictureUrl, profileUrl } = req.body;

//   try {
//     const response = await uploadDocuments({
//       validIdUrl,
//       selfPictureUrl,
//       id: Number(req.user?.id),
//       profileUrl,
//     });
//     res.status(201).json({ message: "Document Upload", data: response });
//   } catch (error: any) {
//     res.status(401).json({ message: error.message });
//   }
// };




