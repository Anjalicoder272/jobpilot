from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="first_name")

    class Meta:
        model = User
        fields = ["id", "email", "name"]


class SignupSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80, trim_whitespace=True)
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, min_length=8, max_length=128, trim_whitespace=False)

    def validate_name(self, value):
        value = " ".join(value.split())
        if not any(ch.isalpha() for ch in value):
            raise serializers.ValidationError("Enter your name.")
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, data):
        # Run Django's validators with the would-be user, so "password similar to your email/name" is caught too.
        candidate = User(username=data["email"], email=data["email"], first_name=data["name"])
        try:
            validate_password(data["password"], user=candidate)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": list(error.messages)})
        return data

    def create(self, data):
        try:
            with transaction.atomic():
                return User.objects.create_user(
                    username=data["email"],
                    email=data["email"],
                    first_name=data["name"],
                    password=data["password"],
                )
        except IntegrityError:  # two signups for the same email at the same moment
            raise serializers.ValidationError({"email": ["An account with this email already exists."]})


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, max_length=128, trim_whitespace=False)
