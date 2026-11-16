import mongoose, { Schema, type InferSchemaType } from "mongoose";

const TemplateTaskSchema = new Schema(
  {
    templateSlug: { type: String, required: true, index: true },
    day: { type: Number, required: true, min: 1, max: 90 },
    phase: {
      type: String,
      enum: [
        "Research & Setup",
        "Build Presence",
        "First Samples/Launch",
        "Active Outreach",
        "First Customer",
        "Iterate & Improve",
        "Scale & Systems",
      ],
      required: true,
    },
    title: { type: String, default: "" },
    defaultHours: { type: Number, default: 0 },
  },
  { timestamps: true },
);

TemplateTaskSchema.index({ templateSlug: 1, day: 1 }, { unique: true });

export type TemplateTaskDocument = InferSchemaType<typeof TemplateTaskSchema> & {
  _id: mongoose.Types.ObjectId;
};

const TemplateTaskModel = mongoose.models.TemplateTask ?? mongoose.model("TemplateTask", TemplateTaskSchema);

export default TemplateTaskModel;
