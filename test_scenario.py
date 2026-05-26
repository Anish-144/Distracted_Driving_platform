import httpx

base_url = "http://localhost:9000/api"

def test():
    print("Logging in...")
    login_data = {
        "username": "test@example.com",
        "password": "password123"
    }
    r = httpx.post(f"{base_url}/auth/login", data=login_data)
    if r.status_code != 200:
        print(f"Login failed: {r.status_code}")
        return
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    print("Testing scenario generation...")
    try:
        r = httpx.post(f"{base_url}/scenarios/generate", json={
            "distraction_type": "whatsapp_notification",
            "difficulty_level": "medium"
        }, headers=headers, timeout=30.0)
        print(f"Status: {r.status_code}")
        print(r.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test()
