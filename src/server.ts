import app from './app';
import config from './config/env';

app.listen(config.PORT, () => {
  console.warn(`[SERVER] Transaction Processor rodando na porta ${config.PORT}`);
});
