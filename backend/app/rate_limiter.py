"""
Shared slowapi rate limiter, keyed by client IP.

Requires uvicorn to be launched with --proxy-headers (see Dockerfile) so that
Render's X-Forwarded-For header populates request.client.host with the real
client IP instead of the platform's internal proxy IP.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
