from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import SignupSerializer
from .models import OTPVerification, PasswordResetToken, UserProfile, Post, Comment, ActivityLog, Loop, LoopMembership, Reward, RewardCode, ClaimedReward, SleepLog, NutritionLog, UserGoal, WeeklyPlan, UserFitnessProfile
import uuid
import os


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


def upload_image_to_supabase(image_file, folder="posts"):
    try:
        from supabase import create_client
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        ext = os.path.splitext(image_file.name)[1].lower() or '.jpg'
        filename = f"{folder}/{uuid.uuid4()}{ext}"
        image_bytes = image_file.read()
        client.storage.from_(settings.SUPABASE_BUCKET).upload(
            filename,
            image_bytes,
            {"content-type": image_file.content_type or "image/jpeg"}
        )
        public_url = client.storage.from_(settings.SUPABASE_BUCKET).get_public_url(filename)
        return public_url
    except Exception as e:
        print(f"Supabase upload error: {e}")
        return None


@api_view(['POST'])
def signup_view(request):
    serializer = SignupSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        user.is_active = False
        user.save()
        UserProfile.objects.get_or_create(user=user)
        otp_obj, _ = OTPVerification.objects.get_or_create(user=user)
        otp = otp_obj.generate_otp()
        send_mail(
            subject='Verify your Momentum account',
            message=f'Your verification code is: {otp}\n\nThis code expires in 10 minutes.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return Response({
            'message': 'Account created! Please check your email for the verification code.',
            'email': user.email
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def verify_otp_view(request):
    email = request.data.get('email')
    otp = request.data.get('otp')
    try:
        user = User.objects.get(email=email)
        otp_obj = OTPVerification.objects.get(user=user)
        if otp_obj.is_expired():
            return Response({'error': 'OTP has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)
        if otp_obj.otp != otp:
            return Response({'error': 'Invalid OTP code.'}, status=status.HTTP_400_BAD_REQUEST)
        user.is_active = True
        user.save()
        otp_obj.is_verified = True
        otp_obj.save()
        UserProfile.objects.get_or_create(user=user)
        return Response({'message': 'Email verified successfully! You can now log in.'})
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
    except OTPVerification.DoesNotExist:
        return Response({'error': 'OTP not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
def resend_otp_view(request):
    email = request.data.get('email')
    try:
        user = User.objects.get(email=email)
        otp_obj, _ = OTPVerification.objects.get_or_create(user=user)
        otp = otp_obj.generate_otp()
        send_mail(
            subject='Your new Momentum verification code',
            message=f'Your new verification code is: {otp}\n\nThis code expires in 10 minutes.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return Response({'message': 'New OTP sent to your email.'})
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')
    try:
        user_obj = User.objects.get(email=email)
        if not user_obj.is_active:
            return Response({'error': 'Please verify your email before logging in.'}, status=status.HTTP_403_FORBIDDEN)
        if not user_obj.check_password(password):
            return Response({'error': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)
        profile, _ = UserProfile.objects.get_or_create(user=user_obj)
        if profile.two_factor_enabled:
            otp = profile.generate_2fa_otp()
            send_mail(
                subject='Your Momentum login verification code',
                message=f'Your 2FA code is: {otp}\n\nThis code expires in 10 minutes.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user_obj.email],
                fail_silently=False,
            )
            return Response({'message': '2FA code sent to your email.', 'requires_2fa': True, 'email': user_obj.email})
        tokens = get_tokens_for_user(user_obj)
        return Response({
            'message': 'Login successful',
            'tokens': tokens,
            'user': {'email': user_obj.email, 'first_name': user_obj.first_name, 'last_name': user_obj.last_name}
        })
    except User.DoesNotExist:
        return Response({'error': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
def verify_2fa_view(request):
    email = request.data.get('email')
    otp = request.data.get('otp')
    try:
        user = User.objects.get(email=email)
        profile = UserProfile.objects.get(user=user)
        if profile.is_2fa_otp_expired():
            return Response({'error': '2FA code has expired. Please log in again.'}, status=status.HTTP_400_BAD_REQUEST)
        if profile.two_factor_otp != otp:
            return Response({'error': 'Invalid 2FA code.'}, status=status.HTTP_400_BAD_REQUEST)
        profile.two_factor_otp = None
        profile.two_factor_otp_created_at = None
        profile.save()
        tokens = get_tokens_for_user(user)
        return Response({
            'message': 'Login successful',
            'tokens': tokens,
            'user': {'email': user.email, 'first_name': user.first_name, 'last_name': user.last_name}
        })
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
    except UserProfile.DoesNotExist:
        return Response({'error': 'Profile not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
def logout_view(request):
    try:
        refresh_token = request.data.get('refresh')
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({'message': 'Logged out successfully.'})
    except Exception:
        return Response({'error': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    return Response({
        'message': f'Welcome, {request.user.first_name}!',
        'user': {
            'email': request.user.email,
            'first_name': request.user.first_name,
            'last_name': request.user.last_name,
            'two_factor_enabled': profile.two_factor_enabled,
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_2fa_view(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    profile.two_factor_enabled = not profile.two_factor_enabled
    profile.save()
    status_text = 'enabled' if profile.two_factor_enabled else 'disabled'
    return Response({'message': f'Two-factor authentication {status_text}.', 'two_factor_enabled': profile.two_factor_enabled})


@api_view(['POST'])
def forgot_password_view(request):
    email = request.data.get('email')
    try:
        user = User.objects.get(email=email)
        PasswordResetToken.objects.filter(user=user).delete()
        reset_token = PasswordResetToken.objects.create(user=user)
        reset_link = f"http://localhost:3000/reset-password?token={reset_token.token}"
        send_mail(
            subject='Reset your Momentum password',
            message=f'Click the link below to reset your password:\n\n{reset_link}\n\nThis link expires in 15 minutes.\n\nIf you did not request this, ignore this email.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return Response({'message': 'Password reset link sent to your email.'})
    except User.DoesNotExist:
        return Response({'message': 'If that email exists a reset link has been sent.'})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def reset_password_view(request):
    token = request.data.get('token')
    new_password = request.data.get('new_password')
    confirm_password = request.data.get('confirm_password')
    if new_password != confirm_password:
        return Response({'error': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(new_password) < 6:
        return Response({'error': 'Password must be at least 6 characters.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        reset_token = PasswordResetToken.objects.get(token=token, is_used=False)
        if reset_token.is_expired():
            return Response({'error': 'Reset link has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)
        user = reset_token.user
        user.set_password(new_password)
        user.save()
        reset_token.is_used = True
        reset_token.save()
        return Response({'message': 'Password reset successfully! You can now log in.'})
    except PasswordResetToken.DoesNotExist:
        return Response({'error': 'Invalid or expired reset link.'}, status=status.HTTP_400_BAD_REQUEST)


# ─── Helper ───────────────────────────────────────────────────────────────────

def get_user_loop_ids(user):
    membership_ids = list(
        LoopMembership.objects.filter(
            user=user, status='approved'
        ).values_list('loop_id', flat=True)
    )
    created_ids = list(
        Loop.objects.filter(created_by=user).values_list('id', flat=True)
    )
    return list(set(membership_ids + created_ids))


def serialize_post(post, request_user=None):
    full_name = f"{post.user.first_name} {post.user.last_name}".strip()
    comments = []
    for comment in post.post_comments.all():
        comment_name = f"{comment.user.first_name} {comment.user.last_name}".strip()
        comments.append({
            'id': comment.id,
            'user': comment_name or comment.user.email,
            'handle': comment.user.email.split('@')[0],
            'text': comment.text,
            'likes': comment.likes.count(),
            'liked': request_user in comment.likes.all() if request_user and request_user.is_authenticated else False,
            'time': comment.created_at.strftime('%b %d, %H:%M'),
            'is_mine': comment.user == request_user if request_user else False,
        })

    return {
        'id': post.id,
        'user': full_name or post.user.email,
        'handle': post.user.email.split('@')[0],
        'text': post.text,
        'image': post.image_url or None,
        'loop': post.loop.name if post.loop else None,
        'loop_id': post.loop.id if post.loop else None,
        'loop_is_private': post.loop.is_private if post.loop else False,
        'likes': post.likes.count(),
        'liked': request_user in post.likes.all() if request_user and request_user.is_authenticated else False,
        'time': post.created_at.strftime('%b %d, %H:%M'),
        'is_mine': post.user == request_user if request_user else False,
        'comments': comments,
    }


# ─── Helper: serialize a loop ─────────────────────────────────────────────────

def serialize_loop(loop, request_user=None):
    member_count = loop.memberships.filter(status='approved').count() + 1
    membership = None
    if request_user and request_user.is_authenticated:
        try:
            membership = LoopMembership.objects.get(loop=loop, user=request_user)
        except LoopMembership.DoesNotExist:
            pass

    return {
        'id': loop.id,
        'name': loop.name,
        'desc': loop.description,
        'tag': loop.tag,
        'is_private': loop.is_private,
        'members': member_count,
        'image_url': loop.image_url or None,
        'created_by_me': loop.created_by == request_user if request_user and request_user.is_authenticated else False,
        'joined': membership.status == 'approved' if membership else loop.created_by == request_user,
        'pending': membership.status == 'pending' if membership else False,
        'joined_at': membership.joined_at.isoformat() if membership and membership.status == 'approved' else (
            loop.created_at.isoformat() if request_user and loop.created_by == request_user else None
        ),
    }


# ─── Posts ────────────────────────────────────────────────────────────────────

@api_view(['GET'])
def get_posts_view(request):
    all_posts = Post.objects.select_related('user', 'loop').prefetch_related(
        'post_comments__user', 'post_comments__likes', 'likes'
    ).all()[:100]

    user_loop_ids = []
    if request.user.is_authenticated:
        user_loop_ids = get_user_loop_ids(request.user)

    data = []
    for post in all_posts:
        if post.loop and post.loop.is_private:
            if not request.user.is_authenticated or post.loop.id not in user_loop_ids:
                continue
        data.append(serialize_post(post, request.user))

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_posts_view(request):
    loop_id = request.query_params.get('loop_id')
    user_loop_ids = get_user_loop_ids(request.user)

    if loop_id:
        if int(loop_id) not in user_loop_ids:
            return Response({'error': 'Not a member of this loop.'}, status=status.HTTP_403_FORBIDDEN)
        posts = Post.objects.filter(
            loop_id=loop_id
        ).select_related('user', 'loop').prefetch_related(
            'post_comments__user', 'post_comments__likes', 'likes'
        )
    else:
        posts = Post.objects.filter(
            user=request.user
        ).select_related('user', 'loop').prefetch_related(
            'post_comments__user', 'post_comments__likes', 'likes'
        )

    return Response([serialize_post(post, request.user) for post in posts])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_loop_posts_view(request, loop_id):
    user_loop_ids = get_user_loop_ids(request.user)

    try:
        loop = Loop.objects.get(id=loop_id)
    except Loop.DoesNotExist:
        return Response({'error': 'Loop not found.'}, status=status.HTTP_404_NOT_FOUND)

    if loop.is_private and loop_id not in user_loop_ids:
        return Response({'error': 'Not a member of this loop.'}, status=status.HTTP_403_FORBIDDEN)

    posts = Post.objects.filter(loop=loop).select_related('user', 'loop').prefetch_related(
        'post_comments__user', 'post_comments__likes', 'likes'
    )

    return Response([serialize_post(post, request.user) for post in posts])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_post_view(request):
    text = request.data.get('text', '').strip()
    loop_id = request.data.get('loop_id')
    image = request.FILES.get('image')

    if not text and not image:
        return Response({'error': 'Post cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(text) > 500:
        return Response({'error': 'Post cannot exceed 500 characters.'}, status=status.HTTP_400_BAD_REQUEST)

    loop = None
    if loop_id:
        try:
            loop = Loop.objects.get(id=loop_id)
            user_loop_ids = get_user_loop_ids(request.user)
            if loop.id not in user_loop_ids:
                return Response({'error': 'You must be a member to post in this loop.'}, status=status.HTTP_403_FORBIDDEN)
        except Loop.DoesNotExist:
            pass

    image_url = None
    if image:
        image_url = upload_image_to_supabase(image, folder="posts")

    post = Post.objects.create(
        user=request.user,
        text=text,
        loop=loop,
        image_url=image_url,
    )
    full_name = f"{request.user.first_name} {request.user.last_name}".strip()

    return Response({
        'id': post.id,
        'user': full_name or request.user.email,
        'handle': request.user.email.split('@')[0],
        'text': post.text,
        'image': image_url,
        'loop': loop.name if loop else None,
        'loop_id': loop.id if loop else None,
        'loop_is_private': loop.is_private if loop else False,
        'likes': 0,
        'liked': False,
        'is_mine': True,
        'time': 'just now',
        'comments': [],
    }, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_post_view(request, post_id):
    try:
        post = Post.objects.get(id=post_id)
        if post.user != request.user:
            return Response({'error': 'You can only delete your own posts.'}, status=status.HTTP_403_FORBIDDEN)
        post.delete()
        return Response({'message': 'Post deleted.'})
    except Post.DoesNotExist:
        return Response({'error': 'Post not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def edit_post_view(request, post_id):
    try:
        post = Post.objects.get(id=post_id)
        if post.user != request.user:
            return Response({'error': 'You can only edit your own posts.'}, status=status.HTTP_403_FORBIDDEN)
        text = request.data.get('text', '').strip()
        if not text:
            return Response({'error': 'Post cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(text) > 500:
            return Response({'error': 'Post cannot exceed 500 characters.'}, status=status.HTTP_400_BAD_REQUEST)
        post.text = text
        post.save()
        return Response({'id': post.id, 'text': post.text, 'message': 'Post updated.'})
    except Post.DoesNotExist:
        return Response({'error': 'Post not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def like_post_view(request, post_id):
    try:
        post = Post.objects.get(id=post_id)
        if request.user in post.likes.all():
            post.likes.remove(request.user)
            liked = False
        else:
            post.likes.add(request.user)
            liked = True
        return Response({'likes': post.likes.count(), 'liked': liked})
    except Post.DoesNotExist:
        return Response({'error': 'Post not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_comment_view(request, post_id):
    text = request.data.get('text', '').strip()
    if not text:
        return Response({'error': 'Comment cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        post = Post.objects.get(id=post_id)
        comment = Comment.objects.create(user=request.user, post=post, text=text)
        full_name = f"{request.user.first_name} {request.user.last_name}".strip()
        return Response({
            'id': comment.id,
            'user': full_name or request.user.email,
            'handle': request.user.email.split('@')[0],
            'text': comment.text,
            'likes': 0,
            'liked': False,
            'is_mine': True,
            'time': 'just now',
        }, status=status.HTTP_201_CREATED)
    except Post.DoesNotExist:
        return Response({'error': 'Post not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def like_comment_view(request, comment_id):
    try:
        comment = Comment.objects.get(id=comment_id)
        if request.user in comment.likes.all():
            comment.likes.remove(request.user)
            liked = False
        else:
            comment.likes.add(request.user)
            liked = True
        return Response({'likes': comment.likes.count(), 'liked': liked})
    except Comment.DoesNotExist:
        return Response({'error': 'Comment not found.'}, status=status.HTTP_404_NOT_FOUND)


import math
from collections import defaultdict

MAX_DURATION_MINUTES = 300
MAX_STEPS_PER_MINUTE = 180
MAX_CALORIES_PER_MINUTE = 20
DUPLICATE_ACTIVITY_POINT_MULTIPLIER = 0.5
DAILY_CAP_FREE = 150
DAILY_CAP_PREMIUM = 200
FIRST_LOG_BONUS = 10


def get_streak_multiplier(streak_days, is_premium):
    if is_premium:
        if streak_days >= 90:
            return 2.0
        if streak_days >= 60:
            return 1.75
    if streak_days >= 30:
        return 1.5
    if streak_days >= 14:
        return 1.25
    if streak_days >= 7:
        return 1.1
    return 1.0


def calc_session_points(duration, steps, calories):
    base = round(math.sqrt(duration) * 5)
    intensity = min(steps // 500, 10) + min(calories // 100, 10)
    return base + intensity


def compute_user_points(user, profile=None):
    from django.db.models import Q
    if profile is None:
        try:
            profile = user.userprofile
        except UserProfile.DoesNotExist:
            profile = None

    is_premium = profile.is_premium_active if profile else False
    daily_cap = DAILY_CAP_PREMIUM if is_premium else DAILY_CAP_FREE

    logs = (
        ActivityLog.objects
        .filter(user=user)
        .order_by('logged_at')
        .values('activity', 'duration', 'steps', 'calories', 'logged_at')
    )

    logs_by_date = defaultdict(list)
    for log in logs:
        logs_by_date[log['logged_at'].date()].append(log)

    total = 0
    consecutive = 0
    prev_date = None

    for date in sorted(logs_by_date):
        if prev_date is None or (date - prev_date).days == 1:
            consecutive += 1
        else:
            consecutive = 1
        prev_date = date

        day_pts = FIRST_LOG_BONUS
        seen = set()
        for log in logs_by_date[date]:
            pts = calc_session_points(log['duration'], log['steps'], log['calories'])
            key = log['activity'].lower()
            if key in seen:
                pts = int(pts * DUPLICATE_ACTIVITY_POINT_MULTIPLIER)
            seen.add(key)
            day_pts += pts

        day_pts = min(day_pts, daily_cap)
        day_pts = round(day_pts * get_streak_multiplier(consecutive, is_premium))
        total += day_pts

    return total


def compute_period_points(user, start_date, profile=None):
    from django.utils import timezone
    if profile is None:
        try:
            profile = user.userprofile
        except UserProfile.DoesNotExist:
            profile = None

    is_premium = profile.is_premium_active if profile else False
    daily_cap = DAILY_CAP_PREMIUM if is_premium else DAILY_CAP_FREE

    logs = (
        ActivityLog.objects
        .filter(user=user, logged_at__date__gte=start_date)
        .order_by('logged_at')
        .values('activity', 'duration', 'steps', 'calories', 'logged_at')
    )

    logs_by_date = defaultdict(list)
    for log in logs:
        logs_by_date[log['logged_at'].date()].append(log)

    total = 0
    for date in sorted(logs_by_date):
        day_pts = 0
        seen = set()
        for log in logs_by_date[date]:
            pts = calc_session_points(log['duration'], log['steps'], log['calories'])
            key = log['activity'].lower()
            if key in seen:
                pts = int(pts * DUPLICATE_ACTIVITY_POINT_MULTIPLIER)
            seen.add(key)
            day_pts += pts
        total += min(day_pts, daily_cap)

    return total


def get_available_points(user, profile=None):
    from django.db.models import Sum
    earned = compute_user_points(user, profile)
    spent = ClaimedReward.objects.filter(user=user).aggregate(t=Sum('cost_at_claim'))['t'] or 0
    return max(0, earned - spent)


def get_active_cosmetics(user):
    from django.utils import timezone
    from django.db.models import Q
    return list(
        ClaimedReward.objects
        .filter(user=user, reward__type='cosmetic')
        .filter(Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now()))
        .values_list('reward__effect', flat=True)
    )


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def edit_comment_view(request, comment_id):
    try:
        comment = Comment.objects.get(id=comment_id)
        if comment.user != request.user:
            return Response({'error': 'You can only edit your own comments.'}, status=status.HTTP_403_FORBIDDEN)
        text = request.data.get('text', '').strip()
        if not text:
            return Response({'error': 'Comment cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)
        comment.text = text
        comment.save()
        return Response({'id': comment.id, 'text': comment.text, 'message': 'Comment updated.'})
    except Comment.DoesNotExist:
        return Response({'error': 'Comment not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_comment_view(request, comment_id):
    try:
        comment = Comment.objects.get(id=comment_id)
        if comment.user != request.user:
            return Response({'error': 'You can only delete your own comments.'}, status=status.HTTP_403_FORBIDDEN)
        comment.delete()
        return Response({'message': 'Comment deleted.'})
    except Comment.DoesNotExist:
        return Response({'error': 'Comment not found.'}, status=status.HTTP_404_NOT_FOUND)


# ─── Loops ────────────────────────────────────────────────────────────────────

@api_view(['GET'])
def get_loops_view(request):
    loops = Loop.objects.select_related('created_by').prefetch_related('memberships').all()
    return Response([serialize_loop(loop, request.user) for loop in loops])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_loop_view(request):
    name = request.data.get('name', '').strip()
    description = request.data.get('description', '').strip()
    tag = request.data.get('tag', 'Other')
    is_private = request.data.get('is_private', False)

    if not name:
        return Response({'error': 'Loop name is required.'}, status=status.HTTP_400_BAD_REQUEST)

    user_loop_count = Loop.objects.filter(created_by=request.user).count()
    if user_loop_count >= 3:
        return Response({'error': 'LOOP_LIMIT_REACHED'}, status=status.HTTP_403_FORBIDDEN)

    loop = Loop.objects.create(
        name=name,
        description=description,
        tag=tag,
        is_private=is_private,
        created_by=request.user,
    )

    return Response(serialize_loop(loop, request.user), status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_loop_view(request, loop_id):
    try:
        loop = Loop.objects.get(id=loop_id)
    except Loop.DoesNotExist:
        return Response({'error': 'Loop not found.'}, status=status.HTTP_404_NOT_FOUND)

    if loop.created_by == request.user:
        return Response({'error': 'You are the creator of this loop.'}, status=status.HTTP_400_BAD_REQUEST)

    membership, created = LoopMembership.objects.get_or_create(
        loop=loop,
        user=request.user,
        defaults={'status': 'pending' if loop.is_private else 'approved'}
    )

    if not created:
        return Response({'error': 'Already a member or request pending.'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'status': membership.status,
        'message': 'Join request sent.' if loop.is_private else 'Joined successfully.',
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def leave_loop_view(request, loop_id):
    try:
        loop = Loop.objects.get(id=loop_id)
        membership = LoopMembership.objects.get(loop=loop, user=request.user)
        membership.delete()
        return Response({'message': 'Left loop successfully.'})
    except Loop.DoesNotExist:
        return Response({'error': 'Loop not found.'}, status=status.HTTP_404_NOT_FOUND)
    except LoopMembership.DoesNotExist:
        return Response({'error': 'You are not a member.'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def edit_loop_view(request, loop_id):
    try:
        loop = Loop.objects.get(id=loop_id, created_by=request.user)
    except Loop.DoesNotExist:
        return Response({'error': 'Loop not found or not authorized.'}, status=status.HTTP_404_NOT_FOUND)

    loop.name = request.data.get('name', loop.name)
    loop.description = request.data.get('description', loop.description)
    loop.tag = request.data.get('tag', loop.tag)
    loop.is_private = request.data.get('is_private', loop.is_private)
    loop.save()

    return Response(serialize_loop(loop, request.user))


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_loop_view(request, loop_id):
    try:
        loop = Loop.objects.get(id=loop_id, created_by=request.user)
        loop.delete()
        return Response({'message': 'Loop deleted.'})
    except Loop.DoesNotExist:
        return Response({'error': 'Loop not found or not authorized.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_loop_image_view(request, loop_id):
    try:
        loop = Loop.objects.get(id=loop_id, created_by=request.user)
    except Loop.DoesNotExist:
        return Response({'error': 'Loop not found or not authorized.'}, status=status.HTTP_404_NOT_FOUND)

    image = request.FILES.get('image')
    if not image:
        return Response({'error': 'No image provided.'}, status=status.HTTP_400_BAD_REQUEST)

    image_url = upload_image_to_supabase(image, folder="loops")
    if not image_url:
        return Response({'error': 'Image upload failed.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    loop.image_url = image_url
    loop.save()

    return Response({'image_url': image_url, 'message': 'Loop image updated.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_join_requests_view(request):
    my_loops = Loop.objects.filter(created_by=request.user)
    requests_qs = LoopMembership.objects.filter(
        loop__in=my_loops, status='pending'
    ).select_related('user', 'loop')

    data = [{
        'id': req.id,
        'loop_id': req.loop.id,
        'loop_name': req.loop.name,
        'user': f"{req.user.first_name} {req.user.last_name}".strip() or req.user.email,
        'handle': req.user.email.split('@')[0],
        'requested_at': req.joined_at.strftime('%b %d, %H:%M'),
    } for req in requests_qs]

    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_request_view(request, membership_id):
    try:
        membership = LoopMembership.objects.get(id=membership_id, loop__created_by=request.user)
        membership.status = 'approved'
        membership.save()
        return Response({'message': 'Request approved.'})
    except LoopMembership.DoesNotExist:
        return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deny_request_view(request, membership_id):
    try:
        membership = LoopMembership.objects.get(id=membership_id, loop__created_by=request.user)
        membership.delete()
        return Response({'message': 'Request denied.'})
    except LoopMembership.DoesNotExist:
        return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications_view(request):
    notifications = []

    my_private_loops = Loop.objects.filter(created_by=request.user, is_private=True)
    pending = LoopMembership.objects.filter(
        loop__in=my_private_loops, status='pending'
    ).select_related('user', 'loop').order_by('-joined_at')[:20]

    for req in pending:
        full_name = f"{req.user.first_name} {req.user.last_name}".strip() or req.user.email
        notifications.append({
            'id': f'req_{req.id}',
            'type': 'join_request',
            'message': f'{full_name} wants to join {req.loop.name}',
            'loop_id': req.loop.id,
            'loop_name': req.loop.name,
            'user': full_name,
            'handle': req.user.email.split('@')[0],
            'membership_id': req.id,
            'time': req.joined_at.strftime('%b %d, %H:%M'),
            'read': False,
        })

    my_public_loops = Loop.objects.filter(created_by=request.user, is_private=False)
    approved = LoopMembership.objects.filter(
        loop__in=my_public_loops, status='approved'
    ).select_related('user', 'loop').order_by('-joined_at')[:20]

    for member in approved:
        full_name = f"{member.user.first_name} {member.user.last_name}".strip() or member.user.email
        notifications.append({
            'id': f'mem_{member.id}',
            'type': 'new_member',
            'message': f'{full_name} joined {member.loop.name}',
            'loop_id': member.loop.id,
            'loop_name': member.loop.name,
            'user': full_name,
            'handle': member.user.email.split('@')[0],
            'time': member.joined_at.strftime('%b %d, %H:%M'),
            'read': False,
        })

    notifications.sort(key=lambda x: x['time'], reverse=True)
    return Response(notifications[:30])


# ─── Activities ───────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def log_activity_view(request):
    from django.utils import timezone

    # ── Allowed activities only ──────────────────────────────────────────────
    ALLOWED = ['Run', 'Swim', 'Cycle', 'Strength', 'Skipping']

    activity = request.data.get('activity', '').strip()
    if not activity:
        return Response({'error': 'Activity name is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if activity not in ALLOWED:
        return Response({'error': f'Activity must be one of: {", ".join(ALLOWED)}'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        duration = int(request.data.get('duration', 0))
        steps = int(request.data.get('steps', 0))
        calories = int(request.data.get('calories', 0))
    except (ValueError, TypeError):
        return Response({'error': 'Duration, steps, and calories must be numbers.'}, status=status.HTTP_400_BAD_REQUEST)

    if duration < 1:
        return Response({'error': 'Duration must be at least 1 minute.'}, status=status.HTTP_400_BAD_REQUEST)
    if duration > MAX_DURATION_MINUTES:
        return Response({'error': f'Duration cannot exceed {MAX_DURATION_MINUTES} minutes per session.'}, status=status.HTTP_400_BAD_REQUEST)
    if steps < 0 or calories < 0:
        return Response({'error': 'Steps and calories cannot be negative.'}, status=status.HTTP_400_BAD_REQUEST)
    if steps > duration * MAX_STEPS_PER_MINUTE:
        return Response({'error': f'Steps seem too high for a {duration}-minute session (max {duration * MAX_STEPS_PER_MINUTE:,}).'}, status=status.HTTP_400_BAD_REQUEST)
    if calories > duration * MAX_CALORIES_PER_MINUTE:
        return Response({'error': f'Calories seem too high for a {duration}-minute session (max {duration * MAX_CALORIES_PER_MINUTE:,}).'}, status=status.HTTP_400_BAD_REQUEST)

    # ── Require both photos ──────────────────────────────────────────────────
    selfie = request.FILES.get('selfie')
    screenshot = request.FILES.get('screenshot')

    if not selfie:
        return Response({'error': 'A selfie photo is required to log an activity.'}, status=status.HTTP_400_BAD_REQUEST)
    if not screenshot:
        return Response({'error': 'A screenshot of your fitness app is required to log an activity.'}, status=status.HTTP_400_BAD_REQUEST)

    # ── Basic file checks ────────────────────────────────────────────────────
    allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp']
    if selfie.content_type not in allowed_types:
        return Response({'error': 'Selfie must be a valid image file (jpg, png, heic, webp).'}, status=status.HTTP_400_BAD_REQUEST)
    if screenshot.content_type not in allowed_types:
        return Response({'error': 'Screenshot must be a valid image file (jpg, png, heic, webp).'}, status=status.HTTP_400_BAD_REQUEST)

    # Max 10MB each
    if selfie.size > 10 * 1024 * 1024:
        return Response({'error': 'Selfie must be under 10MB.'}, status=status.HTTP_400_BAD_REQUEST)
    if screenshot.size > 10 * 1024 * 1024:
        return Response({'error': 'Screenshot must be under 10MB.'}, status=status.HTTP_400_BAD_REQUEST)

    # ── Read image bytes first (before Supabase upload exhausts the pointer) ──
    selfie.seek(0)
    selfie_bytes = selfie.read()
    screenshot.seek(0)
    screenshot_bytes = screenshot.read()

    # ── Upload both photos to Supabase ───────────────────────────────────────
    selfie.seek(0)
    selfie_url = upload_image_to_supabase(selfie, folder="activity-selfies")
    if not selfie_url:
        return Response({'error': 'Failed to upload selfie. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    screenshot.seek(0)
    screenshot_url = upload_image_to_supabase(screenshot, folder="activity-screenshots")
    if not screenshot_url:
        return Response({'error': 'Failed to upload screenshot. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ── Verify with Claude vision ────────────────────────────────────────────
    is_verified = False
    verification_status = 'pending'
    verification_reason = ''

    try:
        import anthropic
        import base64
        import json

        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        prompt = f"""You are verifying a fitness activity log for an app called Momentm.
The user claims to have done a {activity} workout for {duration} minutes, {steps} steps, and {calories} calories.

You have been given two images:
1. A selfie of the person (should show a person who looks like they have been exercising)
2. A screenshot from a fitness app (should show workout data matching the claimed activity)

Verify the following:
- Image 1 looks like a genuine workout selfie (person present, looks active or post-workout)
- Image 2 looks like a genuine fitness app screenshot showing {activity} activity
- The two images appear to be different photos (not the same image uploaded twice)

Reply with ONLY a JSON object in this exact format, nothing else:
{{"verified": true or false, "reason": "brief reason in one sentence"}}"""

        selfie_b64 = base64.standard_b64encode(selfie_bytes).decode('utf-8')
        screenshot_b64 = base64.standard_b64encode(screenshot_bytes).decode('utf-8')

        selfie_type = selfie.content_type if selfie.content_type != 'image/heic' else 'image/jpeg'
        screenshot_type = screenshot.content_type if screenshot.content_type != 'image/heic' else 'image/jpeg'

        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": selfie_type, "data": selfie_b64}},
                    {"type": "image", "source": {"type": "base64", "media_type": screenshot_type, "data": screenshot_b64}},
                    {"type": "text", "text": prompt}
                ]
            }]
        )

        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        is_verified = result.get('verified', False)
        verification_reason = result.get('reason', '')
        verification_status = 'verified' if is_verified else 'rejected'
        print(f"Claude verification result: {verification_status} - {verification_reason}")

    except Exception as e:
        print(f"Claude verification error: {e}")
        is_verified = False
        verification_status = 'pending'
        verification_reason = 'Verification service unavailable, log saved for manual review.'

    # ── Save the activity log ────────────────────────────────────────────────
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    daily_cap = DAILY_CAP_PREMIUM if profile.is_premium else DAILY_CAP_FREE

    today = timezone.now().date()
    today_logs = ActivityLog.objects.filter(user=request.user, logged_at__date=today).values('activity', 'duration', 'steps', 'calories')

    is_first_log_today = not today_logs.exists()
    already_logged_today = today_logs.filter(activity__iexact=activity).exists()

    today_points = FIRST_LOG_BONUS if not is_first_log_today else 0
    seen = set()
    for log in today_logs:
        pts = calc_session_points(log['duration'], log['steps'], log['calories'])
        if log['activity'].lower() in seen:
            pts = int(pts * DUPLICATE_ACTIVITY_POINT_MULTIPLIER)
        seen.add(log['activity'].lower())
        today_points += pts

    log = ActivityLog.objects.create(
        user=request.user,
        activity=activity,
        duration=duration,
        steps=steps,
        calories=calories,
        selfie_url=selfie_url,
        screenshot_url=screenshot_url,
        is_verified=is_verified,
        verification_status=verification_status,
    )

    session_pts = calc_session_points(duration, steps, calories)
    if already_logged_today:
        session_pts = int(session_pts * DUPLICATE_ACTIVITY_POINT_MULTIPLIER)
    if is_first_log_today:
        session_pts += FIRST_LOG_BONUS

    if not is_verified:
        session_pts = 0

    response_data = {
        'id': log.id,
        'activity': log.activity,
        'duration': log.duration,
        'steps': log.steps,
        'calories': log.calories,
        'logged_at': log.logged_at.strftime('%b %d, %H:%M'),
        'points_earned': session_pts,
        'is_verified': is_verified,
        'verification_status': verification_status,
        'verification_reason': verification_reason,
    }

    if not is_verified and verification_status == 'rejected':
        response_data['warning'] = f'Activity logged but not verified: {verification_reason}. No points awarded.'
    elif not is_verified and verification_status == 'pending':
        response_data['warning'] = verification_reason
    elif today_points >= daily_cap:
        response_data['warning'] = f"You've reached your {daily_cap}-point daily cap."
        response_data['points_earned'] = 0
    elif already_logged_today:
        response_data['warning'] = f'You already logged {activity} today — this entry earns {int(DUPLICATE_ACTIVITY_POINT_MULTIPLIER * 100)}% points.'

    return Response(response_data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_activities_view(request):
    logs = ActivityLog.objects.filter(user=request.user)[:30]
    data = [{
        'id': log.id,
        'activity': log.activity,
        'duration': log.duration,
        'steps': log.steps,
        'calories': log.calories,
        'logged_at': log.logged_at.strftime('%b %d, %H:%M'),
        'is_verified': log.is_verified,
        'verification_status': log.verification_status,
    } for log in logs]
    return Response(data)


def _get_period_start(period):
    from django.utils import timezone
    from datetime import timedelta
    today = timezone.now().date()
    if period == 'week':
        return today - timedelta(days=7)
    if period == 'month':
        return today.replace(day=1)
    if period == 'year':
        return today.replace(month=1, day=1)
    return None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def leaderboard_view(request):
    from django.utils import timezone
    from datetime import timedelta

    period = request.GET.get('period', 'all')
    start_date = _get_period_start(period)

    user_ids = ActivityLog.objects.values_list('user_id', flat=True).distinct()
    users = User.objects.filter(id__in=user_ids).select_related('userprofile')

    leaderboard = []
    for user in users:
        try:
            profile = user.userprofile
        except UserProfile.DoesNotExist:
            profile = None

        total_points = (
            compute_period_points(user, start_date, profile)
            if start_date else
            compute_user_points(user, profile)
        )

        logs_dates = set(
            ActivityLog.objects.filter(user=user).values_list('logged_at__date', flat=True)
        )
        today = timezone.now().date()
        display_streak = 0
        current = today
        while current in logs_dates:
            display_streak += 1
            current -= timedelta(days=1)
        if display_streak == 0:
            current = today - timedelta(days=1)
            while current in logs_dates:
                display_streak += 1
                current -= timedelta(days=1)

        cosmetics = get_active_cosmetics(user)
        full_name = f"{user.first_name} {user.last_name}".strip() or user.email.split('@')[0]
        leaderboard.append({
            'name': full_name,
            'points': total_points,
            'streak': display_streak,
            'is_premium': profile.is_premium_active if profile else False,
            'cosmetics': cosmetics,
            'you': user.id == request.user.id,
        })

    leaderboard.sort(key=lambda x: x['points'], reverse=True)
    for i, entry in enumerate(leaderboard):
        entry['rank'] = i + 1

    return Response(leaderboard)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def loop_leaderboard_view(request, loop_id):
    from django.utils import timezone
    from datetime import timedelta

    period = request.GET.get('period', 'all')
    start_date = _get_period_start(period)

    try:
        loop = Loop.objects.get(id=loop_id)
    except Loop.DoesNotExist:
        return Response({'error': 'Loop not found.'}, status=status.HTTP_404_NOT_FOUND)

    member_ids = LoopMembership.objects.filter(
        loop=loop, status='approved'
    ).values_list('user_id', flat=True)

    if request.user.id not in list(member_ids) and loop.created_by_id != request.user.id:
        return Response({'error': 'Not a member of this loop.'}, status=status.HTTP_403_FORBIDDEN)

    users = User.objects.filter(id__in=member_ids).select_related('userprofile')

    leaderboard = []
    for user in users:
        try:
            profile = user.userprofile
        except UserProfile.DoesNotExist:
            profile = None

        total_points = (
            compute_period_points(user, start_date, profile)
            if start_date else
            compute_user_points(user, profile)
        )

        logs_dates = set(
            ActivityLog.objects.filter(user=user).values_list('logged_at__date', flat=True)
        )
        today = timezone.now().date()
        display_streak = 0
        current = today
        while current in logs_dates:
            display_streak += 1
            current -= timedelta(days=1)
        if display_streak == 0:
            current = today - timedelta(days=1)
            while current in logs_dates:
                display_streak += 1
                current -= timedelta(days=1)

        cosmetics = get_active_cosmetics(user)
        full_name = f"{user.first_name} {user.last_name}".strip() or user.email.split('@')[0]
        leaderboard.append({
            'name': full_name,
            'points': total_points,
            'streak': display_streak,
            'is_premium': profile.is_premium_active if profile else False,
            'cosmetics': cosmetics,
            'you': user.id == request.user.id,
        })

    leaderboard.sort(key=lambda x: x['points'], reverse=True)
    for i, entry in enumerate(leaderboard):
        entry['rank'] = i + 1

    return Response(leaderboard)


# ─── Sleep ────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def log_sleep_view(request):
    from django.utils import timezone
    import datetime

    try:
        hours = float(request.data.get('hours', 0))
    except (ValueError, TypeError):
        return Response({'error': 'Hours must be a number.'}, status=status.HTTP_400_BAD_REQUEST)

    if hours < 0 or hours > 24:
        return Response({'error': 'Hours must be between 0 and 24.'}, status=status.HTTP_400_BAD_REQUEST)

    date_str = request.data.get('date')
    if date_str:
        try:
            date = datetime.date.fromisoformat(date_str)
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        date = timezone.now().date()

    log, created = SleepLog.objects.update_or_create(
        user=request.user,
        date=date,
        defaults={'hours': hours},
    )

    return Response({
        'id': log.id,
        'hours': log.hours,
        'date': log.date.isoformat(),
        'logged_at': log.logged_at.strftime('%b %d, %H:%M'),
        'updated': not created,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sleep_view(request):
    logs = SleepLog.objects.filter(user=request.user)[:14]
    data = [{
        'id': log.id,
        'hours': log.hours,
        'date': log.date.isoformat(),
        'logged_at': log.logged_at.strftime('%b %d, %H:%M'),
    } for log in logs]
    return Response(data)


# ─── Nutrition ────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def log_nutrition_view(request):
    from django.utils import timezone
    import datetime

    try:
        calories = int(request.data.get('calories', 0))
        protein = int(request.data.get('protein', 0))
        carbs = int(request.data.get('carbs', 0))
        fats = int(request.data.get('fats', 0))
    except (ValueError, TypeError):
        return Response({'error': 'All values must be numbers.'}, status=status.HTTP_400_BAD_REQUEST)

    if calories < 0 or protein < 0 or carbs < 0 or fats < 0:
        return Response({'error': 'Values cannot be negative.'}, status=status.HTTP_400_BAD_REQUEST)

    if calories > 10000:
        return Response({'error': 'Calories seem too high (max 10,000).'}, status=status.HTTP_400_BAD_REQUEST)

    date_str = request.data.get('date')
    if date_str:
        try:
            date = datetime.date.fromisoformat(date_str)
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        date = timezone.now().date()

    log, created = NutritionLog.objects.update_or_create(
        user=request.user,
        date=date,
        defaults={
            'calories': calories,
            'protein': protein,
            'carbs': carbs,
            'fats': fats,
        },
    )

    return Response({
        'id': log.id,
        'calories': log.calories,
        'protein': log.protein,
        'carbs': log.carbs,
        'fats': log.fats,
        'date': log.date.isoformat(),
        'logged_at': log.logged_at.strftime('%b %d, %H:%M'),
        'updated': not created,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_nutrition_view(request):
    logs = NutritionLog.objects.filter(user=request.user)[:14]
    data = [{
        'id': log.id,
        'calories': log.calories,
        'protein': log.protein,
        'carbs': log.carbs,
        'fats': log.fats,
        'date': log.date.isoformat(),
        'logged_at': log.logged_at.strftime('%b %d, %H:%M'),
    } for log in logs]
    return Response(data)


# ─── Profile ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if request.method == 'PATCH':
        bio = request.data.get('bio', profile.bio)
        is_public = request.data.get('is_public', profile.is_public)
        profile.bio = bio
        profile.is_public = is_public
        profile.save()
    return Response({
        'email': request.user.email,
        'first_name': request.user.first_name,
        'last_name': request.user.last_name,
        'bio': profile.bio,
        'is_public': profile.is_public,
        'avatar_url': profile.avatar_url,
        'is_premium': profile.is_premium_active,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_avatar_view(request):
    image = request.FILES.get('image')
    if not image:
        return Response({'error': 'No image provided.'}, status=status.HTTP_400_BAD_REQUEST)
    image_url = upload_image_to_supabase(image, folder="avatars")
    if not image_url:
        return Response({'error': 'Upload failed.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    profile.avatar_url = image_url
    profile.save()
    return Response({'avatar_url': image_url})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_cosmetic_view(request, claimed_id):
    try:
        claimed = ClaimedReward.objects.get(id=claimed_id, user=request.user)
        claimed.is_equipped = not claimed.is_equipped
        claimed.save()
        return Response({'is_equipped': claimed.is_equipped})
    except ClaimedReward.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
def public_profile_view(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        profile = UserProfile.objects.get(user=user)
        if not profile.is_public:
            return Response({'error': 'This profile is private.'}, status=status.HTTP_403_FORBIDDEN)
        return Response({
            'first_name': user.first_name,
            'last_name': user.last_name,
            'bio': profile.bio,
            'avatar_url': profile.avatar_url,
        })
    except (User.DoesNotExist, UserProfile.DoesNotExist):
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)


# ─── Rewards ──────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def rewards_view(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    available = get_available_points(request.user, profile)

    claimed_reward_ids = set(
        ClaimedReward.objects.filter(user=request.user).values_list('reward_id', flat=True)
    )

    rewards = Reward.objects.filter(is_active=True)
    data = []
    for r in rewards:
        has_codes = True
        if r.type == 'real_world' and r.effect == 'discount':
            has_codes = RewardCode.objects.filter(reward=r, is_claimed=False).exists()
        data.append({
            'id': r.id,
            'name': r.name,
            'description': r.description,
            'type': r.type,
            'effect': r.effect,
            'cost': r.cost,
            'icon': r.icon,
            'color': r.color,
            'metadata': r.metadata,
            'claimed': r.id in claimed_reward_ids,
            'can_afford': available >= r.cost,
            'in_stock': has_codes,
        })

    return Response({
        'available_points': available,
        'is_premium': profile.is_premium_active,
        'rewards': data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def claim_reward_view(request, reward_id):
    from django.utils import timezone
    from datetime import timedelta
    from django.db.models import Q

    try:
        reward = Reward.objects.get(id=reward_id, is_active=True)
    except Reward.DoesNotExist:
        return Response({'error': 'Reward not found.'}, status=status.HTTP_404_NOT_FOUND)

    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    available = get_available_points(request.user, profile)

    if available < reward.cost:
        return Response({
            'error': f'Not enough points. You need {reward.cost:,} but have {available:,}.'
        }, status=status.HTTP_400_BAD_REQUEST)

    code = ''
    expires_at = None

    if reward.type == 'cosmetic':
        already_active = ClaimedReward.objects.filter(
            user=request.user, reward=reward
        ).filter(Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())).exists()
        if already_active:
            return Response({'error': 'You already have this reward active.'}, status=status.HTTP_400_BAD_REQUEST)

    elif reward.type == 'subscription':
        duration_days = reward.metadata.get('duration_days', 7)
        now = timezone.now()
        if profile.is_premium and profile.premium_expires_at and profile.premium_expires_at > now:
            profile.premium_expires_at += timedelta(days=duration_days)
        else:
            profile.is_premium = True
            profile.premium_expires_at = now + timedelta(days=duration_days)
        profile.save()
        expires_at = profile.premium_expires_at

    elif reward.type == 'real_world' and reward.effect == 'discount':
        reward_code = RewardCode.objects.filter(reward=reward, is_claimed=False).first()
        if not reward_code:
            return Response(
                {'error': 'No codes available right now — please try again soon.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        code = reward_code.code
        reward_code.is_claimed = True
        reward_code.save()

    claimed = ClaimedReward.objects.create(
        user=request.user,
        reward=reward,
        cost_at_claim=reward.cost,
        code=code,
        expires_at=expires_at,
    )

    return Response({
        'message': f'Successfully claimed {reward.name}!',
        'claimed_id': claimed.id,
        'reward_type': reward.type,
        'effect': reward.effect,
        'code': code,
        'expires_at': expires_at.isoformat() if expires_at else None,
        'available_points': get_available_points(request.user, profile),
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def claimed_rewards_view(request):
    claims = ClaimedReward.objects.filter(user=request.user).select_related('reward')
    return Response([{
        'id': c.id,
        'reward_name': c.reward.name,
        'reward_type': c.reward.type,
        'reward_effect': c.reward.effect,
        'reward_icon': c.reward.icon,
        'reward_color': c.reward.color,
        'cost': c.cost_at_claim,
        'code': c.code,
        'claimed_at': c.claimed_at.strftime('%b %d, %Y'),
        'expires_at': c.expires_at.strftime('%b %d, %Y') if c.expires_at else None,
    } for c in claims])

# ─── Adaptive Plan ────────────────────────────────────────────────────────────

def _get_nutrition_context(user):
    from django.utils import timezone
    import datetime
    from django.db.models import Avg
    week_ago = timezone.now().date() - datetime.timedelta(days=7)
    logs = NutritionLog.objects.filter(user=user, date__gte=week_ago)
    if not logs.exists():
        return None
    avgs = logs.aggregate(
        avg_calories=Avg('calories'),
        avg_protein=Avg('protein'),
        avg_carbs=Avg('carbs'),
        avg_fats=Avg('fats'),
    )
    return {
        'avg_calories': round(avgs['avg_calories'] or 0),
        'avg_protein': round(avgs['avg_protein'] or 0),
        'avg_carbs': round(avgs['avg_carbs'] or 0),
        'avg_fats': round(avgs['avg_fats'] or 0),
        'days_logged': logs.count(),
    }


def _get_fitness_profile_context(user):
    try:
        fp = user.fitness_profile
        equipment = ', '.join(fp.equipment) if fp.equipment else 'not specified'
        restrictions = ', '.join(fp.dietary_restrictions) if fp.dietary_restrictions else 'none'
        return {
            'age': fp.age,
            'weight_kg': fp.weight_kg,
            'fitness_level': fp.fitness_level,
            'days_per_week': fp.days_per_week,
            'time_per_session_min': fp.time_per_session_min,
            'equipment': equipment,
            'dietary_restrictions': restrictions,
            'injuries': fp.injuries or 'none',
        }
    except UserFitnessProfile.DoesNotExist:
        return None


def _generate_plan_with_openai(goal_text, timeframe_days, week_number, activity_history=None, prev_completion=None, nutrition_data=None, fitness_profile=None):
    from openai import OpenAI
    import datetime
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    total_weeks = max(1, timeframe_days // 7)
    day_start = (week_number - 1) * 7 + 1
    day_end = day_start + 6

    recalibration_context = ""
    if activity_history is not None and prev_completion is not None:
        recalibration_context = f"""
Previous week completion: {prev_completion:.0%} of target sessions
Activities logged last week: {', '.join(activity_history) if activity_history else 'none'}
Adjust difficulty and targets based on this performance.
"""

    nutrition_context = ""
    if nutrition_data:
        nutrition_context = f"""
User's actual nutrition last week (averaged over {nutrition_data['days_logged']} logged days):
- Calories: {nutrition_data['avg_calories']} kcal/day
- Protein: {nutrition_data['avg_protein']}g/day
- Carbs: {nutrition_data['avg_carbs']}g/day
- Fats: {nutrition_data['avg_fats']}g/day
Give specific, data-driven nutrition feedback comparing their actual intake to what their goal requires.
"""
    else:
        nutrition_context = "User has not logged nutrition yet. Give 2-3 practical nutrition tips relevant to their goal."

    if fitness_profile:
        fp = fitness_profile
        profile_context = f"""
User profile:
- Age: {fp['age'] or 'not specified'}
- Weight: {fp['weight_kg'] or 'not specified'} kg
- Fitness level: {fp['fitness_level']}
- Available days per week: {fp['days_per_week']}
- Time per session: {fp['time_per_session_min']} minutes
- Equipment available: {fp['equipment']}
- Dietary restrictions: {fp['dietary_restrictions']}
- Injuries/limitations: {fp['injuries']}
Tailor exercises, intensity, duration, and nutrition strictly to this profile.
"""
    else:
        profile_context = "User profile: not yet configured — use sensible beginner defaults."

    prompt = f"""You are an expert fitness and performance coach. A user has set the following goal:

Goal: {goal_text}
Timeframe: {timeframe_days} days total ({total_weeks} weeks)
Current week: Week {week_number} (Day {day_start} to Day {day_end} of the program)
{profile_context}
{recalibration_context}
Nutrition data:
{nutrition_context}

Generate a detailed training plan for Week {week_number} (Day {day_start}–{day_end}) as a JSON object with exactly this structure:
{{
  "summary": "one sentence describing this week's focus",
  "target_sessions": <number of training sessions this week>,
  "days": [
    {{
      "day": "Day {day_start}",
      "is_rest": false,
      "session_type": "Session name",
      "duration_min": <calculated total — see rules>,
      "drills": [
        {{"name": "Warm-up", "sets": 1, "duration_min": 5, "notes": "e.g. light jog and dynamic stretches"}},
        {{"name": "drill name", "sets": 3, "duration_min": 3, "rest_min": 1, "notes": "optional coaching tip"}},
        {{"name": "Cool-down", "sets": 1, "duration_min": 5, "notes": "e.g. static stretching"}}
      ]
    }},
    {{
      "day": "Day {day_start + 1}",
      "is_rest": true,
      "session_type": "REST",
      "note": "Light stretching or walk recommended"
    }}
  ],
  "nutrition": [
    "specific, actionable nutrition tip based on user data"
  ]
}}

Rules:
- Label days exactly as "Day {day_start}", "Day {day_start + 1}" ... "Day {day_end}" — never use weekday names
- Include all 7 days
- Mark rest days with is_rest: true and no drills array
- Every training day MUST start with a Warm-up drill and end with a Cool-down drill
- Use duration_min (integer minutes) and rest_min (integer minutes) for all drills — no string durations
- Calculate duration_min for the session as: sum of (sets × duration_min) + sum of ((sets - 1) × rest_min) for all drills. Set this as the session's duration_min field
- Be specific: named drills, sets, durations, rest periods, coaching notes
- Nutrition: 2-3 tips — if user has logged nutrition data, compare actual vs recommended and give specific numbers
- Progress difficulty for week {week_number} of {total_weeks} total
- Respond with ONLY the JSON object, no markdown, no extra text"""

    response = client.chat.completions.create(
        model="gpt-4o",
        temperature=0.4,
        max_tokens=2500,
        messages=[{"role": "user", "content": prompt}],
    )
    import json
    raw = response.choices[0].message.content.strip()
    return json.loads(raw)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def plan_setup_view(request):
    from django.utils import timezone
    import datetime

    if request.method == 'GET':
        try:
            goal = request.user.goal
            current_plan = goal.weekly_plans.filter(status__in=['active', 'pending_review']).first()
            past_plans = goal.weekly_plans.filter(status__in=['accepted', 'active', 'denied']).order_by('-week_number')[:5]
            return Response({
                'has_goal': True,
                'goal': {
                    'id': goal.id,
                    'goal_text': goal.goal_text,
                    'timeframe_days': goal.timeframe_days,
                    'start_date': goal.start_date.isoformat(),
                    'end_date': goal.end_date.isoformat(),
                    'days_remaining': max(0, (goal.end_date - timezone.now().date()).days),
                },
                'current_plan': _serialize_plan(current_plan) if current_plan else None,
                'past_plans': [_serialize_plan(p) for p in past_plans],
                'is_premium': request.user.userprofile.is_premium_active,
            })
        except UserGoal.DoesNotExist:
            return Response({'has_goal': False})

    # POST — create or reset goal
    goal_text = request.data.get('goal_text', '').strip()
    timeframe_days = request.data.get('timeframe_days')
    if not goal_text or not timeframe_days:
        return Response({'error': 'goal_text and timeframe_days are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        timeframe_days = int(timeframe_days)
        if timeframe_days < 7 or timeframe_days > 365:
            return Response({'error': 'Timeframe must be between 7 and 365 days.'}, status=status.HTTP_400_BAD_REQUEST)
    except (ValueError, TypeError):
        return Response({'error': 'Invalid timeframe.'}, status=status.HTTP_400_BAD_REQUEST)

    UserGoal.objects.filter(user=request.user).delete()

    end_date = timezone.now().date() + datetime.timedelta(days=timeframe_days)
    goal = UserGoal.objects.create(
        user=request.user,
        goal_text=goal_text,
        timeframe_days=timeframe_days,
        end_date=end_date,
    )

    nutrition_data = _get_nutrition_context(request.user)
    fitness_profile = _get_fitness_profile_context(request.user)

    try:
        plan_data = _generate_plan_with_openai(
            goal_text, timeframe_days, week_number=1,
            nutrition_data=nutrition_data,
            fitness_profile=fitness_profile,
        )
    except Exception as e:
        goal.delete()
        return Response({'error': f'Failed to generate plan: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    WeeklyPlan.objects.create(
        goal=goal,
        week_number=1,
        week_start=timezone.now().date(),
        plan_data=plan_data,
        status='active',
    )

    return Response({
        'has_goal': True,
        'goal': {
            'id': goal.id,
            'goal_text': goal.goal_text,
            'timeframe_days': goal.timeframe_days,
            'start_date': goal.start_date.isoformat(),
            'end_date': goal.end_date.isoformat(),
            'days_remaining': timeframe_days,
        },
        'current_plan': _serialize_plan(goal.weekly_plans.first()),
        'past_plans': [],
        'is_premium': request.user.userprofile.is_premium_active,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def plan_respond_view(request):
    action = request.data.get('action')
    if action not in ('accept', 'deny'):
        return Response({'error': 'action must be accept or deny.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        goal = request.user.goal
    except UserGoal.DoesNotExist:
        return Response({'error': 'No active goal.'}, status=status.HTTP_404_NOT_FOUND)

    plan = goal.weekly_plans.filter(status='pending_review').first()
    if not plan:
        return Response({'error': 'No pending recalibration to review.'}, status=status.HTTP_404_NOT_FOUND)

    if action == 'accept':
        goal.weekly_plans.filter(status='active').update(status='accepted')
        plan.status = 'active'
    else:
        plan.status = 'denied'
    plan.save()

    return Response({'status': plan.status})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def plan_recalibrate_view(request):
    from django.utils import timezone
    import datetime

    try:
        goal = request.user.goal
    except UserGoal.DoesNotExist:
        return Response({'error': 'No active goal.'}, status=status.HTTP_404_NOT_FOUND)

    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if not profile.is_premium_active:
        return Response({'error': 'Recalibration is a Premium feature.'}, status=status.HTTP_403_FORBIDDEN)

    if goal.weekly_plans.filter(status='pending_review').exists():
        return Response({'error': 'A recalibration is already pending your review.'}, status=status.HTTP_400_BAD_REQUEST)

    week_ago = timezone.now().date() - datetime.timedelta(days=7)
    recent_logs = ActivityLog.objects.filter(user=request.user, logged_at__date__gte=week_ago)
    activity_history = list(recent_logs.values_list('activity', flat=True))

    current_plan = goal.weekly_plans.filter(status='active').first()
    target_sessions = current_plan.plan_data.get('target_sessions', 4) if current_plan else 4
    prev_completion = len(activity_history) / target_sessions if target_sessions else 0
    next_week = (current_plan.week_number + 1) if current_plan else 2

    nutrition_data = _get_nutrition_context(request.user)
    fitness_profile = _get_fitness_profile_context(request.user)

    try:
        plan_data = _generate_plan_with_openai(
            goal.goal_text,
            goal.timeframe_days,
            week_number=next_week,
            activity_history=activity_history,
            prev_completion=prev_completion,
            nutrition_data=nutrition_data,
            fitness_profile=fitness_profile,
        )
    except Exception as e:
        return Response({'error': f'Failed to generate recalibration: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    note = f"Last week you completed approximately {prev_completion:.0%} of your target sessions."
    if prev_completion >= 1.0:
        note += " Great work — intensity has been increased."
    elif prev_completion >= 0.5:
        note += " Solid effort — targets adjusted to keep you on track."
    else:
        note += " Targets have been adjusted to help you build momentum."

    WeeklyPlan.objects.create(
        goal=goal,
        week_number=next_week,
        week_start=timezone.now().date(),
        plan_data=plan_data,
        status='pending_review',
        is_recalibration=True,
        recalibration_note=note,
    )

    return Response({'message': 'Recalibration generated. Review it on your plan page.'})


def _serialize_plan(plan):
    return {
        'id': plan.id,
        'week_number': plan.week_number,
        'week_start': plan.week_start.isoformat(),
        'status': plan.status,
        'is_recalibration': plan.is_recalibration,
        'recalibration_note': plan.recalibration_note,
        'plan_data': plan.plan_data,
    }


# ─── Fitness Profile ──────────────────────────────────────────────────────────

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def fitness_profile_view(request):
    profile, _ = UserFitnessProfile.objects.get_or_create(user=request.user)

    if request.method == 'PATCH':
        data = request.data
        if 'age' in data:
            profile.age = int(data['age']) if data['age'] else None
        if 'weight_kg' in data:
            profile.weight_kg = float(data['weight_kg']) if data['weight_kg'] else None
        if 'fitness_level' in data:
            profile.fitness_level = data['fitness_level']
        if 'days_per_week' in data:
            profile.days_per_week = int(data['days_per_week'])
        if 'time_per_session_min' in data:
            profile.time_per_session_min = int(data['time_per_session_min'])
        if 'equipment' in data:
            profile.equipment = data['equipment']
        if 'dietary_restrictions' in data:
            profile.dietary_restrictions = data['dietary_restrictions']
        if 'injuries' in data:
            profile.injuries = data['injuries']
        profile.save()

    return Response({
        'age': profile.age,
        'weight_kg': profile.weight_kg,
        'fitness_level': profile.fitness_level,
        'days_per_week': profile.days_per_week,
        'time_per_session_min': profile.time_per_session_min,
        'equipment': profile.equipment,
        'dietary_restrictions': profile.dietary_restrictions,
        'injuries': profile.injuries,
    })
