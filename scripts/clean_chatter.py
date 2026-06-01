import json
import re

PREFIXES = [
    r"(?i)^by the way,\s*",
    r"(?i)^random, but\s*",
    r"(?i)^i was just thinking,\s*",
    r"(?i)^anyway,\s*",
    r"(?i)^so,\s*",
    r"(?i)^you know,\s*",
    r"(?i)^oh,\s*",
]

SUFFIXES = [
    r"(?i)\s*i don't know why\.$",
    r"(?i)\s*it's just a thought\.$",
    r"(?i)\s*oh well\.$",
    r"(?i)\s*honestly\.$",
    r"(?i)\s*it's crazy\.$",
    r"(?i)\s*you know\?$",
    r"(?i)\s*well, anyway\.$",
    r"(?i)\s*right\?$",
    r"(?i)\s*that reminds me\.$",
]

BANNED_WORDS = [
    "phone", "text", "call", "notification", "distract", 
    "driving", "mistake", "social media", "screen", "message", "app"
]

def clean_chatter():
    input_path = "frontend/src/data/passenger_chatter.json"
    
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    cleaned_data = []
    seen = set()
    
    for item in data:
        text = item["text"]
        
        # Check banned words
        if any(banned in text.lower() for banned in BANNED_WORDS):
            continue
            
        # Strip prefixes
        for prefix in PREFIXES:
            text = re.sub(prefix, "", text)
            
        # Strip suffixes
        for suffix in SUFFIXES:
            text = re.sub(suffix, "", text)
            
        # Cleanup loose ends
        text = text.strip()
        
        # Capitalize first letter properly
        if len(text) > 0:
            text = text[0].upper() + text[1:]
            
        # Add a period if missing
        if len(text) > 0 and text[-1] not in ['.', '!', '?']:
            text += '.'
            
        # Ensure it's not empty and not purely punctuation
        if len(text) > 3 and text not in seen:
            seen.add(text)
            item["text"] = text
            cleaned_data.append(item)
            
    with open(input_path, "w", encoding="utf-8") as f:
        json.dump(cleaned_data, f, indent=2)
        
    print(f"Cleaned dataset. Reduced from {len(data)} to {len(cleaned_data)} unique entries.")

if __name__ == "__main__":
    clean_chatter()
