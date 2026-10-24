import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { UUID_REGEX } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { adminGate, fail } from '@/lib/services/admin/admin-route';
import { DATE, formCCsv, gstCsv } from '@/lib/services/admin/exports.service';
import { AUDIT_NOT_READY, auditReady, recordAdminAction } from '@/lib/services/admin/admin-audit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/exports?type=gst|form_c&from=YYYY-MM-DD&to=YYYY-MM-DD[&venue=<id>] : a CSV file.
 * Form C carries passport details, so it needs the admin log in place and every download is recorded there.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const gate = await adminGate(request);
    if (gate.error) return gate.error;
    const q = new URL(request.url).searchParams;
    const type = q.get('type'); const from = q.get('from') || ''; const to = q.get('to') || '';
    const venue = q.get('venue');
    if (!DATE.test(from) || !DATE.test(to) || from > to) return fail('Choose a valid date range.');
    if (venue && !UUID_REGEX.test(venue)) return fail('Unknown venue.');
    const db = adminDb();

    let out: { csv: string; rows: number };
    if (type === 'gst') out = await gstCsv(db, from, to);
    else if (type === 'form_c') {
      if (!(await auditReady(db))) return fail(AUDIT_NOT_READY, 503);
      out = await formCCsv(db, from, to, venue);
    } else return fail('Unknown export.');

    await recordAdminAction(db, gate.actor, `export_${type}`, venue, { from, to, rows: out.rows });
    const name = `vibers-${type === 'gst' ? 'gst' : 'form-c'}-${from}-to-${to}.csv`;
    return new NextResponse(`﻿${out.csv}`, { headers: {
      'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store',
    } });
  } catch (error) {
    return handleApiError(error, request, 'AdminExportGET');
  }
}, 'AdminExportGET');
