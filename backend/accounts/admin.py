from django.contrib import admin
from .models import OTPVerification, PasswordResetToken, UserProfile, Post

admin.site.register(Post)
admin.site.register(OTPVerification)
admin.site.register(UserProfile)
admin.site.register(PasswordResetToken)