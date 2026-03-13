import "dotenv/config";
import { logger } from "./lib/logger.js";
import { getNestServer } from "./bootstrap.js";

const PORT = Number(process.env.PORT) || 4000;

void (async () => {
  const app = await getNestServer();
  app.listen(PORT, () => {
    logger.info("server", `Backend API (Nest/Express) : http://localhost:${PORT}`);
  });
})();
