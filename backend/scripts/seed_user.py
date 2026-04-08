import asyncio
import sys
import os

# Add the parent directory to sys.path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database import engine, AsyncSessionLocal, init_db
from app.models.user import User
from app.services import auth_service

async def seed_test_user():
    print("🔋 Initializing database...")
    await init_db()
    
    async with AsyncSessionLocal() as session:
        # Check if user already exists
        email = "test@example.com"
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if user:
            print(f"✅ User {email} already exists!")
        else:
            print(f"👤 Creating test user: {email}")
            hashed_password = auth_service.hash_password("password123")
            new_user = User(
                name="Test Driver",
                email=email,
                hashed_password=hashed_password
            )
            session.add(new_user)
            await session.commit()
            print("🚀 Test user created successfully!")

if __name__ == "__main__":
    asyncio.run(seed_test_user())
