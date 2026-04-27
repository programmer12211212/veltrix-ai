from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('chat/', views.chat_api, name='chat_api'),
    path('generate-image/', views.generate_image_view, name='generate_image'),
    path('convert-to-anime/', views.convert_to_anime_view, name='convert_to_anime'),
    path('get_topic_messages/<int:topic_id>/', views.get_topic_messages, name='get_topic_messages'),
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('logout/', views.logout_view, name='logout'),
    path('clear_history/', views.clear_history, name='clear_history'),
    path('check-image-limit/', views.check_image_limit, name='check_image_limit'),
    path('get-tts-audio/', views.get_tts_audio, name='get_tts_audio'),
]
