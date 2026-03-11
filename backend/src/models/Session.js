import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    refreshToken: { type: String, unique: true, required: true },
    userAgent: { type: String },
    ipAddress: { type: String },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// SessionSchema.index({ refreshToken: 1 }, { unique: true });

export const Session = mongoose.model("Session", SessionSchema);