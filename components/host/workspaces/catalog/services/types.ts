export type ServiceBillingDuration = 
  | 'Per Session'
  | 'Per Day'
  | 'Per Stay'
  | 'Per Person / Day'
  | 'Per Hour'
  | 'Per Night';

export type ServiceProviderType = 'in_house' | 'third_party';

export type ServiceCategory = 
  | 'Services'
  | 'Transportation'
  | 'Housekeeping'
  | 'Wellness'
  | 'Tours'
  | 'Rental'
  | 'Dining';

export interface CatalogServiceItem {
  id: string;
  name: string;
  price: number;
  category: ServiceCategory;
  duration: ServiceBillingDuration;
  providerType: ServiceProviderType;
  description: string;
  imageUrl?: string;
  isActive: boolean;
  isCustom?: boolean;
}

export interface ServiceQuickTemplate {
  name: string;
  price: number;
  category: ServiceCategory;
  duration: ServiceBillingDuration;
  providerType: ServiceProviderType;
  description: string;
}
