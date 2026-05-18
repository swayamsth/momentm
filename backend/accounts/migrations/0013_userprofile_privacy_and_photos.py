from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0012_loop_cover_url'),
    ]

    operations = [
        # bio already exists in DB — only update Django's state
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AddField(
                    model_name='userprofile',
                    name='bio',
                    field=models.TextField(blank=True, default=''),
                ),
            ],
        ),
        migrations.AddField(
            model_name='userprofile',
            name='privacy',
            field=models.CharField(
                choices=[('public', 'Public'), ('private', 'Private'), ('restricted', 'Restricted')],
                default='public',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='profile_picture_url',
            field=models.URLField(blank=True, max_length=1000, null=True),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='cover_photo_url',
            field=models.URLField(blank=True, max_length=1000, null=True),
        ),
    ]
