import { Router } from 'express';
import { postTransactions } from '../controllers/transactionController';

const router = Router();

/**
 * POST /transactions
 * Recebe e processa um lote de transações financeiras.
 */
router.post('/', postTransactions);

export default router;
