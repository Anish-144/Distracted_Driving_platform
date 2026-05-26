import sqlite3

conn = sqlite3.connect('distracted_driving.db')
cur = conn.cursor()
cur.execute("SELECT id, behavioral_diagnosis, title FROM user_lessons ORDER BY created_at DESC LIMIT 5")
lessons = cur.fetchall()
print('Recent User Lessons:')
for l in lessons:
    print(l)
