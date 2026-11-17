import mongoose, { Schema, type InferSchemaType } from "mongoose";

const PHASES = [
  "Research & Setup",
  "Build Presence",
  "First Samples/Launch",
  "Active Outreach",
  "First Customer",
  "Iterate & Improve",
  "Scale & Systems",
] as const;

const PlanTaskSchema = new Schema(
  {
    planId: { type: Schema.Types.ObjectId, ref: "UserPlan", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    day: { type: Number, required: true, min: 1, max: 90 },
    date: { type: Date, required: true },
    phase: { type: String, enum: PHASES, required: true },
    title: { type: String, default: "" },
    isCustom: { type: Boolean, default: false },
    done: { type: Boolean, default: false },
    doneAt: { type: Date, default: null },
    hoursSpent: { type: Number, default: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

PlanTaskSchema.index({ planId: 1, day: 1 }, { unique: true });

export type PlanTaskDocument = InferSchemaType<typeof PlanTaskSchema> & {
  _id: mongoose.Types.ObjectId;
};

const PlanTaskModel = mongoose.models.PlanTask ?? mongoose.model("PlanTask", PlanTaskSchema);

export default PlanTaskModel;
