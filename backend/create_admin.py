import sys
import os
import asyncio
import getpass
import argparse
from sqlalchemy import select

# Add backend directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(__file__))

from app.database import AsyncSessionLocal
from app.models.user import User
from app.services.auth_service import hash_password

async def create_admin():
    parser = argparse.ArgumentParser(description="SafeDrive AI Admin Bootstrap")
    parser.add_argument("--email", help="Admin email address")
    parser.add_argument("--name", help="Admin name")
    parser.add_argument("--password", help="Admin password")
    args = parser.parse_args()

    print("--- SafeDrive AI Admin Bootstrap ---")
    
    email = args.email or input("Admin Email: ").strip()
    if not email:
        print("Error: Email is required.")
        return
        
    name = args.name or input("Admin Name: ").strip()
    if not name:
        print("Error: Name is required.")
        return
        
    if args.password:
        password = args.password.strip()
    else:
        password = getpass.getpass("Admin Password: ").strip()
        confirm_password = getpass.getpass("Confirm Password: ").strip()
        if password != confirm_password:
            print("Error: Passwords do not match.")
            return

    if not password:
        print("Error: Password is required.")
        return

    async with AsyncSessionLocal() as db:
        # Check if user exists
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if user:
            print(f"User {email} already exists. Updating to admin...")
            user.is_admin = True
            user.hashed_password = hash_password(password)
            user.name = name
        else:
            print(f"Creating new admin user {email}...")
            user = User(
                email=email,
                name=name,
                hashed_password=hash_password(password),
                is_admin=True
            )
            db.add(user)
            
        await db.commit()
        print(f"Success! User {email} is now an administrator.")

if __name__ == "__main__":
    asyncio.run(create_admin())
