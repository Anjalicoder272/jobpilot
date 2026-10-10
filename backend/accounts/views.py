from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import LoginSerializer, SignupSerializer, UserSerializer


def set_auth_cookies(response, user):
    """Create a JWT pair for the user and store both tokens in httpOnly cookies."""
    refresh = RefreshToken.for_user(user)
    jwt = settings.SIMPLE_JWT
    options = {
        "httponly": True,
        "secure": settings.AUTH_COOKIE_SECURE,
        "samesite": settings.AUTH_COOKIE_SAMESITE,
    }
    response.set_cookie("access", str(refresh.access_token),
                        max_age=int(jwt["ACCESS_TOKEN_LIFETIME"].total_seconds()), **options)
    response.set_cookie("refresh", str(refresh),
                        max_age=int(jwt["REFRESH_TOKEN_LIFETIME"].total_seconds()),
                        path="/api/auth/", **options)
    return response


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AnonRateThrottle])
def signup(request):
    serializer = SignupSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    return set_auth_cookies(Response(UserSerializer(user).data, status=status.HTTP_201_CREATED), user)


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AnonRateThrottle])
def login(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = authenticate(username=serializer.validated_data["email"].lower(),
                        password=serializer.validated_data["password"])
    if user is None:
        return Response({"detail": "Incorrect email or password."}, status=status.HTTP_401_UNAUTHORIZED)
    return set_auth_cookies(Response(UserSerializer(user).data), user)


@api_view(["POST"])
@permission_classes([AllowAny])
def refresh(request):
    """Issue a new access token using the refresh cookie."""
    try:
        token = RefreshToken(request.COOKIES.get("refresh", ""))
    except TokenError:
        return Response({"detail": "Session expired. Please log in again."}, status=status.HTTP_401_UNAUTHORIZED)
    response = Response({"detail": "ok"})
    response.set_cookie("access", str(token.access_token), httponly=True,
                        secure=settings.AUTH_COOKIE_SECURE, samesite=settings.AUTH_COOKIE_SAMESITE,
                        max_age=int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()))
    return response


@api_view(["POST"])
@permission_classes([AllowAny])
def logout(request):
    response = Response(status=status.HTTP_204_NO_CONTENT)
    response.delete_cookie("access")
    response.delete_cookie("refresh", path="/api/auth/")
    return response


@api_view(["GET"])
def me(request):
    return Response(UserSerializer(request.user).data)
