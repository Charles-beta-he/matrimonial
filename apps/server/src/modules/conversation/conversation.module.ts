import { Module } from '@nestjs/common';
import { ConversationGateway } from './conversation.gateway';

/** 会话管理 — real-time chat via Socket.io */
@Module({
  providers: [ConversationGateway],
})
export class ConversationModule {}
