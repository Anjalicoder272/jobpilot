"""Rate limits for endpoints that are attractive to bots: logins, signups and paid AI/search calls."""
import hashlib

from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle, SimpleRateThrottle


class LoginIPThrottle(AnonRateThrottle):
    """Login attempts per IP address."""

    scope = "login"


class LoginEmailThrottle(SimpleRateThrottle):
    """Login attempts per email, so a botnet spread over many IPs still can't guess one password."""

    scope = "login_email"

    def get_cache_key(self, request, view):
        email = str(request.data.get("email", "")).strip().lower() if hasattr(request, "data") else ""
        if not email:
            return None
        digest = hashlib.sha256(email.encode()).hexdigest()  # never keep raw emails in the cache
        return self.cache_format % {"scope": self.scope, "ident": digest}


class SignupThrottle(AnonRateThrottle):
    """Account creation per IP (each account gets its own AI quota, so signups must be scarce)."""

    scope = "signup"


class AIThrottle(ScopedRateThrottle):
    """Throttle only requests that do real work. Reading a saved result (GET) is free."""

    def allow_request(self, request, view):
        if request.method == "GET" and getattr(view, "throttle_reads", True) is False:
            return True
        return super().allow_request(request, view)


class SmartSearchThrottle(SimpleRateThrottle):
    """Smart search calls a paid embedding API and is public, so limit it per user or per IP."""

    scope = "smart_search"

    def get_cache_key(self, request, view):
        if request.query_params.get("smart") != "1" or not request.query_params.get("search", "").strip():
            return None  # plain keyword searches aren't limited here
        ident = request.user.pk if request.user and request.user.is_authenticated else self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}
