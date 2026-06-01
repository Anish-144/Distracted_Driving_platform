import httpx
import uuid

base_url = "http://localhost:9000/api"
test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
password = "password123"
name = "Test User"

def test_auth():
    print("Testing Registration...")
    reg_res = httpx.post(f"{base_url}/auth/register", json={
        "email": test_email,
        "password": password,
        "name": name
    })
    if reg_res.status_code != 201:
        print(f"Registration failed: {reg_res.text}")
        return False
    print(f"Registration OK. Response body:\n{reg_res.text}")
    
    print("Testing Login...")
    log_res = httpx.post(f"{base_url}/auth/login", data={
        "username": test_email,
        "password": password
    })
    if log_res.status_code != 200:
        print(f"Login failed: {log_res.text}")
        return False
    
    token = log_res.json().get("access_token")
    if not token:
        print("No access token in login response")
        return False
    print(f"Login OK. Response body:\n{log_res.text}")
    
    print("Testing Protected Route...")
    me_res = httpx.get(f"{base_url}/auth/me", headers={"Authorization": f"Bearer {token}"})
    if me_res.status_code != 200:
        print(f"Protected route failed: {me_res.text}")
        return False
    print(f"Protected Route OK. Response body:\n{me_res.text}")
    return True

if __name__ == "__main__":
    import sys
    success = test_auth()
    sys.exit(0 if success else 1)
