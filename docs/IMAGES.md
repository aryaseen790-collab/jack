# Image guide

Every picture on the site has a reserved space. Until an image file exists, the space shows an emoji and the file name it is waiting for. Drop a file with that name into `assets/img/` and it appears automatically, with no code changes.

- **Formats:** `.webp` (preferred) or `.png`. The site tries `.webp` first, then `.png`.
- **Transparent backgrounds** for food, so it can float and tilt in 3D.
- **Size:** 1024×1024 is plenty for food and section images; 1920×1080 for backgrounds. Compress with [Squoosh](https://squoosh.app) before adding.
- When your images are in, set `showImageSlots: false` in `assets/menu-data.js` to hide the file-name labels on any spaces you leave empty.
- Don't use Jack in the Box logos, the Jack mascot or branded packaging.

## Style to add to every food prompt

```
3D rendered, glossy stylized food, soft studio lighting, subtle rim light, floating at a slight angle, centered, isolated on a transparent background, no text, no logo, no packaging, high detail, appetizing, warm red and golden accents, 1:1 square
```

## The toy box

The home page box, the preview box beside every menu board and the phone pop-up all show the **menu item images** below, so those are the most important ones. Until an image exists, the box pops out a built-in 3D model of the item (a burger, taco, shake and so on). Once you add an image, it replaces the model. Use a transparent background so it floats on the spring.

## Backgrounds (no transparency, 16:9)

| File | Prompt |
|---|---|
| `bg/late-night` | Neon-lit late-night drive-thru scene at 2am, purple and pink neon glow, rain reflections, cinematic 3D, no text, no logos, 16:9 |

## Section images (they pop up on the home page menu board)

| File | Prompt |
|---|---|
| `categories/burgers` | A tall stacked cheeseburger with sesame bun, two patties, melted cheese, lettuce and tomato |
| `categories/chicken` | A crispy spicy chicken sandwich with a crunchy golden fillet, lettuce and mayo |
| `categories/tacos` | Two crunchy fried tacos with seasoned filling, melted cheese, lettuce and red taco sauce |
| `categories/breakfast` | A buttery croissant sandwich with fried egg, bacon, ham and melted cheese |
| `categories/sides` | A red cup overflowing with seasoned spiral curly fries, a few fries flying out |
| `categories/desserts` | A cookies-and-cream milkshake with whipped cream beside a slice of New York cheesecake |
| `categories/combos` | A burger, curly fries and a fountain soda arranged together as a meal |

## Menu items (37)

For each item use: *"A single [item]: [description], hero product shot, three-quarter angle"* plus the style above.

| File | Item | Description to use |
|---|---|---|
| `items/jumbo-jack` | Jumbo Jack | Beef patty, lettuce, tomato, onion, pickles, mayo and ketchup on a sesame bun. |
| `items/sourdough-jack` | Sourdough Jack | Beef patty, bacon, Swiss and American cheese, tomato and mayo on toasted sourdough. |
| `items/ultimate-cheeseburger` | Ultimate Cheeseburger | Two beef patties with Swiss and American cheese, mayo, ketchup and mustard. |
| `items/bacon-ultimate-cheeseburger` | Bacon Ultimate Cheeseburger | The Ultimate Cheeseburger with crispy bacon added. |
| `items/smashed-jack` | Smashed Jack | Two smashed beef patties, American cheese, caramelized onions and smash sauce. |
| `items/bacon-and-swiss-buttery-jack` | Bacon & Swiss Buttery Jack | Beef patty with bacon, Swiss cheese and garlic herb butter on a toasted bun. |
| `items/jack-s-spicy-chicken` | Jack's Spicy Chicken | Spicy breaded chicken fillet with lettuce, tomato and mayo. |
| `items/jack-s-spicy-chicken-with-cheese` | Jack's Spicy Chicken with Cheese | Jack's Spicy Chicken with a slice of cheese. |
| `items/cluck-sandwich` | Cluck Sandwich | Crispy chicken breast, pickles and sauce on a brioche bun. |
| `items/homestyle-ranch-chicken-club` | Homestyle Ranch Chicken Club | Homestyle chicken fillet with bacon, Swiss, lettuce, tomato and ranch. |
| `items/chicken-nuggets-4-pc` | Chicken Nuggets (4 pc) | Four crispy white-meat nuggets with a dipping sauce. |
| `items/chicken-nuggets-8-pc` | Chicken Nuggets (8 pc) | Eight crispy white-meat nuggets with dipping sauces. |
| `items/hot-honey-spicy-chicken-strips-3-pc` | Hot Honey Spicy Chicken Strips (3 pc) | Three spicy breaded strips with a hot honey drizzle. |
| `items/spicy-chicken-strips-5-pc` | Spicy Chicken Strips (5 pc) | Five spicy breaded chicken strips with dipping sauce. |
| `items/2-tacos` | 2 Tacos | Two crunchy fried tacos with seasoned filling, American cheese, lettuce and taco sauce. |
| `items/tiny-tacos-5-pc` | Tiny Tacos (5 pc) | Five bite-size crunchy tacos. |
| `items/sauced-and-loaded-tiny-tacos-15-pc` | Sauced & Loaded Tiny Tacos (15 pc) | Fifteen Tiny Tacos topped with cheese and sauce. |
| `items/munchie-meal-build-your-own` | Munchie Meal (Build Your Own) | A late-night meal with an entrée, sides and a drink. Usually 9 pm to 5 am. |
| `items/breakfast-jack` | Breakfast Jack | Egg, ham and American cheese on a toasted bun. |
| `items/supreme-croissant` | Supreme Croissant | Egg, bacon, ham and American cheese on a buttery croissant. |
| `items/extreme-sausage-sandwich` | Extreme Sausage Sandwich | Two sausage patties, egg and American cheese on a toasted bun. |
| `items/grande-sausage-breakfast-burrito` | Grande Sausage Breakfast Burrito | Sausage, scrambled eggs, cheese, hash browns and salsa in a flour tortilla. |
| `items/seasoned-curly-fries-medium` | Seasoned Curly Fries (Medium) | Spiral-cut fries in Jack's seasoning. |
| `items/jumbo-egg-roll-1-pc` | Jumbo Egg Roll (1 pc) | A crispy egg roll filled with pork and vegetables, with sweet & sour sauce. |
| `items/egg-rolls-3-pc` | Egg Rolls (3 pc) | Three crispy egg rolls with sweet & sour sauce. |
| `items/stuffed-jalape-os-7-pc` | Stuffed Jalapeños (7 pc) | Seven breaded jalapeño peppers filled with melted cheese. |
| `items/vanilla-shake` | Vanilla Shake | Hand-scooped vanilla ice cream shake. |
| `items/chocolate-shake` | Chocolate Shake | Ice cream shake blended with chocolate syrup. |
| `items/strawberry-shake` | Strawberry Shake | Ice cream shake blended with strawberry syrup. |
| `items/oreo-cookie-shake` | Oreo Cookie Shake | Vanilla ice cream blended with Oreo cookie pieces. |
| `items/new-york-style-cheesecake` | New York Style Cheesecake | A slice of creamy New York style cheesecake. |
| `items/fountain-drink-small` | Fountain Drink (Small) | Your choice of soda, lemonade or iced tea. Larger sizes cost more. |
| `items/jumbo-jack-combo` | Jumbo Jack Combo | Jumbo Jack with a medium side and medium drink. |
| `items/8-pc-chicken-nuggets-combo` | 8 pc Chicken Nuggets Combo | Eight nuggets with a medium side, drink and sauces. |
| `items/supreme-croissant-combo` | Supreme Croissant Combo | Supreme Croissant with hash browns and a drink. |
| `items/grande-sausage-burrito-combo` | Grande Sausage Burrito Combo | Grande Sausage Breakfast Burrito with hash browns and a drink. |
| `items/extreme-sausage-sandwich-combo` | Extreme Sausage Sandwich Combo | Extreme Sausage Sandwich with hash browns and a drink. |

## Deals (square, transparent background; shown on the coupon stubs)

| File | Prompt |
|---|---|
| `deals/doomsday-dipping-box` | Doomsday Dipping Box: A movie tie-in box with Popcorn Chicken, two Mozzarella Sticks, two tacos, seasoned curly fries and a drink. |
| `deals/2-jack-wraps-for-6` | 2 Jack Wraps for $6: Mix and match the Crispy Jack Wrap and the Grilled Jack Wrap.. |
| `deals/jack-pack-app-offers` | Jack Pack app offers: The Jack in the Box app has rotating member-only deals, such as discounted tacos. |
| `deals/late-night-munchie-meals` | Late-night Munchie Meals: Build your own Munchie Meal, from about $7.99 to $10.00 depending on location.. |
