// services/auth.services.ts
import argon2 from 'argon2'
import prisma from '../config/prisma'
import { generateAccessToken, generateRefreshToken } from '../utils/token'
import { UserRole } from '@prisma/client'   // <-- import Prisma enum

export const registerUser = async (
  email: string,
  password: string,
  role: UserRole,           // <-- use Prisma enum here
  username: string
) => {
  const hashedPassword = await argon2.hash(password)

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role,                 // <-- now correct type
      username,
    },
  })

  return user
}

export const loginUser = async (identifier: string, password: string) => {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }],
    },
  })

  let isPasswordValid = false
  if (user) {
    isPasswordValid = await argon2.verify(user.password, password)
  }

  if (!user && !isPasswordValid) {
    throw new Error('Invalid email or username and password!')
  }
  if (!user) {
    throw new Error('Incorrect email or username!')
  }
  if (!isPasswordValid) {
    throw new Error('Incorrect password!')
  }

  return {
    accessToken: generateAccessToken(user.id, user.role),  // user.role is UserRole
    refreshToken: generateRefreshToken(user.id),
  }
}

export const userInfo = async (id: number) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true, username: true, role: true },
  })
  return user
}
