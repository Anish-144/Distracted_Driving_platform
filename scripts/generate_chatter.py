import json
import random

categories = {
    "Family": [
        "I forgot to call my brother yesterday.",
        "My mom is visiting this weekend.",
        "My sister just got a new dog.",
        "I need to buy a birthday gift for my cousin.",
        "My parents are thinking about moving.",
        "I should text my uncle back.",
        "My nephew is getting so tall.",
        "I haven't seen my grandparents in a while."
    ],
    "Friends": [
        "Sarah said she might drop by later.",
        "I really need to catch up with John.",
        "Mark's party last week was fun.",
        "I wonder how Emily is doing.",
        "I should invite the guys over for dinner.",
        "Jane got that new job she wanted.",
        "Alex is moving to a new apartment."
    ],
    "Weekend plans": [
        "I really need to catch up on some sleep this weekend.",
        "Maybe I'll go for a hike on Saturday.",
        "I'm hoping to just relax and read a book.",
        "We should check out that new farmers market.",
        "I have so many chores to do this weekend.",
        "Thinking about going to the museum on Sunday.",
        "I might just stay in and watch movies.",
        "I have a lot of laundry to catch up on."
    ],
    "Food": [
        "I'm still not sure what to eat tonight.",
        "That coffee shop always seems packed.",
        "I could really go for some tacos later.",
        "I need to go grocery shopping soon.",
        "I've been craving sushi all day.",
        "Do you like spicy food?",
        "I tried a new recipe yesterday, it wasn't bad.",
        "I think I'll just order pizza tonight.",
        "I need to cut back on the junk food."
    ],
    "Travel": [
        "I really want to take a vacation soon.",
        "Have you ever been to Europe?",
        "I'm thinking about going camping next month.",
        "I saw some cheap flights to Mexico.",
        "I love exploring new cities.",
        "I hate packing for trips.",
        "I'd love to go back to the beach."
    ],
    "Shopping": [
        "I need to buy some new shoes.",
        "That store at the mall is having a sale.",
        "I spend way too much on online shopping.",
        "I have to return that jacket I bought.",
        "I'm looking for a new winter coat.",
        "I should stop spending money on unnecessary things."
    ],
    "Movies": [
        "Did you see that new action movie?",
        "I need a good comedy to watch.",
        "I'm not a big fan of horror films.",
        "That documentary was really interesting.",
        "I can't wait for the sequel to come out.",
        "I fell asleep halfway through the movie yesterday."
    ],
    "Music": [
        "I've had this song stuck in my head all day.",
        "I need to find some new music to listen to.",
        "Are you going to that concert next week?",
        "I really like this band's old stuff.",
        "I usually just listen to playlists on shuffle.",
        "I miss going to live music shows."
    ],
    "Weather": [
        "Do you think it'll rain later?",
        "It's supposed to be really nice tomorrow.",
        "I can't wait for summer.",
        "It's been so chilly lately.",
        "I love it when the weather is like this.",
        "I hope it doesn't snow this weekend.",
        "The wind is pretty strong today."
    ],
    "Work": [
        "I have a big meeting coming up on Monday.",
        "Work was pretty stressful today.",
        "I'm looking forward to the holidays.",
        "My boss is actually pretty cool.",
        "I need to finish that report by Friday.",
        "I'm thinking about taking a day off soon."
    ],
    "Local surroundings": [
        "The traffic feels lighter today.",
        "Look at that weird cloud.",
        "They've been doing construction there forever.",
        "That new building went up really fast.",
        "I love the trees in this neighborhood.",
        "It's surprisingly quiet out here.",
        "Look at that cute dog walking over there.",
        "This area has changed so much."
    ],
    "Random observations": [
        "Time is flying by so fast lately.",
        "I really need to drink more water.",
        "I should probably stretch more.",
        "I can't believe it's almost the end of the month.",
        "I had the weirdest dream last night.",
        "I keep forgetting where I put my keys.",
        "My phone battery drains so fast now."
    ]
}

# Expand to 500+ items by creating variations
variations = [
    "",
    " You know?",
    " Right?",
    " It's crazy.",
    " Well, anyway.",
    " Oh well.",
    " Honestly.",
    " That reminds me.",
    " I don't know why.",
    " It's just a thought."
]

prefixes = [
    "",
    "By the way, ",
    "So, ",
    "I was just thinking, ",
    "You know, ",
    "Random, but ",
    "Anyway, ",
    "Oh, "
]

all_snippets = []

for category, phrases in categories.items():
    for phrase in phrases:
        # Add the original
        all_snippets.append({"text": phrase, "category": category})
        # Generate variations to bulk up to 500+
        for _ in range(5):
            prefix = random.choice(prefixes)
            suffix = random.choice(variations)
            
            # Format nicely
            text = f"{prefix}{phrase.lower() if prefix else phrase}"
            if text.endswith('.') and suffix:
                text = text[:-1] + suffix
            elif suffix:
                text = text + suffix
                
            # capitalize first letter
            text = text[0].upper() + text[1:]
            
            all_snippets.append({
                "text": text,
                "category": category
            })

# ensure uniqueness
unique_snippets = {s["text"]: s for s in all_snippets}.values()
final_list = list(unique_snippets)

# We want roughly 500.
random.shuffle(final_list)

import os
os.makedirs("frontend/src/data", exist_ok=True)
with open("frontend/src/data/passenger_chatter.json", "w", encoding="utf-8") as f:
    json.dump(final_list, f, indent=2)

print(f"Generated {len(final_list)} passenger chatter snippets.")
