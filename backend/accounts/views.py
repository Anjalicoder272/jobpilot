from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from config.throttles import LoginEmailThrottle, LoginIPThrottle, SignupThrottle

from .serializers import LoginSerializer, SignupSerializer, UserSerializer

User = get_user_model()


def _cookie_options():
    return {"httponly": True, "secure": settings.AUTH_COOKIE_SECURE, "samesite": settings.AUTH_COOKIE_SAMESITE}


def set_auth_cookies(response, user):
    """Create a JWT pair for the user and store both tokens in httpOnly cookies."""
    refresh = RefreshToken.for_user(user)
    jwt = settings.SIMPLE_JWT
    response.set_cookie("access", str(refresh.access_token),
                        max_age=int(jwt["ACCESS_TOKEN_LIFETIME"].total_seconds()), **_cookie_options())
    response.set_cookie("refresh", str(refresh),
                        max_age=int(jwt["REFRESH_TOKEN_LIFETIME"].total_seconds()),
                        path="/api/auth/", **_cookie_options())
    return response


def clear_auth_cookies(response):
    response.delete_cookie("access", samesite=settings.AUTH_COOKIE_SAMESITE)
    response.delete_cookie("refresh", path="/api/auth/", samesite=settings.AUTH_COOKIE_SAMESITE)
    return response


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([SignupThrottle])
def signup(request):
    serializer = SignupSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    return set_auth_cookies(Response(UserSerializer(user).data, status=status.HTTP_201_CREATED), user)


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([LoginIPThrottle, LoginEmailThrottle])
def login(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = authenticate(request, username=serializer.validated_data["email"].lower(),
                        password=serializer.validated_data["password"])
    if user is None:
        return Response({"detail": "Incorrect email or password."}, status=status.HTTP_401_UNAUTHORIZED)
    return set_auth_cookies(Response(UserSerializer(user).data), user)


@api_view(["POST"])
@permission_classes([AllowAny])
def refresh(request):
    """Issue a new access token using the refresh cookie."""
    expired = Response({"detail": "Session expired. Please log in again."}, status=status.HTTP_401_UNAUTHORIZED)
    try:
        token = RefreshToken(request.COOKIES.get("refresh", ""))
    except TokenError:
        return clear_auth_cookies(expired)
    user_id = token.payload.get(settings.SIMPLE_JWT.get("USER_ID_CLAIM", "user_id"))
    if not User.objects.filter(pk=user_id, is_active=True).exists():
        return clear_auth_cookies(expired)
    response = Response({"detail": "ok"})
    response.set_cookie("access", str(token.access_token),
                        max_age=int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
                        **_cookie_options())
    return response


@api_view(["POST"])
@permission_classes([AllowAny])
def logout(request):
    """Blacklist the refresh token so a copied cookie stops working, then clear both cookies."""
    try:
        RefreshToken(request.COOKIES.get("refresh", "")).blacklist()
    except TokenError:
        pass  # already expired, revoked or missing: nothing to revoke
    return clear_auth_cookies(Response(status=status.HTTP_204_NO_CONTENT))


@api_view(["GET"])
def me(request):
    return Response(UserSerializer(request.user).data)
