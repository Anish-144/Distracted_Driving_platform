import requests

BASE_URL = "http://localhost:9000/api"

# 1. Login User (already registered)
print("Logging in...")
res = requests.post(f"{BASE_URL}/auth/login", data={
    "username": "test_feedback1@example.com",
    "password": "TestPassword123!"
})
res.raise_for_status()

data = res.json()
token = data["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print(f"Got token: {token[:20]}...")

# 2. Submit Feedback
print("Submitting feedback...")
files = {
    "type": (None, "feature"),
    "rating": (None, "5"),
    "comment": (None, "This is another test feedback from the end-to-end audit."),
    "page_url": (None, "/test-page-2"),
    "browser": (None, "python-requests"),
    "device_type": (None, "desktop"),
    "screen_size": (None, "1920x1080"),
    "user_agent": (None, "python-requests/2.31"),
    "app_version": (None, "1.0.0")
}

res = requests.post(f"{BASE_URL}/feedback", headers=headers, files=files)
print(f"Submit Feedback Response: {res.status_code}")
res.raise_for_status()
feedback_data = res.json()
feedback_id = feedback_data["id"]
print(f"Created feedback with ID: {feedback_id}")

# 3. Verify in Admin List
print("Fetching admin feedback list...")
res = requests.get(f"{BASE_URL}/feedback/admin", headers=headers)
print(f"Admin list response: {res.status_code}")
res.raise_for_status()
admin_list = res.json()
found = any(item["id"] == feedback_id for item in admin_list["items"])
print(f"Feedback appears in /admin/feedback list: {found}")

# 4. Verify Detail Endpoint
print("Fetching admin feedback detail...")
res = requests.get(f"{BASE_URL}/feedback/admin/{feedback_id}", headers=headers)
print(f"Admin detail response: {res.status_code}")
res.raise_for_status()
detail_data = res.json()
print(f"Successfully retrieved detail for ID: {detail_data['id']}")
print(f"Comment: {detail_data['comment']}")

print("Test script completed successfully.")
