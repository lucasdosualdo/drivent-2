import bookingRepository from "@/repositories/booking-repository";
import ticketService from "@/services/tickets-service";
import { notFoundError, unauthorizedError, forbiddenError } from "@/errors";
import { TicketStatus } from "@prisma/client";
import roomRepository from "@/repositories/room-repository";

async function getBookingByUserId(userId: number) {
  const booking = await bookingRepository.findBookingByUserId(userId);
  if (!booking) {
    throw notFoundError();
  }
  const bookingResponse = {
    id: booking.id,
    Room: booking.Room,
  };
  return bookingResponse;
}

async function validateTicket(userId: number) {
  const ticket = await ticketService.getTicketByUserId(userId);
  if (!ticket.TicketType.includesHotel || ticket.TicketType.isRemote || ticket.status === TicketStatus.RESERVED) {
    throw unauthorizedError();
  }
  return ticket;
}

async function validateBookingByRoomId(roomId: number) {
  const booking = await bookingRepository.findBookingByRoomId(roomId);

  const bookingQuantity = booking.length;
  if (bookingQuantity === 0) {
    throw notFoundError();
  }
  const roomCapacity = booking[0].Room.capacity;

  if (roomCapacity - bookingQuantity < 1) {
    throw forbiddenError();
  }
  return booking;
}

async function validateBookingByUserId(userId: number) {
  const booking = await bookingRepository.findBookingByUserId(userId);
  if (booking) {
    throw forbiddenError();
  }
}

async function postBooking(userId: number, roomId: number) {
  await validateTicket(userId);
  await validateBookingByRoomId(roomId);
  await validateBookingByUserId(userId);
  const booking = await bookingRepository.insertBooking(userId, roomId);
  if (!booking) {
    throw forbiddenError();
  }

  return booking.id;
}

async function checkUserHasBooking(userId: number) {
  const bookingFromUser = await bookingRepository.findBookingByUserId(userId);
  if (!bookingFromUser) {
    throw forbiddenError();
  }
  return bookingFromUser;
}

async function checkRoomExists(roomId: number) {
  const room = await roomRepository.listRoom(roomId);
  if (!room) {
    throw notFoundError();
  }
  return room;
}

async function checkBookingExists(bookingId: number) {
  const booking = await bookingRepository.findBookingByBookingId(bookingId);
  if (!booking) {
    throw notFoundError();
  }
  return booking;
}

async function putBooking(userId: number, roomId: number, bookingId: number) {
  const bookingFromUser = await checkUserHasBooking(userId);
  const room = await checkRoomExists(roomId);
  const booking = await checkBookingExists(bookingId);
  if (bookingFromUser.id !== booking.id) {
    throw forbiddenError();
  }
  await validateBookingByRoomId(roomId);
  const updatedBooking = await bookingRepository.updateBooking(bookingId, roomId);
  return updatedBooking;
}

const bookingService = {
  getBookingByUserId,
  validateTicket,
  validateBookingByRoomId,
  postBooking,
  validateBookingByUserId,
  putBooking,
};

export default bookingService;
