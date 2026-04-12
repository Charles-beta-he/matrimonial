interface Room {
  id: string;
  type: 'one_on_one' | 'matchmaker';
  participants: string[];
  matchmakerId?: string;
  maxParticipants: number;
  createdAt: Date;
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom(type: Room['type'], creatorId: string): Room {
    const room: Room = {
      id: `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      participants: [creatorId],
      maxParticipants: type === 'one_on_one' ? 2 : 6,
      createdAt: new Date(),
    };
    if (type === 'matchmaker') room.matchmakerId = creatorId;
    this.rooms.set(room.id, room);
    return room;
  }

  joinRoom(roomId: string, userId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room || room.participants.length >= room.maxParticipants) return null;
    if (!room.participants.includes(userId)) room.participants.push(userId);
    return room;
  }

  leaveRoom(roomId: string, userId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.participants = room.participants.filter(p => p !== userId);
    if (room.participants.length === 0) this.rooms.delete(roomId);
  }

  listRooms(type?: Room['type']): Room[] {
    const rooms = Array.from(this.rooms.values());
    return type ? rooms.filter(r => r.type === type) : rooms;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }
}
