import app, { init } from "@/app";
import supertest from "supertest";
import { cleanDb, generateValidToken } from "../helpers";
import httpStatus from "http-status";
import { TicketStatus } from "@prisma/client";
import faker from "@faker-js/faker";
import {
  createUser,
  createBooking,
  createHotel,
  createRoomWithHotelId,
  createEnrollmentWithAddress,
  createTicketType,
  createTicket,
  createTicketTypeRemote,
  createTicketTypeWithHotel,
  createTicketTypeWithoutHotel,
  findBooking,
  updateRoom,
} from "../factories";
import * as jwt from "jsonwebtoken";

beforeAll(async () => {
  await init();
});

beforeEach(async () => {
  await cleanDb();
});

const server = supertest(app);

describe("GET /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.get("/booking");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });
});

describe("When token is valid", () => {
  it("should respond with status 404 when has no booking from the user id given", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.NOT_FOUND);
  });
  it("should respond with status 200 with the booking body response when the booking have the user id", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const hotel = await createHotel();
    const room = await createRoomWithHotelId(hotel.id);
    const booking = await createBooking(user.id, room.id);
    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.OK);
    expect(response.body).toEqual({
      id: booking.id,
      Room: {
        id: room.id,
        name: room.name,
        capacity: room.capacity,
        hotelId: room.hotelId,
        createdAt: room.createdAt.toISOString(),
        updatedAt: room.updatedAt.toISOString(),
      },
    });
  });
});

describe("POST /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.post("/booking");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });
});

describe("When token is valid", () => {
  it("Should respond with status 401 when ticket status is not paid", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const hotel = await createHotel();
    const room = await createRoomWithHotelId(hotel.id);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketType();
    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);
    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("Should respond with status 401 when ticket type is remote", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const hotel = await createHotel();
    const room = await createRoomWithHotelId(hotel.id);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeRemote();
    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("Should respond with status 401 when ticket type not includes hotel", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const hotel = await createHotel();
    const room = await createRoomWithHotelId(hotel.id);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithoutHotel();

    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("Should respond with status 404 when room id does not exists or is a invalid case", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const hotel = await createHotel();
    const room = await createRoomWithHotelId(hotel.id);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.NOT_FOUND);
  });

  it("Should respond with status 403 when the capacity room has already full", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const hotel = await createHotel();
    let room = await createRoomWithHotelId(hotel.id);
    room = await updateRoom(room.id);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    await createBooking(user.id, room.id);

    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.FORBIDDEN);
  });

  it("Should respond with status 403 when the user had already reserved the room", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const hotel = await createHotel();
    const room = await createRoomWithHotelId(hotel.id);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    await createBooking(user.id, room.id);
    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.FORBIDDEN);
  });

  it("Should respond with status 200 and booking id body when booking is successfully post", async () => {
    const user = await createUser();
    const otherUser = await createUser();
    const token = await generateValidToken(user);
    const hotel = await createHotel();
    const room = await createRoomWithHotelId(hotel.id);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketTypeWithHotel();
    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    await createBooking(otherUser.id, room.id);
    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: room.id });
    const booking = await findBooking(user.id);
    expect(response.status).toBe(httpStatus.OK);
    expect(response.body).toEqual({ bookingId: booking.id });
  });
});

describe("PUT /booking/:bookingId", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.put("/booking/2");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.put("/booking/2").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.put("/booking/2").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });
});

describe("When token is valid", () => {
  it("Should respond with status 403 when user doesnt have booking yet", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);

    const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(httpStatus.FORBIDDEN);
  });
  it("Should respond with status 404 when room doesnt exists", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const hotel = await createHotel();
    const room = await createRoomWithHotelId(hotel.id);
    await createBooking(user.id, room.id);

    const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`).send({ roomId: -1 });
    expect(response.status).toBe(httpStatus.NOT_FOUND);
  });

  it("Should respond with status 404 when booking doesnt exists from the booking id given", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const hotel = await createHotel();
    const room = await createRoomWithHotelId(hotel.id);
    await createBooking(user.id, room.id);

    const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(httpStatus.NOT_FOUND);
  });

  it("Should respond with status 403 when users booking and booking from params is not equal", async () => {
    const user = await createUser();
    const otherUser = await createUser();
    const token = await generateValidToken(user);
    const hotel = await createHotel();
    const room = await createRoomWithHotelId(hotel.id);
    const usersBooking = await createBooking(user.id, room.id);
    const otherUsersBooking = await createBooking(otherUser.id, room.id);

    const response = await server.put(`/booking/${otherUsersBooking.id}`).set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(httpStatus.FORBIDDEN);
  });

  it("Should respond with status 403 when the capacity room has already full", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const hotel = await createHotel();
    let room = await createRoomWithHotelId(hotel.id);
    room = await updateRoom(room.id);
    const usersBooking = await createBooking(user.id, room.id);
    const response = await server.put(`/booking/${usersBooking.id}`).set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.FORBIDDEN);
  });

  it("Should respond with status 200 and booking id as response body", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const hotel = await createHotel();
    const room = await createRoomWithHotelId(hotel.id);
    const usersBooking = await createBooking(user.id, room.id);
    const response = await server
      .put(`/booking/${usersBooking.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ roomId: room.id });
    const booking = await findBooking(user.id);
    expect(response.status).toBe(httpStatus.OK);
    expect(response.body).toEqual({ bookingId: booking.id });
  });
});
