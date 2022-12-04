import faker from "@faker-js/faker";
import { prisma } from "@/config";

export async function updateRoom(roomId: number) {
  return prisma.room.update({
    where: {
      id: roomId,
    },
    data: {
      capacity: 0,
    },
  });
}
