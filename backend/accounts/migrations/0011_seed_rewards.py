from django.db import migrations

REWARDS = [
    # ── Cosmetic ──────────────────────────────────────────────────────────────
    {
        'name': 'Streak Flame',
        'description': 'Animated flame badge displayed on your leaderboard row',
        'type': 'cosmetic', 'effect': 'streak_flame',
        'cost': 1200, 'icon': 'flame', 'color': 'oklch(0.62 0.22 25)', 'order': 1,
    },
    {
        'name': 'Profile Badge',
        'description': 'Gold badge next to your name across the app',
        'type': 'cosmetic', 'effect': 'profile_badge',
        'cost': 2500, 'icon': 'award', 'color': 'oklch(0.78 0.16 75)', 'order': 2,
    },
    {
        'name': 'Loop Shoutout',
        'description': 'Pin your next post to the top of your Loop for 24 hours',
        'type': 'cosmetic', 'effect': 'loop_shoutout',
        'cost': 3500, 'icon': 'megaphone', 'color': 'oklch(0.55 0.18 300)', 'order': 3,
    },
    {
        'name': 'Leaderboard Title',
        'description': 'Display a custom title next to your name on the leaderboard',
        'type': 'cosmetic', 'effect': 'leaderboard_title',
        'cost': 6000, 'icon': 'crown', 'color': 'oklch(0.78 0.16 75)', 'order': 4,
    },
    # ── Subscription ──────────────────────────────────────────────────────────
    {
        'name': '3-Day Premium Trial',
        'description': 'Unlock all Premium features for 3 days',
        'type': 'subscription', 'effect': '',
        'cost': 3500, 'icon': 'zap', 'color': 'oklch(0.6 0.22 255)',
        'metadata': {'duration_days': 3}, 'order': 5,
    },
    {
        'name': '1 Week Premium',
        'description': 'Unlock all Premium features for 7 days',
        'type': 'subscription', 'effect': '',
        'cost': 7500, 'icon': 'zap', 'color': 'oklch(0.6 0.22 255)',
        'metadata': {'duration_days': 7}, 'order': 6,
    },
    {
        'name': '1 Month Premium',
        'description': 'Unlock all Premium features for 30 days',
        'type': 'subscription', 'effect': '',
        'cost': 15000, 'icon': 'star', 'color': 'oklch(0.78 0.16 75)',
        'metadata': {'duration_days': 30}, 'order': 7,
    },
    # ── Real World ────────────────────────────────────────────────────────────
    {
        'name': 'Prize Draw Entry',
        'description': 'One entry into the monthly prize draw — winner notified by email',
        'type': 'real_world', 'effect': 'prize_draw',
        'cost': 2500, 'icon': 'ticket', 'color': 'oklch(0.7 0.16 155)', 'order': 8,
    },
    {
        'name': 'Charity Donation ($1)',
        'description': '$1 donated to a charity of your choice on your behalf',
        'type': 'real_world', 'effect': 'charity',
        'cost': 1500, 'icon': 'heart', 'color': 'oklch(0.62 0.22 25)', 'order': 9,
    },
    {
        'name': '10% Partner Discount',
        'description': '10% off at our fitness partner stores — code stored in your account',
        'type': 'real_world', 'effect': 'discount',
        'cost': 6000, 'icon': 'tag', 'color': 'oklch(0.6 0.22 255)', 'order': 10,
    },
    {
        'name': '25% Partner Discount',
        'description': '25% off at our fitness partner stores — code stored in your account',
        'type': 'real_world', 'effect': 'discount',
        'cost': 13000, 'icon': 'tag', 'color': 'oklch(0.55 0.18 300)', 'order': 11,
    },
]


def seed(apps, schema_editor):
    Reward = apps.get_model('accounts', 'Reward')
    for r in REWARDS:
        Reward.objects.get_or_create(name=r['name'], defaults=r)


def unseed(apps, schema_editor):
    Reward = apps.get_model('accounts', 'Reward')
    Reward.objects.filter(name__in=[r['name'] for r in REWARDS]).delete()


class Migration(migrations.Migration):
    dependencies = [('accounts', '0010_reward_system')]
    operations = [migrations.RunPython(seed, unseed)]
