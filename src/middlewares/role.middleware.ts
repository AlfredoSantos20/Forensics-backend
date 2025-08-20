import { UserRole } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';


export const Roles = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user || !user.role) {
      res.status(403).json({ message: 'User role not found in token' });
      return;
    }

    if (!allowedRoles.includes(user.role as UserRole)) {
      res.status(403).json({ message: 'You do not have permission to access this resource.' });
      return;
    }

    next();
  };
};
