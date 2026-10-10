import { ItemOption } from '../types';

export interface CustomizationOption {
  id: string;
  name: string;
  price: number;
  is_default?: boolean;
}

export interface CustomizationGroup {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  options: CustomizationOption[];
}

export interface CustomizableItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  type?: string;
  image_url?: string;
  item_options?: ItemOption[];
  options?: ItemOption[];
  customization_groups?: CustomizationGroup[];
}

export function getItemCustomizationGroups(item: CustomizableItem): CustomizationGroup[] {
  if (item.customization_groups && item.customization_groups.length > 0) {
    return item.customization_groups;
  }

  const rawOptions: ItemOption[] = item.item_options || item.options || [];
  if (!rawOptions || rawOptions.length === 0) {
    return [];
  }

  const groupsMap = new Map<string, CustomizationOption[]>();

  rawOptions.forEach((opt) => {
    const groupName = (opt.option_group_name || 'Options').trim();
    const optObj: CustomizationOption = {
      id: opt.id || `${groupName}_${opt.option_name}`,
      name: opt.option_name,
      price: Number(opt.additional_price) || 0,
      is_default: (Number(opt.additional_price) || 0) === 0,
    };

    if (!groupsMap.has(groupName)) {
      groupsMap.set(groupName, []);
    }
    groupsMap.get(groupName)!.push(optObj);
  });

  const result: CustomizationGroup[] = [];
  groupsMap.forEach((opts, groupName) => {
    const isSingle = /size|portion|crust|bread|choice|temperature|type/i.test(groupName);

    result.push({
      id: groupName.toLowerCase().replace(/\s+/g, '_'),
      name: groupName,
      type: isSingle ? 'single' : 'multiple',
      required: isSingle,
      options: opts,
    });
  });

  return result;
}
