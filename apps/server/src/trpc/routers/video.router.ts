import { z } from 'zod';
import { protectedProcedure, router } from '../base';
import { VideoService } from '../../modules/video/video.service';

export const videoRouter = router({
  /** Start a 1v1 call with a matched user */
  start1v1: protectedProcedure
    .input(z.object({ targetUserId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return VideoService.start1v1Call(ctx.user.id, input.targetUserId);
    }),

  /** List active matchmaker rooms */
  listRooms: protectedProcedure.query(() => {
    return VideoService.listMatchmakerRooms();
  }),

  /** Create a matchmaker room */
  createRoom: protectedProcedure
    .input(
      z.object({
        title: z.string().min(2).max(50),
        category: z.string(),
        maxParticipants: z.number().int().min(2).max(10).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return VideoService.createMatchmakerRoom(ctx.user.id, input);
    }),

  /** Join a matchmaker room */
  joinRoom: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return VideoService.joinMatchmakerRoom(ctx.user.id, input.roomId);
    }),

  /** Join quick match queue */
  quickMatch: protectedProcedure.mutation(async ({ ctx }) => {
    return VideoService.joinQuickMatch(ctx.user.id);
  }),

  /** Leave quick match queue */
  leaveQuickMatch: protectedProcedure.mutation(async ({ ctx }) => {
    VideoService.leaveQuickMatch(ctx.user.id);
    return { success: true };
  }),

  /** Check queue status */
  quickMatchStatus: protectedProcedure.query(async ({ ctx }) => {
    return VideoService.getQuickMatchStatus(ctx.user.id);
  }),

  /** Leave a room */
  leaveRoom: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      VideoService.leaveMatchmakerRoom(ctx.user.id, input.roomId);
      return { success: true };
    }),
});
