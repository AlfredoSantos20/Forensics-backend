import { Router } from 'express';
import {  login,  refreshAccessToken, register } from '../controllers/auth.controllers';
import { loginUser } from '../services/auth.services';

const router = Router();

//For Login/Register Routes
router.post('/register', register as any);
router.post('/login', login as any);  
router.post('/refresh-token', refreshAccessToken as any);


export default router;
