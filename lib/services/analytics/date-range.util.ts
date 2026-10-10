import { businessDateString, businessDayRange, isDateOnly } from '@/lib/utils/business-day';

// Calendar arithmetic on YYYY-MM-DD strings (Date.UTC normalises month/day overflow).
const ymd = (year: number, monthIndex: number, day: number) =>
  new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);

export function resolveAnalyticsDateRange(requestUrl: string): { timeframe: string; startDate: string; endDate: string } {
  const { searchParams } = new URL(requestUrl);
  const rawParam = searchParams.get('range') || searchParams.get('timeframe') || searchParams.get('interval') || 'daily';
  const timeframe = rawParam.toLowerCase();
  let start_date = searchParams.get('start_date') || searchParams.get('startDate');
  let end_date = searchParams.get('end_date') || searchParams.get('endDate');

  if (timeframe === 'custom') {
    const customStart = searchParams.get('startDate') || searchParams.get('start_date');
    const customEnd = searchParams.get('endDate') || searchParams.get('end_date');
    if (isDateOnly(customStart) && isDateOnly(customEnd)) {
      start_date = businessDayRange(customStart).start.toISOString();
      end_date = businessDayRange(customEnd).end.toISOString();
    }
  }

  // Anything that is not a real timestamp falls back to the default range instead of reaching the query.
  if (start_date && Number.isNaN(Date.parse(start_date))) start_date = null;
  if (end_date && Number.isNaN(Date.parse(end_date))) end_date = null;

  if (!start_date || !end_date) {
    const [y, m, d] = businessDateString().split('-').map(Number);
    const today = ymd(y, m - 1, d);
    let firstDay = today;
    let lastDay = today;
    if (timeframe === 'weekly') {
      firstDay = ymd(y, m - 1, d - 6);
    } else if (timeframe === 'monthly') {
      firstDay = ymd(y, m - 1 - 11, 1);
      lastDay = ymd(y, m, 0);
    }
    start_date = businessDayRange(firstDay).start.toISOString();
    end_date = businessDayRange(lastDay).end.toISOString();
  }

  return { timeframe, startDate: start_date, endDate: end_date };
}
