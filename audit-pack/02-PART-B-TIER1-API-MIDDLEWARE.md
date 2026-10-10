# PART B — TIER 1 CODE EXTRACTION (API Routes, Middleware & Client Factories)

All code blocks below are copied 100% VERBATIM. Sensitive keys and tokens are replaced with `[REDACTED]`.

---

## 1. Middleware & Configuration

### middleware.ts (66 lines)
```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isHostRoute = request.nextUrl.pathname.startsWith('/host');
  const isOnboardingRoute = request.nextUrl.pathname.startsWith('/onboarding/host');
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth/host');

  const isDev = process.env.NODE_ENV === 'development';

  if (!user && (isHostRoute || isOnboardingRoute) && !isDev) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/host';
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/host/control-center';
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

```

### next.config.mjs (11 lines)
```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [
			{ protocol: 'https', hostname: 'images.unsplash.com' },
		],
	},
};

export default nextConfig;

```

## 2. Supabase Client Factories

### lib/supabase/client.ts (11 lines)
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export const supabase = typeof window !== 'undefined' ? createClient() : null;

```

### lib/supabase/server.ts (37 lines)
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

```

## 3. Core API Utilities

### lib/services/api-idempotency.util.ts (70 lines)
```typescript
// lib/services/api-idempotency.util.ts

interface CachedResponse {
  timestamp: number;
  response: any;
  status: number;
}

const idempotencyCache = new Map<string, CachedResponse>();
const inFlightRequests = new Map<string, Promise<any>>();
const WINDOW_MS = 2000; // 2-second anti-frantic window

// Auto-cleanup expired keys every 30 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of Array.from(idempotencyCache.entries())) {
      if (now - val.timestamp > WINDOW_MS * 5) {
        idempotencyCache.delete(key);
      }
    }
  }, 30000);
}

export function generateIdempotencyKey(scope: string, identifier: string, payload?: any): string {
  if (payload?.idempotency_key) return `${scope}:${payload.idempotency_key}`;
  const payloadFingerprint = payload ? JSON.stringify(payload).length : 0;
  return `${scope}:${identifier.trim().toUpperCase()}:${payloadFingerprint}`;
}

export function checkIdempotency(key: string): { isDuplicate: boolean; cachedResult?: any; status?: number } {
  const existing = idempotencyCache.get(key);
  if (existing && Date.now() - existing.timestamp < WINDOW_MS) {
    return { isDuplicate: true, cachedResult: existing.response, status: existing.status };
  }
  return { isDuplicate: false };
}

export function recordIdempotentResponse(key: string, response: any, status: number = 200) {
  idempotencyCache.set(key, { timestamp: Date.now(), response, status });
}

export async function withIdempotency<T>(
  key: string,
  fn: () => Promise<{ response: T; status?: number }>
): Promise<{ response: T; status: number; duplicate?: boolean }> {
  const check = checkIdempotency(key);
  if (check.isDuplicate) {
    return { response: check.cachedResult, status: check.status || 200, duplicate: true };
  }

  // Handle in-flight duplicate requests
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)!;
  }

  const execPromise = (async () => {
    try {
      const result = await fn();
      recordIdempotentResponse(key, result.response, result.status || 200);
      return { response: result.response, status: result.status || 200 };
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, execPromise);
  return execPromise;
}

```

### lib/utils/api-response.ts (18 lines)
```typescript
// lib/utils/api-response.ts
import { NextResponse } from 'next/server';

export interface StandardApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export function apiSuccess<T>(data: T, status = 200, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, { status, ...init });
}

export function apiError(error: string, code = 'BAD_REQUEST', status = 400, init?: ResponseInit) {
  return NextResponse.json({ success: false, error, code }, { status, ...init });
}

```

### lib/utils/qr-session.ts (103 lines)
```typescript
import type { DineInSessionStatus, OrderItemRecord } from '@/types/qr-session';

export interface OrderTotalSummary {
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  totalQuantity: number;
}

export function calculateOrderTotals(
  items: Array<{ price: number; quantity: number }>,
  taxRatePercent: number = 5
): OrderTotalSummary {
  const subtotal = (items || []).reduce((acc, item) => {
    const p = Number(item.price) || 0;
    const q = Math.max(0, Number(item.quantity) || 0);
    return acc + p * q;
  }, 0);

  const totalQuantity = (items || []).reduce((acc, item) => {
    return acc + Math.max(0, Number(item.quantity) || 0);
  }, 0);

  const taxAmount = Number(((subtotal * taxRatePercent) / 100).toFixed(2));
  const grandTotal = Number((subtotal + taxAmount).toFixed(2));

  return {
    subtotal: Number(subtotal.toFixed(2)),
    taxAmount,
    grandTotal,
    totalQuantity,
  };
}

export interface AggregatedCartLine {
  id: string;
  name: string;
  price: number;
  qty: number;
  notes?: string;
  kot_status?: string;
}

export function aggregateOrderItems(items: Array<any>): AggregatedCartLine[] {
  const map = new Map<string, AggregatedCartLine>();

  for (const item of items || []) {
    const itemName = item.item_name || item.name || 'Item';
    const key = `${item.item_id || itemName}-${item.price}`;
    const qty = Number(item.quantity ?? item.qty ?? 1);
    const existing = map.get(key);

    if (existing) {
      existing.qty += qty;
      if (item.notes && !existing.notes?.includes(item.notes)) {
        existing.notes = existing.notes ? `${existing.notes}, ${item.notes}` : item.notes;
      }
    } else {
      map.set(key, {
        id: item.item_id || item.id || itemName,
        name: itemName,
        price: Number(item.price) || 0,
        qty,
        notes: item.notes || undefined,
        kot_status: item.kot_status,
      });
    }
  }

  return Array.from(map.values());
}

export function getTableVisualState(sessionStatus?: DineInSessionStatus | null): {
  color: 'grey' | 'green' | 'amber';
  label: string;
  badgeStyle: string;
  borderStyle: string;
} {
  switch (sessionStatus) {
    case 'bill_requested':
      return {
        color: 'amber',
        label: 'Bill Requested',
        badgeStyle: 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse',
        borderStyle: 'border-amber-400 bg-amber-50/70 ring-2 ring-amber-300/50',
      };
    case 'open':
      return {
        color: 'green',
        label: 'Active (Dining)',
        badgeStyle: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        borderStyle: 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-400/40',
      };
    default:
      return {
        color: 'grey',
        label: 'Available',
        badgeStyle: 'bg-zinc-100 text-zinc-600 border-zinc-200',
        borderStyle: 'border-zinc-200 bg-zinc-50 hover:border-zinc-300',
      };
  }
}

```

## 4. API Route Handlers (`app/api/**/route.ts`)

### app/api/admin/reset-balance/route.ts (54 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mem } from '@/lib/services/wallet/wallet-memory.store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const body = await request.json().catch(() => ({}));
    const targetVenue = body.venueId || 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
    const targetBalance = typeof body.balance === 'number' ? body.balance : 1500;
    const targetPlanTier = body.planTier || null;

    // 1. Update venue_wallets table
    await supabase
      .from('venue_wallets')
      .update({ balance: targetBalance, updated_at: new Date().toISOString() })
      .eq('venue_id', targetVenue);

    // 2. If targetPlanTier provided, update venue_subscriptions table
    if (targetPlanTier) {
      await supabase
        .from('venue_subscriptions')
        .update({ plan_tier: targetPlanTier, updated_at: new Date().toISOString() })
        .eq('venue_id', targetVenue);
    }

    // 3. Remove test ledger entries if any
    await supabase
      .from('usage_ledger')
      .delete()
      .eq('venue_id', targetVenue)
      .eq('reference_id', 'TOPUP_1791022750554');

    // 4. Sync in-memory store
    if (mem.has(targetVenue)) {
      const c = mem.get(targetVenue)!;
      c.wallet.balance = targetBalance;
      if (targetPlanTier) c.subscription.plan_tier = targetPlanTier;
    }

    return NextResponse.json({
      success: true,
      message: `Balance restored to ₹${targetBalance}.00`,
      venueId: targetVenue,
      balance: targetBalance,
      planTier: targetPlanTier,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

```

### app/api/admin/topup-requests/route.ts (55 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getAllTopupRequests,
  approveTopupRequest,
  rejectTopupRequest,
} from '@/lib/services/wallet/venue-wallet.service';
import type { TopupRequestStatus } from '@/types/wallet';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status') as TopupRequestStatus | 'all' | null;

    const requests = await getAllTopupRequests(supabase, statusParam || 'all');
    return NextResponse.json({ success: true, requests });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const { requestId, action, reason, adminId } = body;

    if (!requestId) {
      return NextResponse.json({ success: false, error: 'requestId is required' }, { status: 400 });
    }

    if (action === 'approve') {
      const res = await approveTopupRequest(supabase, requestId, adminId || 'admin-desk');
      return NextResponse.json(res);
    }

    if (action === 'reject') {
      const res = await rejectTopupRequest(
        supabase,
        requestId,
        reason || 'Payment verification failed',
        adminId || 'admin-desk'
      );
      return NextResponse.json(res);
    }

    return NextResponse.json({ success: false, error: 'Invalid action. Must be approve or reject.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

```

### app/api/guest/call-staff/route.ts (32 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { venue_id, table_number, type } = body;

    const supabase = createClient();
    const { data, error } = await supabase
      .from('staff_notifications')
      .insert({
        business_id: venue_id,
        table_number,
        notification_type: type,
        status: 'PENDING',
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[API Call Staff] Supabase note:', error.message);
    }

    return NextResponse.json({ success: true, notification: data });
  } catch (err: any) {
    console.error('[API Call Staff] Error:', err);
    return NextResponse.json({ success: true, cached: true });
  }
}

```

### app/api/guest/lobby/route.ts (278 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Memory fallback store for lobby messages & invitations
const memoryLobbyMessages: any[] = [];
const memoryInvitations: any[] = [];
const memoryPrivateChats: any[] = [];
const memoryChatMessages: any[] = [];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'messages';
    const supabase = createClient();

    if (type === 'messages') {
      try {
        const { data, error } = await supabase
          .from('lobby_messages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);

        if (!error && data && data.length > 0) {
          return NextResponse.json({ success: true, messages: data });
        }
      } catch (e) {
        console.warn('[API Guest Lobby GET messages]', e);
      }

      return NextResponse.json({
        success: true,
        messages: memoryLobbyMessages.slice(0, 30),
      });
    }

    if (type === 'chat') {
      const chatId = searchParams.get('chat_id');
      if (!chatId) {
        return NextResponse.json({ error: 'Missing chat_id' }, { status: 400 });
      }

      try {
        const { data, error } = await supabase
          .from('private_chat_messages')
          .select('*')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          return NextResponse.json({ success: true, messages: data });
        }
      } catch (e) {
        console.warn('[API Guest Lobby GET chat]', e);
      }

      const local = memoryChatMessages.filter((m) => m.chat_id === chatId);
      return NextResponse.json({ success: true, messages: local });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Guest Lobby GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'invite';
    const body = await request.json();
    const supabase = createClient();

    // 1. Post a public message to the Global Lobby
    if (type === 'messages') {
      const { session_id, guest_name, avatar, table_number, content } = body;
      if (!content || !guest_name) {
        return NextResponse.json({ error: 'Missing content or guest_name' }, { status: 400 });
      }

      const newMsg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        session_id: session_id || 'anon',
        guest_name,
        avatar: avatar || '☕',
        table_number: table_number || 'Lobby',
        content,
        created_at: new Date().toISOString(),
      };

      try {
        const { data, error } = await supabase
          .from('lobby_messages')
          .insert({
            session_id: newMsg.session_id,
            guest_name: newMsg.guest_name,
            avatar: newMsg.avatar,
            table_number: newMsg.table_number,
            content: newMsg.content,
          })
          .select()
          .single();

        if (!error && data) {
          return NextResponse.json({ success: true, message: data });
        }
      } catch (e) {
        console.warn('[API Guest Lobby POST message]', e);
      }

      memoryLobbyMessages.unshift(newMsg);
      return NextResponse.json({ success: true, message: newMsg });
    }

    // 2. Post a message to Private Chat
    if (type === 'chat') {
      const { chat_id, sender_session_id, sender_name, message } = body;
      if (!chat_id || !message) {
        return NextResponse.json({ error: 'Missing chat_id or message' }, { status: 400 });
      }

      const newChatMsg = {
        id: `cmsg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        chat_id,
        sender_session_id: sender_session_id || 'anon',
        sender_name: sender_name || 'Guest',
        message,
        created_at: new Date().toISOString(),
      };

      try {
        const { data, error } = await supabase
          .from('private_chat_messages')
          .insert({
            chat_id,
            sender_session_id: newChatMsg.sender_session_id,
            sender_name: newChatMsg.sender_name,
            message: newChatMsg.message,
          })
          .select()
          .single();

        if (!error && data) {
          return NextResponse.json({ success: true, message: data });
        }
      } catch (e) {
        console.warn('[API Guest Lobby POST chat]', e);
      }

      memoryChatMessages.push(newChatMsg);
      return NextResponse.json({ success: true, message: newChatMsg });
    }

    // 3. Create Table Invitation (Phase 3 Requirement 3)
    const {
      sender_session_id,
      sender_name,
      sender_table,
      sender_avatar,
      receiver_table,
      receiver_session_id,
      interaction_type,
      custom_message,
    } = body;

    if (!sender_table || !receiver_table || !interaction_type) {
      return NextResponse.json({ error: 'Missing required invitation fields' }, { status: 400 });
    }

    const invitation = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender_session_id: sender_session_id || 'anon',
      sender_name: sender_name || 'Guest',
      sender_table,
      sender_avatar: sender_avatar || '☕',
      receiver_table,
      receiver_session_id: receiver_session_id || null,
      interaction_type,
      custom_message: custom_message || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('table_invitations')
        .insert({
          sender_session_id: invitation.sender_session_id,
          sender_name: invitation.sender_name,
          sender_table: invitation.sender_table,
          sender_avatar: invitation.sender_avatar,
          receiver_table: invitation.receiver_table,
          receiver_session_id: invitation.receiver_session_id,
          interaction_type: invitation.interaction_type,
          custom_message: invitation.custom_message,
          status: 'pending',
        })
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json({ success: true, invitation: data });
      }
    } catch (e) {
      console.warn('[API Guest Lobby POST invitation]', e);
    }

    memoryInvitations.unshift(invitation);
    return NextResponse.json({ success: true, invitation });
  } catch (error: any) {
    console.error('[API Guest Lobby POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      invitation_id,
      status, // 'accepted' | 'declined'
      receiver_session_id,
      sender_session_id,
      receiver_table,
      sender_table,
    } = body;

    const supabase = createClient();
    let chatId: string | null = null;

    if (status === 'accepted') {
      chatId = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      // Create private_chats record
      try {
        const { data: chatRow } = await supabase
          .from('private_chats')
          .insert({
            session_a: sender_session_id || 'session-a',
            session_b: receiver_session_id || 'session-b',
            table_a: sender_table || 'Table A',
            table_b: receiver_table || 'Table B',
            status: 'active',
          })
          .select()
          .single();

        if (chatRow?.id) {
          chatId = chatRow.id;
        }
      } catch (e) {
        console.warn('[API Guest Lobby PATCH private_chats]', e);
      }
    }

    // Update invitation status
    try {
      await supabase
        .from('table_invitations')
        .update({
          status,
          chat_id: chatId,
        })
        .eq('id', invitation_id);
    } catch {}

    return NextResponse.json({
      success: true,
      status,
      chat_id: chatId,
    });
  } catch (error: any) {
    console.error('[API Guest Lobby PATCH]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

```

### app/api/guest/menu/route.ts (165 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface CachedMenu {
  business: { id: string; name: string };
  items: any[];
  tables: any[];
  timestamp: number;
}

const menuCache = new Map<string, CachedMenu>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

const categoryPriority = (cat?: string) => {
  const c = (cat || '').toLowerCase();
  if (c.includes('starter') || c.includes('appetizer')) return 1;
  if (c.includes('main') || c.includes('entree') || c.includes('pizza') || c.includes('pasta')) return 2;
  if (c.includes('dessert') || c.includes('sweet')) return 3;
  if (c.includes('beverage') || c.includes('drink') || c.includes('coffee')) return 4;
  if (c.includes('service') || c.includes('spa')) return 8;
  if (c.includes('accommodation') || c.includes('room') || c.includes('cabana') || c.includes('suite')) return 9;
  return 5;
};

function findMatchingTable(tables: any[], tableParam: string, businessId: string) {
  const norm = tableParam.toLowerCase().replace(/[^a-z0-9]/g, '');
  const match = (tables || []).find((t: any) => {
    const tNorm = (t.table_number || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return tNorm === norm || tNorm.includes(norm) || norm.includes(tNorm);
  });
  return match || {
    id: `virtual-${tableParam}`,
    table_number: tableParam,
    business_id: businessId,
    seating_capacity: 4,
    status: 'VACANT',
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tableParamRaw = searchParams.get('table') || searchParams.get('table_number');
    const cafeParamRaw = searchParams.get('cafe_id') || searchParams.get('venue') || searchParams.get('business_id');

    // Robust UUID extraction from cafeParamRaw
    const uuidMatch = cafeParamRaw ? cafeParamRaw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) : null;
    let cafeParam = uuidMatch ? uuidMatch[0] : (cafeParamRaw ? cafeParamRaw.trim().split(/[\s,]+/)[0].replace(/[^\w-]/g, '') : null);

    // Robust table number extraction (e.g. "T-05")
    const tableMatch = tableParamRaw ? tableParamRaw.match(/[a-zA-Z0-9-]+/) : null;
    const tableParam = tableMatch ? tableMatch[0] : 'T-01';

    if (!cafeParam) {
      cafeParam = 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
    }

    const supabase = createClient();
    const now = Date.now();
    const cached = menuCache.get(cafeParam);

    // Ultra-Fast Path: In-memory cached menu & venue tables (0ms DB delay)
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      const validTable = findMatchingTable(cached.tables, tableParam, cafeParam);
      return NextResponse.json({
        success: true,
        table: {
          id: validTable.id,
          table_number: validTable.table_number,
          seating_capacity: validTable.seating_capacity || 4,
        },
        business: cached.business,
        items: cached.items,
      });
    }

    // Parallel fetch: business, all venue tables, and catalog items concurrently
    const [bizRes, tablesRes, itemsRes] = await Promise.all([
      supabase.from('businesses').select('*').eq('id', cafeParam).maybeSingle(),
      supabase
        .from('restaurant_tables')
        .select('id, table_number, business_id, seating_capacity, status')
        .eq('business_id', cafeParam),
      supabase
        .from('catalog_items')
        .select('*')
        .or(`business_id.eq.${cafeParam},location_id.eq.${cafeParam}`)
        .eq('is_available', true),
    ]);

    let businessData = bizRes.data;
    if (!businessData) {
      const { data: defaultBiz } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269')
        .maybeSingle();
      if (defaultBiz) businessData = defaultBiz;
    }

    if (!businessData) {
      return NextResponse.json(
        { error: 'The requested venue could not be found or is currently offline.' },
        { status: 404 }
      );
    }

    const businessId = businessData.id;
    let businessName =
      (businessData as any).name ||
      (businessData as any).business_name ||
      (businessData as any).venue_name ||
      (businessData as any).branch_name ||
      '';

    if (!businessName) {
      businessName = 'Venus Cafe Oldmanali';
    }

    const venueTables = tablesRes.data || [];
    const validTableData = findMatchingTable(venueTables, tableParam, businessId);

    let items: any[] = [];
    if (itemsRes.data && itemsRes.data.length > 0) {
      items = itemsRes.data.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: item.price ? Number(item.price) : 0,
        category: item.category || 'General',
        type: item.item_type || (item.category?.toLowerCase().includes('accommodation') ? 'accommodation' : 'food'),
        image_url: item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
      }));
    }

    items.sort((a, b) => categoryPriority(a.category) - categoryPriority(b.category));

    // Store in memory cache for sub-millisecond responses
    menuCache.set(cafeParam, {
      business: { id: businessId, name: businessName },
      items,
      tables: venueTables,
      timestamp: now,
    });

    return NextResponse.json({
      success: true,
      table: {
        id: validTableData.id,
        table_number: validTableData.table_number,
        seating_capacity: validTableData.seating_capacity || 4,
      },
      business: {
        id: businessId,
        name: businessName,
      },
      items,
    });
  } catch (error: any) {
    console.error('[API Guest Menu GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


```

### app/api/guest/onboard/route.ts (177 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// In-memory fallback cache for high availability if remote DB schema is pending
const inMemoryGuestSessions = new Map<string, any>();

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return null;
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { guest_name, table_number, cafe_id } = body;

    // 1. Validation
    if (!guest_name || typeof guest_name !== 'string' || !guest_name.trim()) {
      return NextResponse.json(
        { success: false, error: 'guest_name is required' },
        { status: 400 }
      );
    }

    if (!table_number || typeof table_number !== 'string' || !table_number.trim()) {
      return NextResponse.json(
        { success: false, error: 'table_number is required' },
        { status: 400 }
      );
    }

    const normalizedName = guest_name.trim();
    const normalizedTable = table_number.trim();
    const normalizedCafeId = (cafe_id && typeof cafe_id === 'string' && cafe_id.trim())
      ? cafe_id.trim()
      : 'quad-default';

    // Generate strict customer UUID
    const customerId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const newGuestRecord = {
      customer_id: customerId,
      session_id: customerId,
      cafe_id: normalizedCafeId,
      table_number: normalizedTable,
      guest_name: normalizedName,
      avatar: '☕',
      status: 'active',
      created_at: nowIso,
      updated_at: nowIso,
    };

    // Store in-memory immediately as backup
    inMemoryGuestSessions.set(customerId, newGuestRecord);

    // 2. Attempt Supabase Admin Insert
    const supabase = getAdminClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('guest_sessions')
          .insert([newGuestRecord])
          .select('*')
          .single();

        if (!error && data) {
          return NextResponse.json({
            success: true,
            customer_id: data.customer_id || customerId,
            session: data,
          });
        }

        if (error) {
          console.warn('[POST /api/guest/onboard] Supabase insert note:', error.message);
          // Try inserting with standard columns only if custom columns aren't migrated
          const { data: retryData, error: retryError } = await supabase
            .from('guest_sessions')
            .insert([{
              session_id: customerId,
              table_number: normalizedTable,
              guest_name: normalizedName,
              avatar: '☕',
              status: 'active',
            }])
            .select('*')
            .single();

          if (!retryError && retryData) {
            return NextResponse.json({
              success: true,
              customer_id: customerId,
              session: {
                ...retryData,
                customer_id: customerId,
                cafe_id: normalizedCafeId,
              },
            });
          }
        }
      } catch (dbEx: any) {
        console.warn('[POST /api/guest/onboard] DB operation caught:', dbEx.message);
      }
    }

    // 3. Resilient fallback response
    return NextResponse.json({
      success: true,
      customer_id: customerId,
      session: newGuestRecord,
      cached: true,
    });
  } catch (error: any) {
    console.error('[POST /api/guest/onboard] Critical unhandled error:', error);
    const fallbackCustomerId = crypto.randomUUID();
    return NextResponse.json(
      {
        success: true,
        customer_id: fallbackCustomerId,
        session: {
          customer_id: fallbackCustomerId,
          session_id: fallbackCustomerId,
          guest_name: 'Guest',
          table_number: 'T-01',
          cafe_id: 'quad-default',
          status: 'active',
          created_at: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');

    if (!customerId) {
      return NextResponse.json({ error: 'Missing customer_id parameter' }, { status: 400 });
    }

    // Check memory first
    if (inMemoryGuestSessions.has(customerId)) {
      return NextResponse.json({
        success: true,
        session: inMemoryGuestSessions.get(customerId),
      });
    }

    const supabase = getAdminClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('guest_sessions')
        .select('*')
        .eq('customer_id', customerId)
        .maybeSingle();

      if (!error && data) {
        return NextResponse.json({ success: true, session: data });
      }
    }

    return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

```

### app/api/guest/order/route.ts (49 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGuestActiveOrder, placeGuestOrder } from '@/lib/services/guest-order.service';

/**
 * GET /api/guest/order
 * Check if there is an active, unbilled order running for the given table.
 */
import { apiError } from '@/lib/utils/api-response';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const result = await getGuestActiveOrder(request.url, supabase);
    return NextResponse.json({ ...result, data: result });
  } catch (error: any) {
    console.error('[API Guest Order GET]', error);
    const status = error.message?.includes('Missing') ? 400 : 500;
    return apiError(error.message || 'Internal Server Error', status === 400 ? 'INVALID_PARAMS' : 'INTERNAL_ERROR', status);
  }
}

/**
 * POST /api/guest/order
 * Smart Active Order Detection & Add-on Order Flow:
 * If an active unbilled order exists for the table, appends new items to that master order
 * and generates an add-on KOT ticket. Otherwise, creates a fresh master order.
 */
import { withIdempotency, generateIdempotencyKey } from '@/lib/services/api-idempotency.util';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const body = await request.json().catch(() => ({}));
    const key = generateIdempotencyKey('guest_order', `${body?.business_id || ''}:${body?.table_number || ''}`, body);

    const { response, status } = await withIdempotency(key, async () => {
      const result = await placeGuestOrder(body, supabase);
      return { response: { ...result, data: result }, status: 200 };
    });

    return NextResponse.json(response, { status });
  } catch (error: any) {
    console.error('[API Guest Order POST]', error);
    const status = error.message?.includes('Missing') || error.message?.includes('No items') ? 400 : 500;
    return apiError(error.message || 'Internal Server Error', status === 400 ? 'INVALID_PAYLOAD' : 'INTERNAL_ERROR', status);
  }
}

```

### app/api/guest/reviews/route.ts (120 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { INITIAL_REVIEWS } from '@/components/guest/lobby/reviews/reviews.constants';

// In-Memory Persistent Store for Verified Reviews
let memoryReviews = [...INITIAL_REVIEWS];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cafeId = searchParams.get('cafe_id') || searchParams.get('business_id') || 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';

    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('venue_reviews')
        .select('*')
        .eq('business_id', cafeId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped = data.map((r: any) => ({
          id: r.id,
          author: r.author,
          table: r.table_number,
          rating: Number(r.rating || 5),
          comment: r.comment,
          tags: r.tags || [],
          images: r.images || [],
          verified: r.verified ?? true,
          helpfulCount: Number(r.helpful_count || 0),
          timestamp: r.created_at
            ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Recently',
        }));
        return NextResponse.json({ success: true, reviews: mapped });
      }
    } catch (dbErr) {
      console.warn('[API Reviews GET Note]:', dbErr);
    }

    return NextResponse.json({
      success: true,
      reviews: memoryReviews,
    });
  } catch (error: any) {
    console.error('[API Reviews GET Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      business_id,
      author,
      table,
      table_number,
      rating,
      comment,
      tags,
      images,
      verified,
    } = body;

    const resolvedTable = table || table_number || 'T-01';
    const resolvedBiz = business_id || 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
    const newId = `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const newReview = {
      id: newId,
      author: author || 'Guest',
      table: resolvedTable,
      rating: Number(rating || 5),
      comment: comment || '',
      tags: tags || [],
      images: images || [],
      verified: verified ?? true,
      helpfulCount: 0,
      timestamp: 'Just now',
    };

    // 1. Store in memory
    memoryReviews = [newReview, ...memoryReviews];

    // 2. Attempt Supabase Table Insertion
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('venue_reviews')
        .insert({
          business_id: resolvedBiz,
          author: newReview.author,
          table_number: resolvedTable,
          rating: newReview.rating,
          comment: newReview.comment,
          tags: newReview.tags,
          images: newReview.images,
          verified: newReview.verified,
          helpful_count: 0,
        })
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json({ success: true, review: { ...newReview, id: data.id } });
      }
    } catch (dbErr) {
      console.warn('[API Reviews POST Note]:', dbErr);
    }

    return NextResponse.json({ success: true, review: newReview });
  } catch (error: any) {
    console.error('[API Reviews POST Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

```

### app/api/guest/session/route.ts (45 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  initializeGuestSession,
  getGuestSession,
  updateGuestSession,
} from '@/lib/services/guest-session.service';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const result = await initializeGuestSession(body, supabase);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Guest Session Error:', error);
    const status = error.message?.includes('Missing') ? 400 : 500;
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const result = await getGuestSession(request.url, supabase);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Guest Session GET Error:', error);
    const status = error.message?.includes('Missing') ? 400 : 500;
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const result = await updateGuestSession(body, supabase);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Guest Session PATCH Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

```

### app/api/guest/wallet/redeem/route.ts (59 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createRedemptionRequest } from '@/lib/services/wallet/redemption.service';
import { inMemoryRedemptions } from '@/lib/services/wallet/redemption-store.util';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createClient();
    const { withIdempotency, generateIdempotencyKey } = await import('@/lib/services/api-idempotency.util');
    const key = generateIdempotencyKey(
      'guest_redeem',
      `${body?.cafe_id || body?.business_id || ''}:${body?.guest_id || body?.guest_handle || ''}`,
      body
    );

    const { response, status } = await withIdempotency(key, async () => {
      const result = await createRedemptionRequest(supabase, body);
      return { response: result, status: result.success ? 200 : 400 };
    });

    return NextResponse.json(response, { status });
  } catch (error: any) {
    console.error('[API Guest Wallet Redeem POST]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guest_id') || searchParams.get('handle');
    const cafeId = searchParams.get('cafe_id') || searchParams.get('business_id');

    if (!guestId) {
      return NextResponse.json({ success: false, error: 'guest_id required' }, { status: 400 });
    }

    const cleanHandle = guestId.startsWith('@') ? guestId : `@${guestId}`;
    let active: any = null;

    for (const rec of Array.from(inMemoryRedemptions.values())) {
      if (
        (rec.guest_id === guestId || rec.guest_handle === cleanHandle || rec.guest_id === cleanHandle) &&
        (!cafeId || rec.cafe_id === cafeId) &&
        (rec.status === 'pending' || rec.status === 'verified') &&
        new Date(rec.expires_at).getTime() > Date.now()
      ) {
        active = rec;
        break;
      }
    }

    return NextResponse.json({ success: true, active_redemption: active });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

```

### app/api/guest/wallet/route.ts (40 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGuestWallet, creditOrderCashback } from '@/lib/services/wallet/cashback.service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guest_id') || searchParams.get('session_id') || searchParams.get('handle') || searchParams.get('phone') || 'gst-current';
    const businessId = searchParams.get('cafe_id') || searchParams.get('business_id') || searchParams.get('venue_id') || undefined;
    const extraIdentifiers = [
      searchParams.get('handle'),
      searchParams.get('guest_handle'),
      searchParams.get('phone'),
      searchParams.get('customer_phone'),
      searchParams.get('name'),
      searchParams.get('guest_name'),
      searchParams.get('session_id'),
    ].filter((id): id is string => Boolean(id && typeof id === 'string' && id.trim().length > 0));

    const supabase = createClient();
    const result = await getGuestWallet(supabase, guestId, businessId, extraIdentifiers);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Guest Wallet GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createClient();
    const result = await creditOrderCashback(supabase, body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Guest Wallet POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

```

### app/api/host/accommodations/categories/route.ts (82 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getAccommodationsCategories,
  createAccommodationCategory,
  deleteAccommodationCategory,
  updateAccommodationCategory,
} from '@/lib/services/accommodation.service';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUser(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function GET() {
  try {
    const supabase = createClient();
    const user = await getAuthenticatedUser(supabase);
    const userId = user?.id || '';

    const result = await getAccommodationsCategories(supabase, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Accommodations Categories GET]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const user = await getAuthenticatedUser(supabase);
    const userId = user?.id || '';

    const body = await request.json();
    const result = await createAccommodationCategory(body, supabase, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Accommodations Categories POST Error]', error);
    const status = error.message?.includes('required') ? 400 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createClient();
    const user = await getAuthenticatedUser(supabase);
    const userId = user?.id || '';

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('id');
    if (!categoryId) return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 });

    const result = await deleteAccommodationCategory(categoryId, supabase, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Accommodations Categories DELETE Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient();
    const user = await getAuthenticatedUser(supabase);
    const userId = user?.id || '';

    const body = await request.json();
    const result = await updateAccommodationCategory(body, supabase, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Accommodations Categories PATCH Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const PUT = PATCH;

```

### app/api/host/accommodations/history/route.ts (140 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateNights, computeStayHistoryMetrics } from '@/lib/utils/accommodations';
import type { HistoricalStayRecord } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('host_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const roomId = searchParams.get('room_id')?.trim();
    const categoryId = searchParams.get('category_id')?.trim();
    const startDate = searchParams.get('start_date')?.trim();
    const endDate = searchParams.get('end_date')?.trim();
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Build query for room_stay_logs joined with room and room_category
    let query = supabase
      .from('room_stay_logs')
      .select(`
        *,
        room:rooms (
          id,
          room_number,
          category:room_categories (
            id,
            name,
            price,
            photos,
            amenities,
            addons
          )
        )
      `)
      .eq('business_id', business.id)
      .order('check_out_time', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (roomId) {
      query = query.eq('room_id', roomId);
    }

    if (startDate) {
      query = query.gte('check_out_time', startDate);
    }

    if (endDate) {
      query = query.lte('check_out_time', endDate);
    }

    if (search) {
      // Supabase ilike filter for guest name or phone
      query = query.or(`guest_name.ilike.%${search}%,guest_phone.ilike.%${search}%`);
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      console.error('[API Accommodations History GET Error]', logsError);
      return NextResponse.json({ success: false, error: logsError.message }, { status: 500 });
    }

    // Filter by category_id if provided
    let filteredLogs = logs || [];
    if (categoryId && categoryId !== 'ALL') {
      filteredLogs = filteredLogs.filter(log => log.room?.category?.id === categoryId);
    }

    // Map into enriched HistoricalStayRecord payload
    const enrichedStays: HistoricalStayRecord[] = filteredLogs.map((log: any) => {
      const roomNumber = log.room?.room_number || 'Room';
      const categoryName = log.room?.category?.name || 'Standard Accommodation';
      const categoryPrice = Number(log.room?.category?.price) || 0;
      const nights = calculateNights(log.check_in_time, log.check_out_time);
      const calculatedTariff = categoryPrice * nights;
      const totalBilled = Number(log.total_billed_amount) || calculatedTariff;

      let idType = log.id_type || null;
      let idNumber = log.id_number || null;
      if (!idType && !idNumber && log.guest_id_proof) {
        if (log.guest_id_proof.includes(':')) {
          const parts = log.guest_id_proof.split(':');
          idType = parts[0].trim();
          idNumber = parts.slice(1).join(':').trim();
        } else {
          idType = 'Govt ID';
          idNumber = log.guest_id_proof.trim();
        }
      }

      return {
        ...log,
        id_type: idType,
        id_number: idNumber,
        guest_email: log.guest_email || null,
        guest_address: log.guest_address || null,
        nights,
        status: log.check_out_time ? 'SETTLED' : 'IN_HOUSE',
        room_number: roomNumber,
        category_name: categoryName,
        category_price: categoryPrice,
        calculated_tariff: calculatedTariff,
        total_billed_amount: totalBilled
      };
    });

    // Compute summary metrics for host dashboard
    const metrics = computeStayHistoryMetrics(enrichedStays);

    return NextResponse.json({
      success: true,
      stays: enrichedStays,
      metrics
    });
  } catch (error: any) {
    console.error('[API Accommodations History GET Exception]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

```

### app/api/host/accommodations/rooms/[id]/checkout/route.ts (297 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const roomId = params.id;
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'Room ID required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const paymentMethod = body.payment_method || 'CASH';

    // 1. Fetch current room details with category
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select(`
        *,
        category:room_categories(*)
      `)
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ success: false, error: roomError?.message || 'Room not found' }, { status: 404 });
    }

    // 2. Fetch all unsettled orders to compute total F&B billed and check for master stay order
    const { data: activeOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('room_id', roomId)
      .neq('status', 'SETTLED')
      .neq('status', 'CANCELLED');

    const masterStayOrder = (activeOrders || []).find(o => o.order_type === 'room_stay');
    const fAndBOrders = (activeOrders || []).filter(o => o.order_type !== 'room_stay');
    const ordersTotal = fAndBOrders.reduce((acc, o) => acc + (Number(o.grand_total) || 0), 0);

    // 3. Compute Stay & Add-on charges
    let nights = 1;
    if (room.check_in_time || room.check_in_date) {
      const checkIn = new Date(room.check_in_time || room.check_in_date).getTime();
      const checkOut = Date.now();
      const diffDays = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      nights = Math.max(1, diffDays || 1);
    }

    let roomTariffTotal = 0;
    let addonsTotal = 0;

    if (masterStayOrder && Number(masterStayOrder.grand_total) > 0) {
      const masterTotal = Number(masterStayOrder.grand_total);
      const roomRate = Number(room.category?.price) || 0;
      roomTariffTotal = roomRate * nights;
      addonsTotal = Math.max(0, masterTotal - roomTariffTotal);
    } else {
      const roomRate = Number(room.category?.price) || 0;
      roomTariffTotal = roomRate * nights;
      const selectedAddons: any[] = Array.isArray(room.selected_addons) ? room.selected_addons : [];
      addonsTotal = selectedAddons.reduce((acc, a) => {
        const p = Number(a.price) || 0;
        if (a.billingType === 'per_night' || a.billingType === 'per_person_per_day') {
          return acc + p * nights;
        }
        return acc + p;
      }, 0);
    }

    const finalBilledAmount = roomTariffTotal + addonsTotal + ordersTotal;
    const nowIso = new Date().toISOString();

    // 4. Build consolidated folio items
    const roomStayItem = {
      id: `tariff-${roomId}`,
      name: `Room ${room.room_number} Stay (${nights} Night${nights > 1 ? 's' : ''} - ${room.category?.name || 'Standard'})`,
      price: roomTariffTotal,
      qty: 1,
      type: 'room_tariff'
    };

    const selectedAddons: any[] = Array.isArray(room.selected_addons) ? room.selected_addons : [];
    const addonLineItems = selectedAddons.map((addon: any) => {
      const p = Number(addon.price) || 0;
      const price = (addon.billingType === 'per_night' || addon.billingType === 'per_person_per_day')
        ? p * nights
        : p;
      return {
        id: addon.id || `addon-${Math.random().toString(36).substring(7)}`,
        name: `${addon.name}${addon.billingType ? ` (${addon.billingType})` : ''}`,
        price,
        qty: 1,
        billingType: addon.billingType,
        type: 'addon'
      };
    });

    const fAndBItems = fAndBOrders.flatMap(o => (Array.isArray(o.items) ? o.items : []));
    const consolidatedItems = [roomStayItem, ...addonLineItems, ...fAndBItems];

    // 5. Mark linked master order in `orders` as ready for settlement
    let masterOrderId = masterStayOrder?.id;

    if (masterStayOrder) {
      const { data: updatedMaster } = await supabase
        .from('orders')
        .update({
          customer_name: room.guest_name || masterStayOrder.customer_name || 'Guest',
          customer_phone: room.guest_phone || masterStayOrder.customer_phone || '',
          table_number: `ROOM ${room.room_number}`,
          items: consolidatedItems,
          subtotal: finalBilledAmount,
          grand_total: finalBilledAmount,
          total_amount: finalBilledAmount,
          status: paymentMethod && body.payment_method ? 'SETTLED' : 'ready_for_settlement',
          payment_method: paymentMethod || 'UPI'
        })
        .eq('id', masterStayOrder.id)
        .select('id')
        .single();
      masterOrderId = updatedMaster?.id || masterStayOrder.id;
    } else {
      const { data: newMasterOrder } = await supabase
        .from('orders')
        .insert({
          business_id: room.business_id,
          room_id: roomId,
          order_type: 'room_stay',
          customer_name: room.guest_name || 'Guest',
          customer_phone: room.guest_phone || '',
          table_number: `ROOM ${room.room_number}`,
          status: paymentMethod && body.payment_method ? 'SETTLED' : 'ready_for_settlement',
          order_source: 'POS',
          items: consolidatedItems,
          subtotal: finalBilledAmount,
          grand_total: finalBilledAmount,
          total_amount: finalBilledAmount,
          payment_method: paymentMethod || 'UPI',
          created_at: room.check_in_time || nowIso
        })
        .select('id')
        .single();
      masterOrderId = newMasterOrder?.id;
    }

    // Mark any active child room service orders as settled/merged
    if (fAndBOrders.length > 0) {
      await supabase
        .from('orders')
        .update({
          status: 'SETTLED',
          master_order_id: masterOrderId
        })
        .in('id', fAndBOrders.map(o => o.id));
    }

    // 6. Update or insert historical room_stay_logs
    try {
      const { data: openLog } = await supabase
        .from('room_stay_logs')
        .select('id')
        .eq('room_id', roomId)
        .is('check_out_time', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openLog) {
        await supabase
          .from('room_stay_logs')
          .update({
            check_out_time: nowIso,
            total_billed_amount: finalBilledAmount
          })
          .eq('id', openLog.id);
      } else if (room.guest_name) {
        await supabase.from('room_stay_logs').insert({
          business_id: room.business_id,
          room_id: roomId,
          guest_name: room.guest_name,
          guest_phone: room.guest_phone || '',
          id_type: room.id_type || null,
          id_number: room.id_number || null,
          guest_email: room.guest_email || null,
          guest_address: room.guest_address || null,
          guest_id_proof: room.guest_id_proof || null,
          check_in_time: room.check_in_time || room.check_in_date || nowIso,
          check_out_time: nowIso,
          total_guests: room.total_guests || 1,
          purpose_of_visit: room.purpose_of_visit || 'Leisure',
          is_celebration: room.is_celebration || false,
          celebration_type: room.celebration_type || null,
          celebration_note: room.celebration_note || null,
          selected_addons: room.selected_addons || [],
          total_billed_amount: finalBilledAmount
        });
      }
    } catch (logErr) {
      console.error('[API Checkout Stay Log Update Error]', logErr);
    }

    // 7. Reset room status to CLEANING and clear guest active session
    const { data: updatedRoom, error: updateError } = await supabase
      .from('rooms')
      .update({
        status: 'CLEANING',
        check_out_date: nowIso,
        check_out_time: nowIso,
        guest_name: null,
        guest_phone: null,
        guest_id_proof: null,
        id_type: null,
        id_number: null,
        guest_email: null,
        guest_address: null,
        current_guest_id: null,
        total_guests: 1,
        purpose_of_visit: null,
        is_celebration: false,
        celebration_type: null,
        celebration_note: null,
        selected_addons: []
      })
      .eq('id', roomId)
      .select(`
        *,
        category:room_categories(*)
      `)
      .single();

    if (updateError) {
      console.error('[API Checkout Room Update Error]', updateError);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    // 8. 💳 Fee Guard — Room checkout is a bill settlement event
    //    Auto-deduct ₹10 from venue wallet OR log to outstanding bills (never blocks checkout)
    try {
      const { invoiceRefFromId, generateInvoiceRef, evaluateFeeGuard } = await import('@/lib/services/wallet/fee-guard.service');
      const feeRef = masterOrderId ? invoiceRefFromId(masterOrderId) : generateInvoiceRef();
      await evaluateFeeGuard(room.business_id, 'room_accommodation', feeRef, supabase);
    } catch (feeErr) {
      console.error('[API Checkout FeeGuard Error]', feeErr);
    }

    // 9. Generate pre-loaded invoice data for POS Billing interface
    const invoice = {
      id: masterOrderId,
      order_id: masterOrderId,
      table_number: `ROOM ${room.room_number}`,
      room_id: roomId,
      guest_name: room.guest_name || 'In-House Guest',
      guest_phone: room.guest_phone || '',
      items: consolidatedItems,
      subtotal: finalBilledAmount,
      discountType: 'percentage' as const,
      discountValue: 0,
      discountAmount: 0,
      taxAmount: 0,
      grandTotal: finalBilledAmount,
      payment_method: paymentMethod || 'UPI',
      isReadOnly: false,
      created_at: nowIso
    };

    return NextResponse.json({
      success: true,
      order_id: masterOrderId,
      room: updatedRoom,
      invoice,
      checkoutSummary: {
        finalBilledAmount,
        roomTariffTotal,
        addonsTotal,
        ordersTotal,
        nights,
        checkoutTime: nowIso
      }
    });
  } catch (error: any) {
    console.error('[API Room Checkout POST Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

```

### app/api/host/accommodations/rooms/[id]/dossier/route.ts (131 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const roomId = params.id;
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'Room ID required' }, { status: 400 });
    }

    // 1. Fetch Room Details with Category
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select(`
        *,
        category:room_categories(*)
      `)
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ success: false, error: roomError?.message || 'Room not found' }, { status: 404 });
    }

    // 2. Fetch Active Food / POS Orders for this room
    const { data: allOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('room_id', roomId)
      .neq('status', 'SETTLED')
      .neq('status', 'CANCELLED')
      .order('created_at', { ascending: false });

    // Separate actual F&B / room service orders from master room_stay order
    const roomServiceOrders = (allOrders || []).filter(o => o.order_type !== 'room_stay');
    const masterStayOrder = (allOrders || []).find(o => o.order_type === 'room_stay');

    // 3. Fetch Active Kitchen Tickets (KOT)
    const { data: tickets } = await supabase
      .from('kitchen_tickets')
      .select('*')
      .eq('room_id', roomId)
      .neq('status', 'CANCELLED')
      .order('created_at', { ascending: false });

    // 4. Fetch Guest Stay History from room_stay_logs
    let stayLogs: any[] = [];
    if (room.guest_phone) {
      const { data: logs } = await supabase
        .from('room_stay_logs')
        .select('*')
        .or(`room_id.eq.${roomId},guest_phone.eq.${room.guest_phone}`)
        .order('created_at', { ascending: false })
        .limit(10);
      stayLogs = logs || [];
    } else {
      const { data: logs } = await supabase
        .from('room_stay_logs')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(10);
      stayLogs = logs || [];
    }

    // 5. Billing calculations
    const roomRate = Number(room.category?.price) || 0;
    
    // Calculate nights elapsed
    let nights = 1;
    if (room.check_in_time || room.check_in_date) {
      const checkIn = new Date(room.check_in_time || room.check_in_date).getTime();
      const checkOut = room.check_out_time || room.check_out_date 
        ? new Date(room.check_out_time || room.check_out_date).getTime() 
        : Date.now();
      const diffDays = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      nights = Math.max(1, diffDays || 1);
    }

    const roomTariffSubtotal = roomRate * nights;

    // Addons subtotal
    const selectedAddons: any[] = Array.isArray(room.selected_addons) ? room.selected_addons : [];
    const addonsSubtotal = selectedAddons.reduce((acc, a) => {
      const price = Number(a.price) || 0;
      if (a.billingType === 'per_night' || a.billingType === 'per_person_per_day') {
        return acc + price * nights;
      }
      return acc + price;
    }, 0);

    // Food & room service subtotal: strictly sum the actual fetched orders where order_type !== 'room_stay'
    const ordersSubtotal = roomServiceOrders.reduce((acc, o) => acc + (Number(o.grand_total || o.total_amount) || 0), 0);

    // Grand total strictly: (Base Room Rate × Nights) + Total Selected Add-ons + Actual Room Service F&B Orders
    const grandTotalPayable = roomTariffSubtotal + addonsSubtotal + ordersSubtotal;

    return NextResponse.json({
      success: true,
      room,
      orders: roomServiceOrders,
      masterOrder: masterStayOrder || null,
      tickets: tickets || [],
      stayLogs,
      billingSummary: {
        nights,
        roomRate,
        roomTariffSubtotal,
        addonsSubtotal,
        ordersSubtotal,
        grandTotalPayable
      }
    });
  } catch (error: any) {
    console.error('[API Room Dossier GET Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

```

### app/api/host/accommodations/rooms/[id]/orders/route.ts (62 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const roomId = params.id;
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'Room ID required' }, { status: 400 });
    }

    // 1. Fetch active orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('room_id', roomId)
      .neq('status', 'SETTLED')
      .neq('status', 'CANCELLED')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('[API Room Orders Error]', ordersError);
    }

    // 2. Fetch active kitchen tickets
    const { data: tickets, error: ticketsError } = await supabase
      .from('kitchen_tickets')
      .select('*')
      .eq('room_id', roomId)
      .neq('status', 'SERVED')
      .neq('status', 'CANCELLED')
      .order('created_at', { ascending: false });

    if (ticketsError) {
      console.error('[API Room KOTs Error]', ticketsError);
    }

    const grandTotal = (orders || []).reduce((acc, ord) => acc + (Number(ord.grand_total) || 0), 0);

    return NextResponse.json({
      success: true,
      orders: orders || [],
      tickets: tickets || [],
      grandTotal
    });
  } catch (error: any) {
    console.error('[API Room Orders GET]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

```

### app/api/host/accommodations/rooms/[id]/status/route.ts (275 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateNights } from '@/lib/utils/accommodations';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const roomId = params.id;
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'Room ID required' }, { status: 400 });
    }

    const body = await request.json();
    const {
      status,
      room_number,
      guest_name,
      guest_phone,
      guest_id,
      guest_id_proof,
      id_type,
      id_number,
      guest_email,
      guest_address,
      check_in_time,
      check_out_time,
      total_guests,
      purpose_of_visit,
      is_celebration,
      celebration_type,
      celebration_note,
      selected_addons,
      total_billed_amount,
      action // e.g. 'check-in', 'checkout', 'mark-clean'
    } = body;

    const validStatuses = ['VACANT', 'OCCUPIED', 'CLEANING', 'MAINTENANCE'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid room status' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};

    if (room_number && typeof room_number === 'string' && room_number.trim()) {
      updatePayload.room_number = room_number.trim();
    }

    if (status) {
      updatePayload.status = status;
    }

    if (action === 'check-in' || status === 'OCCUPIED') {
      const nowIso = new Date().toISOString();
      updatePayload.status = 'OCCUPIED';
      updatePayload.guest_name = guest_name?.trim() || 'Guest';
      updatePayload.guest_phone = guest_phone?.trim() || null;
      updatePayload.id_type = id_type?.trim() || null;
      updatePayload.id_number = id_number?.trim() || null;
      updatePayload.guest_email = guest_email?.trim() || null;
      updatePayload.guest_address = guest_address?.trim() || null;
      updatePayload.guest_id_proof = guest_id_proof?.trim() || (id_number ? `${id_type || 'ID'}: ${id_number}` : null);
      updatePayload.current_guest_id = guest_id || null;
      updatePayload.check_in_date = check_in_time || nowIso;
      updatePayload.check_in_time = check_in_time || nowIso;
      updatePayload.check_out_date = check_out_time || null;
      updatePayload.check_out_time = check_out_time || null;
      updatePayload.total_guests = parseInt(total_guests, 10) || 1;
      updatePayload.purpose_of_visit = purpose_of_visit?.trim() || 'Leisure';
      updatePayload.is_celebration = Boolean(is_celebration);
      updatePayload.celebration_type = celebration_type?.trim() || null;
      updatePayload.celebration_note = celebration_note?.trim() || null;
      updatePayload.selected_addons = Array.isArray(selected_addons) ? selected_addons : [];
    } else if (action === 'checkout' || (status === 'CLEANING' && !guest_name)) {
      updatePayload.status = 'CLEANING';
      updatePayload.check_out_date = new Date().toISOString();
      updatePayload.check_out_time = new Date().toISOString();
      updatePayload.guest_name = null;
      updatePayload.guest_phone = null;
      updatePayload.guest_id_proof = null;
      updatePayload.id_type = null;
      updatePayload.id_number = null;
      updatePayload.guest_email = null;
      updatePayload.guest_address = null;
      updatePayload.current_guest_id = null;
      updatePayload.total_guests = 1;
      updatePayload.purpose_of_visit = null;
      updatePayload.is_celebration = false;
      updatePayload.celebration_type = null;
      updatePayload.celebration_note = null;
      updatePayload.selected_addons = [];

      // Mark linked active orders as settled
      await supabase
        .from('orders')
        .update({ status: 'SETTLED' })
        .eq('room_id', roomId)
        .neq('status', 'CANCELLED');

      // Update historical room_stay_logs check_out_time if open stay exists
      try {
        const { data: openLog } = await supabase
          .from('room_stay_logs')
          .select('id')
          .eq('room_id', roomId)
          .is('check_out_time', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (openLog) {
          await supabase
            .from('room_stay_logs')
            .update({ check_out_time: new Date().toISOString() })
            .eq('id', openLog.id);
        }
      } catch (logErr) {
        console.error('[API Checkout Stay Log Error]', logErr);
      }
    } else if (action === 'mark-clean' || status === 'VACANT') {
      updatePayload.status = 'VACANT';
      updatePayload.guest_name = null;
      updatePayload.guest_phone = null;
      updatePayload.guest_id_proof = null;
      updatePayload.current_guest_id = null;
      updatePayload.check_in_date = null;
      updatePayload.check_out_date = null;
      updatePayload.check_in_time = null;
      updatePayload.check_out_time = null;
      updatePayload.total_guests = 1;
      updatePayload.purpose_of_visit = null;
      updatePayload.is_celebration = false;
      updatePayload.celebration_type = null;
      updatePayload.celebration_note = null;
      updatePayload.selected_addons = [];
    }

    const { data: updatedRoom, error: updateError } = await supabase
      .from('rooms')
      .update(updatePayload)
      .eq('id', roomId)
      .select(`
        *,
        category:room_categories(id, name, price, occupancy, photos, amenities, addons, available_addons)
      `)
      .single();

    if (updateError) {
      console.error('[API Update Room Status Error]', updateError);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    // Insert or update Master POS Folio Order on check-in
    if (action === 'check-in' || status === 'OCCUPIED') {
      try {
        const nights = calculateNights(updatePayload.check_in_time, updatePayload.check_out_time);
        const rate = Number(updatedRoom.category?.price) || 0;
        const tariffTotal = rate * nights;

        // Base stay line item
        const roomStayItem = {
          id: `tariff-${roomId}`,
          name: `Room ${updatePayload.room_number || updatedRoom.room_number} Stay (${nights} Night${nights > 1 ? 's' : ''} - ${updatedRoom.category?.name || 'Standard'})`,
          price: tariffTotal,
          qty: 1,
          type: 'room_tariff'
        };

        // Add-on line items
        const addonItems = (updatePayload.selected_addons || []).map((addon: any) => {
          const p = Number(addon.price) || 0;
          const price = (addon.billingType === 'per_night' || addon.billingType === 'per_person_per_day')
            ? p * nights
            : p;
          return {
            id: addon.id || `addon-${Math.random().toString(36).substring(7)}`,
            name: `${addon.name}${addon.billingType ? ` (${addon.billingType})` : ''}`,
            price,
            qty: 1,
            billingType: addon.billingType,
            type: 'addon'
          };
        });

        const addonsTotal = addonItems.reduce((acc: number, a: any) => acc + a.price, 0);
        const masterGrandTotal = tariffTotal + addonsTotal;

        // Check if an open master stay order already exists for this room
        const { data: existingMasterOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('room_id', roomId)
          .eq('order_type', 'room_stay')
          .not('status', 'in', '("SETTLED","CANCELLED","COMPLETED")')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingMasterOrder) {
          await supabase
            .from('orders')
            .update({
              customer_name: updatePayload.guest_name,
              customer_phone: updatePayload.guest_phone || '',
              table_number: `ROOM ${updatePayload.room_number || updatedRoom.room_number}`,
              items: [roomStayItem, ...addonItems],
              subtotal: masterGrandTotal,
              grand_total: masterGrandTotal,
              total_amount: masterGrandTotal,
              status: 'active'
            })
            .eq('id', existingMasterOrder.id);
        } else {
          await supabase
            .from('orders')
            .insert({
              business_id: updatedRoom.business_id,
              room_id: roomId,
              order_type: 'room_stay',
              customer_name: updatePayload.guest_name,
              customer_phone: updatePayload.guest_phone || '',
              table_number: `ROOM ${updatePayload.room_number || updatedRoom.room_number}`,
              status: 'active',
              order_source: 'POS',
              items: [roomStayItem, ...addonItems],
              subtotal: masterGrandTotal,
              grand_total: masterGrandTotal,
              total_amount: masterGrandTotal,
              created_at: updatePayload.check_in_time || new Date().toISOString()
            });
        }

        // Insert historical stay log on check-in
        await supabase.from('room_stay_logs').insert({
          business_id: updatedRoom.business_id,
          room_id: roomId,
          guest_name: updatePayload.guest_name,
          guest_phone: updatePayload.guest_phone || '',
          id_type: updatePayload.id_type,
          id_number: updatePayload.id_number,
          guest_email: updatePayload.guest_email,
          guest_address: updatePayload.guest_address,
          guest_id_proof: updatePayload.guest_id_proof,
          check_in_time: updatePayload.check_in_time,
          check_out_time: updatePayload.check_out_time,
          total_guests: updatePayload.total_guests,
          purpose_of_visit: updatePayload.purpose_of_visit,
          is_celebration: updatePayload.is_celebration,
          celebration_type: updatePayload.celebration_type,
          celebration_note: updatePayload.celebration_note,
          selected_addons: updatePayload.selected_addons,
          total_billed_amount: masterGrandTotal
        });
      } catch (err) {
        console.error('[API Check-In Master Order / Stay Log Error]', err);
      }
    }

    return NextResponse.json({ success: true, room: updatedRoom });
  } catch (error: any) {
    console.error('[API Update Room Status Exception]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

```

### app/api/host/accommodations/rooms/route.ts (268 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    let business = null;
    if (user) {
      const { data: b } = await supabase
        .from('businesses')
        .select('id')
        .eq('host_id', user.id)
        .limit(1)
        .maybeSingle();
      business = b;
    }
    if (!business) {
      const { data: fb } = await supabase.from('businesses').select('id').limit(1).maybeSingle();
      business = fb;
    }

    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
    }

    // Fetch all physical rooms with their category details
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select(`
        *,
        category:room_categories(id, name, price, occupancy, photos, amenities, addons, available_addons)
      `)
      .eq('business_id', business.id)
      .order('room_number', { ascending: true });

    if (roomsError) {
      console.error('[API Accommodations Rooms GET]', roomsError);
      return NextResponse.json({ success: false, error: roomsError.message }, { status: 500 });
    }

    // Fetch active orders linked to these rooms to compute live billing balance
    const roomIds = (rooms || []).map(r => r.id);
    let activeOrdersByRoom: Record<string, { count: number; total: number }> = {};

    if (roomIds.length > 0) {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, room_id, grand_total, status')
        .in('room_id', roomIds)
        .neq('status', 'SETTLED')
        .neq('status', 'CANCELLED');

      if (orders) {
        orders.forEach(ord => {
          if (ord.room_id) {
            if (!activeOrdersByRoom[ord.room_id]) {
              activeOrdersByRoom[ord.room_id] = { count: 0, total: 0 };
            }
            activeOrdersByRoom[ord.room_id].count += 1;
            activeOrdersByRoom[ord.room_id].total += Number(ord.grand_total) || 0;
          }
        });
      }
    }

    const enrichedRooms = (rooms || []).map(room => ({
      ...room,
      activeOrdersCount: activeOrdersByRoom[room.id]?.count || 0,
      activeOrdersTotal: activeOrdersByRoom[room.id]?.total || 0
    }));

    return NextResponse.json({
      success: true,
      rooms: enrichedRooms
    });
  } catch (error: any) {
    console.error('[API Accommodations Rooms GET]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    let business = null;
    if (user) {
      const { data: b } = await supabase
        .from('businesses')
        .select('id')
        .eq('host_id', user.id)
        .limit(1)
        .maybeSingle();
      business = b;
    }
    if (!business) {
      const { data: fb } = await supabase.from('businesses').select('id').limit(1).maybeSingle();
      business = fb;
    }

    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
    }

    const body = await request.json();
    console.log('[API Accommodations Rooms POST] User:', user?.id, 'Business:', business.id, 'Body:', body);
    const { category_id, room_number } = body;

    if (!category_id || !room_number) {
      return NextResponse.json({ success: false, error: 'Category ID and room number required' }, { status: 400 });
    }

    const { data: newRoom, error: insertError } = await supabase
      .from('rooms')
      .insert({
        business_id: business.id,
        category_id,
        room_number: room_number.trim(),
        status: 'VACANT',
        qr_code_hash: `ROOM_${category_id.slice(0, 8)}_${room_number}_${Date.now().toString(36)}`
      })
      .select(`*, category:room_categories(id, name, price, occupancy)`)
      .single();

    if (insertError) {
      console.error('[API Accommodations Rooms POST] Insert Error:', insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    // Free Setup Threshold Check & Fee Guard (Rooms: first 2 free, then ₹5)
    try {
      const { checkFreeTier, logFreeTierUsage } = await import('@/lib/services/wallet/free-tier.service');
      const { evaluateFeeGuard } = await import('@/lib/services/wallet/fee-guard.service');

      const tierCheck = await checkFreeTier(supabase, business.id, 'room');
      // newRoom is already inserted, so if existingCount <= threshold (2), it was within the free tier
      if (tierCheck.existingCount <= tierCheck.threshold) {
        await logFreeTierUsage(supabase, business.id, 'room_creation', newRoom.id);
      } else {
        await evaluateFeeGuard(business.id, 'room_creation', newRoom.id, supabase, tierCheck.cost);
      }
    } catch (guardErr) {
      console.error('[Accommodations Room POST FeeGuard Error]', guardErr);
    }

    return NextResponse.json({ success: true, room: newRoom });
  } catch (error: any) {
    console.error('[API Accommodations Rooms POST]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('host_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
    }

    const body = await request.json();
    const { id, room_number, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Room ID required' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};
    if (room_number && typeof room_number === 'string' && room_number.trim()) {
      updatePayload.room_number = room_number.trim();
    }
    if (status) {
      updatePayload.status = status;
    }

    const { data: updatedRoom, error: updateError } = await supabase
      .from('rooms')
      .update(updatePayload)
      .eq('id', id)
      .eq('business_id', business.id)
      .select(`*, category:room_categories(id, name, price, occupancy)`)
      .single();

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, room: updatedRoom });
  } catch (error: any) {
    console.error('[API Accommodations Rooms PATCH]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('host_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('id');

    if (!roomId) {
      return NextResponse.json({ success: false, error: 'Room ID required' }, { status: 400 });
    }

    // Verify room is not occupied
    const { data: roomToDel } = await supabase
      .from('rooms')
      .select('status')
      .eq('id', roomId)
      .eq('business_id', business.id)
      .single();

    if (roomToDel?.status === 'OCCUPIED') {
      return NextResponse.json({ success: false, error: 'Cannot delete an occupied room. Check out guest first.' }, { status: 400 });
    }

    const { error: delError } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId)
      .eq('business_id', business.id);

    if (delError) {
      return NextResponse.json({ success: false, error: delError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Accommodations Rooms DELETE]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


```

### app/api/host/analytics/eod-report/route.ts (16 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeEodReport } from '@/lib/services/analytics.service';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const payload = await computeEodReport(request.url, supabase);
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('[API Analytics EOD]', error);
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Business not found' ? 404 : 500;
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status });
  }
}

```

### app/api/host/analytics/eod-z-report/route.ts (183 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('host_id', user.id)
      .single();

    if (businessError || !business?.id) {
      return NextResponse.json({ error: 'Business not found', details: businessError }, { status: 404 });
    }

    const businessId = business.id;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      // Ensure end date covers the full day
      endDate.setHours(23, 59, 59, 999);
    } else if (dateParam) {
      startDate = new Date(dateParam);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(dateParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default to today
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    // Fast Single-Pass Query (Promise.all)
    const [ordersResponse] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq('business_id', businessId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
    ]);

    const orders = ordersResponse.data || [];

    // Financial Audit Metrics
    let gross_revenue = 0;
    let total_discounts = 0;
    let total_tax = 0;
    let grand_total = 0;
    let total_voids_count = 0;
    
    // Tender Splits
    let tender_upi = 0;
    let tender_cash = 0;
    let tender_card = 0;
    let tender_ledger = 0;

    // Category Breakdowns
    const category_sales: Record<string, { qty: number; net_sales: number }> = {};
    let total_guests = 0;

    orders.forEach(order => {
      // 1. Core Order Math Parity
      const sub = Number(order.subtotal) || 0;
      const disc = Number(order.discount_amount) || 0;
      const net = sub - disc;
      const tax = Number(order.tax_amount) || 0;
      const gTotal = net + tax; // Guarantee Grand Total equation
      
      gross_revenue += sub;
      total_discounts += disc;
      total_tax += tax;
      grand_total += gTotal;

      // 2. Payment Tender Grouping (Guarantees sum(tenders) === grand_total)
      const pm = (order.payment_method || '').toUpperCase();
      if (pm === 'UPI') tender_upi += gTotal;
      else if (pm === 'CASH') tender_cash += gTotal;
      else if (pm === 'CARD') tender_card += gTotal;
      else tender_ledger += gTotal;

      total_guests += (Number(order.guest_count) || 2);

      // 3. Category Math Parity (Distributing Net Sales proportionally across items)
      if (Array.isArray(order.items)) {
        // Calculate the sum of raw item prices in this order to find the proportion
        const rawItemsSum = order.items.reduce((acc: number, item: any) => {
          const unitPrice = Number(item.price?.amountMinor || item.nightlyRate?.amountMinor || item.price || item.unitPrice || item.unit_price || 0);
          const qty = Number(item.quantity || item.qty || 1);
          return acc + (unitPrice * qty);
        }, 0);

        order.items.forEach((item: any) => {
          const cat = item.category || 'General / Menu';
          if (!category_sales[cat]) {
            category_sales[cat] = { qty: 0, net_sales: 0 };
          }
          
          const unitPrice = Number(item.price?.amountMinor || item.nightlyRate?.amountMinor || item.price || item.unitPrice || item.unit_price || 0);
          const qty = Number(item.quantity || item.qty || 1);
          const rawItemTotal = unitPrice * qty;
          
          // Proportion of this item's value against the total order subtotal
          const proportion = rawItemsSum > 0 ? (rawItemTotal / rawItemsSum) : 0;
          // Apply proportion against the order's actual Net Sales (Subtotal - Discount)
          const itemNetSales = proportion * net;
          
          category_sales[cat].qty += qty;
          category_sales[cat].net_sales += itemNetSales;
        });
      }
    });

    const net_revenue = gross_revenue - total_discounts;
    // Assuming 5% GST split into 2.5% CGST / 2.5% SGST
    const cgst = total_tax / 2;
    const sgst = total_tax / 2;
    
    const aov = orders.length > 0 ? (grand_total / orders.length) : 0;

    const category_breakdown = Object.entries(category_sales).map(([name, data]) => ({
      name,
      qty: data.qty,
      net_sales: data.net_sales,
      percentage: net_revenue > 0 ? (data.net_sales / net_revenue) * 100 : 0
    })).sort((a, b) => b.net_sales - a.net_sales);

    const payload = {
      success: true,
      time_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      summary: {
        gross_revenue,
        total_discounts,
        net_revenue,
        cgst,
        sgst,
        total_tax,
        grand_total
      },
      tenders: {
        upi: tender_upi,
        cash: tender_cash,
        card: tender_card,
        ledger: tender_ledger
      },
      operations: {
        total_orders: orders.length,
        guest_covers: total_guests,
        aov,
        voids: total_voids_count
      },
      category_breakdown
    };

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('[EOD Z-REPORT API]', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

```

### app/api/host/analytics/route.ts (16 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeEodReport } from '@/lib/services/analytics.service';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const payload = await computeEodReport(request.url, supabase);
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('[API Analytics]', error);
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Business not found' ? 404 : 500;
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status });
  }
}

```

### app/api/host/catalog/ai-ingest/route.ts (115 lines)
```typescript
import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) {
            try { cookieStore.set({ name, value, ...options }); } catch (error) {}
          },
          remove(name: string, options: CookieOptions) {
            try { cookieStore.set({ name, value: '', ...options }); } catch (error) {}
          },
        },
      }
    );

    // Enforce auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { image, mimeType } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Initialize Google GenAI
    // The API Key MUST be in environment variables: GEMINI_API_KEY
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Server misconfiguration: Missing GEMINI_API_KEY environment variable.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const responseSchema: Schema = {
      type: Type.ARRAY,
      description: "List of items extracted from the menu.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: "The name of the food, beverage, or service item.",
          },
          category: {
            type: Type.STRING,
            description: "The category of the item (e.g., Starters, Main Course, Dessert, Beverages).",
          },
          item_type: {
            type: Type.STRING,
            description: "Must be exactly 'food', 'room', or 'service'. Use 'food' for all food and beverages.",
          },
          price: {
            type: Type.NUMBER,
            description: "The price of the item as a number.",
          },
          description: {
            type: Type.STRING,
            description: "A brief, appetizing description of the item. Do not include price here.",
          },
          stock: {
            type: Type.INTEGER,
            description: "Default stock quantity. Always return 50.",
          }
        },
        required: ["name", "category", "item_type", "price", "description", "stock"],
      }
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: "Extract all items from this menu card. Map them to the provided schema." },
            {
              inlineData: {
                data: image,
                mimeType: mimeType || 'image/jpeg',
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No output generated from Vision model.");
    }

    const extractedItems = JSON.parse(textOutput);

    return NextResponse.json({ items: extractedItems });
  } catch (error: any) {
    console.error('AI Ingest Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

```

### app/api/host/catalog/auto-fill-images/route.ts (155 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CatalogItemId } from '@/types/catalog';

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Resolve business_id from the host
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id')
      .eq('host_id', userId)
      .single();

    if (bizError || !business) {
      return NextResponse.json({ error: 'No registered business found for host.' }, { status: 404 });
    }

    // Fetch items with empty images
    const { data: items, error: fetchError } = await supabase
      .from('catalog_items')
      .select('*')
      .eq('business_id', business.id)
      .or('image_url.is.null,image_url.eq.');

    if (fetchError) {
      throw fetchError;
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ success: true, updatedItems: [] });
    }

    const updatedItems = [];

    // Batch process
    for (const item of items) {
      const categoryLower = (item.category || '').toLowerCase();
      const nameLower = (item.name || '').toLowerCase();
      
      let pool = [
        'https://images.unsplash.com/photo-1544025162-811114215b2e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1473093295043-cdd814d0e601?auto=format&fit=crop&w=800&q=80'
      ]; // Default Food

      if (item.item_type === 'room' || categoryLower.includes('suite') || categoryLower.includes('room') || nameLower.includes('suite')) {
        pool = [
          'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
        ];
      } else if (categoryLower.includes('coffee') || categoryLower.includes('beverage') || nameLower.includes('espresso') || nameLower.includes('drink')) {
        pool = [
          'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1461023058943-0708e5214e72?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80'
        ];
      } else if (categoryLower.includes('bakery') || categoryLower.includes('dessert') || nameLower.includes('cake') || nameLower.includes('muffin') || nameLower.includes('marshmallow')) {
        pool = [
          'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=800&q=80'
        ];
      } else if (item.item_type === 'service' || categoryLower.includes('service')) {
        pool = [
          'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=80'
        ];
      }

      // Consistently hash string to a number so items with the same name get the same image if we ever retry or reset.
      let hash = 0;
      for (let i = 0; i < item.name.length; i++) {
        hash = item.name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const stockImageUrl = pool[Math.abs(hash) % pool.length];

      // Update in DB
      const { data: updatedItem, error: updateError } = await supabase
        .from('catalog_items')
        .update({ image_url: stockImageUrl })
        .eq('id', item.id)
        .select()
        .single();
      
      if (!updateError && updatedItem) {
        // Serialize to Canonical Schema
        const canonicalItem = {
          id: updatedItem.id as CatalogItemId,
          branchId: updatedItem.location_id,
          name: updatedItem.name,
          description: updatedItem.description || '',
          imageUrl: updatedItem.image_url,
          status: updatedItem.is_available ? 'active' : 'inactive',
          addons: [],
          createdAt: updatedItem.created_at,
          updatedAt: updatedItem.created_at,
          ...(updatedItem.item_type === 'food' && {
            kind: 'food_beverage',
            course: updatedItem.category,
            dietary: 'veg',
            price: { amountMinor: Math.round(Number(updatedItem.price) * 100), currency: 'INR' },
            prepTimeMinutes: null,
            allergens: [],
          }),
          ...(updatedItem.item_type === 'room' && {
            kind: 'accommodation',
            roomType: updatedItem.category,
            nightlyRate: { amountMinor: Math.round(Number(updatedItem.price) * 100), currency: 'INR' },
            capacity: updatedItem.metadata?.capacity || null,
            bedType: updatedItem.metadata?.bed_type || null,
            amenities: updatedItem.metadata?.amenities || [],
            occupancy: { adults: 2, children: 0 },
            inventoryCount: 1,
          }),
          ...(updatedItem.item_type === 'service' && {
            kind: 'service',
            serviceType: updatedItem.category,
            price: { amountMinor: Math.round(Number(updatedItem.price) * 100), currency: 'INR' },
          }),
        };
        updatedItems.push(canonicalItem);
      }
    }

    return NextResponse.json({ success: true, count: updatedItems.length, updatedItems });
  } catch (error: any) {
    console.error('[API Auto-Fill Images]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

```

### app/api/host/catalog/bulk-insert/route.ts (139 lines)
```typescript
import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) {
            try { cookieStore.set({ name, value, ...options }); } catch (error) {}
          },
          remove(name: string, options: CookieOptions) {
            try { cookieStore.set({ name, value: '', ...options }); } catch (error) {}
          },
        },
      }
    );

    // 1. Authenticate Request
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { items } = await request.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No valid items provided for insertion.' }, { status: 400 });
    }

    // 2. Resolve Host Topology
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('host_id', user.id)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'No registered business found for host.' }, { status: 404 });
    }

    const { data: locations } = await supabase
      .from('locations')
      .select('id')
      .eq('business_id', business.id)
      .limit(1);

    const locationId = locations && locations.length > 0 ? locations[0].id : null;

    // 3. Format Catalog Items Payload
    const catalogPayload = items.map((item: any) => ({
      business_id: business.id,
      location_id: locationId,
      item_type: item.item_type || 'food',
      name: item.name,
      description: item.description || '',
      price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
      category: item.category,
      image_url: item.image_url || item.imageUrl || null,
      is_available: true,
      metadata: item.metadata || null
    }));

    // 4. Bulk Insert Catalog Items
    const { data: insertedItems, error: catalogError } = await supabase
      .from('catalog_items')
      .insert(catalogPayload)
      .select('id');

    if (catalogError) {
      console.error('Catalog Insert Error:', catalogError);
      return NextResponse.json({ error: catalogError.message }, { status: 400 });
    }

    // 5. Bulk Insert Inventory Stock (if items have stock > 0, else default to 0)
    if (insertedItems && insertedItems.length > 0) {
      const inventoryPayload = insertedItems.map((record: any, index: number) => {
        const correspondingItem = items[index];
        return {
          catalog_item_id: record.id,
          stock_quantity: correspondingItem.stock ? parseInt(correspondingItem.stock, 10) : 0,
          low_stock_threshold: 5
        };
      });

      const { error: inventoryError } = await supabase
        .from('inventory_stock')
        .insert(inventoryPayload);

      if (inventoryError) {
        console.error('Inventory Insert Error:', inventoryError);
        // We do not fail the request completely if inventory fails, but we log it.
      }
    }

    // 6. Free Setup Threshold Check & Fee Guard for Bulk Insert (First 10 free, then ₹2/item)
    // Only standard menu items (food/beverage) count toward the threshold. Services & add-ons are completely free.
    try {
      const { checkFreeTier, logFreeTierUsage, isFreeItemType } = await import('@/lib/services/wallet/free-tier.service');
      const { evaluateFeeGuard, generateInvoiceRef } = await import('@/lib/services/wallet/fee-guard.service');

      // Filter only chargeable candidate items (exclude services and add-ons)
      const standardMenuItems = (items || []).filter((it: any) => !isFreeItemType(it.item_type, it.category));
      const totalBatch = standardMenuItems.length;

      if (totalBatch > 0) {
        const tierCheck = await checkFreeTier(supabase, business.id, 'menu');
        // existingCount includes this batch now, so items before this batch:
        const beforeCount = Math.max(0, tierCheck.existingCount - totalBatch);
        const freeSlots = Math.max(0, tierCheck.threshold - beforeCount);
        const freeCount = Math.min(totalBatch, freeSlots);
        const chargedCount = totalBatch - freeCount;

        const bulkRef = generateInvoiceRef();

        if (freeCount > 0) {
          await logFreeTierUsage(supabase, business.id, 'menu_item_creation', `${bulkRef}-FREE(${freeCount})`);
        }

        if (chargedCount > 0) {
          const totalFee = chargedCount * tierCheck.cost;
          await evaluateFeeGuard(business.id, 'menu_item_creation', bulkRef, supabase, totalFee);
        }
      }
    } catch (guardErr) {
      console.error('[Bulk Ingest FeeGuard Error]', guardErr);
    }

    return NextResponse.json({ success: true, count: insertedItems?.length || 0 });
  } catch (error: any) {
    console.error('Bulk Ingest Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

```

### app/api/host/catalog/bulk-price-update/route.ts (110 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authData.user.id;
    const { locationIds, category, mode, value } = await request.json();

    if (!locationIds || !Array.isArray(locationIds) || locationIds.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid locationIds' }, { status: 400 });
    }

    if (!['percentage', 'flat'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    if (typeof value !== 'number' || isNaN(value)) {
      return NextResponse.json({ error: 'Invalid value' }, { status: 400 });
    }

    // Map 'food_beverage' back to 'food' for DB
    const dbCategory = category === 'food_beverage' ? 'food' : (category === 'accommodation' ? 'room' : category);

    // Ensure the locations belong to businesses owned by the user
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id')
      .eq('host_id', userId);

    const businessIds = businesses?.map(b => b.id) || [];
    if (businessIds.length === 0) {
      return NextResponse.json({ error: 'Unauthorized to modify these locations' }, { status: 403 });
    }

    // Now verify the locationIds belong to these businesses
    const { data: validLocations } = await supabase
      .from('locations')
      .select('id')
      .in('business_id', businessIds)
      .in('id', locationIds);

    const validLocationIds = validLocations?.map(l => l.id) || [];
    if (validLocationIds.length === 0) {
      return NextResponse.json({ error: 'No valid locations found for this host' }, { status: 403 });
    }

    // Build the query to get all items to update
    let query = supabase.from('catalog_items').select('id, price').in('location_id', validLocationIds).eq('is_available', true);
    if (dbCategory !== 'All') {
      query = query.eq('item_type', dbCategory);
    }

    const { data: items, error: selectError } = await query;
    if (selectError) {
      throw selectError;
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Note: Supabase JS doesn't support complex arithmetic updates natively like `price = price + X` across multiple rows dynamically
    // without an RPC call. Since we want to support this dynamically and safely, we can either:
    // 1. Create an RPC function (best for scaling).
    // 2. Fetch all items, calculate new prices in Node, and upsert batch.
    // For MVP, we will fetch, calculate, and batch update (upsert).

    const updates = items.map((item) => {
      let newPrice = item.price;
      if (mode === 'percentage') {
        newPrice = item.price * (1 + value / 100);
      } else if (mode === 'flat') {
        newPrice = item.price + value;
      }
      // Ensure price never drops below 0 and round to 2 decimals
      newPrice = Math.max(0, Math.round(newPrice * 100) / 100);

      return {
        id: item.id,
        price: newPrice
      };
    });

    // Batch update using upsert (requires matching all unique constraints if any, but ID is enough if it's primary key and we only pass ID and price? Actually no, upsert might require all NOT NULL fields unless we do multiple updates).
    // To be safe without an RPC, we will update them concurrently or use RPC.
    // Let's use Promise.all for a small catalog, this is safe for ~500 items.
    const CHUNK_SIZE = 50;
    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(u => 
          supabase.from('catalog_items').update({ price: u.price }).eq('id', u.id)
        )
      );
    }

    return NextResponse.json({ success: true, count: updates.length });
  } catch (error: any) {
    console.error('[Bulk Price Update API Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

```

### app/api/host/catalog/create/route.ts (162 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CatalogItemId } from '@/types/catalog';

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      branchId,
      name,
      description,
      price,
      imageUrl,
      itemType,
      category,
      inventoryCount,
      capacity,
      bedType,
      amenities,
      dietType,
      prepTimeMinutes,
      duration,
      providerType,
      metadata: extraMetadata
    } = body;

    if (!name || price == null || !branchId || !itemType || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let metadata: Record<string, any> = extraMetadata || {};
    if (itemType === 'room') {
      metadata = {
        ...metadata,
        capacity: capacity || null,
        bed_type: bedType || null,
        amenities: amenities || []
      };
    } else if (itemType === 'food') {
      metadata = {
        ...metadata,
        dietary: dietType || 'veg',
        prep_time_minutes: prepTimeMinutes ? parseInt(prepTimeMinutes, 10) : null,
      };
    } else if (itemType === 'service') {
      metadata = {
        ...metadata,
        duration: duration || null,
        provider_type: providerType || 'in_house',
      };
    }

    // Resolve business_id from the linked location/branch
    const { data: location, error: locError } = await supabase
      .from('locations')
      .select('business_id')
      .eq('id', branchId)
      .single();

    if (locError || !location) {
      return NextResponse.json({ error: 'Invalid branch ID or ownership not confirmed.' }, { status: 400 });
    }

    // Free Setup Threshold Check & Fee Guard (Menu: first 10 free, then ₹2; Room: first 2 free, then ₹10)
    // Services and Add-ons are 100% free (₹0.00) and completely bypass fees
    try {
      const { checkFreeTier, logFreeTierUsage, isFreeItemType } = await import('@/lib/services/wallet/free-tier.service');
      const { evaluateFeeGuard, generateInvoiceRef } = await import('@/lib/services/wallet/fee-guard.service');

      if (!isFreeItemType(itemType, category)) {
        const isRoom = itemType === 'room_accommodation' || itemType === 'room';
        const kind = isRoom ? 'room' : 'menu';
        const feeRef = generateInvoiceRef();
        const tierCheck = await checkFreeTier(supabase, location.business_id, kind);

        if (tierCheck.isFree) {
          await logFreeTierUsage(supabase, location.business_id, tierCheck.action, feeRef);
        } else {
          await evaluateFeeGuard(location.business_id, tierCheck.action, feeRef, supabase, tierCheck.cost);
        }
      }
    } catch (feeErr) {
      console.error('[Catalog Create FeeGuard Error]', feeErr);
    }

    // Insert Canonical Catalog Item
    const { data: item, error: insertError } = await supabase
      .from('catalog_items')
      .insert({
        business_id: location.business_id,
        location_id: branchId,
        item_type: itemType, 
        name,
        description,
        price,
        category,
        image_url: imageUrl || null,
        metadata,
        is_available: true,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Conditionally initialize inventory (e.g., for rooms or fixed stock items)
    if (inventoryCount !== undefined && inventoryCount !== null) {
      const { error: invError } = await supabase
        .from('inventory_stock')
        .insert({
          catalog_item_id: item.id,
          stock_quantity: inventoryCount,
          low_stock_threshold: 5,
        });
      if (invError) throw invError;
    }

    // Serialize returned entity back to the Canonical Zustand Schema for hydration
    const canonicalItem = {
      id: item.id as CatalogItemId,
      branchId: item.location_id,
      name: item.name,
      description: item.description || '',
      imageUrl: item.image_url,
      status: item.is_available ? 'active' : 'inactive',
      addons: [],
      createdAt: item.created_at,
      updatedAt: item.created_at,
      ...(item.item_type === 'food' && {
        kind: 'food_beverage',
        course: item.category,
        dietary: 'veg', // Default stub mapping
        price: { amountMinor: Number(item.price), currency: 'INR' },
        prepTimeMinutes: null,
        allergens: [],
      }),
      ...(item.item_type === 'room' && {
        kind: 'accommodation',
        roomType: item.category,
        nightlyRate: { amountMinor: Number(item.price), currency: 'INR' },
        capacity: item.metadata?.capacity || null,
        bedType: item.metadata?.bed_type || null,
        amenities: item.metadata?.amenities || [],
        occupancy: { adults: 2, children: 0 },
        inventoryCount: inventoryCount || 1,
      }),
    };

    return NextResponse.json({ data: canonicalItem });
  } catch (error) {
    console.error('[API Catalog POST]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

```

### app/api/host/catalog/delete/route.ts (24 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executeCatalogDelete } from '@/lib/services/catalog-delete.service';

export async function POST(request: Request) {
  return handleDelete(request);
}

export async function DELETE(request: Request) {
  return handleDelete(request);
}

async function handleDelete(request: Request) {
  try {
    const supabase = createClient();
    const result = await executeCatalogDelete(request, supabase);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Catalog Delete Fatal Error]', error);
    const status = error.message?.includes('Missing') ? 400 : 500;
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status });
  }
}

```

### app/api/host/catalog/recipe/route.ts (70 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const catalogItemId = url.searchParams.get('catalogItemId');
    if (!catalogItemId) return NextResponse.json({ error: 'Missing catalogItemId' }, { status: 400 });

    const { data: ingredients, error } = await supabase
      .from('recipe_ingredients')
      .select('*, raw_item:raw_inventory_items(id, item_name, unit, cost_per_unit)')
      .eq('catalog_item_id', catalogItemId);

    if (error) throw error;
    
    // Map the returned format to what the frontend expects
    const mappedIngredients = (ingredients || []).map(ing => ({
      ...ing,
      raw_item: Array.isArray(ing.raw_item) ? ing.raw_item[0] : ing.raw_item
    }));

    return NextResponse.json({ ingredients: mappedIngredients });
  } catch (error: any) {
    console.error('[API Catalog Recipe GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: business } = await supabase.from('businesses').select('id').eq('host_id', user.id).single();
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { catalogItemId, ingredients } = await request.json();
    if (!catalogItemId) return NextResponse.json({ error: 'Missing catalogItemId' }, { status: 400 });

    // 1. Delete existing recipes for this item
    await supabase.from('recipe_ingredients').delete().eq('catalog_item_id', catalogItemId).eq('business_id', business.id);

    // 2. Insert new recipes if any
    if (ingredients && ingredients.length > 0) {
      const payload = ingredients.map((ing: any) => ({
        business_id: business.id,
        catalog_item_id: catalogItemId,
        raw_item_id: ing.raw_item_id,
        quantity_required: ing.quantity_required
      }));

      const { error: insertError } = await supabase.from('recipe_ingredients').insert(payload);
      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Catalog Recipe POST]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

```

### app/api/host/catalog/route.ts (67 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  fetchHostCatalog,
  createCatalogItem,
  deleteCatalogItem,
} from '@/lib/services/catalog.service';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const result = await fetchHostCatalog(request.url, supabase);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Catalog GET]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const canonicalItem = await createCatalogItem(body, supabase);
    return NextResponse.json({ data: canonicalItem });
  } catch (error: any) {
    console.error('[API Catalog POST]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message?.includes('Missing') || error.message?.includes('Invalid') ? 400 : 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    let itemId = url.searchParams.get('id');

    if (!itemId) {
      const body = await request.json().catch(() => ({}));
      itemId = body.id;
    }

    if (!itemId) {
      return NextResponse.json({ error: 'Missing item id' }, { status: 400 });
    }

    const result = await deleteCatalogItem(itemId, supabase);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Catalog DELETE]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

```

### app/api/host/catalog/update/route.ts (148 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      id, 
      name, 
      item_type, 
      category, 
      price, 
      description, 
      image_url,
      dietType,
      prepTimeMinutes,
      duration,
      providerType,
      inventoryCount,
      metadata: extraMetadata
    } = body;

    if (!id || !name || price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify ownership indirectly by checking if the user owns the business associated with this item's location
    const { data: catalogItem } = await supabase
      .from('catalog_items')
      .select('business_id, metadata, name, category')
      .eq('id', id)
      .single();

    if (!catalogItem) {
      const roomCategoryId = extraMetadata?.room_category_id;
      if (extraMetadata?.source !== 'room_category_addon' || !roomCategoryId) {
        return NextResponse.json({ error: 'Catalog item not found' }, { status: 404 });
      }

      const { data: roomCategory } = await supabase.from('room_categories')
        .select('id, business_id, addons, available_addons').eq('id', roomCategoryId).maybeSingle();
      if (!roomCategory) return NextResponse.json({ error: 'Room add-on not found' }, { status: 404 });
      const { data: ownerBusiness } = await supabase.from('businesses').select('id')
        .eq('id', roomCategory.business_id).eq('host_id', user.id).maybeSingle();
      if (!ownerBusiness) return NextResponse.json({ error: 'Unauthorized to modify this item' }, { status: 403 });

      const field = Array.isArray(roomCategory.addons) && roomCategory.addons.length ? 'addons' : 'available_addons';
      const addons = Array.isArray(roomCategory[field]) ? [...roomCategory[field]] : [];
      const addonIndex = addons.findIndex((addon: any) =>
        String(addon.id || '') === String(id) || String(addon.name || '').trim().toLowerCase() === String(name).trim().toLowerCase()
      );
      if (addonIndex < 0) return NextResponse.json({ error: 'Room add-on not found' }, { status: 404 });
      addons[addonIndex] = { ...addons[addonIndex], price: Number(price) };
      const { error: addonUpdateError } = await supabase.from('room_categories')
        .update({ [field]: addons }).eq('id', roomCategory.id).eq('business_id', ownerBusiness.id);
      if (addonUpdateError) throw addonUpdateError;
      return NextResponse.json({ success: true, data: addons[addonIndex] });
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', catalogItem.business_id)
      .eq('host_id', user.id)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'Unauthorized to modify this item' }, { status: 403 });
    }

    let updatedMetadata: Record<string, any> = {
      ...(catalogItem.metadata || {}),
      ...(extraMetadata || {}),
    };

    if (item_type === 'food') {
      updatedMetadata = {
        ...updatedMetadata,
        dietary: dietType || updatedMetadata.dietary || 'veg',
        prep_time_minutes: prepTimeMinutes ? parseInt(prepTimeMinutes, 10) : updatedMetadata.prep_time_minutes,
        is_recipe_ready: true,
      };
    } else if (item_type === 'service') {
      updatedMetadata = {
        ...updatedMetadata,
        duration: duration || updatedMetadata.duration || null,
        provider_type: providerType || updatedMetadata.provider_type || 'in_house',
      };
    }

    const { data: updatedItem, error: updateError } = await supabase
      .from('catalog_items')
      .update({
        name: name ? String(name).trim() : catalogItem.name,
        item_type,
        category: category ? String(category).trim() : catalogItem.category,
        price,
        description,
        image_url,
        metadata: updatedMetadata,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[Catalog Update Error]', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Sync inventory if provided
    if (inventoryCount !== undefined && inventoryCount !== null) {
      await supabase
        .from('inventory_stock')
        .upsert({
          catalog_item_id: id,
          stock_quantity: parseInt(inventoryCount, 10) || 0,
          low_stock_threshold: 5,
        }, { onConflict: 'catalog_item_id' });
    }

    // Bidirectional sync: if this catalog item is linked to a room_category, sync price, name & image
    if (item_type === 'room' || category === 'Accommodations' || category === 'accommodation') {
      await supabase
        .from('room_categories')
        .update({
          name,
          price: parseFloat(price),
          ...(image_url ? { photos: [image_url] } : {})
        })
        .eq('catalog_item_id', id);
    }

    return NextResponse.json({ success: true, data: updatedItem });
  } catch (err: any) {
    console.error('[Catalog Update Route Exception]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

```

### app/api/host/expenses/advances/route.ts (37 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: business } = await supabase.from('businesses').select('id').eq('host_id', user.id).single();
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const body = await request.json();
    
    const { data: newAdvance, error: insertError } = await supabase
      .from('staff_advances')
      .insert({
        business_id: business.id,
        staff_id: body.staff_id,
        amount: body.amount,
        date_given: body.date_given,
        notes: body.notes
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, advance: newAdvance });
  } catch (error: any) {
    console.error('[API Advances POST]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

```

### app/api/host/expenses/bills/route.ts (63 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: business } = await supabase.from('businesses').select('id').eq('host_id', user.id).single();
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { data: expenses, error } = await supabase
      .from('operational_expenses')
      .select('*')
      .eq('business_id', business.id)
      .order('billing_date', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ expenses: expenses || [] });
  } catch (error: any) {
    console.error('[API Bills GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: business } = await supabase.from('businesses').select('id').eq('host_id', user.id).single();
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const body = await request.json();
    
    const { data: newExpense, error: insertError } = await supabase
      .from('operational_expenses')
      .insert({
        business_id: business.id,
        category: body.category,
        custom_category_name: body.custom_category_name,
        amount: body.amount,
        billing_date: body.billing_date,
        status: body.status,
        notes: body.notes
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, expense: newExpense });
  } catch (error: any) {
    console.error('[API Bills POST]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

```

### app/api/host/expenses/staff/route.ts (159 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: business } = await supabase.from('businesses').select('id').eq('host_id', user.id).single();
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    // Using Supabase RPC or raw SQL via view would be best, but we can do a subquery via postgREST 
    // or fetch both and combine in memory for simplicity if PostgREST doesn't support correlated subqueries easily.
    // Fetch staff
    const { data: staff, error: staffError } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });

    if (staffError) throw staffError;

    // Fetch this month's advances
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: advances, error: advancesError } = await supabase
      .from('staff_advances')
      .select('staff_id, amount')
      .eq('business_id', business.id)
      .gte('date_given', startOfMonth.toISOString().split('T')[0]);

    if (advancesError) throw advancesError;

    // Combine
    const staffWithAdvances = (staff || []).map(s => {
      const myAdvances = (advances || []).filter(a => a.staff_id === s.id);
      const advances_this_month = myAdvances.reduce((sum, a) => sum + Number(a.amount), 0);
      return {
        ...s,
        advances_this_month
      };
    });

    return NextResponse.json({ staff: staffWithAdvances });
  } catch (error: any) {
    console.error('[API Staff GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: business } = await supabase.from('businesses').select('id').eq('host_id', user.id).single();
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const body = await request.json();
    
    const { data: newStaff, error: insertError } = await supabase
      .from('staff_profiles')
      .insert({
        business_id: business.id,
        name: body.name,
        contact_number: body.contact_number,
        designation: body.designation,
        department: body.department,
        join_date: body.join_date,
        base_salary: body.base_salary,
        role: body.role || 'CASHIER'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, staff: newStaff });
  } catch (error: any) {
    console.error('[API Staff POST]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: business } = await supabase.from('businesses').select('id').eq('host_id', user.id).single();
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const body = await request.json();
    const { id, name, contact_number, designation, department, join_date, base_salary, role, is_pos_active } = body;

    if (!id) return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });

    const { data: updatedStaff, error: updateError } = await supabase
      .from('staff_profiles')
      .update({
        name,
        contact_number,
        designation,
        department,
        join_date,
        base_salary,
        role,
        is_pos_active: is_pos_active ?? true,
      })
      .eq('id', id)
      .eq('business_id', business.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, staff: updatedStaff });
  } catch (error: any) {
    console.error('[API Staff PUT]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: business } = await supabase.from('businesses').select('id').eq('host_id', user.id).single();
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });

    const { error: deleteError } = await supabase
      .from('staff_profiles')
      .delete()
      .eq('id', id)
      .eq('business_id', business.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Staff DELETE]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

```

### app/api/host/inventory/audit/route.ts (93 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('host_id', user.id)
      .single();

    if (!business?.id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const businessId = business.id;
    const { audits } = await request.json();

    if (!Array.isArray(audits) || audits.length === 0) {
      return NextResponse.json({ error: 'Invalid or missing audits payload' }, { status: 400 });
    }

    const auditRecords = [];

    // Begin updates (we use a promise map instead of a true SQL transaction for now, 
    // though a Supabase RPC would be more atomic, Promise.all is sufficient here since 
    // it's an EOD manager action)
    for (const audit of audits) {
      const { raw_item_id, theoretical_stock, physical_stock, notes } = audit;
      
      if (!raw_item_id || physical_stock === undefined || theoretical_stock === undefined) {
        continue; // Skip invalid rows
      }

      // 1. Log the audit
      auditRecords.push({
        business_id: businessId,
        raw_item_id,
        theoretical_stock,
        physical_stock,
        notes: notes || 'Manager EOD Audit'
      });

      // 2. Hard reset the stock
      await supabase
        .from('raw_inventory_items')
        .update({ 
          current_stock: Number(physical_stock),
          updated_at: new Date().toISOString()
        })
        .eq('id', raw_item_id)
        .eq('business_id', businessId);
        
      // 3. (Optional but recommended) Insert an inventory_log for the manual adjustment
      const variance = Number(physical_stock) - Number(theoretical_stock);
      if (variance !== 0) {
        await supabase
          .from('inventory_logs')
          .insert({
            business_id: businessId,
            item_id: raw_item_id,
            action_type: 'MANUAL_ADJUST',
            change_amount: variance,
            notes: `EOD Variance Audit: ${variance}`
          });
      }
    }

    // Insert all audit records
    if (auditRecords.length > 0) {
      const { error: auditError } = await supabase
        .from('inventory_audits')
        .insert(auditRecords);

      if (auditError) {
        throw auditError;
      }
    }

    return NextResponse.json({ success: true, message: 'Audits saved and stock updated' });
  } catch (error: any) {
    console.error('[INVENTORY AUDIT API]', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

```

### app/api/host/inventory/items/route.ts (126 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: business } = await supabase.from('businesses').select('id').eq('host_id', user.id).single();
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { data: items, error } = await supabase
      .from('raw_inventory_items')
      .select('*')
      .eq('business_id', business.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('[API Inventory GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: business } = await supabase.from('businesses').select('id').eq('host_id', user.id).single();
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const body = await request.json();

    // Check if batch insert or single insert
    const rawList = Array.isArray(body.items) 
      ? body.items 
      : (body.itemName ? [body] : []);

    if (rawList.length === 0) {
      return NextResponse.json({ error: 'No inventory items provided for ingestion' }, { status: 400 });
    }

    const rows = rawList.map((it: any) => ({
      business_id: business.id,
      item_name: it.itemName || it.item_name,
      category: it.category || 'Raw Stock',
      unit: it.unit || 'kg',
      current_stock: Number(it.currentStock ?? it.current_stock ?? 0),
      threshold: Number(it.threshold ?? 5),
      cost_per_unit: Number(it.costPerUnit ?? it.cost_per_unit ?? 0),
      is_critical: Boolean(it.is_critical ?? it.isCritical ?? false)
    }));

    const { data: insertedItems, error } = await supabase
      .from('raw_inventory_items')
      .insert(rows)
      .select();

    if (error) throw error;

    // Log the initial addition for items with positive stock
    const logRows = (insertedItems || [])
      .filter((it: any) => it.current_stock > 0)
      .map((it: any) => ({
        business_id: business.id,
        item_id: it.id,
        change_amount: it.current_stock,
        action_type: 'MANUAL_ADJUSTMENT',
        notes: 'Initial Stock Entry'
      }));

    if (logRows.length > 0) {
      await supabase.from('inventory_logs').insert(logRows);
    }

    return NextResponse.json({ 
      success: true, 
      count: insertedItems?.length || 0,
      item: insertedItems?.[0] || null,
      items: insertedItems || []
    });
  } catch (error: any) {
    console.error('[API Inventory POST]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, current_stock, cost_per_unit, threshold, is_critical } = body;
    if (!id) return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });

    const updates: any = { updated_at: new Date().toISOString() };
    if (current_stock !== undefined) updates.current_stock = current_stock;
    if (cost_per_unit !== undefined) updates.cost_per_unit = cost_per_unit;
    if (threshold !== undefined) updates.threshold = threshold;
    if (is_critical !== undefined) updates.is_critical = is_critical;

    const { data: updatedItem, error } = await supabase
      .from('raw_inventory_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ item: updatedItem });
  } catch (error: any) {
    console.error('[API Inventory PATCH]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

```

### app/api/host/inventory/ocr-ingest/route.ts (90 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: business } = await supabase.from('businesses').select('id').eq('host_id', user.id).single();
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    // Since this is a simulation, we don't actually process the FormData image.
    // In a real app, we would use Vision AI to extract line items.
    
    // SIMULATED OCR EXTRACTED ITEMS:
    const simulatedExtract = [
      { item_name: 'Premium Coffee Beans', unit: 'kg', quantity: 15, cost: 800 },
      { item_name: 'Whole Milk', unit: 'ltr', quantity: 50, cost: 65 },
      { item_name: 'Sugar (White)', unit: 'kg', quantity: 10, cost: 45 },
      { item_name: 'Brown Napkins', unit: 'pcs', quantity: 1000, cost: 0.5 }
    ];

    const addedItems = [];

    for (const line of simulatedExtract) {
      // Upsert logic based on item name (simple matching for simulation)
      let { data: existing } = await supabase
        .from('raw_inventory_items')
        .select('*')
        .eq('business_id', business.id)
        .ilike('item_name', line.item_name)
        .maybeSingle();

      let targetItem;

      if (existing) {
        // Update existing stock
        const newStock = Number(existing.current_stock) + line.quantity;
        const { data: updated, error: updateError } = await supabase
          .from('raw_inventory_items')
          .update({ 
            current_stock: newStock, 
            cost_per_unit: line.cost, // Update to latest price
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (!updateError) targetItem = updated;
      } else {
        // Insert new stock
        const { data: inserted, error: insertError } = await supabase
          .from('raw_inventory_items')
          .insert({
            business_id: business.id,
            item_name: line.item_name,
            unit: line.unit,
            current_stock: line.quantity,
            cost_per_unit: line.cost,
            category: 'Raw Supply'
          })
          .select()
          .single();
        
        if (!insertError) targetItem = inserted;
      }

      if (targetItem) {
        // Log the purchase
        await supabase.from('inventory_logs').insert({
          business_id: business.id,
          item_id: targetItem.id,
          change_amount: line.quantity,
          action_type: 'PURCHASE',
          notes: 'Auto-ingested via Bill OCR'
        });
        addedItems.push(targetItem);
      }
    }

    return NextResponse.json({ success: true, message: 'OCR Extracted and inserted', addedItems });
  } catch (error: any) {
    console.error('[API OCR Ingest]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

```

### app/api/host/kitchen/tickets/route.ts (59 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  resolveKitchenBusinessId,
  fetchKitchenTickets,
  updateKitchenTicket,
  createKitchenTicketRecord,
} from '@/lib/services/kitchen.service';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const businessId = await resolveKitchenBusinessId(supabase, request);
    if (!businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const statusFilter = new URL(request.url).searchParams.get('status');
    const tickets = await fetchKitchenTickets(supabase, businessId, statusFilter);
    return NextResponse.json({ tickets }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const businessId = await resolveKitchenBusinessId(supabase, request);
    if (!businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const result = await createKitchenTicketRecord(supabase, businessId, body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient();
    const businessId = await resolveKitchenBusinessId(supabase, request);
    if (!businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, status, items } = await request.json();
    if (!id || !status) return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });

    const ticket = await updateKitchenTicket(supabase, businessId, id, status, items);
    if (ticket && (status.toUpperCase() === 'SERVED' || status.toUpperCase() === 'COMPLETED') && (ticket.order_id || id)) {
      const { deductInventoryForOrder } = await import('@/lib/services/inventory/recipe-deduction.service');
      void deductInventoryForOrder(supabase, ticket.order_id || id, businessId);
    }
    return NextResponse.json({ success: true, ticket });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

```

### app/api/host/orders/create/route.ts (25 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveOrderBusinessId, createHostOrder } from '@/lib/services/orders.service';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const body = await request.json().catch(() => ({}));

    const businessId = await resolveOrderBusinessId(supabase, request, body);
    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const order = await createHostOrder(supabase, businessId, body);
    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error('[API Orders POST]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

```

### app/api/host/orders/history/route.ts (30 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: business } = await supabase.from('businesses').select('id').eq('host_id', user.id).single();
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error('[API Orders History GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

```

### app/api/host/orders/update-status/route.ts (132 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('host_id', user.id)
      .single();

    if (!business?.id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const businessId = business.id;
    const { orderId, status } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 });
    }

    // 1. Fetch the Order to check its items and current status
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, items, status')
      .eq('id', orderId)
      .eq('business_id', businessId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Prevent double depletion if it was already COMPLETED or SERVED
    const isAlreadyDepleted = order.status === 'COMPLETED' || order.status === 'SERVED';
    const isNowDepleting = status === 'COMPLETED' || status === 'SERVED';

    // 2. Update Order Status
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (updateError) {
      throw updateError;
    }

    // 3. Auto-Depletion Engine
    if (!isAlreadyDepleted && isNowDepleting && Array.isArray(order.items)) {
      // Collect all catalog item IDs from the order
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const catalogItemIds = order.items
        .filter((item: any) => item?.id && typeof item.id === 'string' && uuidRegex.test(item.id) && !item.id.startsWith('custom') && !item.isAdHoc)
        .map((item: any) => item.id);

      if (catalogItemIds.length > 0) {
        // Fetch recipes for these catalog items
        const { data: recipes } = await supabase
          .from('recipe_ingredients')
          .select('catalog_item_id, raw_item_id, quantity_required')
          .eq('business_id', businessId)
          .in('catalog_item_id', catalogItemIds);

        if (recipes && recipes.length > 0) {
          // Map recipes by catalog_item_id for fast lookup
          const recipesByCatalogItem = recipes.reduce((acc: any, recipe) => {
            if (!acc[recipe.catalog_item_id]) acc[recipe.catalog_item_id] = [];
            acc[recipe.catalog_item_id].push(recipe);
            return acc;
          }, {});

          // Calculate total raw material used
          const rawMaterialUsage: Record<string, number> = {};

          order.items.forEach((item: any) => {
            const qty = Number(item.quantity || item.qty || 1);
            const itemRecipes = recipesByCatalogItem[item.id];
            
            if (itemRecipes) {
              itemRecipes.forEach((recipe: any) => {
                const totalUsed = Number(recipe.quantity_required) * qty;
                if (!rawMaterialUsage[recipe.raw_item_id]) {
                  rawMaterialUsage[recipe.raw_item_id] = 0;
                }
                rawMaterialUsage[recipe.raw_item_id] += totalUsed;
              });
            }
          });

          // Execute Supabase RPC deduct_inventory_stock for each raw item
          // wrapped in Promise.all to act efficiently
          const depletionPromises = Object.entries(rawMaterialUsage).map(([rawItemId, totalUsed]) => {
            return supabase.rpc('deduct_inventory_stock', {
              p_raw_item_id: rawItemId,
              p_qty_to_deduct: totalUsed,
              p_business_id: businessId,
              p_notes: `Auto-depletion for Order ${orderId}`
            });
          });

          await Promise.all(depletionPromises);
        }
      }
    }

    // 4. 💳 Fee Guard — fire when an order is finalized (COMPLETED or SETTLED)
    //    ₹3 deducted from wallet OR logged to venue_outstanding_bills
    if (isNowDepleting && !isAlreadyDepleted) {
      try {
        const { invoiceRefFromId, evaluateFeeGuard } = await import('@/lib/services/wallet/fee-guard.service');
        const invoiceRef = invoiceRefFromId(orderId);
        await evaluateFeeGuard(businessId, 'bill_generate', invoiceRef, supabase);
      } catch (feeErr) {
        console.error('[UpdateStatus FeeGuard Error]', feeErr);
      }
    }

    return NextResponse.json({ success: true, message: 'Order status updated and inventory depleted if applicable' });
  } catch (error: any) {
    console.error('[UPDATE ORDER STATUS API]', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

```

### app/api/host/profile/route.ts (175 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    let userId = authData?.user?.id;

    if (!userId) {
      // In development or when unauthenticated on localhost, fallback to primary host of Venus Cafe
      const { data: defaultBiz } = await supabase
        .from('businesses')
        .select('host_id')
        .eq('id', 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269')
        .maybeSingle();

      userId = defaultBiz?.host_id || '3187876a-edf8-43af-b67a-3b75d616dc3f';
    }

    // 1. Fetch profile safely
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    // 2. Fetch businesses safely without crashing on duplicate rows
    // Order by created_at DESC to evaluate the latest topologies
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('host_id', userId)
      .order('created_at', { ascending: false });

    if (businessError) {
      console.error('[API Profile GET] Business fetch error:', businessError);
    }

    // Pick the primary business (prioritize the record with populated banking details)
    const business = businesses?.find(b => b.bank_account_number && String(b.bank_account_number).trim() !== '') 
      || businesses?.[0] 
      || null;

    // 3. Fetch location safely
    let location = null;
    if (business) {
      const { data: loc } = await supabase
        .from('locations')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      location = loc;
    }

    // Fallback: check if any location exists for any of the user's businesses
    if (!location && businesses && businesses.length > 0) {
      const bIds = businesses.map(b => b.id);
      const { data: anyLoc } = await supabase
        .from('locations')
        .select('*')
        .in('business_id', bIds)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      location = anyLoc;
    }

    const adminPin = business?.admin_pin ? String(business?.admin_pin).trim() : null;

    // Auto-provision venue subscription & credit wallet
    let walletInfo = null;
    if (business?.id) {
      try {
        const { getOrProvisionVenueWallet } = await import('@/lib/services/wallet/venue-wallet.service');
        walletInfo = await getOrProvisionVenueWallet(supabase, business.id);
      } catch (wErr) {
        console.warn('[Profile GET] Wallet auto-provisioning deferred:', wErr);
      }
    }

    return NextResponse.json({
      success: true,
      profile: profileData || {},
      business: business || {},
      location: location || {},
      admin_pin: adminPin,
      adminPin: adminPin,
      staff_pin: business?.staff_pin || null,
      protected_modules: business?.protected_modules || null,
      wallet: walletInfo?.wallet || null,
      subscription: walletInfo?.subscription || null,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error: any) {
    console.error('[API Profile GET Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authData.user.id;
    const payload = await request.json();

    const { displayName, ecosystemStatement, phone, dob, gender, offersAccommodation, adminPin, admin_pin } = payload;

    // 1. Update profile
    const profileUpdates: Record<string, any> = {};
    if (displayName) profileUpdates.full_name = displayName;
    if (phone !== undefined && phone !== null && phone !== '') profileUpdates.phone = phone;
    if (dob !== undefined && dob !== null && dob !== '') profileUpdates.dob = dob;
    if (gender !== undefined && gender !== null) profileUpdates.gender = gender;
    if (offersAccommodation !== undefined) profileUpdates.offers_accommodation = offersAccommodation ?? false;
    if (ecosystemStatement !== undefined && ecosystemStatement !== null && ecosystemStatement !== '') {
      profileUpdates.ecosystem_statement = ecosystemStatement;
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userId);

      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    // 2. Explicitly update businesses for admin_pin if provided
    const candidatePin = adminPin !== undefined ? adminPin : admin_pin;
    if (candidatePin !== undefined) {
      const cleanPin = (candidatePin && String(candidatePin).trim().length > 0) ? String(candidatePin).trim() : null;
      const { error: businessError } = await supabase
        .from('businesses')
        .update({ admin_pin: cleanPin })
        .eq('host_id', userId);

      if (businessError) {
        console.error('[API Profile PATCH] Failed to save Master PIN:', businessError);
        throw new Error(`Failed to save Master PIN: ${businessError.message}`);
      }
    }

    return NextResponse.json({ success: true }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });
  } catch (error: any) {
    console.error('[API Profile PATCH Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update profile' },
      { status: 500 },
    );
  }
}

```

### app/api/host/profile/update/route.ts (231 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Full Name is required').optional(),
  displayName: z.string().min(2, 'Display Name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().regex(/^\d{10}$/, 'Must be 10 digits').optional().nullable().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional().nullable(),
  dob: z.string().optional().nullable(),
  offersAccommodation: z.boolean().optional(),
  ecosystemStatement: z.string().optional().nullable(),
  categoriesHandled: z.array(z.string()).optional(),
  adminPin: z.string().regex(/^\d{4}$/, 'Master PIN must be exactly 4 digits').optional().nullable().or(z.literal('')),
  businesses: z.array(
    z.object({
      id: z.string().optional().nullable(),
      businessName: z.string().optional().nullable().or(z.literal('')),
      gstNumber: z.string().optional().nullable().or(z.literal('')),
      bankName: z.string().optional().nullable().or(z.literal('')),
      bankAccountNumber: z.string().optional().nullable().or(z.literal('')),
      bankIfscCode: z.string().optional().nullable().or(z.literal('')),
      upiId: z.string().optional().nullable().or(z.literal('')),
      staffPin: z.string().regex(/^\d{4}$/, 'Staff PIN must be exactly 4 digits').optional().nullable().or(z.literal('')),
      adminPin: z.string().regex(/^\d{4}$/, 'Master PIN must be exactly 4 digits').optional().nullable().or(z.literal('')),
      protectedModules: z.record(z.string(), z.boolean()).optional().nullable(),
    })
  ).optional()
});

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();
    let userId = authData?.user?.id;
    if (!userId) {
      // In development or when unauthenticated on localhost, fallback to primary host of Venus Cafe
      const { data: defaultBiz } = await supabase
        .from('businesses')
        .select('host_id')
        .eq('id', 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269')
        .maybeSingle();

      userId = defaultBiz?.host_id || '3187876a-edf8-43af-b67a-3b75d616dc3f';
    }

    const rawPayload = await request.json();

    // 1. Extract adminPin cleanly from root or businesses array
    const candidatePin = rawPayload.adminPin !== undefined 
      ? rawPayload.adminPin 
      : (rawPayload.admin_pin !== undefined 
          ? rawPayload.admin_pin 
          : rawPayload.businesses?.[0]?.adminPin);

    const cleanAdminPin = (candidatePin && String(candidatePin).trim().length > 0)
      ? String(candidatePin).trim()
      : null;

    if (cleanAdminPin && !/^\d{4}$/.test(cleanAdminPin)) {
      return NextResponse.json({ success: false, error: 'Master PIN must be exactly 4 digits' }, { status: 400 });
    }

    // 2. Validate payload safely
    const parsed = updateProfileSchema.safeParse(rawPayload);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid profile data.' }, { status: 400 });
    }
    const payload = parsed.data;

    // 3. Update Profiles Table (Separate from Business)
    const profileUpdates: Record<string, any> = {
      id: userId,
      role: 'host',
      full_name: payload.fullName || payload.displayName || authData?.user?.email?.split('@')[0] || 'Host',
    };
    if (payload.email !== undefined) profileUpdates.email = payload.email || null;
    if (payload.gender !== undefined) profileUpdates.gender = payload.gender;
    if (payload.offersAccommodation !== undefined) profileUpdates.offers_accommodation = payload.offersAccommodation;
    if (payload.dob !== undefined) profileUpdates.dob = payload.dob || null;
    if (payload.ecosystemStatement !== undefined) profileUpdates.ecosystem_statement = payload.ecosystemStatement || null;
    if (payload.categoriesHandled !== undefined) profileUpdates.categories_handled = payload.categoriesHandled;
    if (payload.phone !== undefined) profileUpdates.phone = payload.phone || null;

    try {
      const { error: profileError } = await supabase.from('profiles')
        .upsert(profileUpdates, { onConflict: 'id' });
      if (profileError) {
        console.warn(`[Profile Update Warning] Failed to save host identity to profiles: ${profileError.message}`);
      }
    } catch (e: any) {
      console.warn(`[Profile Update Warning] profiles table exception: ${e?.message}`);
    }

    // 4. Update Businesses Table
    // CRITICAL: NEVER overwrite unpassed or empty fields with null! Only update explicitly provided non-empty values.
    const businessData: Record<string, any> = (payload.businesses?.[0] || payload) as Record<string, any>;
    const businessUpdatePayload: Record<string, any> = {};

    if (candidatePin !== undefined) {
      businessUpdatePayload.admin_pin = cleanAdminPin; // Explicitly allowed to be NULL when user disables/clears PIN
    }

    if (payload.categoriesHandled !== undefined) {
      businessUpdatePayload.categories = payload.categoriesHandled;
    }
    if (businessData.businessName !== undefined) {
      businessUpdatePayload.business_name = String(businessData.businessName || '').trim() || null;
    }
    if (businessData.gstNumber !== undefined) {
      businessUpdatePayload.gst_number = String(businessData.gstNumber || '').trim() || null;
    }
    if (businessData.bankName !== undefined) {
      businessUpdatePayload.bank_name = String(businessData.bankName || '').trim() || null;
    }
    if (businessData.bankAccountNumber !== undefined) {
      businessUpdatePayload.bank_account_number = String(businessData.bankAccountNumber || '').trim() || null;
    }
    if (businessData.bankIfscCode !== undefined) {
      businessUpdatePayload.bank_ifsc_code = String(businessData.bankIfscCode || '').trim() || null;
    }
    if (businessData.upiId !== undefined) {
      businessUpdatePayload.upi_id = String(businessData.upiId || '').trim() || null;
    }
    if (businessData.staffPin !== undefined) businessUpdatePayload.staff_pin = String(businessData.staffPin || '').trim() || null;
    if (businessData.protectedModules !== undefined && businessData.protectedModules !== null) {
      businessUpdatePayload.protected_modules = typeof businessData.protectedModules === 'string' 
        ? businessData.protectedModules 
        : JSON.stringify(businessData.protectedModules);
    }

    // Perform SELECTIVE UPDATE only on existing business
    let updatedBizId: string | null = null;
    if (Object.keys(businessUpdatePayload).length > 0) {
      const targetBizQuery = (bPayload: Record<string, any>) => {
        let q = supabase.from('businesses').update(bPayload);
        if (businessData.id) return q.eq('id', businessData.id);
        if (userId) return q.eq('host_id', userId);
        return q.eq('id', 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269');
      };

      let { data: updatedBiz, error: businessError } = await targetBizQuery(businessUpdatePayload).select('id');

      // Schema Cache Resilience: If business_name column is not present in PostgREST cache, fallback seamlessly
      if (businessError && (businessError.message?.includes('business_name') || businessError.code === 'PGRST204')) {
        console.warn("[Profile Update] 'business_name' column missing from businesses cache. Retrying without it and syncing to locations.");
        const fallbackPayload = { ...businessUpdatePayload };
        delete fallbackPayload.business_name;

        if (Object.keys(fallbackPayload).length > 0) {
          const retryRes = await targetBizQuery(fallbackPayload).select('id');
          updatedBiz = retryRes.data;
          businessError = retryRes.error;
        } else {
          businessError = null;
        }
      }

      if (businessError) {
        console.error("Business Update Error:", businessError);
      }

      if (updatedBiz && updatedBiz.length > 0) {
        updatedBizId = updatedBiz[0].id;
      }
    }

    // 5. Update Location (Branch Name) in locations table
    const targetBranchName = businessData.businessName ? String(businessData.businessName).trim() : '';
    if (targetBranchName) {
      if (businessData.id) {
        await supabase
          .from('locations')
          .update({ branch_name: targetBranchName })
          .eq('id', businessData.id);
      }
      if (updatedBizId) {
        await supabase
          .from('locations')
          .update({ branch_name: targetBranchName })
          .eq('business_id', updatedBizId);
      }
    }

    const response = NextResponse.json({ 
      success: true, 
      admin_pin: cleanAdminPin,
      message: 'Enterprise profile and settings saved successfully.' 
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });

    // Set cookie cache for zero-latency localhost PIN and security sync
    if (cleanAdminPin) {
      response.cookies.set('quad_master_pin_cache', cleanAdminPin, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    } else if (candidatePin !== undefined) {
      response.cookies.delete('quad_master_pin_cache');
    }

    if (businessData.protectedModules) {
      const pmStr = typeof businessData.protectedModules === 'string'
        ? businessData.protectedModules
        : JSON.stringify(businessData.protectedModules);
      response.cookies.set('quad_protected_modules_cache', pmStr, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (error: any) {
    console.error('[API Profile Update Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to apply enterprise changes.' },
      { status: 500 },
    );
  }
}

```

### app/api/host/promotions/route.ts (98 lines)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    let businessId: string | null = null;

    if (user) {
      // 2. Resolve business_id from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (profile?.business_id) {
        businessId = profile.business_id;
      }
    }

    // 3. Fallback for Dev Environment if no active session
    if (!businessId) {
      const { data: fallbackOrder } = await supabase
        .from('orders')
        .select('business_id')
        .limit(1)
        .single();
      
      businessId = fallbackOrder?.business_id || null;
    }

    if (!businessId) {
      return NextResponse.json(
        { error: 'No active business ID found. Please log in or link a business.' },
        { status: 400 }
      );
    }

    // 4. Parse request payload
    const body = await req.json();
    const { code, title, type, value, is_active } = body;

    // 5. Insert into Supabase promotions table
    const { data: promotion, error: insertError } = await supabase
      .from('promotions')
      .insert({
        business_id: businessId,
        title: title || code,
        code: code || title,
        discount_type: type === '%' || type === 'percentage' || type === 'PERCENTAGE' ? 'PERCENTAGE' : 'FLAT',
        discount_value: parseFloat(value),
        is_active: is_active ?? true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Supabase Promo Insert Error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, promotion }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const id = req.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Promotion ID is required' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('promotions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Supabase Promo Delete Error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

```

### app/api/host/provision/route.ts (39 lines)
```typescript
import { NextResponse } from 'next/server';
import { hostOnboardingSchema } from '@/lib/validations/onboarding';
import { generateOwnerCafeId } from '@/lib/utils/ids';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const validatedData = hostOnboardingSchema.parse(payload);
    const uniqueOwnerCafeId = generateOwnerCafeId();
    const processedBusinesses = validatedData.businesses.map((business) => ({
      ...business,
      locationId: `loc_${crypto.randomUUID().slice(0, 8)}`,
      qrCodeHash: `qr_${crypto.randomUUID().slice(0, 12)}`,
    }));

    return NextResponse.json({
      success: true,
      uniqueOwnerCafeId,
      host: {
        uniqueOwnerCafeId,
        fullName: validatedData.fullName,
        gender: validatedData.gender,
        dob: validatedData.dob,
        categories: validatedData.categories,
      },
      businesses: processedBusinesses,
      controlCenterUrl: '/host/control-center',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid payload',
      },
      { status: 400 },
    );
  }
}

```

### app/api/host/security/status/route.ts (94 lines)
```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    let userId = user?.id;
    let business = null;

    if (userId) {
      const { data } = await supabase
        .from('businesses')
        .select('admin_pin, staff_pin, protected_modules')
        .eq('host_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      business = data;
    }

    if (!business) {
      const { data } = await supabase
        .from('businesses')
        .select('admin_pin, staff_pin, protected_modules')
        .eq('id', 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269')
        .maybeSingle();
      business = data;
    }

    const cookieStore = cookies();
    const cachedPin = cookieStore.get('quad_master_pin_cache')?.value?.trim();
    const cachedModules = cookieStore.get('quad_protected_modules_cache')?.value?.trim();

    const staffPin = business?.staff_pin?.toString().trim();
    const adminPin = business?.admin_pin?.toString().trim() || cachedPin || null;

    const isStaffPinActive = Boolean(staffPin && staffPin !== '');
    const isAdminPinActive = Boolean(adminPin && adminPin !== '');

    let protectedModules: Record<string, boolean> = {
      dashboard: true,
      profile: true,
      catalog: true,
      inventory: true,
      accommodations: false,
      expenses: true,
    };

    if (business?.protected_modules) {
      try {
        const parsed = typeof business.protected_modules === 'string'
          ? JSON.parse(business.protected_modules)
          : business.protected_modules;
        if (parsed && typeof parsed === 'object') {
          protectedModules = { ...protectedModules, ...parsed };
        }
      } catch {}
    } else if (cachedModules) {
      try {
        const parsed = JSON.parse(decodeURIComponent(cachedModules));
        if (parsed && typeof parsed === 'object') {
          protectedModules = { ...protectedModules, ...parsed };
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      isStaffPinActive,
      isAdminPinActive,
      hasAdminPin: isAdminPinActive,
      admin_pin: adminPin || null,
      protectedModules,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      }
    });
  } catch (error) {
    console.error('[API Security Status Error]', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      isAdminPinActive: false,
      hasAdminPin: false 
    }, { status: 500 });
  }
}

```

### app/api/host/sessions/fee/route.ts (39 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { FeeGuardAction } from '@/types/wallet';

export const dynamic = 'force-dynamic';

/**
 * POST /api/host/sessions/fee
 * Lightweight fee guard endpoint for Takeaway/Counter/Cash bills
 * that don't go through the PATCH /api/host/sessions flow.
 *
 * Body: { venueId: string, invoiceRef: string, action: FeeGuardAction }
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const { venueId, invoiceRef, action, overrideCost } = body as {
      venueId: string;
      invoiceRef: string;
      action: FeeGuardAction;
      overrideCost?: number;
    };

    if (!venueId || !action) {
      return NextResponse.json({ success: false, error: 'venueId and action required' }, { status: 400 });
    }

    const { evaluateFeeGuard, generateInvoiceRef } = await import('@/lib/services/wallet/fee-guard.service');
    const ref = invoiceRef || generateInvoiceRef();
    const feeResult = await evaluateFeeGuard(venueId, action, ref, supabase, overrideCost);

    return NextResponse.json({ success: true, feeResult, invoiceRef: ref });
  } catch (error: any) {
    console.error('[API Sessions Fee POST]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

```

### app/api/host/sessions/route.ts (85 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getActiveHostSessions,
  getBillRequestHistory,
  fetchActiveSessionLines,
  settleAndVacateSession,
} from '@/lib/services/session.service';

/**
 * GET /api/host/sessions
 * Fetch all active dine-in sessions for the host's tables.
 */
export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const view = new URL(request.url).searchParams.get('view');
    const result = view === 'bill_requests'
      ? await getBillRequestHistory(supabase)
      : await getActiveHostSessions(supabase);
    return NextResponse.json({ ...result, data: result });
  } catch (error: any) {
    console.error('[API Host Sessions GET]', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error', code: 'GET_SESSIONS_FAILED' }, { status: 500 });
  }
}

/**
 * POST /api/host/sessions
 * Fetch full itemized lines for a table's active session to load into POS cart.
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const result = await fetchActiveSessionLines(body, supabase);
    return NextResponse.json({ ...result, data: result });
  } catch (error: any) {
    console.error('[API Host Sessions POST]', error);
    const status = error.message?.includes('not found') ? 404 : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error', code: status === 404 ? 'SESSION_NOT_FOUND' : 'INTERNAL_ERROR' },
      { status }
    );
  }
}

/**
 * PATCH /api/host/sessions
 * Close session, settle master bill, and trigger Pay-As-You-Go fee guard.
 *
 * Fee resolution priority:
 *   1. Use body.order_id (real UUID) → display as QC-YYYY-{first8} in invoice ref
 *   2. Use body.session_id if no order_id
 *   3. Generate a fresh QC-YYYY-XXXX as last resort
 */
export async function PATCH(request: Request) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const venueId = body.business_id || body.venue_id || 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';

    const { withIdempotency, generateIdempotencyKey } = await import('@/lib/services/api-idempotency.util');
    const key = generateIdempotencyKey(
      'settle_session',
      `${venueId}:${body.table_number || body.table_id || body.session_id || ''}`,
      body
    );

    const { response, status } = await withIdempotency(key, async () => {
      const { invoiceRefFromId, generateInvoiceRef, evaluateFeeGuard } = await import('@/lib/services/wallet/fee-guard.service');
      const rawOrderId: string | undefined = body.order_id || body.session_id;
      const invoiceRef = rawOrderId ? invoiceRefFromId(rawOrderId) : generateInvoiceRef();
      const feeResult = await evaluateFeeGuard(venueId, 'bill_generate', invoiceRef, supabase);
      const result = await settleAndVacateSession(body, supabase);
      return { response: { ...result, feeResult, invoiceRef, data: { ...result, feeResult, invoiceRef } }, status: 200 };
    });

    return NextResponse.json(response, { status });
  } catch (error: any) {
    console.error('[API Host Sessions PATCH]', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error', code: 'SETTLE_FAILED' }, { status: 500 });
  }
}

```

### app/api/host/staff/verify-pin/route.ts (26 lines)
```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyPinCode } from './verify-pin.service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pinCode } = body || {};

    if (!pinCode) {
      return NextResponse.json({ success: false, error: 'PIN is required' }, { status: 400 });
    }

    const cookieStore = cookies();
    const cachedPin = cookieStore.get('quad_master_pin_cache')?.value?.trim();

    const { status, data } = await verifyPinCode(pinCode, cachedPin);
    return NextResponse.json(data, { status });
  } catch (error: any) {
    console.error('[API Staff Verify PIN Error]', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

```

### app/api/host/tables/route.ts (89 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getHostTables,
  createHostTable,
  updateHostTable,
  deleteHostTable,
} from '@/lib/services/table.service';

/**
 * GET /api/host/tables
 * Fetch all tables for the host's business.
 */
export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const result = await getHostTables(request.url, supabase);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Tables GET]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/host/tables
 * Create a new restaurant table.
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = await createHostTable(body, user, supabase);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Tables POST]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message?.includes('required') ? 400 : 500 }
    );
  }
}

/**
 * PATCH /api/host/tables
 * Update table status or active state.
 */
export async function PATCH(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const body = await request.json();
    const result = await updateHostTable(body, user, supabase);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Tables PATCH]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message?.includes('required') ? 400 : 500 }
    );
  }
}

/**
 * DELETE /api/host/tables
 * Deactivate (soft-delete) a table.
 */
export async function DELETE(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = await deleteHostTable(body, user, supabase);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Tables DELETE]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

```

### app/api/host/wallet/outstanding/route.ts (46 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venue_id');
    if (!venueId) return NextResponse.json({ success: false, error: 'venue_id required' }, { status: 400 });

    const { data, error } = await supabase
      .from('venue_outstanding_bills')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json({ success: true, bills: data ?? [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const { venueId } = body;
    if (!venueId) return NextResponse.json({ success: false, error: 'venueId required' }, { status: 400 });

    const { error } = await supabase
      .from('venue_outstanding_bills')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('venue_id', venueId)
      .eq('status', 'unpaid');

    if (error) throw error;
    return NextResponse.json({ success: true, message: 'All outstanding bills cleared.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

```

### app/api/host/wallet/redeem/route.ts (55 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyRedemptionCode } from '@/lib/services/wallet/redemption.service';
import { inMemoryRedemptions } from '@/lib/services/wallet/redemption-store.util';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createClient();
    const { withIdempotency, generateIdempotencyKey } = await import('@/lib/services/api-idempotency.util');
    const key = generateIdempotencyKey('host_verify_code', `${body?.cafe_id || ''}:${body?.code || ''}`, body);

    const { response, status } = await withIdempotency(key, async () => {
      const result = await verifyRedemptionCode(supabase, body);
      return { response: result, status: result.success ? 200 : 400 };
    });

    return NextResponse.json(response, { status });
  } catch (error: any) {
    console.error('[API Host Wallet Redeem POST]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const tableNumber = searchParams.get('table_number');
    const cafeId = searchParams.get('cafe_id') || searchParams.get('business_id');

    if (code) {
      const rec = inMemoryRedemptions.get(code.trim().toUpperCase());
      return NextResponse.json({ success: true, redemption: rec || null });
    }

    if (tableNumber) {
      const normT = tableNumber.replace(/^(table|t-)\s*/i, '').trim().toUpperCase();
      let match: any = null;
      for (const rec of Array.from(inMemoryRedemptions.values())) {
        const recNorm = (rec.table_number || '').replace(/^(table|t-)\s*/i, '').trim().toUpperCase();
        if (recNorm === normT && (!cafeId || rec.cafe_id === cafeId) && (rec.status === 'pending' || rec.status === 'verified')) {
          match = rec;
          break;
        }
      }
      return NextResponse.json({ success: true, redemption: match });
    }

    return NextResponse.json({ success: true, count: inMemoryRedemptions.size });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

```

### app/api/host/wallet/route.ts (124 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getVenueWalletDetails,
  topUpVenueWallet,
  updateVenuePlan,
  createTopupRequest,
  getVenuePendingTopup,
} from '@/lib/services/wallet/venue-wallet.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    let venueId = searchParams.get('venue_id');

    if (!venueId) {
      const { data: biz } = await supabase.from('businesses').select('id').limit(1).maybeSingle();
      venueId = biz?.id || 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
    }
    const finalVenueId = venueId || 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';

    const details = await getVenueWalletDetails(supabase, finalVenueId);
    return NextResponse.json({ success: true, ...details });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const { action, venueId, amount, planTier, utrNumber, paymentMethod, requestType, notes } = body;
    const targetVenue = venueId || 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';

    // 1. Submit UTR / Manual Payment Top-Up Request
    if (action === 'submit_topup_request') {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json({ success: false, error: 'Invalid top-up amount' }, { status: 400 });
      }
      if (!utrNumber || !String(utrNumber).trim()) {
        return NextResponse.json({ success: false, error: 'UTR / Transaction Reference is required' }, { status: 400 });
      }

      const res = await createTopupRequest(supabase, {
        venueId: targetVenue,
        amount: numAmount,
        utrNumber: String(utrNumber).trim(),
        paymentMethod: paymentMethod || 'upi_manual',
        requestedPlanTier: planTier || null,
        requestType,
        notes,
      });

      return NextResponse.json(res);
    }

    // 2. Select Plan with pending approval enforcement
    if (action === 'select_plan') {
      if (!['8k_2m', '12k_6m', '14k_9m', 'pay_as_you_go'].includes(planTier)) {
        return NextResponse.json({ success: false, error: 'Invalid plan tier' }, { status: 400 });
      }

      // Check if venue has pending topup
      const pending = await getVenuePendingTopup(supabase, targetVenue);
      if (pending) {
        return NextResponse.json(
          {
            success: false,
            error: 'Payment verification pending. Plan shifting is locked until admin approval.',
          },
          { status: 403 }
        );
      }

      const res = await updateVenuePlan(supabase, targetVenue, planTier);
      return NextResponse.json(res);
    }

    // 3. Direct topup (if UTR provided, routes to submit_topup_request)
    if (action === 'topup') {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json({ success: false, error: 'Invalid top-up amount' }, { status: 400 });
      }

      if (utrNumber && String(utrNumber).trim()) {
        const res = await createTopupRequest(supabase, {
          venueId: targetVenue,
          amount: numAmount,
          utrNumber: String(utrNumber).trim(),
          paymentMethod: paymentMethod || 'upi_manual',
          requestedPlanTier: planTier || null,
          notes,
        });
        return NextResponse.json(res);
      }

      // If pending approval exists, block direct credit
      const pending = await getVenuePendingTopup(supabase, targetVenue);
      if (pending) {
        return NextResponse.json(
          {
            success: false,
            error: 'Payment verification pending. Direct wallet crediting is locked until admin approval.',
          },
          { status: 403 }
        );
      }

      const res = await topUpVenueWallet(supabase, targetVenue, numAmount);
      return NextResponse.json(res);
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

```

### app/api/orders/route.ts (2 lines)
```typescript
export { GET, POST } from '@/app/api/guest/order/route';

```

### app/api/tables/route.ts (18 lines)
```typescript
import { GET as hostTablesGET, PATCH as hostTablesPATCH, POST as hostTablesPOST, DELETE as hostTablesDELETE } from '@/app/api/host/tables/route';

export async function GET(request: Request) {
  return hostTablesGET(request);
}

export async function PATCH(request: Request) {
  return hostTablesPATCH(request);
}

export async function POST(request: Request) {
  return hostTablesPOST(request);
}

export async function DELETE(request: Request) {
  return hostTablesDELETE(request);
}

```

### app/api/venue/offers/route.ts (250 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { VenueLiveOffer } from '@/types/offers';

// In-Memory store for graceful fallback & immediate local sync
let inMemoryOffers: VenueLiveOffer[] = [
  {
    id: 'offer-seed-1',
    venue_id: 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269',
    title: 'Sunset Happy Hour Cocktails',
    description: 'Buy 1 Get 1 on all craft cocktails & artisanal brews from 5:00 PM to 8:00 PM daily at the deck.',
    category: 'food',
    discount_badge: '1+1 Free',
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'offer-seed-2',
    venue_id: 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269',
    title: 'Weekend Mountain Suite Getaway',
    description: 'Enjoy 20% off on 2+ nights weekend bookings with complimentary organic orchard breakfast.',
    category: 'room',
    discount_badge: '20% OFF',
    valid_until: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'offer-seed-3',
    venue_id: 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269',
    title: 'Complimentary Dessert on Chef Specials',
    description: 'Order any 2 Chef Signature Mains and unlock a complimentary handcrafted Chocolate Lava Cake.',
    category: 'food',
    discount_badge: 'Free Dessert',
    valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId =
      searchParams.get('venue_id') ||
      searchParams.get('cafe_id') ||
      searchParams.get('business_id') ||
      'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
    const activeOnly = searchParams.get('active_only') !== 'false';
    const category = searchParams.get('category');

    // 1. Direct Supabase Query
    try {
      const supabase = createClient();
      let query = supabase
        .from('venue_live_offers')
        .select('*')
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        return NextResponse.json({ success: true, source: 'supabase', offers: data });
      }
    } catch (err) {
      console.warn('[API Offers GET] Fallback store active:', err);
    }

    // 2. Fallback in-memory store
    let filtered = inMemoryOffers.filter((o) => !o.venue_id || o.venue_id === venueId);
    if (activeOnly) {
      filtered = filtered.filter((o) => o.is_active);
    }
    if (category && category !== 'all') {
      filtered = filtered.filter((o) => o.category === category);
    }

    return NextResponse.json({
      success: true,
      source: 'fallback',
      offers: filtered,
    });
  } catch (error: any) {
    console.error('[API Offers GET Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch offers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      venue_id,
      cafe_id,
      title,
      description,
      category,
      discount_badge,
      valid_until,
      is_active,
    } = body;

    const resolvedVenueId = venue_id || cafe_id || 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
    const resolvedTitle = (title || '').trim();
    const resolvedBadge = (discount_badge || '').trim();
    const resolvedCategory = (category || 'general').toLowerCase();

    if (!resolvedTitle) {
      return NextResponse.json({ error: 'Offer title is required' }, { status: 400 });
    }
    if (!resolvedBadge) {
      return NextResponse.json({ error: 'Discount badge is required' }, { status: 400 });
    }

    const newOffer: VenueLiveOffer = {
      id: `offer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      venue_id: resolvedVenueId,
      title: resolvedTitle,
      description: (description || '').trim() || null,
      category: ['room', 'food', 'general'].includes(resolvedCategory)
        ? (resolvedCategory as any)
        : 'general',
      discount_badge: resolvedBadge,
      valid_until: valid_until || null,
      is_active: is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Try Supabase Insert
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('venue_live_offers')
        .insert({
          venue_id: newOffer.venue_id,
          title: newOffer.title,
          description: newOffer.description,
          category: newOffer.category,
          discount_badge: newOffer.discount_badge,
          valid_until: newOffer.valid_until,
          is_active: newOffer.is_active,
        })
        .select()
        .single();

      if (!error && data) {
        newOffer.id = data.id;
        inMemoryOffers.unshift(data);
        return NextResponse.json({ success: true, source: 'supabase', offer: data });
      }
    } catch (dbErr) {
      console.warn('[API Offers POST] Supabase note, using memory store:', dbErr);
    }

    // 2. Fallback memory save
    inMemoryOffers.unshift(newOffer);
    return NextResponse.json({ success: true, source: 'fallback', offer: newOffer });
  } catch (error: any) {
    console.error('[API Offers POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to create offer' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { id, is_active, title, description, category, discount_badge, valid_until } = body;

    if (!id) {
      return NextResponse.json({ error: 'Offer id is required' }, { status: 400 });
    }

    const updates: Partial<VenueLiveOffer> = {};
    if (typeof is_active === 'boolean') updates.is_active = is_active;
    if (title) updates.title = title.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (category) updates.category = category;
    if (discount_badge) updates.discount_badge = discount_badge.trim();
    if (valid_until !== undefined) updates.valid_until = valid_until;
    updates.updated_at = new Date().toISOString();

    // 1. Try Supabase Update
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('venue_live_offers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        const idx = inMemoryOffers.findIndex((o) => o.id === id);
        if (idx !== -1) inMemoryOffers[idx] = data;
        return NextResponse.json({ success: true, source: 'supabase', offer: data });
      }
    } catch (dbErr) {
      console.warn('[API Offers PATCH] Supabase note, using memory store:', dbErr);
    }

    // 2. Fallback memory update
    const idx = inMemoryOffers.findIndex((o) => o.id === id);
    if (idx !== -1) {
      inMemoryOffers[idx] = { ...inMemoryOffers[idx], ...updates };
      return NextResponse.json({ success: true, source: 'fallback', offer: inMemoryOffers[idx] });
    }

    return NextResponse.json({ success: true, source: 'fallback', updated: updates });
  } catch (error: any) {
    console.error('[API Offers PATCH Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to update offer' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Offer id is required' }, { status: 400 });
    }

    // 1. Try Supabase Delete
    try {
      const supabase = createClient();
      await supabase.from('venue_live_offers').delete().eq('id', id);
    } catch (dbErr) {
      console.warn('[API Offers DELETE] Supabase note:', dbErr);
    }

    // 2. Fallback memory delete
    inMemoryOffers = inMemoryOffers.filter((o) => o.id !== id);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error('[API Offers DELETE Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete offer' }, { status: 500 });
  }
}

```

### app/api/venue/photo-vault/route.ts (206 lines)
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { VENUE_VAULT_PHOTOS, VaultPhoto } from '@/components/guest/lobby/vault.constants';

// In-Memory store for graceful fallback & immediate sync
let inMemoryVault: Array<VaultPhoto & { venue_id?: string; time_tag?: string; image_url?: string; created_at?: string }> = 
  VENUE_VAULT_PHOTOS.map((p) => ({
    ...p,
    venue_id: 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269',
    time_tag: p.time ? `${p.date} @ ${p.time}` : p.date,
    timeTag: p.time ? `${p.date} @ ${p.time}` : p.date,
    image_url: p.imageUrl,
    created_at: new Date().toISOString(),
  }));

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId =
      searchParams.get('venue_id') ||
      searchParams.get('cafe_id') ||
      searchParams.get('business_id') ||
      'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
    const category = searchParams.get('category');

    // 1. Attempt live query from Supabase table
    try {
      const supabase = createClient();
      let query = supabase
        .from('venue_photo_vault')
        .select('*')
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false });

      if (category && category !== 'All') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        const mapped = data.map((row: any) => ({
          id: row.id,
          venue_id: row.venue_id,
          title: row.title,
          category: row.category,
          time_tag: row.time_tag || '',
          timeTag: row.time_tag || '',
          date: row.time_tag ? row.time_tag.split('@')[0]?.trim() : 'Live Event',
          time: row.time_tag ? row.time_tag.split('@')[1]?.trim() || '' : '',
          imageUrl: row.image_url,
          image_url: row.image_url,
          description: row.description || '',
          created_at: row.created_at,
        }));

        // If Supabase returned records, return them directly
        if (mapped.length > 0) {
          return NextResponse.json({ success: true, source: 'supabase', photos: mapped });
        }
      }
    } catch (dbErr) {
      console.warn('[API Photo-Vault Note]: Using fallback store while DB initializes:', dbErr);
    }

    // 2. Fallback to memory store
    let filtered = inMemoryVault.filter((p) => !p.venue_id || p.venue_id === venueId);
    if (category && category !== 'All') {
      filtered = filtered.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }

    return NextResponse.json({
      success: true,
      source: 'fallback',
      photos: filtered,
    });
  } catch (error: any) {
    console.error('[API Photo-Vault GET Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch photos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      venue_id,
      cafe_id,
      title,
      category,
      time_tag,
      timeTag,
      image_url,
      imageUrl,
      description,
    } = body;

    const resolvedVenueId = venue_id || cafe_id || 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
    const resolvedTitle = (title || '').trim();
    const resolvedCategory = (category || 'Acoustic Lounge').trim();
    const resolvedTimeTag = (time_tag || timeTag || 'Tonight @ 8:00 PM').trim();
    const resolvedImageUrl = (image_url || imageUrl || '').trim();
    const resolvedDescription = (description || '').trim();

    if (!resolvedTitle) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!resolvedImageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    const newRecordId = `vault-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newPhotoItem = {
      id: newRecordId,
      venue_id: resolvedVenueId,
      title: resolvedTitle,
      category: resolvedCategory,
      time_tag: resolvedTimeTag,
      timeTag: resolvedTimeTag,
      date: resolvedTimeTag.includes('@') ? resolvedTimeTag.split('@')[0]?.trim() : resolvedTimeTag,
      time: resolvedTimeTag.includes('@') ? resolvedTimeTag.split('@')[1]?.trim() : '',
      image_url: resolvedImageUrl,
      imageUrl: resolvedImageUrl,
      description: resolvedDescription,
      created_at: nowIso,
    };

    // 1. Save to in-memory store immediately
    inMemoryVault = [newPhotoItem, ...inMemoryVault];

    // 2. Attempt Supabase direct insertion
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('venue_photo_vault')
        .insert({
          venue_id: resolvedVenueId,
          title: resolvedTitle,
          category: resolvedCategory,
          time_tag: resolvedTimeTag,
          image_url: resolvedImageUrl,
          description: resolvedDescription,
        })
        .select()
        .single();

      if (!error && data) {
        newPhotoItem.id = data.id;
        newPhotoItem.created_at = data.created_at;
        return NextResponse.json({
          success: true,
          source: 'supabase',
          item: newPhotoItem,
        });
      } else if (error) {
        console.warn('[API Photo-Vault Insert Note]:', error.message);
      }
    } catch (dbErr) {
      console.warn('[API Photo-Vault DB Insertion Error]:', dbErr);
    }

    return NextResponse.json({
      success: true,
      source: 'fallback',
      item: newPhotoItem,
    });
  } catch (error: any) {
    console.error('[API Photo-Vault POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }

    // 1. Remove from memory store
    inMemoryVault = inMemoryVault.filter((p) => p.id !== id);

    // 2. Attempt Supabase deletion
    try {
      const supabase = createClient();
      await supabase.from('venue_photo_vault').delete().eq('id', id);
    } catch (dbErr) {
      console.warn('[API Photo-Vault Delete Note]:', dbErr);
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error('[API Photo-Vault DELETE Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete' }, { status: 500 });
  }
}

```

