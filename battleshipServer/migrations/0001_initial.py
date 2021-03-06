# Generated by Django 3.0.5 on 2020-05-03 12:46

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Room',
            fields=[
                ('hostID', models.DecimalField(decimal_places=0, max_digits=6)),
                ('guestID', models.DecimalField(blank=True, decimal_places=0, max_digits=6, null=True)),
                ('roomID', models.DecimalField(decimal_places=0, max_digits=6, primary_key=True, serialize=False, unique=True)),
                ('hostField', models.CharField(max_length=100)),
                ('guestField', models.CharField(max_length=100)),
            ],
        ),
    ]
