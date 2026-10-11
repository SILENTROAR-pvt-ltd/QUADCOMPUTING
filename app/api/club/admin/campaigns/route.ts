import { adminDb } from '@/lib/supabase/admin';
import { clubApi, fail, ok, readBody } from '@/lib/club/http';
import { requireStaff } from '@/lib/club/auth';
import { createCampaign, listCampaigns, rotateCampaign, setCampaignActive } from '@/lib/club/campaigns.service';

export const dynamic = 'force-dynamic';

/** GET /api/club/admin/campaigns — QR campaigns and how many applications each brought. */
export const GET = clubApi('AdminCampaigns', async () => {
  const db = adminDb();
  await requireStaff(db);
  return ok({ campaigns: await listCampaigns(db) });
});

/** POST /api/club/admin/campaigns { op: create, label } | { op: rotate|activate|deactivate, id } */
export const POST = clubApi('AdminCampaign', async (request) => {
  const db = adminDb();
  const { user } = await requireStaff(db);
  const body = await readBody(request);
  const id = String(body.id || '');
  switch (body.op) {
    case 'create': return ok({ campaign: await createCampaign(db, user.id, body.label) });
    case 'rotate': return ok({ campaign: await rotateCampaign(db, user.id, id) });
    case 'activate': await setCampaignActive(db, id, true); return ok();
    case 'deactivate': await setCampaignActive(db, id, false); return ok();
    default: fail(400, 'Unknown campaign action.');
  }
});
