import requests
import json
import subprocess
import uuid

BASE_URL = "http://localhost:9000/api"

def query_db(email):
    cmd = f'docker exec distracted_driving_db psql -U postgres -d distracted_driving_db -t -c "SELECT name, email, hashed_password FROM users WHERE email=\'{email}\';"'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout.strip()

uid = str(uuid.uuid4())[:8]
old_email = f"test_{uid}@example.com"
new_email = f"updated_{uid}@example.com"

print(f"--- Registering User ({old_email}) ---")
res = requests.post(f"{BASE_URL}/auth/register", json={
    "name": "Original Name",
    "email": old_email,
    "password": "oldpassword123"
})
if res.status_code != 201:
    print("Failed to register:", res.json())
    exit(1)
    
token = res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

print("\n--- DB BEFORE PROFILE UPDATE ---")
print(query_db(old_email))

print("\n--- Updating Profile ---")
res = requests.patch(f"{BASE_URL}/users/profile", json={
    "name": "Updated Name",
    "email": new_email
}, headers=headers)
print("Response:", res.status_code, res.json())

print("\n--- DB AFTER PROFILE UPDATE ---")
print(query_db(new_email))

print("\n--- Updating Password ---")
res = requests.patch(f"{BASE_URL}/users/password", json={
    "current_password": "oldpassword123",
    "new_password": "newpassword123"
}, headers=headers)
print("Response:", res.status_code, res.json())

print("\n--- DB AFTER PASSWORD UPDATE ---")
print(query_db(new_email))

print("\n--- Verifying Old Password Fails ---")
res = requests.post(f"{BASE_URL}/auth/login", data={
    "username": new_email,
    "password": "oldpassword123"
})
print("Old Password Status:", res.status_code)

print("\n--- Verifying New Password Succeeds ---")
res = requests.post(f"{BASE_URL}/auth/login", data={
    "username": new_email,
    "password": "newpassword123"
})
print("New Password Status:", res.status_code)
