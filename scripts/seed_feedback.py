import sqlite3
import uuid
from datetime import datetime, timedelta
import random

def seed():
    conn = sqlite3.connect('distracted_driving.db')
    cursor = conn.cursor()
    
    types = ['bug', 'feature', 'ux', 'general', 'simulation']
    statuses = ['open', 'in_progress', 'resolved', 'archived']
    priorities = ['low', 'medium', 'high']
    
    comments = [
        "The simulation crashed on level 2 when my phone rang.",
        "I love the passenger voice, but can we turn it down?",
        "The cognitive report is missing my last session.",
        "Can we add a night driving mode?",
        "Great app, really helped me realize how distracted I get.",
        "UI looks a bit weird on my small phone screen.",
        "The GPS audio overlaps too much with the passenger.",
        "Would love a feature to review past mistakes in a replay.",
    ]
    
    # create some dummy users first just in case
    user_id = str(uuid.uuid4())
    try:
        cursor.execute("INSERT INTO users (id, name, email, hashed_password, is_admin) VALUES (?, ?, ?, ?, ?)", 
                       (user_id, "Tester", "tester@test.com", "fakehash", 0))
    except:
        pass # ignore if exists
        
    for i in range(20):
        f_id = str(uuid.uuid4())
        f_type = random.choice(types)
        f_status = random.choice(statuses)
        f_priority = random.choice(priorities)
        f_comment = random.choice(comments)
        
        # random date in past 30 days
        created = datetime.now() - timedelta(days=random.randint(0, 30))
        
        cursor.execute("""
            INSERT INTO feedbacks (id, user_id, type, rating, comment, status, priority, page_url, browser, device_type, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (f_id, user_id, f_type, random.randint(1,5), f_comment, f_status, f_priority, "/dashboard", "Chrome", "Desktop", created, created))
        
    conn.commit()
    conn.close()
    print("Seeded 20 mock feedbacks.")

if __name__ == "__main__":
    seed()
