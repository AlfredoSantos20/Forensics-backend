import express from 'express';
import dotenv from 'dotenv';
import { json } from 'body-parser';
import authRoutes from './routes/auth.routes';
import activityLogs  from './routes/activity-logs.routes';
import cors from 'cors';
import path from 'path';

dotenv.config();

const app = express();

app.use(json());
app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use('/images', express.static(path.join(__dirname, '..', 'assets', 'images')));
app.use('/api/logs/', activityLogs);
app.use('/api/auth', authRoutes);

export default app;
