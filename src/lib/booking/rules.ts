const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** 40 minutos de servicio más 5 de preparación. */
export const BLOCK_MINUTES = 45;
/** Todos los barberos comparten la grilla: 10:00, 10:45, 11:30... */
export const GRID_ANCHOR_MINUTES = 10 * 60;

export const DEPOSIT_PERCENT = 40;
export const MIN_BOOKING_NOTICE_MS = 2 * HOUR_MS;
export const MAX_BOOKING_DAYS_AHEAD = 7;
export const MAX_ACTIVE_BOOKINGS = 2;
export const MP_PAYMENT_WINDOW_MS = 30 * MINUTE_MS;
export const CASH_MIN_NOTICE_MS = 3 * HOUR_MS;
export const CASH_PAYMENT_WINDOW_MS = 24 * HOUR_MS;
export const CASH_DEADLINE_BEFORE_START_MS = 2 * HOUR_MS;
export const CANCELLATION_NOTICE_MS = 24 * HOUR_MS;
