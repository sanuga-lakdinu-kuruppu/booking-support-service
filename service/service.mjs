import { Booking } from "../model/bookingModel.mjs";
import { TripCapacity } from "../model/tripCapacityModel.mjs";
import AWS from "aws-sdk";

const eventBridge = new AWS.EventBridge({
  region: process.env.FINAL_AWS_REGION,
});

export const updateBookingDocumentForBookingCreation = async (
  bookingId,
  trip
) => {
  try {
    const tripData = {
      tripId: trip.tripId,
      tripNumber: trip.tripNumber,
      tripDate: trip.tripDate,
      startLocation: trip.startLocation,
      endLocation: trip.endLocation,
      schedule: trip.schedule,
      vehicle: trip.vehicle,
      cancellationPolicy: trip.cancellationPolicy,
    };

    const newData = {
      bookingId: bookingId,
      bookingStatus: "PENDING",
      trip: tripData,
      price: trip.vehicle.pricePerSeat,
    };

    const updatedBooking = await Booking.findOneAndUpdate(
      { bookingId: bookingId },
      newData,
      { new: true, runValidators: true }
    );
  } catch (error) {
    console.log(`booking support service error occured: ${error}`);
  }
};

export const createNewRecordWithVehicleCapacity = async (tripId, capacity) => {
  try {
    const newData = {
      tripId: tripId,
      capacity: capacity,
    };
    const newTripCapacity = new TripCapacity(newData);
    const savedTripCapacity = await newTripCapacity.save();
    console.log(`trip capacity saved successfully :)`);
  } catch (error) {
    console.log(`booking support service error occured: ${error}`);
  }
};
