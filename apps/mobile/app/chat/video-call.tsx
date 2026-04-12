import { useLocalSearchParams, useRouter } from 'expo-router';
import { VideoCall } from '../../components/VideoCall';
import { api } from '@matrimonial/api-client';

export default function VideoCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    roomName: string;
    token: string;
    wsUrl: string;
    userName: string;
    roomId?: string;
  }>();

  const leaveRoom = api.video.leaveRoom.useMutation();

  const handleEnd = async () => {
    if (params.roomId) {
      await leaveRoom.mutateAsync({ roomId: params.roomId }).catch(() => {});
    }
    router.back();
  };

  if (!params.roomName || !params.token) {
    router.back();
    return null;
  }

  return (
    <VideoCall
      roomName={params.roomName}
      token={params.token}
      wsUrl={params.wsUrl ?? ''}
      userName={params.userName ?? '用户'}
      onEnd={handleEnd}
    />
  );
}
