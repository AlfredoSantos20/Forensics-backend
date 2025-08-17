import { Request, Response } from "express";
import prisma from "../config/prisma";

export const getAllActivityLogs = async (req: Request, res: Response) => {
    try {
    const response = await prisma.activityLog.findMany();
    return res.status(200).json({ message: 'All support concerns retrieved.', data: response });
  } catch (error) {
    console.error('Controller Error:', error);
    return res.status(500).json({ error: 'Failed to fetch support concerns.' });
  }
};