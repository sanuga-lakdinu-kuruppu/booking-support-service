import { Booking } from "../model/bookingModel.mjs";
import { TripDuplication } from "../model/tripDuplicationModel.mjs";
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

export const createNewRecordWithForTripDuplication = async (tripId, capacity, bookingStatus) => {
  try {
    const newData = {
      tripId: tripId,
      capacity: capacity,
      bookingStatus: bookingStatus
    };
    const newTripCapacity = new TripDuplication(newData);
    const savedTripCapacity = await newTripCapacity.save();
    console.log(`trip duplication saved successfully :)`);
  } catch (error) {
    console.log(`booking support service error occured: ${error}`);
  }
};

export const updateBookingStatus = async (tripId, bookingStatus) => {
  try {
    const newData = {
      tripId: tripId,
      bookingStatus: bookingStatus
    }
    const updatedTripDuplication = await TripDuplication.findOneAndUpdate(
      { tripId: tripId },
      newData,
      { new: true, runValidators: true }
    );
    console.log(`trip duplication updated successfully :)`);
  } catch (error) {
    console.log(`booking support service error occured: ${error}`);
  }
};

export const deleteSingleTripDuplication = async (tripId) => {
  try {
    const deletedTrip = await TripDuplication.findOneAndDelete({ tripId: tripId });
    if (!deletedTrip) return null;
    console.log(`trip duplication deleted successfully :)`);
  } catch (error) {
    console.log(`booking support service error occured: ${error}`);
  }
};
