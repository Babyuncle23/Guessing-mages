export const PROMPTS = {
  // Действия (для вопроса 14)
  actionWork: { text: "Inappropriate action at work", brainstorm: ["take a nap", "leave early", "ignore the boss", "play games"] },
  actionIllegal: { text: "Minor illegal act", brainstorm: ["pirate a movie", "jaywalk", "steal a pen", "sneak into a concert"] },
  actionEmbarrassing: { text: "Embarrassing action", brainstorm: ["trip and fall", "forget a name", "snort while laughing", "wave at a stranger"] },
  actionParty: { text: "Weird party trick", brainstorm: ["swallow a sword", "juggle apples", "do a backflip", "eat a glass"] },
  actionChore: { text: "Annoying daily chore", brainstorm: ["wash the dishes", "iron clothes", "vacuum", "take out the trash"] },
  actionRelax: { text: "Relaxing activity", brainstorm: ["sleep for 10 hours", "take a hot bath", "read a book", "stare at the wall"] },
  actionExtreme: { text: "Extreme sport action", brainstorm: ["jump from a plane", "surf a huge wave", "climb a mountain", "bungee jump"] },
  actionAlone: { text: "Something you do when alone", brainstorm: ["sing loudly", "talk to yourself", "dance weirdly", "eat from the fridge"] },

  // Еда и напитки
  fastFood: { text: "Fast food", brainstorm: ["Burger", "Pizza", "Fries", "Hot Dog"] },
  snack: { text: "Snack food", brainstorm: ["Skittles", "Doritos", "Jelly beans", "Cheetos"] },
  sweetLiquid: { text: "Sweet liquid", brainstorm: ["Maple syrup", "Melted chocolate", "Apple juice", "Honey"] },
  strongFood: { text: "Strong-smelling food", brainstorm: ["Onion", "Garlic", "Fish", "Blue Cheese"] },
  
  // Животные и существа
  animalFunny: { text: "Funny-looking animal", brainstorm: ["Platypus", "Ostrich", "Sloth", "Blobfish"] },
  animalFarm: { text: "Farm animal", brainstorm: ["Cow", "Pig", "Horse", "Goat"] },
  fictionalChar: { text: "Fictional character", brainstorm: ["Shrek", "Batman", "Homer Simpson", "Pikachu", "Yoda", "SpongeBob"] },
  villain: { text: "Horror movie villain", brainstorm: ["Freddy Krueger", "Jason Voorhees", "Michael Myers", "Ghostface"] },
  
  // Люди и роли
  politician: { text: "Famous politician", brainstorm: ["Donald Trump", "Joe Biden", "Boris Johnson", "Kim Jong Un", "Barack Obama", "Winston Churchill"] },
  historical: { text: "Historical figure", brainstorm: ["Abraham Lincoln", "Cleopatra", "Napoleon", "Julius Caesar"] },
  singer: { text: "Famous singer", brainstorm: ["Elvis", "Beyonce", "Eminem", "Adele"] },
  band: { text: "Rock band", brainstorm: ["Queen", "Nirvana", "The Beatles", "Metallica"] },
  
  // Вещи и объекты
  everyday: { text: "Everyday object", isPlural: true, brainstorm: ["Smartphones", "Toasters", "Fidget spinners", "Vinyl records"] },
  expensive: { text: "Expensive item", isPlural: true, brainstorm: ["Sports cars", "Designer bags", "Fine art", "Statues"] },
  gadget: { text: "Iconic gadget", brainstorm: ["The first iPhone", "The Game Boy", "The first PC"] },
  smallObj: { text: "Small object", brainstorm: ["Bottle caps", "Paperclips", "Buttons", "Rubber bands"] },
  
  // Технологии и компании
  techOld: { text: "Outdated technology", brainstorm: ["Fax machines", "Floppy disks", "Wired headphones", "VHS tapes"] },
  company: { text: "Famous company", brainstorm: ["Blockbuster", "Nokia", "Yahoo", "Toys R Us", "Tesla", "Netflix", "SpaceX"] },
  app: { text: "Modern app", brainstorm: ["TikTok", "Tinder", "Uber", "Instagram"] },
  website: { text: "Popular website", brainstorm: ["YouTube", "Wikipedia", "Amazon", "Google"] }
};

export const questionsDatabase = [
  {
    id: 1,
    category: "survival",
    text: "Would you rather",
    fragments: [
      {
        options: [
          { text: "be stranded", type: "stranded" },
          { text: "be left", type: "left" }
        ]
      },
      {
        options: [
          { text: "on a desert island", requires: ["stranded", "left"], type: "isolated", hints: ["Name a famous singer", "Name an annoying person", "Name a youtuber"] },
          { text: "in the woods alone", requires: ["stranded", "left"], type: "isolated", hints: [{ text: "Fictional character", brainstorm: ["Harry Potter", "Batman", "Sherlock Holmes", "Darth Vader"] }] },
          { text: "in a completely unfamiliar city", requires: ["left"], type: "urban", hints: [{ text: "Famous politician", brainstorm: ["Barack Obama", "Winston Churchill", "Abraham Lincoln"] }] },
        ]
      },
      {
        options: [
          { text: "for the rest of your life", hints: [{ text: "Famous actor", brainstorm: ["Leonardo DiCaprio", "Brad Pitt", "Tom Cruise", "Johnny Depp"] }] },
          { text: "for 5 years" },
          { text: "for 10 years" },
          { text: "for one day" },
          { text: "for one week" },
          { text: "forever" }
        ]
      },
      {
        options: [
          { text: "accompanied by [ ... ] or by [ ... ]?", hints: ["Name a type of person you find annoying", "Name a profession"] }
        ]
      }
    ],
    hints: [
      { text: "Cartoon character", brainstorm: ["Mickey Mouse", "Homer Simpson", "SpongeBob", "Bugs Bunny"] },
      { text: "Famous media personality", brainstorm: ["Kim Kardashian", "Oprah Winfrey", "Gordon Ramsay"] }
    ]
  },
  {
    id: 2,
    category: "activities",
    text: "Would you rather",
    fragments: [
      {
        options: [
          { text: "spend 1000 hours", type: "time", hints: [{ text: "Popular video game", brainstorm: ["Minecraft", "GTA V", "Fortnite", "Skyrim"] }] },
          { text: "enter a world championship for", type: "compete", hints: ["Name a board game", { text: "Sport", brainstorm: ["Football", "Basketball", "Tennis", "Golf"] }] },
          { text: "dedicate your entire future to", type: "future" },
          { text: "sacrifice all your free time to", type: "sacrifice" },
          { text: "spend all your weekends", type: "weekends" },
          { text: "be cursed to spend the rest of your life", type: "curse" }
        ]
      },
      {
        options: [
          { text: "playing", requires: ["time", "compete", "sacrifice", "weekends", "curse"], hints: ["Name a mobile game", { text: "Classic board game", brainstorm: ["Monopoly", "Chess", "Scrabble", "Catan"] }] },
          { text: "doing", requires: ["sacrifice", "weekends", "curse"], hints: [{ text: "Annoying habit", brainstorm: ["Biting nails", "Chewing loudly", "Interrupting", "Snoring", "Complaining"] }, { text: "Household chore", brainstorm: ["Washing dishes", "Vacuuming", "Doing laundry", "Ironing"] }] },
          { text: "mastering", requires: ["future", "sacrifice", "time", "weekends"], hints: [{ text: "Musical instrument", brainstorm: ["Guitar", "Piano", "Violin", "Drums"] }, { text: "Creative hobby", brainstorm: ["Painting", "Writing", "Photography", "Knitting", "Beatmaking", "Sculpting", "Composing"] }] },
          { text: "watching", requires: ["time", "weekends", "curse"], hints: [{ text: "Popular TV show", brainstorm: ["Breaking Bad", "Game of Thrones", "Friends", "The Office"] }, { text: "Basic human activity", brainstorm: ["Sleeping", "Eating", "Walking", "Breathing"] }] },
          { text: "obsessively analyzing", requires: ["future", "curse", "time"], hints: [{ text: "Weird conspiracy theory", brainstorm: ["Flat earth", "Birds aren't real", "Lizard people", "Faked moon landing"] }, { text: "School subject", brainstorm: ["Math", "History", "Physics", "Literature"] }] },
          { text: "aggressively teaching people about", requires: ["curse", "future", "weekends"], hints: ["Name a random country", { text: "Complicated topic", brainstorm: ["Quantum physics", "Cryptocurrency", "Taxes", "Veganism"] }] }
        ]
      },
      {
        options: [
          { text: "[ ... ] or [ ... ]?" },
          { text: "[ ... ] or [ ... ], and if you win you get a million dollars, but if you lose, you pay a fine equal to half of your annual income?", requires: ["compete"] },
          { text: "[ ... ] or [ ... ], and if you win you get a million dollars, but if you lose, you pay a fine equal to a quarter of your annual income?", requires: ["compete"] }
        ]
      }
    ],
    hints: []
  },
  {
    id: 3,
    category: "animals",
    text: "Would you rather",
    fragments: [
      {
        options: [
          { text: "have a pet", type: "possession", hints: ["Name a chubby animal", { text: "Farm animal", brainstorm: ["Cow", "Pig", "Chicken", "Sheep"] }] },
          { text: "be chased by a", type: "threat_run", hints: [{ text: "Fast animal", brainstorm: ["Cheetah", "Horse", "Ostrich", "Greyhound"] }, { text: "Angry animal", brainstorm: ["Bull", "Wolverine", "Hornet", "Boar"] }, { text: "Weird-looking animal", brainstorm: ["Platypus", "Sloth", "Pug", "Emu"] }] },
          { text: "be trapped alone with a", type: "threat_close", hints: ["Name a very loud animal"] },
          { text: "have to play with a", type: "threat_close", hints: [{ text: "Dangerous animal", brainstorm: ["Tiger", "Shark", "Crocodile", "Bear"] }] }
        ]
      },
      {
        options: [
          { text: "[ ... ] or [ ... ]", type: "normal" },
          { text: "giant [ ... ] or giant [ ... ]", type: "giant", hints: [{ text: "Common insect", brainstorm: ["Ant", "Spider", "Fly", "Mosquito"] }] },
          { text: "tiny [ ... ] or tiny [ ... ]", type: "tiny", hints: [{ text: "Heavy animal", brainstorm: ["Elephant", "Rhino", "Hippo", "Whale"] }] },
          { text: "invisible [ ... ] or invisible [ ... ]", type: "invisible", hints: ["Name an animal that bites"] }
        ]
      },
      {
        options: [
          { text: "for the next ten years?", requires: ["possession"] },
          { text: "in a tiny studio apartment?", requires: ["possession", "threat_run", "threat_close"] },
          { text: "in a dark forest?", requires: ["threat_run", "threat_close"], hints: [{ text: "Nocturnal animal", brainstorm: ["Owl", "Bat", "Raccoon", "Moth"] }] },
          { text: "in an empty mall?", requires: ["threat_run", "threat_close"] },
          { text: "inside a small elevator?", requires: ["threat_close"] },
          { text: "?" } 
        ]
      }
    ],
    hints: [
      { text: "Wild animal", brainstorm: ["Wolf", "Fox", "Lion", "Zebra"] },
      { text: "Dog breed", brainstorm: ["Pug", "Bulldog", "Husky", "Golden Retriever"] }
    ]
  },
  {
    id: 4,
    category: "skills",
    text: "Would you rather",
    fragments: [
      {
        options: [
          { 
            text: "instantly become a world-class expert in", 
            type: "positive", 
            hints: [
              { text: "Foreign language", brainstorm: ["Spanish", "Mandarin", "French", "Japanese"] },
              { text: "Professional field", brainstorm: ["Medicine", "Law", "Engineering", "Finance"] },
              { text: "Martial art", brainstorm: ["Karate", "Judo", "Boxing", "Taekwondo"] }
            ] 
          },
        ]
      },
      {
        options: [
          { text: "[ ... ] or [ ... ]" }
        ]
      },
      {
        options: [
          { text: "but only when you are", type: "condition" },
          { text: "but only when you are trying to impress", type: "context" }
        ]
      },
      {
        options: [
          { text: "the first person you meet on the street?", requires: ["context"], hints: [{ text: "Superpower", brainstorm: ["Flying", "Invisibility", "Telepathy", "Time travel"] }] },
          { text: "the hiring manager during a job interview?", requires: ["context"], hints: ["Name a professional skill"] },
          { text: "your parents at dinner?", requires: ["context"] },
          { text: "your parents?", requires: ["context"] },
          { text: "completely hungover?", requires: ["condition"] },
          { text: "in sauna?", requires: ["condition"] },
          { text: "having a bad hair day?", requires: ["condition"] },
          { text: "on a first date?", requires: ["condition"], hints: ["Name a topic for small talk"] }
        ]
      }
    ]
  },
  {
    id: 5,
    category: "lifestyle",
    text: "Would you rather",
    fragments: [
      {
        options: [
          { text: "have to brush your teeth with", type: "hygiene", hints: [{ text: "Sauce", brainstorm: ["Ketchup", "Mayo", "Mustard", "Soy Sauce"] }, { text: "Sticky thing", brainstorm: ["Honey", "Glue", "Syrup", "Melted cheese"] }] },
          { text: "have to wash your clothes in", type: "hygiene", hints: [{ text: "Sauce", brainstorm: ["Ketchup", "Mayo", "Mustard", "Soy Sauce"] }, { text: "Sticky thing", brainstorm: ["Honey", "Glue", "Syrup", "Melted cheese"] }] },
          { text: "have to drink a full glass of", type: "utility", hints: [{ text: "Hot drink", brainstorm: ["Coffee", "Tea", "Hot Chocolate", "Mulled Wine"] }, { text: "Popular drink", brainstorm: ["Cola", "Juice", "Beer", "Milk"] }] },
          { text: "fill your bed pillows with", type: "storage", hints: [{ text: "Crunchy snack", isPlural: true, brainstorm: ["Chips", "Nuts", "Pretzels", "Crackers"] }, { text: "Kitchen item", isPlural: true, brainstorm: ["Spoons", "Plates", "Blenders", "Knives"] }] }
        ]
      },
      {
        options: [
          { text: "[ ... ] or [ ... ]" }
        ]
      },
      {
        options: [
          { text: "every single morning for the rest of your life?" },
          { text: "every single day for an entire year, receiving the million dollars only at the very end?" },
          { text: "right before sleep?" },
          { text: "while a random stranger awkwardly stares at you?" },
          { text: "?" }
        ]
      }
    ],
    hints: [] 
  },
  {
    id: 6,
    category: "body",
    text: "Would you rather",
    fragments: [
      {
        options: [
          { text: "instantly sweat a puddle that", type: "sweat", hints: [{ text: "Sweet liquid", brainstorm: ["Maple syrup", "Melted chocolate", "Apple juice", "Honey"] }, { text: "Strong-smelling food", brainstorm: ["Onion", "Garlic", "Fish", "Blue Cheese"] }] },
          { text: "breathe out a cloud that", type: "breath", hints: [{ text: "Fast food", brainstorm: ["Burger", "Pizza", "Fries", "Hot Dog"] }] },
          { text: "produce saliva that", type: "saliva", hints: [{ text: "Type of candy", brainstorm: ["Gummy bears", "Chocolate", "Lollipop", "Skittles"] }] },
          { text: "have a face that", type: "face", hints: [{ text: "Funny-looking animal", brainstorm: ["Pug", "Sloth", "Monkey", "Frog"] }] },
          { text: "have a head that", type: "head", hints: [{ text: "Body part", brainstorm: ["Foot", "Ear", "Knee", "Elbow"] }, { text: "Common household item", brainstorm: ["Toaster", "Lamp", "Sponge", "Broom"] }] }
        ]
      },
      {
        options: [
          { text: "smells exactly like", requires: ["sweat", "breath"] },
          { text: "tastes exactly like", requires: ["sweat", "saliva"] },
          { text: "looks exactly like a", requires: ["face", "head"] }
        ]
      },
      {
        options: [
          { text: "[ ... ] or [ ... ]" }
        ]
      },
      {
        options: [
          { text: ", but only when you are", type: "condition" },
          { text: ", and it triggers every time you", type: "action" },
          { text: "", type: "none" }
        ]
      },
      {
        options: [
          { text: "in a bad mood?", requires: ["condition"] },
          { text: "in a great mood?", requires: ["condition"] },
          { text: "feeling guilty?", requires: ["condition"], hints: [{ text: "Junk food", brainstorm: ["Chips", "Donuts", "Ice cream", "Nachos"] }] },
          { text: "trying to sleep?", requires: ["condition"] },
          { text: "sit still?", requires: ["action"] },
          { text: "start laughing?", requires: ["action"] },
          { text: "get nervous?", requires: ["action"] },
          { text: "start eating?", requires: ["action"] },
          { text: "sneeze?", requires: ["action"], hints: [{ text: "Strong spice", brainstorm: ["Pepper", "Chili", "Cinnamon", "Garlic"] }] },
          { text: "?", requires: ["none"] }
        ]
      }
    ],
    hints: [
      { text: "Fruit", brainstorm: ["Banana", "Apple", "Pineapple", "Mango"] }
    ] 
  },
  {
    id: 7,
    category: "survival",
    text: "Would you rather",
    fragments: [
      {
        options: [
          { text: "be stranded", type: "stranded" },
          { text: "be left", type: "left" }
        ]
      },
      {
        options: [
          { text: "on a desert island", requires: ["stranded", "left"] },
          { text: "in the woods alone", requires: ["stranded", "left"] },
          { text: "in a completely unfamiliar city", requires: ["left"] }
        ]
      },
      {
        options: [
          { text: "for the rest of your life" },
          { text: "for 5 years" },
          { text: "for 10 years" },
          { text: "for one day" },
          { text: "for one week" }
        ]
      },
      {
        options: [
          { text: "without [ ... ] or without [ ... ]?", hints: [{ text: "Common piece of clothing", brainstorm: ["Sock", "Shoe", "Jacket", "Hat"] }, { text: "Basic survival tool", brainstorm: ["Pocket knife", "Matches", "Flashlight", "Compass"] }] }
        ]
      }
    ],
    hints: [
      { text: "Small pocket item", brainstorm: ["Keys", "Phone", "Wallet", "Chapstick"] },
      { text: "Hygiene product", isPlural: true, brainstorm: ["Soaps", "Toothpastes", "Shampoos", "Deodorants"] }
    ]
  },
  {
    id: 8,
    category: "lifestyle",
    text: "Would you rather",
    fragments: [
      {
        options: [
          { text: "magically receive an endless supply of", type: "recurring", hints: [{ text: "Large item in a house", isPlural: true, brainstorm: ["Sofas", "Beds", "Fridges", "Tables"] }] },
          { text: "receive a random package every day containing", type: "recurring" },
          { text: "wake up every morning next to a new pile of", type: "recurring" },
          { text: "get to use only", type: "one-time", hints: [{ text: "Expensive thing", isPlural: true, brainstorm: ["Cars", "Yachts", "Diamonds", "Mansions"] }, { text: "Thing you wear on your head", isPlural: true, brainstorm: ["Hats", "Helmets", "Caps", "Headbands"] }] }
        ]
      },
      {
        options: [
          { text: "[ ... ] or [ ... ]", type: "middle" }
        ]
      },
      {
        options: [
          { text: "appear out of thin air, but you have no control over when it happens?", requires: ["recurring"] }, 
          { text: "except it completely disappears on weekends?", requires: ["recurring"] }, 
          { text: "but it always emits a terrible, rotten smell?", requires: ["recurring"], hints: [{ text: "Thing that smells bad", brainstorm: ["Garbage", "Skunk", "Rotten egg", "Mud"] }] },
          { text: "for the rest of your life?", requires: ["one-time"] },
          { text: "but you are forced to share it with a total stranger?" }, 
          { text: "?" }
        ]
      }
    ],
    hints: [
      { text: "Thing you find in a refrigerator", isPlural: true, brainstorm: ["Eggs", "Apples", "Carrots", "Sausages"] }
    ]
  },
  {
    id: 9,
    category: "social",
    text: "Would you rather",
    fragments: [
      {
        options: [
          { text: "be adopted by a family of", type: "adopted", hints: [{ text: "Animal", isPlural: true, brainstorm: ["Wolves", "Monkeys", "Penguins", "Bears"] }, { text: "Type of rich person", isPlural: true, brainstorm: ["Billionaires", "Aristocrats", "Celebrities", "Royals"] }] },
          { text: "be fully accepted into a secret society of", type: "society", hints: [{ text: "Boring profession", isPlural: true, brainstorm: ["Accountants", "Data entry clerks", "Actuaries", "Auditors"] }, { text: "Exciting profession", isPlural: true, brainstorm: ["Astronauts", "Spies", "Stunt doubles", "Detectives"] }] }, 
          { text: "be raised from birth by a pack of", type: "raised", hints: [{ text: "Angry-looking animal", isPlural: true, brainstorm: ["Rhinos", "Bulls", "Eagles", "Hippos"] }] },
          { text: "be fully accepted into a magic school where the only spell you learn is how to summon", type: "society", hints: [{ text: "Fast food", brainstorm: ["Burgers", "Pizzas", "Fries", "Hot Dogs"] }] },
          { text: "have the magic power to turn gold into", type: "society", hints: [{ text: "Fast food", brainstorm: ["Burgers", "Pizzas", "Fries", "Hot Dogs"] }] },
          { text: "have the magic power to turn water into", type: "society", hints: [{ text: "Fast food", brainstorm: ["Burgers", "Pizzas", "Fries", "Hot Dogs"] }] },
          { text: "have the magic power to turn dirt into", type: "society", hints: [{ text: "Fast food", brainstorm: ["Burgers", "Pizzas", "Fries", "Hot Dogs"] }] }
        ]
      },
      {
        options: [
          { text: "[ ... ] or [ ... ]?" } 
        ]
      }
    ],
    hints: [
      { text: "Group of people", isPlural: true, brainstorm: ["Tourists", "Teenagers", "Politicians", "Clowns"] },
      { text: "Pet", isPlural: true, brainstorm: ["Dogs", "Cats", "Parrots", "Hamsters"] }
    ]
  },
  {
    id: 10,
    category: "career",
    text: "Would you rather",
    fragments: [
      {
        options: [
          { text: "start a successful business that only sells", type: "business", hints: [{ text: "Cheap item", isPlural: true, brainstorm: ["Paperclips", "Rubber bands", "Pencils", "Matches"] }] },
          { text: "found a popular new cult based entirely on the use of", type: "cult" },
          { text: "start a massive social movement focused on", type: "movement", hints: [{ text: "Minor inconvenience", isPlural: true, brainstorm: ["Slow Wi-Fi", "Stubbed toes", "Traffic lights", "Paper cuts"] }] },
          { text: "open a fancy restaurant where everything tastes like", type: "restaurant", hints: [{ text: "Thing you find in a bathroom", brainstorm: ["Soap", "Shampoo", "Toothpaste", "Toilet paper"] }] },
          { text: "host a daily podcast that obsessively discusses", type: "podcast", hints: [{ text: "Disease", isPlural: true, brainstorm: ["Flus", "Colds", "Headaches", "Allergies"] }] },
          { text: "run a massive YouTube channel dedicated to", type: "podcast" },
          { text: "become the CEO of a company that produces", type: "business" },
          { text: "form a popular musical band where all instruments are replaced by", type: "band", hints: [{ text: "Tool", isPlural: true, brainstorm: ["Hammers", "Saws", "Drills", "Wrenches"] }] },
          { text: "start a feared criminal gang that exclusively steals", type: "gang", hints: [{ text: "Cheap household item", isPlural: true, brainstorm: ["Sponges", "Toilet paper", "Lightbulbs", "Batteries"] }] }
        ]
      },
      {
        options: [
          { text: "[ ... ] or [ ... ]" }
        ]
      },
      {
        options: [
          { text: ", and become incredibly famous, but everyone makes fun of you?" },
          { text: ", but your entire family is forced to participate?" }, 
          { text: ", and you have to bring it up in every single conversation?" },
          { text: "?" }
        ]
      }
    ],
    hints: [
      { text: "Random thing in your room", isPlural: true, brainstorm: ["Books", "Cables", "Pillows", "Cups"] },
      { text: "Office supply", isPlural: true, brainstorm: ["Staplers", "Pens", "Sticky notes", "Folders"] }
    ]
  },
{
    id: 11,
    category: "time_travel",
    text: "Would you rather",
    fragments: [
      {
        options: [
          { text: "travel into the past", type: "past" },
          { text: "travel about 100 years into the future", type: "future" }
        ]
      },
      {
        options: [
          { text: "and warn people about the terrible future of", requires: ["past"], type: "change", hints: [PROMPTS.company, { text: "Modern technology", brainstorm: ["Social media", "Smartphones", "Artificial Intelligence"] }] },
          { text: "and destroy the original prototype of", requires: ["past"], type: "change_done", hints: [PROMPTS.gadget, { text: "Popular toy or game", brainstorm: ["Tamagotchi", "Rubik's Cube", "Furby", "Tetris"] }] },
          { text: "and invest all your savings into", requires: ["past"], type: "change_done", hints: [{ text: "Digital currency", brainstorm: ["Bitcoin", "Dogecoin", "Ethereum"] }, PROMPTS.company] },
          { text: "and secretly invent and take credit for", requires: ["past"], type: "change", hints: [PROMPTS.app, PROMPTS.website] },
          
          { text: "and discover that future humans worship", requires: ["future"], type: "worship", hints: [{ text: "Household item", brainstorm: ["Toaster", "Toilet", "Sofa", "Refrigerator"] }, PROMPTS.fictionalChar] },
          { text: "and discover that future humans completely stopped using", requires: ["future"], type: "future_stop", hints: [{ text: "Modern convenience", brainstorm: ["Smartphones", "Wi-Fi", "Toilets", "Beds"] }, { text: "Basic household item", brainstorm: ["Spoons", "Mirrors", "Chairs", "Blankets"] }] },
          { text: "and discover that future humans still unironically use", requires: ["future"], type: "future_still", hints: [PROMPTS.techOld, { text: "Old school trend", brainstorm: ["Fidget spinners", "Tamagotchis", "Yo-yos", "Pogs"] }] }
        ]
      },
      {
        options: [
          { text: "[ ... ] or [ ... ]?" }
        ]
      }
    ],
    hints: [] 
  },
  {
    id: 12,
    category: "superpowers",
    text: "Would you rather",
    fragments: [
      {
        options: [
          { text: "have the superpower to turn any object into", type: "transform", hints: [{ text: "Food item", brainstorm: ["Pizza", "Cheese", "Cake", "Chocolate"] }, { text: "Office supply", brainstorm: ["Stapler", "Paperclip", "Sticky note", "Pen"] }] },
          { text: "have the superpower to instantly turn yourself into", type: "shapeshift", hints: [PROMPTS.animalFunny, { text: "Inanimate object", brainstorm: ["Chair", "Lamp", "Car", "Tree"] }] },
          { text: "be able to teleport anywhere, but you always arrive covered in", type: "teleport", hints: [{ text: "Sticky substance", brainstorm: ["Honey", "Mud", "Slime", "Glue"] }, { text: "Sauce", brainstorm: ["Ketchup", "Mayonnaise", "Mustard", "Soy sauce"] }] },
          { text: "become completely invisible while holding", type: "invisible", hints: [{ text: "Fragile object", brainstorm: ["Raw egg", "Glass cup", "Flower", "Paper cup"] }, { text: "Exotic animal", brainstorm: ["Panda", "Koala", "Iguana", "Toucan"] }] },
          { text: "have super strength, but only while singing songs about", type: "strength", hints: [{ text: "Boring topic", brainstorm: ["Taxes", "Weather", "Traffic", "Math"] }, { text: "Vegetable", brainstorm: ["Broccoli", "Carrot", "Onion", "Cabbage"] }] },
          { text: "have super strength, but only while singing songs by", type: "strength", hints: [PROMPTS.singer, PROMPTS.band] },
          { text: "be able to fly, but you constantly emit the smell of", type: "fly", hints: [PROMPTS.strongFood, { text: "Chemical", brainstorm: ["Gasoline", "Bleach", "Chlorine", "Vinegar"] }] },
          { text: "gain the ability to read minds, but you can only hear people's thoughts about", type: "mind", hints: [{ text: "Boring topic", brainstorm: ["Weather", "Taxes", "Traffic", "Grocery lists"] }, { text: "Weird hobby", brainstorm: ["Taxidermy", "Collecting spoons", "Soap carving", "Extreme ironing"] }] }
        ]
      },
      {
        options: [
          { text: "[ ... ] or [ ... ]" }
        ]
      },
      {
        options: [
          { text: "whenever you sneeze?", requires: ["shapeshift"] },
          { text: "but suddenly everyone around you knows it?", requires: ["teleport", "shapeshift", "fly"] },
          { text: "but you can't control exactly when it happens?", requires: ["mind", "shapeshift"] },
          { text: "but the effect only lasts for 60 seconds a day?", requires: ["transform", "invisible", "strength"] }, 
          { text: "and you have to loudly annouce that you are doing it before use?" },
          { text: "?" },
          { text: "?" } 
        ]
      }
    ],
    hints: []
  },
  {
    id: 13,
    category: "lifestyle",
    text: "Would you rather",
    fragments: [
      {
        options: [
          { 
            text: "be forced to wear a costume of", 
            type: "costume_full", 
            hints: [PROMPTS.animalFunny, { text: "Food item", brainstorm: ["Hot dog", "Banana", "Taco", "Pizza"] }] 
          },
          { 
            text: "have to wear a mask of", 
            type: "costume_mask", 
            hints: [PROMPTS.politician, PROMPTS.villain] 
          },
          { 
            text: "have to physically carry a life-sized statue of", 
            type: "carry_statue", 
            hints: [PROMPTS.fictionalChar, PROMPTS.animalFarm] 
          },
          { 
            text: "be forced to dress exactly like", 
            type: "dress_like", 
            hints: [PROMPTS.historical, { text: "Weird profession", brainstorm: ["Clown", "Mime", "Pirate", "Astronaut"] }] 
          }
        ]
      },
      {
        options: [
          { text: "[ ... ] or [ ... ]" }
        ]
      },
      {
        options: [
          { text: "to every job interview you ever go to?", requires: ["costume_full", "dress_like"] },
          { text: "on wedding days you are invited to?", requires: ["costume_full", "dress_like"] },
          { text: "every time you fly on an airplane?", requires: ["costume_full", "carry_statue"] },
          { text: "every time you use public transport?", requires: ["costume_full", "carry_statue"] },
          { text: "every time you use public toilet?", requires: ["costume_full", "carry_statue"] },
          { text: "in all your official ID and passport photos?", requires: ["costume_mask"] },
          { text: "during every serious conversation with your partner?", requires: ["costume_mask"] },
          { text: "every time you talk to a police officer?", requires: ["costume_mask", "dress_like"] },
          { text: "every time you talk to a government official?", requires: ["costume_mask", "dress_like"] },
          { text: "every time you go grocery shopping?", requires: ["carry_statue"] },
          { text: "through airport security every single time?", requires: ["carry_statue"] },
          { text: "to every family gathering?", requires: ["costume_full", "dress_like", "carry_statue", "costume_mask"] },
          { text: "on every single first date?", requires: ["costume_full", "costume_mask", "dress_like"] },
          { text: "and pretend you don't understand why people are staring?", requires: ["costume_full", "carry_statue", "dress_like"] }
        ]
      }
    ],
    hints: []
  },
{
    id: 14,
    category: "superpowers",
    text: "Would you rather have the ability to",
    fragments: [
      {
        options: [
          { text: "[ ... ] or [ ... ]" }
        ]
      },
      {
        options: [
          { text: "without anyone ever knowing?" },
          { text: ", but you have to loudly announce that you're using it?" }, // <-- Исправлено здесь
          { text: ", but it only works when no one is looking at you?" },
          { text: ", but doing it makes you incredibly tired?" },
          { text: ", but instantly forget everything that happened while you were using  it?" },
          { text: ", but it only works for a year?" }
        ]
      }
    ],
    hints: [
      PROMPTS.actionWork, 
      PROMPTS.actionIllegal, 
      PROMPTS.actionEmbarrassing, 
      PROMPTS.actionParty, 
      PROMPTS.actionChore, 
      PROMPTS.actionRelax, 
      PROMPTS.actionExtreme, 
      PROMPTS.actionAlone
    ]
  },
  {
    id: 15,
    category: "mind",
    text: "Would you rather",
    fragments: [
      {
        options: [
          { text: "instantly gain all the life experience of", type: "exp" },
          { text: "instantly absorb all the memories and skills of", type: "skills" }
        ]
      },
      {
        options: [
          { text: "[ ... ] or [ ... ]" }
        ]
      },
      {
        options: [
          { text: ", but you permanently speak with their exact voice?" },
          { text: ", but you also inherit all of their deepest fears?" },
          { text: ", but you completely forget your own childhood?" },
          { text: ", but you start looking exactly like them when you get angry?" },
          { text: "?" }
        ]
      }
    ],
    hints: [
      { text: "Tech industry billionaire", brainstorm: ["Elon Musk", "Mark Zuckerberg", "Jeff Bezos", "Bill Gates"] },
      { text: "Someone with a high-stress job", brainstorm: ["Neurosurgeon", "Bomb disposal expert", "Air traffic controller"] },
      { text: "Person with dangerous secrets", brainstorm: ["Undercover spy", "Mafia boss", "Cult leader"] },
      PROMPTS.historical,
      PROMPTS.singer
    ]
  },
  {
    id: 16,
    category: "identity",
    text: "Would you rather",
    fragments: [
{
        options: [
          { text: "switch bodies with", type: "switch" }
        ]
      },
      {
        options: [
          { text: "[ ... ] or [ ... ]" }
        ]
      },
      {
        options: [
          { text: "for the rest of your lives?" },
          { text: "every single Monday for the rest of your lives?" },
          { text: "every weekend for the next 10 years?" },
          { text: "for one random day every month, without warning?" },
          { text: "for exactly one year, and then return to normal?" }
        ]
      }
    ],
    hints: [
      PROMPTS.animalFunny,
      PROMPTS.politician,
      PROMPTS.fictionalChar,
      { text: "Someone with a difficult job", brainstorm: ["Coal miner", "Surgeon", "President", "Deep sea diver"] }
    ]
  }
];