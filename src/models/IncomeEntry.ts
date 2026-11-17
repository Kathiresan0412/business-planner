import mongoose, { Schema, type InferSchemaType } from "mongoose";

const IncomeEntrySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: "UserPlan", index: true },
    amount: { type: Number, required: true, min: 0 },
    source: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

export type IncomeEntryDocument = InferSchemaType<typeof IncomeEntrySchema> & {
  _id: mongoose.Types.ObjectId;
};

const IncomeEntryModel = mongoose.models.IncomeEntry ?? mongoose.model("IncomeEntry", IncomeEntrySchema);

export default IncomeEntryModel;
