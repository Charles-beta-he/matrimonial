import { createSignalingServer } from './signaling.js';
import { RoomManager } from './room-manager.js';

const roomManager = new RoomManager();
const io = createSignalingServer();

// Expose room manager via HTTP endpoint or socket events if needed
console.log('media-service started');
export { roomManager, io };
