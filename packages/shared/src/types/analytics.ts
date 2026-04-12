/** All trackable events in the app */
export type AnalyticsEvent =
  // Auth
  | { event: 'auth_send_code'; props: { phone_masked: string } }
  | { event: 'auth_verify_success'; props: { is_new_user: boolean } }
  | { event: 'auth_verify_fail'; props: { reason: string } }
  | { event: 'auth_logout'; props: Record<string, never>}
  // Registration
  | { event: 'register_step_complete'; props: { step: 1 | 2 | 3 | 4 | 5; duration_ms: number } }
  | { event: 'register_complete'; props: { total_duration_ms: number } }
  | { event: 'register_abandon'; props: { step: number; duration_ms: number } }
  // Discovery
  | { event: 'card_view'; props: { target_user_id: string; position: number } }
  | { event: 'card_like'; props: { target_user_id: string; type: 'normal' | 'super' } }
  | { event: 'card_skip'; props: { target_user_id: string; view_duration_ms: number } }
  | { event: 'match_success'; props: { target_user_id: string } }
  | { event: 'daily_picks_view'; props: Record<string, never>}
  // Profile
  | { event: 'profile_view'; props: { target_user_id: string; source: 'discover' | 'search' | 'match' | 'chat' } }
  | { event: 'profile_edit'; props: { fields_changed: string[] } }
  | { event: 'photo_upload'; props: { count: number } }
  | { event: 'verification_start'; props: { level: 'L2' | 'L3' | 'L4' } }
  | { event: 'verification_complete'; props: { level: 'L2' | 'L3' | 'L4'; duration_ms: number } }
  // Chat
  | { event: 'chat_open'; props: { conversation_id: string } }
  | { event: 'chat_message_send'; props: { conversation_id: string; type: string } }
  | { event: 'chat_message_read'; props: { conversation_id: string; count: number } }
  // Video
  | { event: 'video_hall_enter'; props: { type: '1v1' | 'matchmaker' } }
  | { event: 'video_call_start'; props: { target_user_id: string } }
  | { event: 'video_call_end'; props: { duration_ms: number } }
  // Explore
  | { event: 'circle_join'; props: { circle_name: string } }
  | { event: 'activity_view'; props: { activity_id: string } }
  | { event: 'activity_signup'; props: { activity_id: string; fee: number } }
  | { event: 'buddy_post_create'; props: { type: string } }
  // Payment
  | { event: 'membership_view'; props: Record<string, never>}
  | { event: 'payment_start'; props: { product_type: string; amount: number } }
  | { event: 'payment_success'; props: { product_type: string; amount: number; channel: string } }
  | { event: 'payment_fail'; props: { product_type: string; reason: string } }
  // Safety
  | { event: 'report_submit'; props: { reason: string } }
  | { event: 'block_user'; props: { target_user_id: string } }
  | { event: 'sos_trigger'; props: Record<string, never>}
  // App lifecycle
  | { event: 'app_open'; props: { source: 'cold' | 'warm' | 'push' } }
  | { event: 'app_background'; props: { session_duration_ms: number } }
  | { event: 'screen_view'; props: { screen_name: string } }
  | { event: 'error_boundary'; props: { error: string; screen: string } };

export type AnalyticsEventName = AnalyticsEvent['event'];
