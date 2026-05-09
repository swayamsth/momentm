from django.db import models
from django.contrib.auth.models import User
import random
import datetime
import uuid


class OTPVerification(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    otp = models.CharField(max_length=6)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now=True)

    def is_expired(self):
        expiry = self.created_at + datetime.timedelta(minutes=10)
        from django.utils import timezone
        return timezone.now() > expiry

    def generate_otp(self):
        self.otp = str(random.randint(100000, 999999))
        self.save()
        return self.otp

    def __str__(self):
        return f"{self.user.email} - {self.otp}"


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def is_expired(self):
        expiry = self.created_at + datetime.timedelta(minutes=15)
        from django.utils import timezone
        return timezone.now() > expiry

    def __str__(self):
        return f"{self.user.email} - {self.token}"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_otp = models.CharField(max_length=6, blank=True, null=True)
    two_factor_otp_created_at = models.DateTimeField(blank=True, null=True)

    def is_2fa_otp_expired(self):
        if not self.two_factor_otp_created_at:
            return True
        expiry = self.two_factor_otp_created_at + datetime.timedelta(minutes=10)
        from django.utils import timezone
        return timezone.now() > expiry

    def generate_2fa_otp(self):
        from django.utils import timezone
        self.two_factor_otp = str(random.randint(100000, 999999))
        self.two_factor_otp_created_at = timezone.now()
        self.save()
        return self.two_factor_otp

    def __str__(self):
        return f"{self.user.email} - 2FA: {self.two_factor_enabled}"


class Loop(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    tag = models.CharField(max_length=50, default='Other')
    is_private = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_loops')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-created_at']


class LoopMembership(models.Model):
    STATUS_CHOICES = [
        ('approved', 'Approved'),
        ('pending', 'Pending'),
    ]
    loop = models.ForeignKey(Loop, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='loop_memberships')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='approved')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('loop', 'user')

    def __str__(self):
        return f"{self.user.email} - {self.loop.name} ({self.status})"


class Post(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    loop = models.ForeignKey(Loop, on_delete=models.SET_NULL, null=True, blank=True, related_name='posts')
    text = models.TextField()
    image_url = models.URLField(max_length=1000, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    likes = models.ManyToManyField(User, related_name='liked_posts', blank=True)

    def __str__(self):
        return f"{self.user.email} - {self.text[:50]}"

    class Meta:
        ordering = ['-created_at']


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='post_comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    likes = models.ManyToManyField(User, related_name='liked_comments', blank=True)

    def __str__(self):
        return f"{self.user.email} - {self.text[:50]}"

    class Meta:
        ordering = ['created_at']


class ActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_logs')
    activity = models.CharField(max_length=100)
    duration = models.IntegerField(help_text="Duration in minutes")
    steps = models.IntegerField(default=0)
    calories = models.IntegerField(default=0)
    logged_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - {self.activity} ({self.logged_at.date()})"

    class Meta:
        ordering = ['-logged_at']