import sys
import os
import asyncio
import getpass
import argparse
import subprocess
from sqlalchemy import select

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

async def run_db_create_admin(email, name, password):
    from app.database import AsyncSessionLocal
    from app.models.user import User
    from app.services.auth_service import hash_password

    async with AsyncSessionLocal() as db:
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

def run_in_docker(email, name, password):
    print("\nLocal database connection failed. Attempting creation inside Docker container 'distracted_driving_backend'...")
    cmd = [
        "docker", "exec", "-i", "distracted_driving_backend",
        "python", "create_admin.py",
        "--email", email,
        "--name", name,
        "--password", password
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print(res.stdout)
        return True
    except Exception as e:
        print(f"Docker execution error: {e}")
        if hasattr(e, 'stderr') and e.stderr:
            print(e.stderr)
        return False

async def main():
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

    try:
        await run_db_create_admin(email, name, password)
    except Exception as err:
        print(f"\nHost DB error: {err}")
        # Try Docker container fallback automatically
        success = run_in_docker(email, name, password)
        if not success:
            print("\nCould not connect to host DB or Docker container DB.")
            print("Please ensure Docker is running and execute:")
            print(f"docker exec -it distracted_driving_backend python create_admin.py --email {email} --name {name} --password <your_password>")

if __name__ == "__main__":
    asyncio.run(main())
