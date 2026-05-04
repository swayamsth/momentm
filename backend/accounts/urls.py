from django.urls import path
from . import views

urlpatterns = [
    path('signup/', views.signup_view, name='signup'),
    path('verify-otp/', views.verify_otp_view, name='verify-otp'),
    path('resend-otp/', views.resend_otp_view, name='resend-otp'),
    path('login/', views.login_view, name='login'),
    path('verify-2fa/', views.verify_2fa_view, name='verify-2fa'),
    path('logout/', views.logout_view, name='logout'),
    path('dashboard/', views.dashboard_view, name='dashboard'),
    path('toggle-2fa/', views.toggle_2fa_view, name='toggle-2fa'),
    path('forgot-password/', views.forgot_password_view, name='forgot-password'),
    path('reset-password/', views.reset_password_view, name='reset-password'),
    path('posts/', views.get_posts_view, name='get-posts'),
    path('posts/create/', views.create_post_view, name='create-post'),
    path('posts/<int:post_id>/like/', views.like_post_view, name='like-post'),
    path('posts/<int:post_id>/comment/', views.create_comment_view, name='create-comment'),
    path('comments/<int:comment_id>/like/', views.like_comment_view, name='like-comment'),
    path('activities/', views.get_activities_view, name='get-activities'),
    path('activities/log/', views.log_activity_view, name='log-activity'),
]