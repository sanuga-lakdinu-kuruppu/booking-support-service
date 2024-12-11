import createConnection from "./config/databaseConnection.mjs";
import {
  updateBookingDocumentForBookingCreation,
  createNewRecordWithForTripDuplication,
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
    } else if (internalEventType === "EVN_TRIP_CREATED_FOR_TRIP_DUPLICATION") {
      const { tripId, capacity, bookingStatus } = event.detail;
      await createNewRecordWithForTripDuplication(tripId, capacity, bookingStatus);
    }
    console.log("booking support service event processed successfully.");
  } catch (error) {
    console.log(`booking support service error occured: ${error}`);
  }
};
