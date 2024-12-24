import createConnection from "./config/databaseConnection.mjs";
import {
  updateBookingDocumentForBookingCreation,
  createNewRecordWithForTripDuplication,
  updateBookingStatus,
  deleteSingleTripDuplication,
  checkBookingExpiration,
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
      console.log(
        `2, booking support service event triggered, ${internalEventType} `
      );
      const { tripId, capacity, bookingStatus, tripDate } = event.detail;
      await createNewRecordWithForTripDuplication(
        tripId,
        capacity,
        bookingStatus,
        tripDate
      );
    } else if (internalEventType === "EVN_TRIP_BOOKING_STATUS_UPDATED") {
      console.log(
        `3, booking support service event triggered, ${internalEventType} `
      );
      const { tripId, bookingStatus } = event.detail;
      await updateBookingStatus(tripId, bookingStatus);
    } else if (internalEventType === "EVN_SINGLE_TRIP_DELETED") {
      console.log(
        `4, booking support service event triggered, ${internalEventType} `
      );
      const { tripId } = event.detail;
      await deleteSingleTripDuplication(tripId);
    } else if (
      internalEventType === "EVN_BOOKING_CREATED_FOR_DELAYED_BOOKING_CHECKING"
    ) {
      console.log(
        `5, booking support service event triggered, ${internalEventType} `
      );
      const { bookingId, tripId, seatNumber } = event.detail;
      await checkBookingExpiration(bookingId, tripId, seatNumber);
    }
    console.log("booking support service event processed successfully.");
  } catch (error) {
    console.log(`booking support service error occured: ${error}`);
  }
};
