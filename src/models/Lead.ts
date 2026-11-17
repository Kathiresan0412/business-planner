import mongoose, { Schema, type InferSchemaType } from "mongoose";

const LeadPlatform = [
  "instagram",
  "linkedin",
  "email",
  "whatsapp",
  "upwork",
  "fiverr",
  "other",
] as const;

const LeadStatus = [
  "new",
  "contacted",
  "replied",
  "proposal",
  "won",
  "lost",
] as const;

const LeadSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: "UserPlan", required: true, index: true },
    name: { type: String, required: true, trim: true },
    platform: { type: String, enum: LeadPlatform, required: true },
    contact: { type: String, default: "" },
    status: { type: String, enum: LeadStatus, default: "new" },
    nextFollowUpDate: { type: Date, default: null },
    notes: { type: String, default: "" },
    valueExpected: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type LeadDocument = InferSchemaType<typeof LeadSchema> & {
  _id: mongoose.Types.ObjectId;
};

const LeadModel = mongoose.models.Lead ?? mongoose.model("Lead", LeadSchema);

export default LeadModel;
