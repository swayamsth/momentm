from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import SignupSerializer
from .models import OTPVerification, PasswordResetToken, UserProfile, Post, Comment, ActivityLog


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


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
        reset_link = f"http://localhost:8080/reset-password?token={reset_token.token}"
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


@api_view(['GET'])
def get_posts_view(request):
    posts = Post.objects.select_related('user').prefetch_related('post_comments__user', 'post_comments__likes').all()[:50]
    data = []
    for post in posts:
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
                'liked': request.user in comment.likes.all() if request.user.is_authenticated else False,
                'time': comment.created_at.strftime('%b %d, %H:%M'),
            })
        data.append({
            'id': post.id,
            'user': full_name or post.user.email,
            'handle': post.user.email.split('@')[0],
            'text': post.text,
            'likes': post.likes.count(),
            'liked': request.user in post.likes.all() if request.user.is_authenticated else False,
            'time': post.created_at.strftime('%b %d, %H:%M'),
            'comments': comments,
        })
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_post_view(request):
    text = request.data.get('text', '').strip()
    if not text:
        return Response({'error': 'Post cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(text) > 500:
        return Response({'error': 'Post cannot exceed 500 characters.'}, status=status.HTTP_400_BAD_REQUEST)
    post = Post.objects.create(user=request.user, text=text)
    full_name = f"{request.user.first_name} {request.user.last_name}".strip()
    return Response({
        'id': post.id,
        'user': full_name or request.user.email,
        'handle': request.user.email.split('@')[0],
        'text': post.text,
        'likes': 0,
        'liked': False,
        'time': 'just now',
        'comments': [],
    }, status=status.HTTP_201_CREATED)


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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def log_activity_view(request):
    activity = request.data.get('activity', '').strip()
    duration = request.data.get('duration', 0)
    steps = request.data.get('steps', 0)
    calories = request.data.get('calories', 0)

    if not activity:
        return Response({'error': 'Activity name is required.'}, status=status.HTTP_400_BAD_REQUEST)

    log = ActivityLog.objects.create(
        user=request.user,
        activity=activity,
        duration=int(duration),
        steps=int(steps),
        calories=int(calories),
    )

    return Response({
        'id': log.id,
        'activity': log.activity,
        'duration': log.duration,
        'steps': log.steps,
        'calories': log.calories,
        'logged_at': log.logged_at.strftime('%b %d, %H:%M'),
    }, status=status.HTTP_201_CREATED)


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
    } for log in logs]
    return Response(data)