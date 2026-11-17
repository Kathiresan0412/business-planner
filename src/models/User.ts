import mongoose, { Schema, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    timezone: { type: String, default: "Asia/Colombo" },
    weeklyIncomeTarget: { type: Number, min: 0, default: 0 },
    monthlyIncomeGoal: { type: Number, min: 0, default: 0 },
    dailyReminderTime: { type: String, default: "" },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
};

const UserModel = mongoose.models.User ?? mongoose.model("User", UserSchema);

export default UserModel;
