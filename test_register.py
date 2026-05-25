import httpx
import uuid

base_url = "http://localhost:9000/api"

def test_register():
    email = f"test_{uuid.uuid4()}@example.com"
    data = {
        "name": "Test User",
        "email": email,
        "password": "password123"
    }
    r = httpx.post(f"{base_url}/auth/register", json=data)
    print(f"Status: {r.status_code}")
    print(r.text)

if __name__ == "__main__":
    test_register()
