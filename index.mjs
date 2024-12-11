import createConnection from "./config/databaseConnection.mjs";
import {
  updateBookingDocumentForBookingCreation,
  createNewRecordWithVehicleCapacity,
} from "./service/service.mjs";

createConnection();

export const handler = async (event) => {
  console.log(`booking support service event triggered`);
  try {
    const { internalEventType } = event.detail;

    if (internalEventType === "EVN_TRIP_DETAIL_FETCHED_FOR_BOOKING") {
      console.log(
        `1, booking support service event triggered, ${internalEventType} `
      );
      const { bookingId, trip } = event.detail;
      await updateBookingDocumentForBookingCreation(bookingId, trip);
    } else if (internalEventType === "EVN_TRIP_CREATED_FOR_VEHICLE_CAPACITY") {
      const { tripId, capacity } = event.detail;
      await createNewRecordWithVehicleCapacity(tripId, capacity);
    }
    console.log("booking support service event processed successfully.");
  } catch (error) {
    console.log(`booking support service error occured: ${error}`);
  }
};
