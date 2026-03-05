export const BOOKING_CUTOFF_HOURS = 4;
export const LATE_CANCEL_CUTOFF_HOURS = 4;
export const FCFS_NOTIFICATION_CUTOFF_MINUTES = 30;
export const FCFS_OFFER_TIMEOUT_MINUTES = 5;

export function hoursUntilClass(startTime: string): number {
  return (new Date(startTime).getTime() - Date.now()) / (1000 * 60 * 60);
}

export function minutesUntilClass(startTime: string): number {
  return (new Date(startTime).getTime() - Date.now()) / (1000 * 60);
}

export function canBook(startTime: string): boolean {
  return hoursUntilClass(startTime) >= BOOKING_CUTOFF_HOURS;
}

export function isLateCancellation(startTime: string): boolean {
  return hoursUntilClass(startTime) < LATE_CANCEL_CUTOFF_HOURS;
}

export function shouldNotifyWaitlist(
  startTime: string
): 'auto_promote' | 'fcfs' | 'none' {
  const hours = hoursUntilClass(startTime);
  const minutes = hours * 60;
  if (hours >= BOOKING_CUTOFF_HOURS) return 'auto_promote';
  if (minutes >= FCFS_NOTIFICATION_CUTOFF_MINUTES) return 'fcfs';
  return 'none';
}

export function formatCountdown(startTime: string): string {
  const diff = new Date(startTime).getTime() - Date.now();
  if (diff <= 0) return 'Started';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatCancelDeadline(startTime: string): string {
  const deadlineTime =
    new Date(startTime).getTime() - BOOKING_CUTOFF_HOURS * 60 * 60 * 1000;
  const diff = deadlineTime - Date.now();
  if (diff <= 0) return 'Passed';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
