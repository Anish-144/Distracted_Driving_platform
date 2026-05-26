import sqlite3

conn = sqlite3.connect('distracted_driving.db')
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [x[0] for x in cur.fetchall()]
print('Tables:', tables)

if 'cognitive_reports' in tables:
    cur.execute("SELECT COUNT(*) FROM cognitive_reports")
    print('Reports:', cur.fetchone()[0])
else:
    print('cognitive_reports TABLE NOT FOUND')
