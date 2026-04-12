import { protectedProcedure, router } from '../base';
import { CreditsService } from '../../modules/credits/credits.service';

export const creditsRouter = router({
  balance: protectedProcedure.query(async ({ ctx }) => {
    return CreditsService.getBalance(ctx.user.id);
  }),
});
