// controllers/auth.controllers.ts
import { Request, Response } from 'express'
import prisma from '../config/prisma'
import { registerUser, loginUser } from '../services/auth.services'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/token'
import { UserRole } from '@prisma/client'

/** Map any incoming role string to Prisma's UserRole (or null if invalid). */
function normalizeRole(input: unknown): UserRole | null {
  const val = String(input ?? '').toUpperCase()
  // Allow legacy/alias names if you had them on the frontend
  if (val === 'CUSTOMER') return UserRole.STUDENT
  if (val in UserRole) return val as UserRole
  return null
}

export const register = async (req: Request, res: Response) => {
  const { email, password, confirmPassword, role, username } = req.body

  // Basic required fields
  if (!email || !password || !confirmPassword || !role || !username) {
    return res.status(400).json({ message: 'All fields are required' })
  }

  // Password match
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' })
  }

  // Password policy
  const passwordErrors: string[] = []
  if (password.length < 8) passwordErrors.push('Password must be at least 8 characters long')
  if (!/[A-Z]/.test(password)) passwordErrors.push('Password must include an uppercase letter')
  if (!/[a-z]/.test(password)) passwordErrors.push('Password must include a lowercase letter')
  if (!/[0-9]/.test(password)) passwordErrors.push('Password must include a number')
  if (!/[^A-Za-z0-9]/.test(password)) passwordErrors.push('Password must include a special character')
  if (passwordErrors.length) {
    return res.status(400).json({ message: passwordErrors })
  }

  // Normalize role → Prisma enum
  const normalizedRole = normalizeRole(role)
  if (!normalizedRole) {
    return res.status(400).json({ message: 'Invalid role. Allowed: ADMIN, INSTRUCTOR, STUDENT' })
  }

  // Uniqueness checks
  const [existingUser, existingUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { username } }),
  ])

  if (existingUser) {
    return res.status(400).json({ message: 'Email is already in use' })
  }
  if (existingUsername) {
    return res.status(400).json({ message: 'Username is already in use' })
  }

  try {
    const user = await registerUser(email, password, normalizedRole, username)
    return res.status(201).json({ message: 'User registered', userId: user.id })
  } catch (error: any) {
    return res.status(401).json({ message: error?.message || 'Registration failed' })
  }
}

// controllers/auth.controllers.ts
export const login = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body || {}
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Identifier and password are required' })
    }

    const { accessToken, refreshToken } = await loginUser(identifier, password)
    return res.status(200).json({ accessToken, refreshToken })
  } catch (error: any) {
    console.error('Login error:', error)
    return res.status(401).json({ message: error?.message || 'Invalid credentials' })
  }
}

export const refreshAccessToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' })
  }

  try {
    const decoded = verifyRefreshToken(refreshToken) as { id: number; role: UserRole }
    const newAccessToken = generateAccessToken(decoded.id, decoded.role)
    const newRefreshToken = generateRefreshToken(decoded.id)
    return res.status(200).json({ accessToken: newAccessToken, refreshToken: newRefreshToken })
  } catch {
    return res.status(403).json({ message: 'Invalid refresh token' })
  }
}
