from django.contrib.auth.models import User
from rest_framework import serializers

class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    full_name = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['full_name', 'email', 'password', 'confirm_password']

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError('Passwords do not match.')
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError('Email already registered.')
        return data

    def create(self, validated_data):
        full_name = validated_data.pop('full_name')
        validated_data.pop('confirm_password')
        first_name, *last_name = full_name.split()
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=first_name,
            last_name=' '.join(last_name)
        )
        return user