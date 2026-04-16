import { TRPCError } from '@trpc/server';
import { uploadRequestSchema, confirmUploadSchema } from '@matrimonial/shared';
import { protectedProcedure, router } from '../base';
import { UploadService } from '../../modules/upload/upload.service';
import { audit } from '../../adapters/audit.adapter';
import { logger } from '../../lib/logger';

export const uploadRouter = router({
  /** Request upload credentials */
  requestUpload: protectedProcedure
    .input(uploadRequestSchema)
    .mutation(async ({ input, ctx }) => {
      const validation = UploadService.validate(input.category, input.contentType, input.sizeBytes);
      if (!validation.valid) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: validation.error });
      }
      return UploadService.generateCredential(
        ctx.user.id,
        input.category,
        input.filename,
        input.contentType,
        input.sizeBytes,
      );
    }),

  /** Confirm upload complete — trigger audit, save to DB */
  confirmUpload: protectedProcedure
    .input(confirmUploadSchema)
    .mutation(async ({ input, ctx }) => {
      const publicUrl = UploadService.getPublicUrl(input.objectKey);

      // Auto-create Photo record for photo category
      if (input.category === 'photo' || input.category === 'avatar') {
        const count = await ctx.prisma.photo.count({ where: { userId: ctx.user.id } });
        const photo = await ctx.prisma.photo.create({
          data: {
            userId: ctx.user.id,
            url: publicUrl,
            order: count,
            isAvatar: input.category === 'avatar',
            auditStatus: 'PENDING',
          },
        });

        // Async audit — don't block the response
        audit
          .auditImage(publicUrl)
          .then(async (result) => {
            if (result.status === 'REJECTED') {
              await ctx.prisma.photo.update({
                where: { id: photo.id },
                data: { auditStatus: 'REJECTED' },
              });
              logger.info('photo auto-rejected', { photoId: photo.id, reasons: result.reasons });
            } else if (result.status === 'APPROVED') {
              await ctx.prisma.photo.update({
                where: { id: photo.id },
                data: { auditStatus: 'APPROVED' },
              });
            }
            // REVIEW status keeps PENDING for manual review
          })
          .catch((err) => logger.error('photo audit failed', { error: err?.message }));
      }

      return { publicUrl, objectKey: input.objectKey };
    }),
});
