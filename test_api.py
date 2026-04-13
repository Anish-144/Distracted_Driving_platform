import httpx
import json

base_url = "http://localhost:9000/api"

def test_flow():
    # Login
    print("Logging in...")
    login_data = {
        "username": "test@example.com",
        "password": "password123"
    }
    r = httpx.post(f"{base_url}/auth/login", data=login_data)
    if r.status_code != 200:
        print(f"Login failed: {r.status_code} {r.text}")
        return
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Progress
    print("Testing /progress/me...")
    r = httpx.get(f"{base_url}/progress/me", headers=headers)
    print(f"Status: {r.status_code}")
    print(json.dumps(r.json(), indent=2)[:500])
    
    # Lessons recommended
    print("Testing /lessons/recommended...")
    r = httpx.get(f"{base_url}/lessons/recommended", headers=headers)
    print(f"Status: {r.status_code}")
    
    # All lessons
    print("Testing /lessons...")
    r = httpx.get(f"{base_url}/lessons", headers=headers)
    print(f"Status: {r.status_code}")
    if r.status_code != 200:
        print(r.text)

if __name__ == "__main__":
    test_flow()
