import sqlite3

def migrate():
    conn = sqlite3.connect('distracted_driving.db')
    cursor = conn.cursor()
    
    # 1. Add is_admin to users if it doesn't exist
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT 0;")
        print("Added is_admin to users")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("is_admin already exists")
        else:
            print("Error adding is_admin:", e)

    # 2. Create feedbacks table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS feedbacks (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NULL,
        type VARCHAR(50) NOT NULL,
        rating INTEGER NULL,
        comment TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        priority VARCHAR(50) NOT NULL DEFAULT 'medium',
        page_url VARCHAR(500) NULL,
        browser VARCHAR(100) NULL,
        device_type VARCHAR(50) NULL,
        screen_size VARCHAR(50) NULL,
        user_agent TEXT NULL,
        app_version VARCHAR(50) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    """)

    # 3. Create feedback_attachments table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS feedback_attachments (
        id VARCHAR(36) PRIMARY KEY,
        feedback_id VARCHAR(36) NOT NULL,
        file_path VARCHAR(1000) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY(feedback_id) REFERENCES feedbacks(id) ON DELETE CASCADE
    );
    """)

    # 4. Create feedback_notes table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS feedback_notes (
        id VARCHAR(36) PRIMARY KEY,
        feedback_id VARCHAR(36) NOT NULL,
        admin_id VARCHAR(36) NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY(feedback_id) REFERENCES feedbacks(id) ON DELETE CASCADE,
        FOREIGN KEY(admin_id) REFERENCES users(id) ON DELETE SET NULL
    );
    """)

    conn.commit()
    conn.close()
    print("Migration successful")

if __name__ == "__main__":
    migrate()
