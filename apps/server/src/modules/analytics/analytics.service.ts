import { prisma } from '../../lib/prisma';

interface RawEvent {
  event: string;
  props: Record<string, any>;
  timestamp: number;
  user_id?: string;
  session_id: string;
}

// In-memory buffer for batch writing
const eventBuffer: RawEvent[] = [];
const WRITE_INTERVAL = 30_000; // 30 seconds
const WRITE_BATCH_SIZE = 100;

export const AnalyticsService = {
  ingest(events: RawEvent[]) {
    // Validate and sanitize
    for (const event of events) {
      eventBuffer.push({
        event: String(event.event).slice(0, 100),
        props: typeof event.props === 'object' ? event.props : {},
        timestamp: Number(event.timestamp) || Date.now(),
        user_id: event.user_id ? String(event.user_id).slice(0, 50) : undefined,
        session_id: String(event.session_id).slice(0, 50),
      });
    }
  },

  async flush() {
    if (eventBuffer.length === 0) return;
    const batch = eventBuffer.splice(0, WRITE_BATCH_SIZE);

    // Write to database (using raw query for analytics table)
    // For MVP: write to a JSONB log table
    // For scale: write to ClickHouse/BigQuery
    try {
      await prisma.$executeRaw`
        INSERT INTO analytics_events (event, props, user_id, session_id, created_at)
        SELECT * FROM UNNEST(
          ${batch.map(e => e.event)}::text[],
          ${batch.map(e => JSON.stringify(e.props))}::jsonb[],
          ${batch.map(e => e.user_id ?? null)}::text[],
          ${batch.map(e => e.session_id)}::text[],
          ${batch.map(e => new Date(e.timestamp))}::timestamptz[]
        )
      `;
    } catch {
      // Fallback: log to stdout for collection
      for (const event of batch) {
        console.log(JSON.stringify({ type: 'analytics', ...event }));
      }
    }
  },

  startAutoFlush() {
    setInterval(() => this.flush(), WRITE_INTERVAL);
  },
};
