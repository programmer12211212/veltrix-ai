from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_POST
from .models import ChatTopic, ChatMessage
from .ai_utils import get_ai_response
from .services.viscodev_image import generate_image, convert_to_anime
import json
import base64
from django.utils import timezone
from datetime import timedelta

@login_required
def index(request):
    topics = ChatTopic.objects.filter(user=request.user).order_by('-created_at')
    
    # Guruhlash logikasi
    now = timezone.now()
    today = now.date()
    yesterday = today - timedelta(days=1)
    last_week = today - timedelta(days=7)
    last_month = today - timedelta(days=30)
    
    grouped_topics = {
        'Bugun': [],
        'Kechagi': [],
        'Oxirgi 7 kun': [],
        'Oxirgi 30 kun': [],
        'Eski suhbatlar': []
    }
    
    for t in topics:
        t_date = t.created_at.date()
        if t_date == today:
            grouped_topics['Bugun'].append(t)
        elif t_date == yesterday:
            grouped_topics['Kechagi'].append(t)
        elif t_date >= last_week:
            grouped_topics['Oxirgi 7 kun'].append(t)
        elif t_date >= last_month:
            grouped_topics['Oxirgi 30 kun'].append(t)
        else:
            grouped_topics['Eski suhbatlar'].append(t)
            
    # Bo'sh bo'lmagan guruhlarni tozalash
    final_groups = {k: v for k, v in grouped_topics.items() if v}
    
    return render(request, 'chat/index.html', {'grouped_topics': final_groups})

@login_required
def get_topic_messages(request, topic_id):
    topic = get_object_or_404(ChatTopic, id=topic_id, user=request.user)
    messages = topic.messages.all().order_by('created_at')
    msg_data = []
    for m in messages:
        msg_data.append({
            'role': m.role,
            'content': m.content,
            'image': m.image.url if m.image else None
        })
    return JsonResponse({'messages': msg_data})

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

from django.views.decorators.csrf import csrf_exempt

def check_image_quota(user, count_requested=1):
    """
    Checks if a user has exceeded their image limit (upload or generation).
    Returns (is_allowed, remaining_quota).
    """
    is_pro = hasattr(user, 'profile') and user.profile.plan.lower() not in ['free', '']
    if is_pro:
        return True, 999 

    last_24h = timezone.now() - timedelta(hours=24)
    img_count = ChatMessage.objects.filter(
        topic__user=user,
        created_at__gte=last_24h
    ).exclude(image__exact='').exclude(image__isnull=True).count()

    if img_count >= 3:
        return False, 0
    if img_count + count_requested > 3:
        return False, 3 - img_count
    
    return True, 3 - img_count

@login_required
@csrf_exempt
def chat_api(request):
    if request.method == 'POST':
        try:
            is_voice_mode = False
            content_type = request.content_type or ''
            if 'multipart' in content_type:
                user_message = request.POST.get('message', '')
                topic_id = request.POST.get('topic_id') or None
                images = request.FILES.getlist('image')
                is_voice_mode = request.POST.get('is_voice_mode') == 'true'
                is_search_mode = request.POST.get('is_search_mode') == 'true'
            else:
                data = json.loads(request.body)
                user_message = data.get('message', '')
                topic_id = data.get('topic_id') or None
                images = []
                is_voice_mode = str(data.get('is_voice_mode', '')).lower() == 'true'
                is_search_mode = str(data.get('is_search_mode', '')).lower() == 'true'

            if not user_message and not images:
                return JsonResponse({'error': 'Message cannot be empty'}, status=400)

            # --- LIMIT CHECKS ---
            is_pro = hasattr(request.user, 'profile') and request.user.profile.plan.lower() not in ['free', '']

            # 1. Message Count Limit (30 per topic for Free)
            if topic_id:
                topic = get_object_or_404(ChatTopic, id=topic_id, user=request.user)
                if not is_pro and topic.messages.count() >= 30:
                    return JsonResponse({'error': 'Ushbu suhbat juda uzun bo\'lib ketdi. Iltimos, yangi suhbat boshlang! 🚀'}, status=403)
            else:
                topic = None

            # 2. Image Quota Check
            if images:
                is_allowed, remaining = check_image_quota(request.user, len(images))
                if not is_allowed:
                    if remaining <= 0:
                        return JsonResponse({'error': 'Sizning kunlik rasm limitingiz (3 ta) tugagan. Iltimos, 24 soatdan keyin urinib ko\'ring! 🛡️'}, status=403)
                    else:
                        return JsonResponse({'error': f'Siz yana faqat {remaining} ta rasm yuklashingiz mumkin. 🛡️'}, status=403)

            # --- CREATE OR GET TOPIC ---
            if not topic:
                topic = ChatTopic.objects.create(user=request.user, title=user_message[:40] or "Rasm bo'yicha suhbat")
            
            if not user_message and images:
                user_message = 'Ushbu rasm(lar) haqida nima deyolasiz?'

            # Save user messages
            if images:
                for i, img in enumerate(images):
                    # Only the first message gets the actual text, others get empty or placeholder
                    msg_text = user_message if i == 0 else ""
                    ChatMessage.objects.create(topic=topic, role='user', content=msg_text, image=img)
            else:
                ChatMessage.objects.create(topic=topic, role='user', content=user_message)

            # Build history (last 10 messages)
            messages_objs = topic.messages.all().order_by('created_at')
            history_count = messages_objs.count()
            recent_msgs = messages_objs[max(0, history_count - 10):]

            history = []
            for m in recent_msgs:
                if m.image:
                    try:
                        base64_image = encode_image(m.image.path)
                        content = [
                            {"type": "text", "text": m.content if m.content else "Rasm"},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            }
                        ]
                    except Exception as e:
                        print(f"Image encoding error: {e}")
                        content = m.content
                else:
                    content = m.content
                
                history.append({"role": m.role, "content": content})

            if is_voice_mode:
                history.append({
                    "role": "system",
                    "content": "Javobingiz ovozli chat orqali o'qiladi. Iltimos, mutlaqo qisqa, londa va suhbatdosh sifatida, tabiiy tonda javob qaytaring. Keraksiz katta ro'yxatlar, belgilar va noqulay uzun matnlardan qoching."
                })

            # Get AI response
            user_mem_text = ""
            if hasattr(request.user, 'memory'):
                user_mem_text = request.user.memory.content
                
            ai_content = get_ai_response(history, user_memory=user_mem_text, is_voice_mode=is_voice_mode, is_search_mode=is_search_mode)

            # Save AI response
            ChatMessage.objects.create(topic=topic, role='assistant', content=ai_content)
            
            # Update Memory (Extract facts from this interaction)
            from .ai_utils import update_user_memory
            update_user_memory(request.user, user_message, ai_content)

            return JsonResponse({
                'topic_id': topic.id,
                'topic_title': topic.title,
                'reply': ai_content
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid request'}, status=400)


@login_required
@require_POST
def generate_image_view(request):
    try:
        data = json.loads(request.body.decode('utf-8') or '{}')
        prompt = data.get('prompt', '').strip()
        ratio = data.get('ratio', '1:1')
        count = int(data.get('count', 1))
        upscale = int(data.get('upscale', 4))
        topic_id = data.get('topic_id')

        if not prompt:
            return JsonResponse({'error': 'Prompt required'}, status=400)

        # 1. Quota Check
        is_allowed, remaining = check_image_quota(request.user, count)
        if not is_allowed:
            if remaining <= 0:
                return JsonResponse({'error': 'Kunlik rasm yaratish limitingiz (3 ta) tugagan. 24 soatdan keyin urinib ko\'ring! 🛡️'}, status=403)
            else:
                return JsonResponse({'error': f'Siz yana faqat {remaining} ta rasm yaratishingiz mumkin. 🛡️'}, status=403)

        # 2. Generate
        images = generate_image(prompt, ratio, count, upscale)

        # 3. Save to History and record quota
        if images:
            if topic_id:
                topic = get_object_or_404(ChatTopic, id=topic_id, user=request.user)
            else:
                topic, _ = ChatTopic.objects.get_or_create(user=request.user, title="AI Tasvirlar")

            from django.core.files.base import ContentFile
            import base64
            
            for i, img_b64 in enumerate(images):
                format, imgstr = img_b64.split(';base64,') if ';base64,' in img_b64 else (None, img_b64)
                ext = format.split('/')[-1] if format else 'png'
                data = ContentFile(base64.b64decode(imgstr), name=f'gen_{timezone.now().timestamp()}_{i}.{ext}')
                
                msg_content = f"AI tasvir yaratdi: **{prompt}**" if i == 0 else ""
                ChatMessage.objects.create(topic=topic, role='assistant', content=msg_content, image=data)

        return JsonResponse({'images': images})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@require_POST
def convert_to_anime_view(request):
    data = {}
    content_type = request.content_type or ''
    if content_type.startswith('multipart/'):
        data = request.POST
    else:
        try:
            data = json.loads(request.body.decode('utf-8') or '{}')
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON payload'}, status=400)

    image_file = request.FILES.get('image')
    gender = data.get('gender', 'Female')
    style = data.get('style', 'manga')
    ratio = data.get('ratio', '1:1')

    if image_file:
        image_input = image_file
    else:
        image_url = data.get('image_url', '').strip()
        if not image_url:
            return JsonResponse({'error': 'Image file or URL required'}, status=400)
        image_input = image_url

    try:
        anime_image = convert_to_anime(image_input, gender, style, ratio)
        return JsonResponse({'image': anime_image})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def register_view(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('index')
    else:
        form = UserCreationForm()
    return render(request, 'chat/register.html', {'form': form})

def login_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect('index')
    else:
        form = AuthenticationForm()
    return render(request, 'chat/login.html', {'form': form})

@login_required
def clear_history(request):
    ChatTopic.objects.filter(user=request.user).delete()
    return redirect('index')

def logout_view(request):
    logout(request)
    return redirect('login')


@login_required
def check_image_limit(request):
    is_pro = hasattr(request.user, 'profile') and request.user.profile.plan.lower() not in ['free', '']
    if is_pro:
        return JsonResponse({
            'count': 0,
            'limit_reached': False,
            'remaining': 9999,
            'minutes_remaining': 0
        })

    last_24h = timezone.now() - timedelta(hours=24)
    user_imgs = ChatMessage.objects.filter(
        topic__user=request.user,
        created_at__gte=last_24h
    ).exclude(image__exact='').exclude(image__isnull=True).order_by('created_at')
    
    img_count = user_imgs.count()
    minutes_remaining = 0
    
    if img_count >= 3:
        oldest = user_imgs.first()
        if oldest:
            reset_at = oldest.created_at + timedelta(hours=24)
            diff = reset_at - timezone.now()
            minutes_remaining = max(0, int(diff.total_seconds() / 60))
    
    return JsonResponse({
        'count': img_count,
        'limit_reached': img_count >= 3,
        'remaining': max(0, 3 - img_count),
        'minutes_remaining': minutes_remaining
    })

import os
from django.conf import settings
try:
    from gtts import gTTS
except ImportError:
    import sys
    import subprocess
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "gTTS"])
        from gtts import gTTS
    except Exception as e:
        gTTS = None
        print("Failed to auto-install gTTS:", e)

@login_required
@csrf_exempt
def get_tts_audio(request):
    if request.method == 'POST':
        try:
            import urllib.request
            import urllib.parse
            import re
            
            data = json.loads(request.body)
            text = data.get('text', '').strip()
            if not text:
                return HttpResponse(status=400)

            # Clean text (remove markdown tools like ** etc for better reading)
            clean_text = text.replace('*', '').replace('#', '').replace('_', '')
            
            sentences = re.split(r'([.,!?\n]+)', clean_text)
            chunks = []
            curr = ""
            for s in sentences:
                if len(curr) + len(s) < 180:
                    curr += s
                else:
                    if curr.strip(): chunks.append(curr.strip())
                    curr = s
            if curr.strip(): chunks.append(curr.strip())
            
            final_audio = b''
            for c in chunks:
                if not c.strip(): continue
                url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl=uz&client=tw-ob&q={urllib.parse.quote(c)}"
                try:
                    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                    r = urllib.request.urlopen(req)
                    final_audio += r.read()
                except Exception as e:
                    print("TTS Proxy Error:", e)
                    
            return HttpResponse(final_audio, content_type="audio/mpeg")
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid request'}, status=400)
