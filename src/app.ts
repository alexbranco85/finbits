import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import transactionsRouter from './routes/transactions';

const app = express();

// Segurança: headers HTTP seguros
app.use(helmet());

// Segurança: rate limiting por IP (100 req / 15 min)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too Many Requests' },
  })
);

// Parse JSON com limite de payload
app.use(express.json({ limit: '1mb' }));

// Health check — sem autenticação
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Rotas protegidas por token
app.use('/transactions', authMiddleware, transactionsRouter);

// Handler global de erros (deve ser o último middleware)
app.use(errorHandler);

export default app;
