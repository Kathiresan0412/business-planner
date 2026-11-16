import mongoose, { Schema, type InferSchemaType } from "mongoose";

const BusinessTemplateSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    number: { type: Number, required: true },
    name: { type: String, required: true },
    investment: { type: String, required: true },
    incomePotential: { type: String, required: true },
    daysToFirstIncome: { type: Number, required: true },
    sheetName: { type: String, required: true },
    description: { type: String },
    emoji: { type: String },
  },
  { timestamps: true },
);

export type BusinessTemplateDocument = InferSchemaType<typeof BusinessTemplateSchema> & {
  _id: mongoose.Types.ObjectId;
};

const BusinessTemplateModel =
  mongoose.models.BusinessTemplate ?? mongoose.model("BusinessTemplate", BusinessTemplateSchema);

export default BusinessTemplateModel;
