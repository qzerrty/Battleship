# Generated by Django 3.0.5 on 2020-05-14 07:11

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('battleshipServer', '0003_auto_20200505_2202'),
    ]

    operations = [
        migrations.AddField(
            model_name='room',
            name='guestStatus',
            field=models.SmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='room',
            name='hostStatus',
            field=models.SmallIntegerField(blank=True, null=True),
        ),
    ]
