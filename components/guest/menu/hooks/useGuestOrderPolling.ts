'use client';

import { useEffect, useCallback, useRef } from 'react';
import { normalizeTableIdentifier } from './order-totals.util';
import { getKnownOrder } from './guest-storage.util';

interface PollingProps {
  tableNumber: string; cafeParam: string; guestId: string; activeSessionId?: string; hasActiveOrder: boolean; sentItemsCount: number;
  /** The table's push channel is up: the polls below are then only a slow safety net. */
  pushUp?: boolean;
  billRequestedBanner: boolean; markBillSettled: (t?: number, cashback?: number) => void; setSentItems: (it: any[]) => void;
  setMasterOrder: (o: any) => void; setKotStatus: (s: string) => void; setTicketNumber: (t: string) => void; setBillRequestedBanner: (v: boolean) => void;
}

// How often a guest's phone asks the server for the order and session status. Kitchen status changes and settlement
// are PUSHED to the phone (useGuestRealtimeSync), so these polls are the safety net for a missed push and the way a
// dish another device added to the table's bill shows up. They were 4s and 3.5s while ordering: with a few hundred
// phones that was most of the database and egress load. Do not lower them without measuring.
const STATUS_POLL_ACTIVE_MS = 10_000;
const ORDER_POLL_ACTIVE_MS = 8_000;
const POLL_IDLE_MS = 30_000;
// While the table's push channel is up a change arrives at once, so the reads only guard against a missed push.
const STATUS_POLL_PUSHED_MS = 60_000;
const ORDER_POLL_PUSHED_MS = 45_000;
const POLL_IDLE_PUSHED_MS = 90_000;

export function useGuestOrderPolling(props: PollingProps) {
  // Callbacks like markBillSettled are rebuilt whenever order state changes, and
  // every poll changes order state. Depending on them made each poll restart
  // the effects below, which poll immediately on start: an endless request loop
  // (dozens of /api/guest/order calls per second per guest). Read the latest
  // props from a ref instead; effects restart only on table/venue/speed changes.
  const latest = useRef(props);
  latest.current = props;
  const { tableNumber, cafeParam } = props;
  const statusId = props.activeSessionId || props.guestId;
  const isActive = props.hasActiveOrder || props.sentItemsCount > 0 || props.billRequestedBanner;
  const pushUp = Boolean(props.pushUp);
  const statusEveryMs = pushUp ? (isActive ? STATUS_POLL_PUSHED_MS : POLL_IDLE_PUSHED_MS) : (isActive ? STATUS_POLL_ACTIVE_MS : POLL_IDLE_MS);
  const orderEveryMs = pushUp ? (isActive ? ORDER_POLL_PUSHED_MS : POLL_IDLE_PUSHED_MS) : (isActive ? ORDER_POLL_ACTIVE_MS : POLL_IDLE_MS);

  const pollActiveOrder = useCallback(async () => {
    const p = latest.current;
    const normCur = normalizeTableIdentifier(p.tableNumber);
    if (!p.tableNumber) return;
    try {
      const q = new URLSearchParams({ table: p.tableNumber });
      if (p.cafeParam) q.set('cafe_id', p.cafeParam);
      const knownOrder = getKnownOrder(p.cafeParam, p.tableNumber);
      if (knownOrder) q.set('known_order', knownOrder);
      const res = await fetch(`/api/guest/order?${q.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!data?.success) return;
      if (data.order?.table_number && normalizeTableIdentifier(data.order.table_number) !== normCur) return;
      if (data.is_settled || data.order?.status === 'settled') { p.markBillSettled(data.settled_total || data.order?.grand_total, data.cashback_credited); return; }
      if (data.items) p.setSentItems(data.items);
      if (data.order) p.setMasterOrder(data.order);
      if (data.kot_status) p.setKotStatus(data.kot_status);
      if (data.ticket?.ticket_number) p.setTicketNumber(data.ticket.ticket_number);
      if (data.is_bill_requested) p.setBillRequestedBanner(true);
    } catch {}
  }, []);

  // Real refs: these were plain objects recreated every render, so the in-flight guards never held
  // and polls could overlap.
  const isPollingOrderRef = useRef(false);
  const isCheckingStatusRef = useRef(false);

  useEffect(() => {
    // The session endpoint requires an id; the guest id is assigned in an effect
    // after first render, so wait for it instead of sending session_id= (a 500).
    if (!statusId) return;

    // The first check always runs (a page opened in a background tab must still
    // show the real status); only the repeating ticks pause while hidden.
    const checkStatus = async (force = false) => {
      if (isCheckingStatusRef.current || (!force && document.hidden)) return;
      isCheckingStatusRef.current = true;
      try {
        const p = latest.current;
        const res = await fetch(`/api/guest/session?session_id=${encodeURIComponent(statusId)}&table_number=${encodeURIComponent(tableNumber)}&cafe_id=${encodeURIComponent(cafeParam)}`, { cache: 'no-store' });
        const data = await res.json();
        if (data.table_number && normalizeTableIdentifier(data.table_number) !== normalizeTableIdentifier(tableNumber)) return;
        // A closed session is only a hint: the session this phone remembers may be an earlier party's. Whether this
        // phone's own bill was settled is asked of the order check, which answers only for the order this device placed.
        if (data.session_status === 'closed' && (p.hasActiveOrder || p.sentItemsCount > 0 || p.billRequestedBanner)) void pollActiveOrder();
        if (data.kot_status) p.setKotStatus(data.kot_status);
        if (data.ticket_number) p.setTicketNumber(data.ticket_number);
      } catch {} finally {
        isCheckingStatusRef.current = false;
      }
    };

    void checkStatus(true);
    // Active orders poll faster; idle tables poll at relaxed interval
    const interval = setInterval(() => void checkStatus(), statusEveryMs);
    return () => clearInterval(interval);
  }, [statusId, tableNumber, cafeParam, statusEveryMs, pollActiveOrder]);

  useEffect(() => {
    if (!tableNumber) return;

    const runPoll = async (force = false) => {
      if (isPollingOrderRef.current || (!force && document.hidden)) return;
      isPollingOrderRef.current = true;
      try {
        await pollActiveOrder();
      } finally {
        isPollingOrderRef.current = false;
      }
    };

    void runPoll(true);
    const interval = setInterval(() => void runPoll(), orderEveryMs);
    // Catch up immediately when the guest returns to the tab.
    const onVisible = () => { if (!document.hidden) void runPoll(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  }, [tableNumber, cafeParam, orderEveryMs, pollActiveOrder]);

  return { pollActiveOrder };
}
