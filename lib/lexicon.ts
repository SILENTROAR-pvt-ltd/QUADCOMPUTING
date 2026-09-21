export const LEXICON = {
  portal: 'Host Control Center',
  profile: 'Registered Profile Infrastructure',
  ownerId: 'Unique Owner Cafe ID',
  statement: 'Ecosystem Statement',
  completion: 'Completion Status',
  score: 'Profile Score',
  categories: 'Categories Handled',
  branches: 'Registered Property Branches',
  catalog: 'Service Catalog',
  foodAndBeverage: 'Food & Beverage Items',
  accommodation: 'Accommodation / Tariffs',
  drawer: 'Slide-Over Drawer',
} as const;

export type LexiconKey = keyof typeof LEXICON;
