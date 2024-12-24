import { Booking } from "../model/bookingModel.mjs";
import { TripDuplication } from "../model/tripDuplicationModel.mjs";
import { Commuter } from "../model/commuterModel.mjs";
import AWS from "aws-sdk";
import {
  SchedulerClient,
  DeleteScheduleCommand,
} from "@aws-sdk/client-scheduler";

const eventBridge = new AWS.EventBridge({
  region: process.env.FINAL_AWS_REGION,
});

const schedulerClient = new SchedulerClient({
  region: process.env.FINAL_AWS_REGION,
});

const s3 = new AWS.S3();

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
      route: trip.route,
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

export const createNewRecordWithForTripDuplication = async (
  tripId,
  capacity,
  bookingStatus,
  tripDate
) => {
  try {
    const newData = {
      tripId: tripId,
      capacity: capacity,
      bookingStatus: bookingStatus,
      tripDate: tripDate,
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
      bookingStatus: bookingStatus,
    };
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
    const deletedTrip = await TripDuplication.findOneAndDelete({
      tripId: tripId,
    });
    if (!deletedTrip) return null;
    console.log(`trip duplication deleted successfully :)`);
  } catch (error) {
    console.log(`booking support service error occured: ${error}`);
  }
};

export const checkBookingExpiration = async (bookingId, tripId, seatNumber) => {
  try {
    const params = { Name: `booking-expiration-${bookingId}` };
    const command = new DeleteScheduleCommand(params);
    await schedulerClient.send(command);

    const foundTrip = await Booking.findOne({
      bookingId: bookingId,
    });
    if (!foundTrip) return null;
    if (foundTrip.bookingStatus === "PENDING") {
      const newData = {
        bookingId: bookingId,
        bookingStatus: "EXPIRED",
      };
      const updatedBooking = await Booking.findOneAndUpdate(
        { bookingId: bookingId },
        newData,
        { new: true, runValidators: true }
      );
      if (!updatedBooking) return null;
      await triggerBookingExpiredEvent(tripId, seatNumber);
    }
    console.log(`booking expiration updated successfully :)`);
  } catch (error) {
    console.log(`booking support service error occured: ${error}`);
  }
};

export const backupBookings = async () => {
  try {
    console.log("Midnight backup event triggered");
    const bookings = await getBookingsOlderThanSevenDays();
    if (bookings.length === 0) {
      console.log("No trips found for backup.");
      return;
    }
    await backupBookingsToS3(bookings);
    await updateBackupStatus(bookings);
    console.log("Booking backup process completed successfully.");
  } catch (error) {
    console.log(`Booking support service error occured: ${error}`);
  }
};

export const deleteBookings = async () => {
  try {
    console.log("Midnight deletion event triggered");
    await deleteBookingsWithBackedUpStatus();
    console.log("Booking deletion process completed successfully.");
  } catch (error) {
    console.log(`booking support service error occured: ${error}`);
  }
};

const deleteBookingsWithBackedUpStatus = async () => {
  try {
    const bookingsToDelete = await Booking.find({
      backedUpStatus: "BACKED_UP",
    });

    if (bookingsToDelete.length === 0) {
      console.log("No bookings found with backedUpStatus: 'BACKED_UP'");
      return;
    }

    const commuterIds = bookingsToDelete.map((booking) => booking.commuter);

    const commutersDeleted = await Commuter.deleteMany({
      _id: { $in: commuterIds },
    });
    console.log(`${commutersDeleted.deletedCount} related commuters deleted.`);

    const bookingsDeleted = await Booking.deleteMany({
      commuter: { $in: commuterIds },
    });
    console.log(
      `${bookingsDeleted.deletedCount} bookings deleted with backedUpStatus: "BACKED_UP"`
    );
  } catch (error) {
    console.log(`Error deleting bookings: ${error}`);
    throw new Error("Failed to delete bookings.");
  }
};

const getBookingsOlderThanSevenDays = async () => {
  const pastDays = new Date();
  pastDays.setDate(
    pastDays.getDate() - Number(process.env.BACKUP_CHEKCING_DAYS)
  );

  try {
    const bookings = await Booking.find({
      "trip.tripDate": { $lt: pastDays },
      backedUpStatus: "NOT_BACKED_UP",
    }).populate({
      path: "commuter",
    });
    return bookings;
  } catch (error) {
    console.log(`Error fetching bookings: ${error}`);
    throw new Error("Failed to fetch bookings.");
  }
};

const backupBookingsToS3 = async (bookings) => {
  try {
    const bookingsBackup = JSON.stringify(bookings);

    const params = {
      Bucket: process.env.BOOKING_BUCKET_NAME,
      Key: `backups/bookings/bookings_${new Date()
        .toISOString()
        .replace(/[-:.]/g, "")}.json`,
      Body: bookingsBackup,
      ContentType: "application/json",
    };

    await s3.putObject(params).promise();
    console.log("Bookings backup uploaded successfully.");
  } catch (error) {
    console.log(`Error backing up bookings to S3: ${error}`);
    throw new Error("Failed to upload backup to S3.");
  }
};

const updateBackupStatus = async (bookings) => {
  try {
    for (const booking of bookings) {
      booking.backedUpStatus = "BACKED_UP";
      await booking.save();
    }
    console.log("Backup status updated successfully.");
  } catch (error) {
    console.log(`Error updating backup status: ${error}`);
    throw new Error("Failed to update backup status.");
  }
};

const triggerBookingExpiredEvent = async (tripId, seatNumber) => {
  try {
    const eventParams = {
      Entries: [
        {
          Source: "booking-support-service",
          DetailType: "TRIP_SUPPORT_SERVICE",
          Detail: JSON.stringify({
            internalEventType: "EVN_BOOKING_EXPIRED",
            tripId: tripId,
            seatNumber: seatNumber,
          }),
          EventBusName: "busriya.com_event_bus",
        },
      ],
    };
    await eventBridge.putEvents(eventParams).promise();
  } catch (error) {
    console.log(`booking expired event triggering error ${error}`);
  }
};
