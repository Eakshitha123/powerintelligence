import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    status: { type: String, enum: ["ACTIVE", "PENDING"], default: "PENDING" },
    role: {
      type: String,
      enum: ["ADMIN", "DT_OPS_MANAGER", "FIELD_ENGINEER", "ANALYST", "CONSUMER"],
      default: null
    },
    requestedRole: {
      type: String,
      enum: ["ADMIN", "DT_OPS_MANAGER", "FIELD_ENGINEER", "ANALYST", "CONSUMER"],
      default: null
    }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", UserSchema);