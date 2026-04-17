import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';

const MAX_DURATION_MS = 60_000; // 60 seconds

type RecorderState = 'idle' | 'recording' | 'uploading' | 'done';

export function useVoiceRecorder() {
  const [state, setState] = useState<RecorderState>('idle');
  const [duration, setDuration] = useState(0); // seconds
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingRef.current) {
        try {
          recordingRef.current.stopAndUnloadAsync();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      // Request permission
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要麦克风权限才能录制语音消息');
        return false;
      }

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      startTimeRef.current = Date.now();
      setDuration(0);
      setState('recording');

      // Duration timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);

        // Auto-stop at max duration
        if (elapsed >= MAX_DURATION_MS / 1000) {
          // Will be handled by caller checking duration
          clearInterval(timerRef.current!);
          timerRef.current = null;
        }
      }, 200);

      return true;
    } catch (err: any) {
      Alert.alert('录音失败', err?.message ?? '无法启动录音');
      setState('idle');
      return false;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    clearTimer();
    const recording = recordingRef.current;
    if (!recording) {
      setState('idle');
      return null;
    }

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      const uri = recording.getURI();
      recordingRef.current = null;
      setState('idle');
      return uri;
    } catch {
      recordingRef.current = null;
      setState('idle');
      return null;
    }
  }, [clearTimer]);

  const cancelRecording = useCallback(async () => {
    clearTimer();
    const recording = recordingRef.current;
    if (!recording) {
      setState('idle');
      setDuration(0);
      return;
    }

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    } catch {
      // ignore
    }
    recordingRef.current = null;
    setState('idle');
    setDuration(0);
  }, [clearTimer]);

  return {
    recorderState: state,
    setRecorderState: setState,
    isRecording: state === 'recording',
    isUploading: state === 'uploading',
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
