from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """Read the access token from the "access" cookie instead of the Authorization header."""

    def authenticate(self, request):
        token = request.COOKIES.get("access")
        if not token:
            return None
        validated = self.get_validated_token(token)
        return self.get_user(validated), validated
