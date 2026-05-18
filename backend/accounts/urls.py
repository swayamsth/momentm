from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('signup/', views.signup_view, name='signup'),
    path('verify-otp/', views.verify_otp_view, name='verify-otp'),
    path('resend-otp/', views.resend_otp_view, name='resend-otp'),
    path('login/', views.login_view, name='login'),
    path('verify-2fa/', views.verify_2fa_view, name='verify-2fa'),
    path('logout/', views.logout_view, name='logout'),
    path('delete-account/', views.delete_account_view, name='delete-account'),
    path('dashboard/', views.dashboard_view, name='dashboard'),
    path('toggle-2fa/', views.toggle_2fa_view, name='toggle-2fa'),
    path('forgot-password/', views.forgot_password_view, name='forgot-password'),
    path('reset-password/', views.reset_password_view, name='reset-password'),
    # Posts
    path('posts/', views.get_posts_view, name='get-posts'),
    path('posts/mine/', views.get_my_posts_view, name='my-posts'),
    path('posts/create/', views.create_post_view, name='create-post'),
    path('posts/<int:post_id>/delete/', views.delete_post_view, name='delete-post'),
    path('posts/<int:post_id>/edit/', views.edit_post_view, name='edit-post'),
    path('posts/<int:post_id>/like/', views.like_post_view, name='like-post'),
    path('posts/<int:post_id>/comment/', views.create_comment_view, name='create-comment'),
    # Comments
    path('comments/<int:comment_id>/like/', views.like_comment_view, name='like-comment'),
    path('comments/<int:comment_id>/edit/', views.edit_comment_view, name='edit-comment'),
    path('comments/<int:comment_id>/delete/', views.delete_comment_view, name='delete-comment'),
    # Loops
    path('loops/', views.get_loops_view, name='get-loops'),
    path('loops/create/', views.create_loop_view, name='create-loop'),
    path('loops/requests/', views.get_join_requests_view, name='get-requests'),
    path('loops/requests/<int:membership_id>/approve/', views.approve_request_view, name='approve-request'),
    path('loops/requests/<int:membership_id>/deny/', views.deny_request_view, name='deny-request'),
    path('loops/<int:loop_id>/posts/', views.get_loop_posts_view, name='loop-posts'),
    path('loops/<int:loop_id>/join/', views.join_loop_view, name='join-loop'),
    path('loops/<int:loop_id>/leave/', views.leave_loop_view, name='leave-loop'),
    path('loops/<int:loop_id>/edit/', views.edit_loop_view, name='edit-loop'),
    path('loops/<int:loop_id>/delete/', views.delete_loop_view, name='delete-loop'),
    path('loops/<int:loop_id>/upload-image/', views.upload_loop_image_view, name='upload-loop-image'),
    path('loops/<int:loop_id>/upload-cover/', views.upload_loop_cover_view, name='upload-loop-cover'),
    # Notifications
    path('notifications/', views.get_notifications_view, name='notifications'),
    # Activities
    path('activities/', views.get_activities_view, name='get-activities'),
    path('activities/log/', views.log_activity_view, name='log-activity'),
    # Sleep
    path('sleep/', views.get_sleep_view, name='get-sleep'),
    path('sleep/log/', views.log_sleep_view, name='log-sleep'),
    # Nutrition
    path('nutrition/', views.get_nutrition_view, name='get-nutrition'),
    path('nutrition/log/', views.log_nutrition_view, name='log-nutrition'),
    # Profile
    path('profile/', views.profile_view, name='profile'),
    path('profile/upload-avatar/', views.upload_avatar_view, name='upload-avatar'),
    path('profile/cosmetics/<int:claimed_id>/toggle/', views.toggle_cosmetic_view, name='toggle-cosmetic'),
    path('profile/<int:user_id>/', views.public_profile_view, name='public-profile'),
    # Leaderboard
    path('leaderboard/', views.leaderboard_view, name='leaderboard'),
    path('loops/<int:loop_id>/leaderboard/', views.loop_leaderboard_view, name='loop-leaderboard'),
    # Rewards
    path('rewards/', views.rewards_view, name='rewards'),
    path('rewards/<int:reward_id>/claim/', views.claim_reward_view, name='claim-reward'),
    path('rewards/claimed/', views.claimed_rewards_view, name='claimed-rewards'),
    # Profile
    path('profile/', views.profile_view, name='profile'),
    path('users/<int:user_id>/', views.public_profile_view, name='public-profile'),
    path('users/<int:user_id>/follow/', views.follow_user_view, name='follow-user'),
    path('profile/upload-picture/', views.upload_profile_picture_view, name='upload-profile-picture'),
    path('profile/upload-cover/', views.upload_cover_photo_view, name='upload-cover-photo'),
    path('profile/suggestions/', views.profile_suggestions_view, name='profile-suggestions'),
    path('profile/delete/', views.delete_account_view, name='delete-account'),
    # Follow requests
    path('follow-requests/<int:follow_id>/approve/', views.approve_follow_view, name='approve-follow'),
    path('follow-requests/<int:follow_id>/deny/', views.deny_follow_view, name='deny-follow'),
    # Loop members
    path('loops/<int:loop_id>/members/', views.loop_members_view, name='loop-members'),
]