import { Response } from "express";
import { AuthenticatedRequest } from "@/middlewares";
import bookingService from "@/services/booking-service";
import httpStatus from "http-status";

export async function getBooking(req: AuthenticatedRequest, res: Response) {
  const { userId } = req;
  try {
    const booking = await bookingService.getBookingByUserId(userId);
    return res.status(httpStatus.OK).send(booking);
  } catch (error) {
    return res.sendStatus(httpStatus.NOT_FOUND);
  }
}

export async function postBooking(req: AuthenticatedRequest, res: Response) {
  const { userId } = req;
  const roomId: number = req.body.roomId;
  try {
    const bookingId = await bookingService.postBooking(userId, roomId);
    return res.status(httpStatus.OK).send({ bookingId });
  } catch (error) {
    if (error.name === "UnauthorizedError") {
      return res.sendStatus(httpStatus.UNAUTHORIZED);
    }
    if (error.name === "ForbiddenError") {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }
    return res.sendStatus(httpStatus.NOT_FOUND);
  }
}

export async function putBooking(req: AuthenticatedRequest, res: Response) {
  const { userId } = req;
  const roomId: number = req.body.roomId;
  const bookingId = Number(req.params.bookingId);
  try {
    const updatedBooking = await bookingService.putBooking(userId, roomId, bookingId);
    return res.status(httpStatus.OK).send({ bookingId: updatedBooking.id });
  } catch (error) {
    if (error.name === "ForbiddenError") {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }
    return res.sendStatus(httpStatus.NOT_FOUND);
  }
}
