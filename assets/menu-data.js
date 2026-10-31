/*
 * Menu data for the unofficial Jack in the Box menu guide.
 *
 * Prices were researched in October 2026 from several third-party menu-price
 * trackers (see sources.html). Jack in the Box restaurants are mostly
 * franchised and set their own prices, so the same item costs different
 * amounts in different places. For each item:
 *   price - the most common price seen across sources (what we show first)
 *   low/high - the lowest and highest price seen, when sources disagreed
 */
window.MENU = {
  updated: "October 31, 2026",
  categories: [
    { id: "burgers",   name: "Burgers",            page: "burgers.html",   icon: "🍔", blurb: "Jack's classic burgers, from the Jumbo Jack to the Bacon Ultimate." },
    { id: "chicken",   name: "Chicken",            page: "chicken.html",   icon: "🍗", blurb: "Spicy sandwiches, crispy strips and nuggets." },
    { id: "tacos",     name: "Tacos & Munchies",   page: "tacos.html",     icon: "🌮", blurb: "The famous two tacos, Tiny Tacos and late-night Munchie Meals." },
    { id: "breakfast", name: "Breakfast",          page: "breakfast.html", icon: "🥐", blurb: "Croissants, burritos and sandwiches, served all day at most locations." },
    { id: "sides",     name: "Sides & Snacks",     page: "sides.html",     icon: "🍟", blurb: "Curly fries, egg rolls and stuffed jalapeños." },
    { id: "desserts",  name: "Desserts & Drinks",  page: "desserts.html",  icon: "🥤", blurb: "Shakes, cheesecake and fountain drinks." },
    { id: "combos",    name: "Combos",             page: "combos.html",    icon: "🧺", blurb: "Meals with a side and a drink." }
  ],
  items: [
    // Burgers
    { cat: "burgers", name: "Jumbo Jack", price: 4.99, low: 4.99, high: 5.86, desc: "Beef patty, lettuce, tomato, onion, pickles, mayo and ketchup on a sesame bun.", tags: ["classic", "popular"] },
    { cat: "burgers", name: "Sourdough Jack", price: 6.99, low: 5.99, high: 7.29, desc: "Beef patty, bacon, Swiss and American cheese, tomato and mayo on toasted sourdough.", tags: ["popular"] },
    { cat: "burgers", name: "Ultimate Cheeseburger", price: 7.49, low: 6.99, high: 7.79, desc: "Two beef patties with Swiss and American cheese, mayo, ketchup and mustard." },
    { cat: "burgers", name: "Bacon Ultimate Cheeseburger", price: 8.49, low: 6.99, high: 8.99, desc: "The Ultimate Cheeseburger with crispy bacon added." },
    { cat: "burgers", name: "Smashed Jack", price: 7.49, low: 7.29, high: 7.49, desc: "Two smashed beef patties, American cheese, caramelized onions and smash sauce.", tags: ["new"] },
    { cat: "burgers", name: "Bacon & Swiss Buttery Jack", price: 6.89, low: 6.49, high: 6.89, desc: "Beef patty with bacon, Swiss cheese and garlic herb butter on a toasted bun." },

    // Chicken
    { cat: "chicken", name: "Jack's Spicy Chicken", price: 6.79, low: 6.79, high: 6.99, desc: "Spicy breaded chicken fillet with lettuce, tomato and mayo.", tags: ["spicy", "popular"] },
    { cat: "chicken", name: "Jack's Spicy Chicken with Cheese", price: 7.29, desc: "Jack's Spicy Chicken with a slice of cheese.", tags: ["spicy"] },
    { cat: "chicken", name: "Cluck Sandwich", price: 6.59, low: 6.39, high: 6.59, desc: "Crispy chicken breast, pickles and sauce on a brioche bun." },
    { cat: "chicken", name: "Homestyle Ranch Chicken Club", price: 7.29, low: 7.29, high: 7.49, desc: "Homestyle chicken fillet with bacon, Swiss, lettuce, tomato and ranch." },
    { cat: "chicken", name: "Chicken Nuggets (4 pc)", price: 2.59, desc: "Four crispy white-meat nuggets with a dipping sauce." },
    { cat: "chicken", name: "Chicken Nuggets (8 pc)", price: 4.99, desc: "Eight crispy white-meat nuggets with dipping sauces." },
    { cat: "chicken", name: "Hot Honey Spicy Chicken Strips (3 pc)", price: 6.69, desc: "Three spicy breaded strips with a hot honey drizzle.", tags: ["spicy"] },
    { cat: "chicken", name: "Spicy Chicken Strips (5 pc)", price: 8.79, desc: "Five spicy breaded chicken strips with dipping sauce.", tags: ["spicy"] },

    // Tacos & Munchies
    { cat: "tacos", name: "2 Tacos", price: 1.99, low: 1.79, high: 2.49, desc: "Two crunchy fried tacos with seasoned filling, American cheese, lettuce and taco sauce.", tags: ["classic", "value", "popular"] },
    { cat: "tacos", name: "Tiny Tacos (5 pc)", price: 2.99, low: 2.99, high: 3.50, desc: "Five bite-size crunchy tacos.", tags: ["value"] },
    { cat: "tacos", name: "Sauced & Loaded Tiny Tacos (15 pc)", price: 4.99, low: 4.99, high: 6.99, desc: "Fifteen Tiny Tacos topped with cheese and sauce." },
    { cat: "tacos", name: "Munchie Meal (Build Your Own)", price: 8.49, low: 7.99, high: 10.00, desc: "A late-night meal with an entrée, sides and a drink. Usually 9 pm to 5 am.", tags: ["late night"] },

    // Breakfast
    { cat: "breakfast", name: "Breakfast Jack", price: 3.79, low: 3.29, high: 3.99, desc: "Egg, ham and American cheese on a toasted bun.", tags: ["value"] },
    { cat: "breakfast", name: "Supreme Croissant", price: 4.99, low: 2.99, high: 4.99, desc: "Egg, bacon, ham and American cheese on a buttery croissant.", tags: ["popular"] },
    { cat: "breakfast", name: "Extreme Sausage Sandwich", price: 4.49, low: 3.19, high: 4.49, desc: "Two sausage patties, egg and American cheese on a toasted bun." },
    { cat: "breakfast", name: "Grande Sausage Breakfast Burrito", price: 5.49, desc: "Sausage, scrambled eggs, cheese, hash browns and salsa in a flour tortilla." },

    // Sides
    { cat: "sides", name: "Seasoned Curly Fries (Medium)", price: 3.49, low: 2.99, high: 3.49, desc: "Spiral-cut fries in Jack's seasoning.", tags: ["popular"] },
    { cat: "sides", name: "Jumbo Egg Roll (1 pc)", price: 2.99, desc: "A crispy egg roll filled with pork and vegetables, with sweet & sour sauce." },
    { cat: "sides", name: "Egg Rolls (3 pc)", price: 5.49, low: 4.49, high: 5.99, desc: "Three crispy egg rolls with sweet & sour sauce." },
    { cat: "sides", name: "Stuffed Jalapeños (7 pc)", price: 4.99, low: 3.29, high: 5.49, desc: "Seven breaded jalapeño peppers filled with melted cheese.", tags: ["spicy"] },

    // Desserts & drinks
    { cat: "desserts", name: "Vanilla Shake", price: 3.99, desc: "Hand-scooped vanilla ice cream shake." },
    { cat: "desserts", name: "Chocolate Shake", price: 3.99, desc: "Ice cream shake blended with chocolate syrup." },
    { cat: "desserts", name: "Strawberry Shake", price: 3.99, desc: "Ice cream shake blended with strawberry syrup." },
    { cat: "desserts", name: "Oreo Cookie Shake", price: 4.29, desc: "Vanilla ice cream blended with Oreo cookie pieces.", tags: ["popular"] },
    { cat: "desserts", name: "New York Style Cheesecake", price: 2.99, low: 2.99, high: 4.86, desc: "A slice of creamy New York style cheesecake." },
    { cat: "desserts", name: "Fountain Drink (Small)", price: 1.99, low: 1.49, high: 4.49, desc: "Your choice of soda, lemonade or iced tea. Larger sizes cost more." },

    // Combos
    { cat: "combos", name: "Jumbo Jack Combo", price: 9.49, low: 8.99, high: 11.87, desc: "Jumbo Jack with a medium side and medium drink.", tags: ["popular"] },
    { cat: "combos", name: "8 pc Chicken Nuggets Combo", price: 8.99, desc: "Eight nuggets with a medium side, drink and sauces." },
    { cat: "combos", name: "Supreme Croissant Combo", price: 7.69, low: 4.09, high: 7.69, desc: "Supreme Croissant with hash browns and a drink." },
    { cat: "combos", name: "Grande Sausage Burrito Combo", price: 7.49, desc: "Grande Sausage Breakfast Burrito with hash browns and a drink." },
    { cat: "combos", name: "Extreme Sausage Sandwich Combo", price: 7.29, low: 4.29, high: 7.29, desc: "Extreme Sausage Sandwich with hash browns and a drink." }
  ],
  deals: [
    { title: "Doomsday Dipping Box", when: "Launches November 5, 2026", desc: "A movie tie-in box with Popcorn Chicken, two Mozzarella Sticks, two tacos, seasoned curly fries and a drink. Sauces: the new Assemble Sauce, Mutant Marinara and Buttermilk Ranch. Price not announced yet.", tag: "Coming soon" },
    { title: "Munchie Meal of Horror", when: "Halloween limited time", desc: "A Halloween Munchie Meal with a Double Krusty Burger of Terror or a Double Chicken Sandwich of Terror and a glow-in-the-dark cup. Listed at about $14.00.", tag: "Limited time" },
    { title: "2 Jack Wraps for $6", when: "Ongoing at many locations", desc: "Mix and match the Crispy Jack Wrap and the Grilled Jack Wrap.", tag: "Value" },
    { title: "Jack Pack app offers", when: "Changes weekly", desc: "The Jack in the Box app has rotating member-only deals, such as discounted tacos. Check the app for what's live near you.", tag: "App" },
    { title: "Late-night Munchie Meals", when: "Usually 9 pm to 5 am", desc: "Build your own Munchie Meal, from about $7.99 to $10.00 depending on location.", tag: "Late night" }
  ]
};
