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
    bio = models.TextField(null=True, blank=True)
    is_public = models.BooleanField(default=True)
    avatar_url = models.URLField(null=True, blank=True)
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_otp = models.CharField(max_length=6, blank=True, null=True)
    two_factor_otp_created_at = models.DateTimeField(blank=True, null=True)
    is_premium = models.BooleanField(default=False)
    premium_expires_at = models.DateTimeField(blank=True, null=True)
    bio = models.TextField(blank=True, default='')
    is_public = models.BooleanField(default=True)
    avatar_url = models.URLField(max_length=1000, blank=True, null=True)

    @property
    def is_premium_active(self):
        from django.utils import timezone
        if not self.is_premium:
            return False
        if self.premium_expires_at is None:
            return True
        return self.premium_expires_at > timezone.now()

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
    image_url = models.URLField(max_length=1000, blank=True, null=True)

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
    VERIFICATION_STATUS = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
    ]

    ALLOWED_ACTIVITIES = ['Run', 'Swim', 'Cycle', 'Strength', 'Skipping']

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_logs')
    activity = models.CharField(max_length=100)
    duration = models.IntegerField(help_text="Duration in minutes")
    steps = models.IntegerField(default=0)
    calories = models.IntegerField(default=0)
    selfie_url = models.URLField(max_length=1000, blank=True, null=True)
    screenshot_url = models.URLField(max_length=1000, blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    verification_status = models.CharField(max_length=20, choices=VERIFICATION_STATUS, default='pending')
    logged_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - {self.activity} ({self.logged_at.date()})"

    class Meta:
        ordering = ['-logged_at']


class SleepLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sleep_logs')
    hours = models.FloatField(help_text="Hours of sleep")
    date = models.DateField()
    logged_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - {self.hours}hrs on {self.date}"

    class Meta:
        ordering = ['-date']
        unique_together = ('user', 'date')


class NutritionLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='nutrition_logs')
    calories = models.IntegerField(help_text="Calories consumed")
    protein = models.IntegerField(default=0, help_text="Protein in grams")
    carbs = models.IntegerField(default=0, help_text="Carbs in grams")
    fats = models.IntegerField(default=0, help_text="Fats in grams")
    date = models.DateField()
    logged_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - {self.calories}kcal on {self.date}"

    class Meta:
        ordering = ['-date']
        unique_together = ('user', 'date')


class Reward(models.Model):
    REWARD_TYPES = [
        ('cosmetic', 'Cosmetic'),
        ('subscription', 'Subscription'),
        ('real_world', 'Real World'),
    ]
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    type = models.CharField(max_length=20, choices=REWARD_TYPES)
    effect = models.CharField(max_length=100, blank=True, default='')
    cost = models.IntegerField()
    icon = models.CharField(max_length=10, blank=True, default='🎁')
    color = models.CharField(max_length=50, blank=True, default='')
    metadata = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class RewardCode(models.Model):
    reward = models.ForeignKey(Reward, on_delete=models.CASCADE, related_name='codes')
    code = models.CharField(max_length=100)
    is_claimed = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.reward.name} - {self.code}"


class ClaimedReward(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='claimed_rewards')
    reward = models.ForeignKey(Reward, on_delete=models.CASCADE)
    cost_at_claim = models.IntegerField()
    code = models.CharField(max_length=100, blank=True, default='')
    claimed_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_equipped = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.email} - {self.reward.name}"