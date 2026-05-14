from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0013_avatar_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='claimedreward',
            name='is_equipped',
            field=models.BooleanField(default=True),
        ),
    ]
