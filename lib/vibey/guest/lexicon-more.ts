// More food vocabulary for Vibey, merged into the base lexicon per concept. Same rules: vocabulary only, never dishes.
// Covers Indian regional and street-food names, chaat, sweets, drinks, breads, rice, sandwiches and the common
// menu wording of Indian cafes and restaurants.
import { normalise } from './text';

export const MORE_LEXICON: Record<string, string[]> = {
  dessert: [
    'kulfi falooda', 'falooda', 'faluda', 'rabdi', 'jalebi rabdi', 'motichoor laddu', 'besan ladoo', 'coconut ladoo', 'mysore pak',
    'sohan halwa', 'badam halwa', 'moong dal halwa', 'sooji halwa', 'chum chum', 'mishti doi', 'pista kulfi', 'mango kulfi', 'ice gola',
    'gola', 'banana split', 'hot fudge', 'chocolate fudge', 'apple pie', 'panna cotta', 'creme brulee', 'crème brulee', 'cinnamon roll',
    'croissant', 'cinnamon', 'pastry puff', 'puff', 'choco lava', 'lava cake', 'molten cake', 'black forest', 'red velvet', 'pineapple cake',
    'fruit custard', 'kesari', 'payasam', 'gur halwa', 'til ladoo', 'gajar ka halwa', 'shrikhand', 'basundi', 'srikhand',
  ],
  drink: [
    'lemon iced tea', 'peach iced tea', 'masala soda', 'jaljeera', 'jal jeera', 'kokum sharbat', 'rose sharbat', 'rooh afza', 'rooafza',
    'bael sharbat', 'thandai', 'badam milk', 'kesar milk', 'turmeric milk', 'haldi doodh', 'hot badam milk', 'espresso shot', 'masala milk',
    'filter kaapi', 'kaapi', 'bournvita', 'horlicks', 'boost', 'complan', 'sugarcane', 'nimbu soda', 'lime soda', 'sweet lime', 'mosambi juice',
    'orange juice', 'pineapple juice', 'watermelon juice', 'mixed fruit juice', 'apple juice', 'pomegranate juice', 'carrot juice',
    'beetroot juice', 'wheatgrass', 'green smoothie', 'fruit punch', 'ginger ale', 'tonic water', 'sparkling water', 'still water',
    'soft drink', 'aerated drink', 'mango drink', 'cold beverage', 'hot beverage', 'kulhad', 'masala lemonade', 'sweet lassi', 'salted lassi',
  ],
  starter: [
    'corn chaat', 'bhel chaat', 'aloo chaat', 'papdi', 'papdi chaat', 'dahi vada', 'dahi bhalla', 'bhalla papdi', 'raj kachori', 'cheese corn',
    'corn cheese', 'veg cutlet', 'cutlet', 'cutlets', 'chicken lollipop', 'mushroom pakora', 'onion pakora', 'palak pakora', 'mirchi bajji',
    'mirchi pakora', 'aloo bonda', 'bonda', 'medu vada', 'masala peanut', 'peanut chaat', 'garlic bread sticks', 'stuffed mushroom', 'crispy corn',
    'honey chilli potato', 'chilli baby corn', 'baby corn', 'paneer 65', 'veg 65', 'gobi 65', 'tandoori momos', 'steamed momos', 'fried momos',
    'corn momos', 'nachos', 'loaded nachos', 'chips', 'potato wedges', 'wedges', 'onion rings', 'spring onion', 'sev', 'chakli', 'murukku',
  ],
  bread: [
    'methi', 'methi paratha', 'methi thepla', 'pav bhaji bread', 'laddu pav', 'kulcha chole', 'naan roti', 'pudina paratha', 'mooli paratha', 'gobi paratha', 'onion kulcha',
    'amritsari kulcha', 'stuffed kulcha', 'rumali roti', 'roomali roti', 'bajra bhakri', 'thalipeeth', 'sheermal', 'kheer paratha',
    'bun maska', 'pav roll', 'dinner roll', 'focaccia', 'baguette', 'ciabatta', 'garlic roti', 'missi', 'malabar paratha', 'kerala paratha',
    'chapati roll', 'roti roll', 'cheese naan', 'peshawari naan', 'kashmiri naan',
  ],
  rice: [
    'bhindi rice', 'vegetable pulao', 'mushroom pulao', 'paneer pulao', 'corn pulao', 'kaju pulao', 'jeera pulao', 'masala rice', 'pudina rice',
    'tomato rice', 'bisi bele bath', 'vegetable biryani', 'paneer biryani', 'mushroom biryani', 'soya biryani', 'curd rice', 'pongal rice',
    'venn pongal', 'pongal', 'rice plate', 'rice meal', 'egg rice', 'veg fried rice', 'chilli rice',
  ],
  main: [
    'chole bhature', 'rajma masala', 'dal palak', 'dal panchmel', 'kadhi pakora', 'sarson da saag', 'makki di roti', 'kaju curry', 'mix veg',
    'mixed veg', 'mix veg curry', 'veg kolhapuri', 'kolhapuri', 'malvani', 'paneer lababdar', 'aloo matar', 'aloo jeera', 'aloo bhindi',
    'bhindi masala', 'jeera aloo', 'shahi korma', 'veg korma', 'veg kurma', 'navratan korma', 'hara bhara kebab', 'cabbage curry', 'tinda masala',
    'lauki kofta', 'dum aloo', 'kashmiri dum aloo', 'veg thali', 'gujarati thali', 'punjabi thali', 'rajasthani thali', 'maharashtrian thali',
    'sarso', 'undhiyu', 'handvo', 'dhokla curry', 'mutter paneer', 'kadai veg', 'veg handi', 'paneer handi', 'mushroom curry', 'malai kofta curry',
  ],
  dal: [
    'dal', 'daal', 'dals', 'dal fry', 'dal tadka', 'dal makhani', 'dal palak', 'dal panchmel', 'dal shorba', 'toor dal', 'moong dal', 'masoor dal',
    'urad dal', 'chana dal', 'chilka dal', 'rajma dal', 'kali dal', 'black dal', 'yellow dal', 'pappu', 'sambar', 'rasam', 'khatti dal',
    'gujarati khatti mithi dal', 'sweet dal', 'dhaba dal', 'lentil curry', 'lentil soup',
  ],
  paneer: [
    'paneer kathi roll', 'paneer tikka roll', 'paneer frankie', 'paneer lollipop', 'paneer jalfrezi', 'paneer do pyaza', 'paneer bhurji sandwich',
    'paneer kulcha', 'paneer cheese toast', 'cottage cheese tikka', 'paneer schezwan', 'paneer shashlik', 'paneer tandoori', 'paneer reshmi',
  ],
  sandwich: [
    'cheese chilli sandwich', 'corn sandwich', 'tomato sandwich', 'cucumber sandwich', 'cheese corn sandwich', 'aloo sandwich',
    'bombay grilled sandwich', 'grilled cheese', 'triple decker', 'cheese toastie', 'toastie', 'ham sandwich', 'egg sandwich',
    'chicken sandwich', 'peanut butter sandwich', 'nutella sandwich', 'chocolate sandwich', 'banana sandwich', 'grilled sandwich',
  ],
  burger: ['double cheese burger', 'crispy burger', 'spicy chicken burger', 'crispy chicken burger', 'mcaloo', 'aloo burger', 'bean burger'],
  pizza: ['veggie pizza', 'peppy pizza', 'pizza margherita', 'pizza slice', 'pizza bun', 'garlic bread pizza', 'chicken pizza', 'onion pizza'],
  pasta: ['white sauce pasta', 'red sauce pasta', 'pink sauce pasta', 'pasta in cheese sauce', 'penne alfredo', 'spaghetti aglio olio', 'macaroni pasta'],
  noodles: ['hakka chowmein', 'veg chowmein', 'schezwan chowmein', 'singapore chowmein', 'chowmein noodles', 'egg chowmein', 'chicken chowmein'],
  shake: ['oreo milkshake', 'kitkat milkshake', 'cold coffee frappe', 'belgian chocolate shake', 'dates shake', 'sitaphal shake', 'chikoo shake'],
  salad: ['cucumber onion salad', 'sprouted moong salad', 'fruit chaat', 'bean salad', 'corn salad', 'paneer salad', 'chicken salad'],
  soup: ['hot n sour soup', 'veg manchow soup', 'corn soup', 'palak soup', 'carrot soup', 'pumpkin soup', 'cream soup'],
  south: [
    'masala uttapam', 'onion uttapam', 'mini idli', 'rava idli', 'paper dosa', 'mysore dosa', 'plain dosa', 'podi idli', 'ghee roast', 'ghee roast dosa',
    'onion rava dosa', 'upma dosa', 'idli vada', 'medu idli', 'kanchipuram idli', 'coconut chutney idli', 'pesarattu', 'uttapam',
  ],
  breakfast: [
    'veg sandwich breakfast', 'bread upma', 'aloo poha', 'kanda poha', 'sabudana khichdi', 'egg bhurji', 'masala omelette', 'cheese omelette',
    'western omelette', 'boiled eggs', 'oats porridge', 'overnight oats', 'fruit bowl', 'muesli bowl', 'idli sambar breakfast',
  ],
  cold: ['shake', 'shakes', 'milkshake', 'milk shake', 'lassi', 'soda', 'juice', 'smoothie', 'frappe', 'lemonade', 'cooler', 'mojito', 'chaas', 'buttermilk', 'iced tea', 'cold drink', 'cold coffee', 'frappuccino', 'cold tea'],
  side: [
    'papad', 'pickle', 'achar', 'chutney', 'raita', 'onion salad', 'kachumber', 'green chutney', 'mint chutney', 'tamarind chutney', 'extra pav',
    'extra bread', 'extra chutney', 'side dish', 'side', 'accompaniment', 'dip', 'dips', 'mayo dip', 'schezwan dip',
  ],
};

/** Merges two lexicons concept by concept, keeping every term once. */
export function mergeLexicon(a: Record<string, string[]>, b: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const src of [a, b]) {
    for (const [concept, terms] of Object.entries(src)) {
      const seen = new Set(out[concept] ?? []);
      out[concept] = [...(out[concept] ?? []), ...terms.filter((t) => !seen.has(t) && normalise(t).length > 0)];
    }
  }
  return out;
}
