export type CompletionGroup = 'profile' | 'branches' | 'catalog';
export type CompletionTier = 'Provisioning' | 'Registered' | 'Operational' | 'Distinguished';
export interface CompletionCriterion { id: string; group: CompletionGroup; label: string; weight: number; fraction: number; hint: string; }
export interface CompletionStatus { score: number; tier: CompletionTier; byGroup: Record<CompletionGroup, { earned: number; possible: number }>; criteria: CompletionCriterion[]; nextAction: CompletionCriterion | null; }
