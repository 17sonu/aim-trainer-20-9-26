import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

const MODES = new Set(["30", "60", "100"]);

const gameResultSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 30
    },
    mode: {
      type: String,
      required: true,
      enum: ["30", "60", "100"],
      index: true
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      index: true
    },
    playedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { versionKey: false }
);

gameResultSchema.index({ mode: 1, score: -1, playedAt: 1 });

const GameResult = mongoose.model("GameResult", gameResultSchema);

app.use(cors());
app.use(express.json({ limit: "20kb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, database: mongoose.connection.readyState === 1 });
});

app.get("/api/leaderboard/:mode", async (req, res) => {
  try {
    const { mode } = req.params;

    if (!MODES.has(mode)) {
      return res.status(400).json({ message: "Invalid mode." });
    }

    const entries = await GameResult.find({ mode })
      .sort({ score: -1, playedAt: 1 })
      .limit(10)
      .lean();

    res.json({
      mode,
      entries: entries.map((entry, index) => ({
        rank: index + 1,
        id: entry._id,
        name: entry.name,
        score: entry.score,
        playedAt: entry.playedAt
      }))
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ message: "Unable to load leaderboard." });
  }
});

app.post("/api/results", async (req, res) => {
  try {
    const { name, mode, score } = req.body;

    const cleanName = String(name || "").trim();
    const numericScore = Number(score);

    if (!cleanName) {
      return res.status(400).json({ message: "Name is required." });
    }

    if (cleanName.length > 30) {
      return res.status(400).json({ message: "Name must be 30 characters or fewer." });
    }

    if (!MODES.has(String(mode))) {
      return res.status(400).json({ message: "Invalid mode." });
    }

    if (!Number.isFinite(numericScore) || numericScore < 0) {
      return res.status(400).json({ message: "Invalid score." });
    }

    const result = await GameResult.create({
      name: cleanName,
      mode: String(mode),
      score: Math.round(numericScore)
    });

    res.status(201).json({
      id: result._id,
      name: result.name,
      mode: result.mode,
      score: result.score,
      playedAt: result.playedAt
    });
  } catch (error) {
    console.error("Save result error:", error);
    res.status(500).json({ message: "Unable to save game result." });
  }
});

if (!MONGODB_URI) {
  console.error("MONGODB_URI is missing. Create server/.env from server/.env.example.");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Aim Trainer API running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
