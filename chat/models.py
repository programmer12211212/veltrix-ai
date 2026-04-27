from django.db import models
from django.contrib.auth.models import User

class ChatTopic(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class ChatMessage(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
    ]
    topic = models.ForeignKey(ChatTopic, related_name='messages', on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    image = models.ImageField(upload_to='chat_images/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.role}: {self.content[:20]}..."

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    plan = models.CharField(max_length=50, default='Free')
    
    def __str__(self):
        return f"{self.user.username} - {self.plan}"

class UserMemory(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='memory')
    content = models.TextField(default="", blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Memory for {self.user.username}"

from django.db.models.signals import post_save
from django.dispatch import receiver

VIP_EMAILS = ['asadbek_tursunboyev@mail.ru', 'davron.120a@gmail.com', 'uchqunbekfarxodov003@gmail.com']
VIP_USERNAMES = ['asadbek_tursunboyev', 'uchqunbek']

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        plan = 'Free'
        email_lower = (instance.email or '').lower()
        username_lower = (instance.username or '').lower()
        
        if email_lower in VIP_EMAILS or username_lower in VIP_USERNAMES:
            plan = 'Pro Account'
            
        UserProfile.objects.create(user=instance, plan=plan)
        UserMemory.objects.get_or_create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    email_lower = (instance.email or '').lower()
    username_lower = (instance.username or '').lower()
    is_vip = email_lower in VIP_EMAILS or username_lower in VIP_USERNAMES
    
    if not hasattr(instance, 'profile'):
        plan = 'Pro Account' if is_vip else 'Free'
        UserProfile.objects.create(user=instance, plan=plan)
    else:
        if is_vip and instance.profile.plan != 'Pro Account':
            instance.profile.plan = 'Pro Account'
        instance.profile.save()
        
    if not hasattr(instance, 'memory'):
        UserMemory.objects.create(user=instance)
