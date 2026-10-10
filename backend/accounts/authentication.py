from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken


class CookieJWTAuthentication(JWTAuthentication):
    """Read the access token from the "access" cookie instead of the Authorization header."""

    def authenticate(self, request):
        token = request.COOKIES.get("access")
        if not token:
            return None
        try:
            validated = self.get_validated_token(token)
            return self.get_user(validated), validated
        except (InvalidToken, AuthenticationFailed):
            # A stale cookie must not block login or public pages; IsAuthenticated still returns 401.
            return None
