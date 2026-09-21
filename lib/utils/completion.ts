import type { CatalogItem, CompletionCriterion, CompletionGroup, CompletionStatus, CompletionTier, HostProfile, PropertyBranch } from '@/types';
import { isValidGstin } from './gst';

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const ratio = (value: number, total: number) => total ? clamp(value / total) : 0;
const filled = (value?: string | null) => Boolean(value?.trim());

export function calculateCompletionStatus(input: { profile: HostProfile | null; propertyBranches: PropertyBranch[]; serviceCatalog: CatalogItem[] }): CompletionStatus {
  const { profile, propertyBranches: branches, serviceCatalog } = input;
  const active = serviceCatalog.filter((item) => item.status !== 'archived');
  const criterion = (group: CompletionGroup, id: string, label: string, weight: number, fraction: number, hint: string): CompletionCriterion => ({ group, id, label, weight, fraction: clamp(fraction), hint });
  const criteria = [
    criterion('profile', 'display-name', 'Display name', 8, filled(profile?.displayName) ? 1 : 0, 'Set your public display name'),
    criterion('profile', 'legal-entity', 'Legal entity name', 6, filled(profile?.legalEntityName) ? 1 : 0, 'Register your legal entity'),
    criterion('profile', 'contact-phone', 'Contact phone', 6, filled(profile?.contact.phone) ? 1 : 0, 'Add a contact number'),
    criterion('profile', 'avatar', 'Identity mark', 5, filled(profile?.avatarUrl) ? 1 : 0, 'Upload an identity mark'),
    criterion('profile', 'statement', 'Ecosystem Statement', 10, ratio(profile?.ecosystemStatement.length ?? 0, 120), 'Articulate your Ecosystem Statement'),
    criterion('profile', 'categories', 'Categories Handled', 5, (profile?.categoriesHandled.length ?? 0) > 0 ? 1 : 0, 'Declare the Categories Handled'),
    criterion('branches', 'first-branch', 'Registered Property Branch', 12, branches.length ? 1 : 0, 'Register your first Property Branch'),
    criterion('branches', 'gst', 'GST registration', 8, ratio(branches.filter((branch) => branch.gstNumber && isValidGstin(branch.gstNumber)).length, branches.length), 'Attach a valid GST number'),
    criterion('branches', 'address', 'Branch address', 5, ratio(branches.filter((branch) => filled(branch.address.line1) && filled(branch.address.city)).length, branches.length), 'Complete every branch address'),
    criterion('branches', 'qr', 'QR Code hash', 5, ratio(branches.filter((branch) => branch.qrCodeHash).length, branches.length), 'Issue a QR Code hash'),
    criterion('catalog', 'first-item', 'First catalog item', 10, active.length ? 1 : 0, 'Add your first Service Catalog entry'),
    criterion('catalog', 'depth', 'Catalog depth', 8, ratio(active.length, 5), 'Reach five active catalog entries'),
    criterion('catalog', 'coverage', 'Category coverage', 12, active.length ? 1 : 0, 'Populate the Service Catalog'),
  ];
  const byGroup = { profile: { earned: 0, possible: 0 }, branches: { earned: 0, possible: 0 }, catalog: { earned: 0, possible: 0 } };
  criteria.forEach((item) => { byGroup[item.group].possible += item.weight; byGroup[item.group].earned += item.weight * item.fraction; });
  const possible = criteria.reduce((sum, item) => sum + item.weight, 0);
  const score = Math.round(criteria.reduce((sum, item) => sum + item.weight * item.fraction, 0) / possible * 100);
  const tier: CompletionTier = score >= 100 ? 'Distinguished' : score >= 70 ? 'Operational' : score >= 40 ? 'Registered' : 'Provisioning';
  const nextAction = criteria.filter((item) => item.fraction < 1).sort((a, b) => b.weight * (1 - b.fraction) - a.weight * (1 - a.fraction))[0] ?? null;
  return { score, tier, byGroup, criteria, nextAction };
}
