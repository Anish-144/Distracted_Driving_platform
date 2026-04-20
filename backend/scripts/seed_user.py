import asyncio
import sys
import os

# Add the parent directory to sys.path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database import engine, AsyncSessionLocal, init_db
from app.models.user import User
from app.models.lesson import Lesson, LessonTag
from app.services import auth_service

async def seed_test_user():
    print("--- Initializing database ---")
    await init_db()
    
    async with AsyncSessionLocal() as session:
        # Check if user already exists
        email = "test@example.com"
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if user:
            print(f"User {email} already exists!")
        else:
            print(f"Creating test user: {email}")
            hashed_password = auth_service.hash_password("password123")
            new_user = User(
                name="Test Driver",
                email=email,
                hashed_password=hashed_password
            )
            session.add(new_user)
            await session.commit()
            print("Test user created successfully!")

        # Seed lessons
        result = await session.execute(select(Lesson))
        existing_lessons = result.scalars().all()
        if not existing_lessons:
            print("Seeding lessons...")
            lessons_to_add = [
                Lesson(title="Impulse Control While Driving", description="Learn how to delay your reaction to sudden notifications.", difficulty="Intermediate", tag=LessonTag.IMPULSIVE),
                Lesson(title="Managing Digital Distractions", description="Step-by-step guide to using your phone's 'Do Not Disturb' effectively.", difficulty="Beginner", tag=LessonTag.DISTRACTED),
                Lesson(title="Peripheral Vision Mastery", description="Maintain focus while keeping an eye on your surroundings.", difficulty="Advanced", tag=LessonTag.SAFE),
                Lesson(title="The 2-Second Rule", description="General defensive driving distance rules.", difficulty="Beginner", tag=LessonTag.GENERAL),
            ]
            session.add_all(lessons_to_add)
            await session.commit()
            print("Lessons seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_test_user())
