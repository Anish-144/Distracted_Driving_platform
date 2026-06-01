import sqlite3

def migrate():
    conn = sqlite3.connect('distracted_driving.db')
    cursor = conn.cursor()
    
    # 1. Add session_id to feedbacks
    try:
        cursor.execute("ALTER TABLE feedbacks ADD COLUMN session_id VARCHAR(36) REFERENCES sessions(id) ON DELETE SET NULL;")
        print("Added session_id to feedbacks")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("session_id already exists")
        else:
            print("Error adding session_id:", e)

    # 2. Create ai_feedback_insights_cache table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ai_feedback_insights_cache (
        id VARCHAR(36) PRIMARY KEY,
        insights_text TEXT NOT NULL,
        analyzed_count INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        expires_at DATETIME NOT NULL
    );
    """)

    conn.commit()
    conn.close()
    print("Migration successful")

if __name__ == "__main__":
    migrate()
