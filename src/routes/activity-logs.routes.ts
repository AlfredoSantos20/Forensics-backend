import { Router } from 'express';
import { getAllActivityLogs } from '../controllers/logs.controllers';

const router = Router();

router.get('/all-activity', getAllActivityLogs as any);


export default router;
