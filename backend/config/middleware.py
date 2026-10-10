"""
CSRF defence for the cookie-authenticated API, on top of SameSite=Lax: unsafe requests must send a custom
header. Browsers only allow custom headers cross-origin after a CORS preflight, which this API never grants.
"""
from django.http import JsonResponse

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
HEADER = "HTTP_X_REQUESTED_WITH"
EXPECTED = "JobPilot"


class APICSRFMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if (request.method in UNSAFE_METHODS and request.path.startswith("/api/")
                and request.META.get(HEADER) != EXPECTED):
            return JsonResponse({"detail": "Missing request header. Please reload the page."}, status=403)
        return self.get_response(request)


class SecurityHeadersMiddleware:

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith("/api/"):
            response.setdefault("Cache-Control", "no-store")
            response.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
        response.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        return response


class RequestSizeMiddleware:
    """Reject oversized bodies before Django spools them to disk."""

    def __init__(self, get_response):
        from django.conf import settings

        self.get_response = get_response
        self.limit = settings.MAX_REQUEST_BYTES

    def __call__(self, request):
        try:
            length = int(request.META.get("CONTENT_LENGTH") or 0)
        except ValueError:
            return JsonResponse({"detail": "Invalid request."}, status=400)
        if length > self.limit:
            return JsonResponse({"detail": "That request is too large."}, status=413)
        return self.get_response(request)
