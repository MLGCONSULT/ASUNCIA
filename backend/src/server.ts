import "dotenv/config";
import app from "./index.js";
import { logger } from "./lib/logger.js";

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  logger.info("server", `Backend API : http://localhost:${PORT}`);
});
