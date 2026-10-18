// Food vocabulary for Vibey: dish words, Hinglish names, spelling variants and category words, grouped by concept.
// It teaches the matcher what words mean ("thandi" is cold, "chai" is tea, "dal" is a main course). It never adds a
// dish: every dish still comes from the venue's own menu. Keep terms lower case, singular or plural, any spelling.
import { MORE_LEXICON, mergeLexicon } from './lexicon-more';

const BASE_LEXICON: Record<string, string[]> = {
  main: [
    'main course', 'mains', 'main', 'main dish', 'entree', 'curry', 'curries', 'sabzi', 'subzi', 'sabji', 'gravy',
    'dal', 'daal', 'lentil', 'lentils', 'dals', 'kadhi', 'kadhi chawal', 'rajma', 'rajma chawal', 'chole', 'chhole', 'chana',
    'chana masala', 'butter masala', 'makhani', 'makhni', 'kadai', 'korma', 'handi', 'bhuna', 'saag', 'palak', 'aloo gobi',
    'bhindi', 'baingan', 'bharta', 'matar', 'biryani', 'briyani', 'pulao', 'pulav', 'khichdi', 'khichadi', 'thali', 'meal',
    'khana', 'khaana', 'combo', 'platter', 'bhaji', 'pav bhaji', 'mushroom masala', 'dal makhani', 'dal tadka', 'dal fry',
    'tadka', 'tadke', 'dhaba', 'moong', 'masoor', 'toor', 'urad', 'rogan josh', 'nihari', 'haleem', 'kofta', 'malai kofta',
  ],
  dal: [
    'dal', 'daal', 'dals', 'lentil', 'lentils', 'tadka', 'tadke', 'dal fry', 'dal tadka', 'dal makhani', 'moong', 'masoor', 'toor', 'urad',
    'kadhi', 'dhaba', 'chana dal',
  ],
  rice: [
    'rice', 'chawal', 'chaawal', 'jeera rice', 'fried rice', 'steamed rice', 'ghee rice', 'lemon rice', 'curd rice', 'dahi chawal',
    'schezwan rice', 'schezwan fried rice', 'veg pulao', 'tawa pulao', 'kashmiri pulao', 'matar pulao', 'peas pulao', 'pulao rice',
    'veg biryani', 'hyderabadi biryani', 'lucknowi biryani', 'dum biryani', 'kachi biryani', 'rice bowl', 'khichdi rice',
    'coconut rice', 'tamarind rice', 'puliogare', 'bisibele bath', 'vegetable rice', 'egg fried rice', 'chicken fried rice',
  ],
  paneer: [
    'paneer', 'panir', 'cottage cheese', 'paneer tikka', 'paneer butter masala', 'shahi paneer', 'kadai paneer', 'paneer bhurji',
    'paneer paratha', 'palak paneer', 'paneer pakora', 'paneer makhani', 'paneer masala', 'paneer pizza', 'paneer roll',
    'paneer sandwich', 'paneer tikka masala', 'malai paneer', 'chilli paneer', 'chilly paneer', 'paneer 65', 'matar paneer',
    'paneer kofta', 'paneer lababdar', 'paneer grill', 'paneer pahadi', 'paneer makhni', 'schezwan paneer', 'paneer kathi',
  ],
  bread: [
    'bread', 'breads', 'roti', 'rotis', 'chapati', 'chapathi', 'phulka', 'fulka', 'naan', 'nan', 'kulcha', 'kulche', 'paratha',
    'parathe', 'parantha', 'paratha', 'aloo paratha', 'puri', 'poori', 'bhatura', 'bhature', 'thepla', 'pav', 'pao', 'bun', 'buns',
    'laccha paratha', 'missi roti', 'tandoori roti', 'garlic naan', 'butter naan', 'khakhra', 'bread butter', 'bread butter jam',
    'bread pakoda', 'bread roll', 'methi thepla', 'tawa paratha', 'ghee fulka', 'plain fulka', 'lachha paratha', 'stuffed paratha',
    'mix paratha', 'all mix paratha', 'cheese paratha', 'bhakri', 'bhakhri', 'jowar roti', 'bajra roti', 'makki roti', 'kulcha naan',
  ],
  starter: [
    'starter', 'starters', 'appetiser', 'appetizer', 'appetisers', 'snack', 'snacks', 'nashta', 'quick bite', 'quick bites', 'bite',
    'bites', 'fries', 'fry', 'french fries', 'peri peri', 'mayo fries', 'cheesy fries', 'batata vada', 'vada', 'vadas', 'vada pav',
    'pakoda', 'pakora', 'pakode', 'bhajiya', 'bhajji', 'samosa', 'samosas', 'kachori', 'chaat', 'chat', 'pani puri', 'panipuri',
    'golgappa', 'golgappe', 'bhel', 'bhel puri', 'sev puri', 'dahi puri', 'tikki', 'aloo tikki', 'spring roll', 'spring rolls',
    'momos', 'momo', 'manchurian', 'chilli', 'chilly', 'lollipop', 'hakka', 'nuggets', 'popcorn', 'cheese balls', 'papdi chaat',
    'ragda pattice', 'dhokla', 'khandvi', 'pav bhaji', 'misal', 'misal pav', 'poha', 'pohe', 'upma', 'sabudana vada', 'kothimbir vadi',
  ],
  dessert: [
    'dessert', 'desserts', 'sweet', 'sweets', 'meetha', 'meethe', 'meethi', 'mitha', 'mithai', 'halwa', 'halva', 'kheer', 'gulab jamun',
    'gulabjamun', 'jamun', 'jalebi', 'jalebis', 'rasgulla', 'rasgulle', 'rasmalai', 'kulfi', 'barfi', 'ladoo', 'laddu', 'ice cream',
    'icecream', 'sundae', 'brownie', 'brownies', 'cake', 'cakes', 'pastry', 'pastries', 'cheesecake', 'cheese cake', 'tiramisu',
    'pudding', 'mousse', 'donut', 'doughnut', 'waffle', 'waffles', 'fruit cream', 'fruit creams', 'shahi tukda', 'gajar halwa',
    'sheera', 'sheero', 'phirni', 'custard', 'trifle', 'cookie', 'cookies', 'muffin', 'muffins', 'pancake', 'pancakes', 'crepe',
    'crepes', 'tart', 'pie', 'macaron', 'macarons', 'cupcake', 'cupcakes', 'mochi', 'malpua', 'rabri', 'basundi', 'sandesh',
    'peda', 'kaju katli', 'barfee', 'nutella', 'chocolate waffle', 'dessert shots', 'gelato', 'kheer rice',
  ],
  drink: [
    'drink', 'drinks', 'beverage', 'beverages', 'peena', 'peene', 'piyenge', 'pina', 'sip', 'refreshment', 'juice', 'juices',
    'shake', 'shakes', 'milkshake', 'milk shake', 'lassi', 'soda', 'lemonade', 'mocktail', 'mocktails', 'cooler', 'smoothie',
    'frappe', 'chaas', 'chhaas', 'buttermilk', 'nimbu pani', 'sharbat', 'sherbet', 'aam panna', 'cola', 'coke', 'sprite', 'water',
    'mineral water', 'tea', 'chai', 'coffee', 'hot chocolate', 'cocoa', 'green tea', 'lemon tea', 'hot milk', 'milk', 'doodh',
    'sugarcane juice', 'ganne ka ras', 'coconut water', 'nariyal pani', 'tender coconut', 'iced tea', 'energy drink', 'mojito',
    'virgin mojito', 'sangria', 'kombucha', 'hot drink', 'cold drink', 'fizzy', 'aerated', 'packaged drink',
  ],
  cold: [
    'cold', 'chilled', 'iced', 'ice', 'thanda', 'thandi', 'thande', 'thanda chahiye', 'cool', 'frozen', 'chill', 'icy', 'shake', 'shakes', 'milkshake', 'milk shake', 'lassi', 'soda', 'juice', 'smoothie', 'frappe', 'lemonade', 'cooler', 'mojito', 'chaas', 'buttermilk', 'iced tea', 'cold drink', 'cold coffee', 'frappuccino', 'cold tea',
  ],
  tea: [
    'tea', 'teas', 'chai', 'chay', 'chaai', 'cutting chai', 'cutting', 'masala chai', 'ginger tea', 'adrak chai', 'adrak wali chai',
    'cardamom tea', 'elaichi chai', 'elaichi', 'ilaichi', 'kadak chai', 'kulhad chai', 'green tea', 'lemon tea', 'chai latte',
    'special tea', 'plain tea', 'spl masala tea', 'ginger lemon honey tea', 'honey tea', 'herbal tea', 'black tea', 'milk tea',
    'irani chai', 'cutting', 'tulsi tea', 'mint tea', 'pudina chai', 'saffron tea', 'kashmiri chai', 'noon chai', 'butter tea',
  ],
  coffee: [
    'coffee', 'coffe', 'cofee', 'kaafi', 'kafi', 'kaapi', 'cappuccino', 'capuccino', 'cappucino', 'americano', 'espresso', 'latte',
    'filter coffee', 'cold coffee', 'iced americano', 'mocha', 'macchiato', 'cafe', 'cafeteria', 'frappuccino', 'cafe latte',
    'flat white', 'long black', 'affogato', 'coffee frappe', 'instant coffee', 'black coffee', 'brew', 'chicory coffee',
  ],
  sandwich: [
    'sandwich', 'sandwiches', 'sandwitch', 'grill sandwich', 'grill', 'toast', 'toasts', 'club', 'club sandwich', 'cheese toast',
    'chilli toast', 'chilly toast', 'masala toast', 'open toast', 'panini', 'sub', 'subway', 'jumbo sandwich', 'pizza sandwich',
    'bread toast', 'cheese chilly toast', 'mumbai masala toast', 'garlic bread', 'herb garlic bread', 'pahadi sandwich', 'pahadi',
    'veg sandwich', 'cheese sandwich', 'plain sandwich', 'classic sandwich', 'chutney sandwich', 'bombay sandwich', 'bombay toast',
  ],
  burger: [
    'burger', 'burgers', 'veggie burger', 'veg burger', 'cheese burger', 'aloo tikki burger', 'patty', 'patties', 'slider', 'sliders',
    'zinger', 'chicken burger', 'paneer burger', 'double patty', 'maharaja mac',
  ],
  roll: [
    'roll', 'rolls', 'wrap', 'wraps', 'kathi', 'kathi roll', 'frankie', 'frankies', 'kebab roll', 'paneer roll', 'veg roll', 'egg roll',
    'twister', 'shawarma', 'shawarma roll', 'tortilla', 'tortillas', 'kati roll', 'kebab wrap', 'chicken roll', 'egg wrap', 'tikka roll',
  ],
  pizza: [
    'pizza', 'pizzas', 'pizzaa', 'margherita', 'margarita', 'margherita pizza', 'farmhouse', 'farm house', 'farm house pizza', 'peppy paneer',
    'pepperoni', 'veggie supreme', 'cheese pizza', 'pizza base', 'deep dish', 'thin crust', 'pan pizza', 'barbeque pizza', 'bbq pizza',
    'corn pizza', 'paneer pizza', 'mexican pizza', 'tandoori pizza', 'extra cheese pizza', 'extra cheese',
  ],
  pasta: [
    'pasta', 'pastas', 'penne', 'spaghetti', 'fettuccine', 'lasagna', 'lasagne', 'macaroni', 'mac and cheese', 'mac n cheese',
    'mac cheese', 'alfredo', 'arrabbiata', 'arrabiata', 'pesto', 'ravioli', 'fusilli', 'farfalle', 'tagliatelle', 'carbonara',
    'bolognese', 'pasta arrabbiata', 'cheesy pasta', 'baked pasta', 'lasagna sheets',
  ],
  noodles: [
    'noodles', 'noodle', 'noodls', 'maggi', 'maggie', 'chowmein', 'chow mein', 'chowmin', 'hakka noodles', 'schezwan noodles',
    'ramen', 'thukpa', 'singapore noodles', 'pad thai', 'egg noodles', 'veg noodles', 'instant noodles', 'cheesy maggi', 'peri peri maggi',
  ],
  chinese: [
    'chinese', 'manchurian', 'chilli', 'chilly', 'schezwan', 'szechuan', 'hakka', 'dimsum', 'dim sum', 'momo', 'momos', 'spring roll',
    'gobi manchurian', 'veg manchurian', 'chilli chicken', 'sweet and sour', 'honey chilli', 'chopsuey', 'chop suey', 'fried wonton',
    'wonton', 'kung pao', 'chilli potato', 'chilli garlic', 'garlic chilli', 'oriental',
  ],
  salad: [
    'salad', 'salads', 'caesar', 'caesar salad', 'greek salad', 'green salad', 'garden salad', 'garden green salad', 'sprout salad',
    'sprouts', 'kachumber', 'raita', 'coleslaw', 'fruit salad', 'russian salad', 'cucumber salad', 'tossed salad', 'chaat salad',
  ],
  soup: [
    'soup', 'soups', 'tomato soup', 'sweet corn soup', 'sweetcorn soup', 'hot and sour', 'hot n sour', 'manchow', 'clear soup',
    'lemon coriander soup', 'broth', 'shorba', 'dal shorba', 'mushroom soup', 'cream of tomato', 'minestrone', 'veg soup',
  ],
  shake: [
    'shake', 'shakes', 'milkshake', 'milk shake', 'banana shake', 'chocolate shake', 'oreo shake', 'mango shake', 'strawberry shake',
    'vanilla shake', 'butterscotch shake', 'kitkat shake', 'cold coffee shake', 'dry fruit shake', 'badam shake', 'thick shake',
    'mango milk shake', 'banana milkshake', 'chocolate milkshake', 'vanilla milkshake', 'strawberry milkshake', 'oreo milkshake',
  ],
  veg: [
    'veg', 'vegetarian', 'pure veg', 'paneer', 'aloo', 'alu', 'potato', 'gobi', 'cauliflower', 'mushroom', 'corn', 'sweet corn',
    'sabzi', 'vegetable', 'vegetables', 'veggie', 'veggies', 'shakahari', 'jain', 'satvik', 'no onion no garlic',
  ],
  nonveg: [
    'chicken', 'murgh', 'murg', 'murgh', 'mutton', 'gosht', 'lamb', 'goat', 'fish', 'machli', 'machhi', 'prawn', 'prawns', 'shrimp',
    'egg', 'eggs', 'anda', 'ande', 'keema', 'kheema', 'kebab', 'kebabs', 'tikka', 'tandoori', 'seekh', 'seekh kebab', 'chicken tikka',
    'butter chicken', 'chicken curry', 'egg bhurji', 'bhurji', 'omelette', 'omelet', 'fish fry', 'chicken biryani', 'mutton biryani',
    'non veg', 'nonveg', 'non vegetarian', 'meat', 'beef', 'pork', 'bacon', 'salami', 'sausage',
  ],
  breakfast: [
    'breakfast', 'nashta', 'poha', 'pohe', 'upma', 'idli', 'idly', 'dosa', 'dosas', 'uttapam', 'omelette', 'sabudana', 'oats',
    'cornflakes', 'muesli', 'pancake', 'pancakes', 'bread omelette', 'egg bhurji pav', 'morning', 'brunch',
  ],
  south: [
    'idli', 'idly', 'dosa', 'dosas', 'sambar', 'uttapam', 'rasam', 'medu', 'medu vada', 'pongal', 'appam', 'coconut chutney',
    'chutney', 'upma', 'south indian', 'south', 'madras', 'chettinad', 'kerala', 'andhra', 'udupi', 'mysore masala', 'masala dosa',
    'rava dosa', 'set dosa', 'podi', 'vada sambar', 'idli sambar', 'bisibele', 'pesarattu', 'kothu',
  ],
  modifier: [
    'indian', 'desi', 'punjabi', 'gujarati', 'maharashtrian', 'bengali', 'rajasthani', 'mughlai', 'hyderabadi', 'lucknowi', 'north',
    'north indian', 'style', 'special', 'spl', 'house', 'classic', 'fresh', 'homemade', 'homestyle', 'authentic', 'traditional',
    'kashmiri', 'chatpata', 'tangy', 'spicy', 'mild', 'sweet and spicy',
  ],
  generic: [
    'food', 'kuch', 'something', 'sabkuch', 'option', 'options', 'menu', 'dish', 'dishes', 'item', 'items', 'available', 'list',
    'show', 'dikhao', 'dikhaiye', 'dikha do', 'batao', 'bataye', 'bata do', 'suggest', 'suggestion', 'suggestions', 'recommend',
    'recommendation', 'popular', 'best', 'top', 'please', 'pls', 'any', 'koi', 'kya', 'kaun', 'what', 'which', 'have', 'got', 'you',
    'do', 'the', 'some', 'want', 'wnt', 'need', 'chahiye', 'hai', 'hain', 'milega', 'milegi', 'mujhe', 'mere', 'liye', 'course',
    'bhi', 'aur', 'ya', 'or', 'to', 'of', 'for', 'a', 'an', 'is', 'are', 'kuchh', 'ek', 'thoda', 'bahut', 'ne', 'ki', 'ka', 'ke',
  ],
  eatery: [
    'restaurant', 'cafe', 'bistro', 'dhaba', 'canteen', 'kitchen', 'thaali', 'tiffin', 'takeaway', 'parcel', 'delivery',
  ],
};

/** The concept names a person may ask for, as they read on screen. */
/** Base vocabulary plus the extra terms, merged per concept. */
export const LEXICON: Record<string, string[]> = mergeLexicon(BASE_LEXICON, MORE_LEXICON);

export const CONCEPT_LABEL: Record<string, string> = {
  main: 'mains', rice: 'rice dishes', paneer: 'paneer dishes', bread: 'breads', starter: 'starters', dessert: 'desserts',
  drink: 'drinks', tea: 'teas', coffee: 'coffees', sandwich: 'sandwiches', burger: 'burgers', roll: 'rolls', pizza: 'pizzas',
  pasta: 'pasta', noodles: 'noodles', chinese: 'Chinese dishes', salad: 'salads', soup: 'soups', shake: 'shakes', veg: 'veg dishes',
  nonveg: 'non-veg dishes', breakfast: 'breakfast', south: 'South Indian dishes', dal: 'dals',
};

/** Words that describe a request but name no dish. Ignored when matching a browse. */
export const STOP_CONCEPTS = new Set(['modifier', 'generic', 'eatery']);

/** The concepts that name a kind of food a guest can ask for: mains, desserts, sandwiches and so on. */
export const CATEGORY_CONCEPTS = new Set(Object.keys(CONCEPT_LABEL));
