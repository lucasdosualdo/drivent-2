import { prisma } from "@/config";

async function listRoom(roomId: number) {
  return prisma.room.findFirst({
    where: {
      id: roomId,
    },
  });
}

const roomRepository = { listRoom };

export default roomRepository;
