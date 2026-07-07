import "dotenv/config";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";

import playlistRoutes from "./routes/playlist.routes.js"

dotenv.config();
import participantsRouter from "./routes/participants.js";
import sessionsRouter from "./routes/sessions.js";
import checkinsRouter from "./routes/checkins.js";
import guidedRouter from "./routes/guided.js";
import adminRouter from "./routes/admin.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/playlists", playlistRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/participants", participantsRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/checkins", checkinsRouter);
app.use("/api/guided", guidedRouter);
app.use("/api/admin", adminRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

app.listen(PORT, () => {
  console.log(`Attention Reset backend listening on :${PORT}`);
});
