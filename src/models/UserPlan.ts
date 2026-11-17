import mongoose, { Schema, type InferSchemaType } from "mongoose";

const UserPlanSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    templateSlug: { type: String, required: true, index: true },
    startDate: { type: Date, required: true },
    status: { type: String, enum: ["active", "paused", "completed"], default: "active" },
  },
  { timestamps: true },
);

UserPlanSchema.index({ userId: 1, templateSlug: 1, status: 1 });
UserPlanSchema.index(
  { userId: 1, templateSlug: 1 },
  { unique: true, partialFilterExpression: { status: "active" } },
);

export type UserPlanDocument = InferSchemaType<typeof UserPlanSchema> & {
  _id: mongoose.Types.ObjectId;
};

const UserPlanModel = mongoose.models.UserPlan ?? mongoose.model("UserPlan", UserPlanSchema);

export default UserPlanModel;
