import mongoose from "mongoose";

const tripDuplicationSchema = new mongoose.Schema(
  {
    tripId: {
      type: Number,
      required: true,
      unique: true,
    },
    capacity: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const TripDuplication = mongoose.model("TripDuplication", tripDuplicationSchema);
