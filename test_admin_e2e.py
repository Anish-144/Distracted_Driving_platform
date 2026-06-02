import requests

BASE_URL = "http://localhost:9000/api"

def get_token(email, password, name):
    print(f"Registering/Logging in {email}...")
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "email": email,
        "password": password,
        "name": name
    })
    if res.status_code == 409 or (res.status_code == 400 and "already registered" in res.text):
        res = requests.post(f"{BASE_URL}/auth/login", data={
            "username": email,
            "password": password
        })
    res.raise_for_status()
    return res.json()["access_token"]

# 1. Normal user (not admin) submitting feedback
normal_token = get_token("e2e_1a3203@example.com", "Test1234!", "Normal User")
normal_headers = {"Authorization": f"Bearer {normal_token}"}

print("Normal user submitting feedback...")
files = {
    "type": (None, "bug"),
    "rating": (None, "3"),
    "comment": (None, "E2E status/priority test."),
    "page_url": (None, "/test-e2e")
}
res = requests.post(f"{BASE_URL}/feedback", headers=normal_headers, files=files)
res.raise_for_status()
feedback_id = res.json()["id"]
print(f"Created feedback ID: {feedback_id}")

# 2. Normal user trying to access admin route
res = requests.get(f"{BASE_URL}/feedback/admin", headers=normal_headers)
print(f"Normal user accessing /admin/feedback: {res.status_code}") # Should be 403

# 3. Admin user checking feedback
# We already made test_feedback1 an admin
admin_token = get_token("test_feedback1@example.com", "TestPassword123!", "Admin User")
admin_headers = {"Authorization": f"Bearer {admin_token}"}

print("Admin user updating status and priority...")
res = requests.patch(f"{BASE_URL}/feedback/admin/{feedback_id}", headers=admin_headers, json={
    "status": "resolved",
    "priority": "high"
})
print(f"Admin patch response: {res.status_code}")
res.raise_for_status()
patch_data = res.json()
print(f"Status is now: {patch_data['status']}")
print(f"Priority is now: {patch_data['priority']}")

print("Admin user adding note...")
res = requests.post(f"{BASE_URL}/feedback/admin/{feedback_id}/notes", headers=admin_headers, json={
    "content": "This is a test note from admin."
})
print(f"Admin add note response: {res.status_code}")
res.raise_for_status()
notes_data = res.json()
print(f"Notes count: {len(notes_data['notes'])}")
print(f"Note content: {notes_data['notes'][-1]['content']}")

print("Test script completed successfully.")
