import { router } from './base';
import { aiRouter } from './routers/ai.router';
import { authRouter } from './routers/auth.router';
import { activityRouter } from './routers/activity.router';
import { adminRouter } from './routers/admin.router';
import { chatRouter } from './routers/chat.router';
import { creditsRouter } from './routers/credits.router';
import { matchRouter } from './routers/match.router';
import { paymentRouter } from './routers/payment.router';
import { reportRouter } from './routers/report.router';
import { uploadRouter } from './routers/upload.router';
import { userRouter } from './routers/user.router';
import { verificationRouter } from './routers/verification.router';
import { safetyRouter } from './routers/safety.router';
import { videoRouter } from './routers/video.router';
import { checkinRouter } from './routers/checkin.router';
import { inviteRouter } from './routers/invite.router';
import { circleRouter } from './routers/circle.router';
import { buddyRouter } from './routers/buddy.router';

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  match: matchRouter,
  chat: chatRouter,
  credits: creditsRouter,
  payment: paymentRouter,
  report: reportRouter,
  activity: activityRouter,
  verification: verificationRouter,
  admin: adminRouter,
  upload: uploadRouter,
  ai: aiRouter,
  safety: safetyRouter,
  video: videoRouter,
  checkin: checkinRouter,
  invite: inviteRouter,
  circle: circleRouter,
  buddy: buddyRouter,
});

export type AppRouter = typeof appRouter;
