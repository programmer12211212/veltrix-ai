/* 
  Veltrix AI - ULTRA PRO JS LOGIC (Multimodal Version)
*/

let currentTopicId = null;
let selectedImages = []; 
let lastUserMessage = "";
let isSearchModeActive = false;

const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const voiceModeBtn = document.getElementById('voiceModeBtn');
const msgContainer = document.getElementById('messagesContainer');
const historyList = document.getElementById('historyList');
const newChatBtn = document.getElementById('newChatBtn');
const imageInput = document.getElementById('imageInput');
const imagePreviewBox = document.getElementById('imagePreviewBox');
const plusMenu = document.getElementById('plusMenu');
const plusMenuBtn = document.getElementById('plusMenuBtn');
const imagePromptSection = document.getElementById('imagePromptSection');
const imagePrompt = document.getElementById('imagePrompt');
const sendImageBtn = document.getElementById('sendImageBtn');
const imageRatio = document.getElementById('imageRatio');
const imageCount = document.getElementById('imageCount');
const imageUpscale = document.getElementById('imageUpscale');

const animePromptSection = document.getElementById('animePromptSection');
const animeImageInput = document.getElementById('animeImageInput');
const sendAnimeBtn = document.getElementById('sendAnimeBtn');
const animeGender = document.getElementById('animeGender');
const animeStyle = document.getElementById('animeStyle');
const animeRatio = document.getElementById('animeRatio');

const API_GENERATE_IMAGE = '/generate-image/';
const API_CONVERT_TO_ANIME = '/convert-to-anime/';
const API_CHECK_IMAGE_LIMIT = '/check-image-limit/';

// Auto-resize textarea
if(userInput) {
    userInput.oninput = function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    };
    userInput.onfocus = () => userInput.closest('.input-box-wrapper').style.borderColor = 'var(--accent)';
    userInput.onblur = () => userInput.closest('.input-box-wrapper').style.borderColor = '';
    userInput.onkeypress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };
    
    // Nusxa olingan (Pasted) rasmlarni qabul qilish (Global)
    document.addEventListener('paste', (e) => {
        const data = e.clipboardData || window.clipboardData;
        if (!data) return;

        const items = data.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    addImages([blob]);
                }
            }
        }
    });
}

// Image selection
if(imageInput) {
    imageInput.onchange = function(e) {
        const files = Array.from(e.target.files);
        addImages(files);
        imageInput.value = ''; 
    };
}

// Keyboard Shortcut: Ctrl + Shift + U (Rasm/Fayl qo'shish)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        imageInput.click();
    }
});

// ==========================================
// VOICE: Speech-To-Text (Web Speech API)
// ==========================================
let recognition;
let isRecording = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'uz-UZ'; // O'zbek tili
    recognition.interimResults = true; // Jonli yozish
    recognition.continuous = false; // Bitta gapdan keyin to'xtaydi

    recognition.onstart = () => {
        isRecording = true;
        if(micBtn) micBtn.classList.add('listening');
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        
        if(userInput) {
            // Agar foydalanuvchi oldin nimanidir yozgan bo'lsa, davomidan qo'shadi
            const currentValue = userInput.value;
            // Biz faqat oxirgi final natijani qo'shamiz, yoki jonli ko'rsatamiz
            if(finalTranscript) {
                userInput.value = currentValue ? currentValue + ' ' + finalTranscript : finalTranscript;
                userInput.style.height = 'auto';
                userInput.style.height = (userInput.scrollHeight) + 'px';
            }
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        if(micBtn) micBtn.classList.remove('listening');
        isRecording = false;
        if(event.error === 'not-allowed') {
            addSystemMessage("Mikrofondan foydalanishga ruxsat berilmadi. Iltimos brauzer sozlamalarini tekshiring.");
        }
    };

    recognition.onend = () => {
        isRecording = false;
        if(micBtn) micBtn.classList.remove('listening');
        
        if(isVoiceModeActive) {
            if(userInput && userInput.value.trim() !== '') {
                sendMessage();
            } else {
                setTimeout(() => {
                    if (isVoiceModeActive && !isRecording) recognition.start();
                }, 800);
            }
        }
    };
} else {
    // Brauzer qo'llab quvvatlamasa
    if(micBtn) {
        micBtn.style.display = 'none';
        console.warn('Speech recognition xizmati brauzeringiz tomonidan qo\'llab quvvatlanmaydi.');
    }
}

if(micBtn) {
    micBtn.addEventListener('click', () => {
        if(!recognition) return;
        
        if(isRecording) {
            recognition.stop();
        } else {
            // Yangi gap boshlashdan oldin
            recognition.start();
        }
    });
}

let isVoiceModeActive = false;
let currentAudio = null;

if(voiceModeBtn) {
    voiceModeBtn.addEventListener('click', () => {
        isVoiceModeActive = !isVoiceModeActive;
        if(isVoiceModeActive) {
            voiceModeBtn.classList.add('active');
            addSystemMessage("Uzluksiz Ovozli Suhbat (Voice Chat) yoqildi. Gapirishingiz mumkin! 🎧");
            if(recognition && !isRecording) recognition.start();
        } else {
            voiceModeBtn.classList.remove('active');
            addSystemMessage("Voice Chat o'chirildi. 🛑");
            if(recognition && isRecording) recognition.stop();
            if(currentAudio) {
                currentAudio.pause();
                currentAudio = null;
            }
        }
    });
}

let isImageLimitReached = false;
let imageLimitMinutesRemaining = 0;

// Initial check
window.addEventListener('DOMContentLoaded', updateImageLimitStatus);

// Attach event listeners for generation buttons
if (sendImageBtn) {
    sendImageBtn.onclick = generateImage;
}
if (sendAnimeBtn) {
    sendAnimeBtn.onclick = convertToAnime;
}

async function updateImageLimitStatus() {
    try {
        if (typeof API_CHECK_IMAGE_LIMIT === 'undefined') return;
        const res = await fetch(API_CHECK_IMAGE_LIMIT);
        const data = await res.json();
        isImageLimitReached = data.limit_reached;
        imageLimitMinutesRemaining = data.minutes_remaining || 0;
        const plusImageBtn = document.getElementById('plusImageBtn');
        if (plusImageBtn) {
            plusImageBtn.style.display = isImageLimitReached ? 'none' : 'flex';
        }
    } catch (e) {
        console.error('Limit check error:', e);
    }
}

// Initial check
window.addEventListener('DOMContentLoaded', updateImageLimitStatus);

function openImagePrompt() {
    if (!imagePromptSection || !imagePrompt) return;
    closeAnimePrompt();
    imagePromptSection.style.display = 'flex';
    imagePrompt.focus();
}

function openAnimePrompt() {
    if (!animePromptSection) return;
    closeImagePrompt();
    animePromptSection.style.display = 'flex';
}

function closeImagePrompt() {
    if (!imagePromptSection || !imagePrompt) return;
    imagePromptSection.style.display = 'none';
    imagePrompt.value = '';
}

function closeAnimePrompt() {
    if (!animePromptSection) return;
    animePromptSection.style.display = 'none';
    animeImageInput.value = '';
}

async function generateImage() {
    if (!imagePrompt || !sendImageBtn) return;
    const prompt = imagePrompt.value.trim();
    if (!prompt) {
        addSystemMessage('Iltimos, rasm uchun tavsif kiriting.');
        return;
    }

    const loadingDiv = showLoading();
    sendImageBtn.disabled = true;
    closeImagePrompt();

    try {
        const response = await fetch(API_GENERATE_IMAGE, {
            method: 'POST',
            headers: {
                'X-CSRFToken': CSRF_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: prompt,
                ratio: imageRatio.value,
                count: parseInt(imageCount.value),
                upscale: parseInt(imageUpscale.value),
                topic_id: currentTopicId
            })
        });

        const data = await response.json();
        loadingDiv.remove();
        setLoadingState(false);
        sendImageBtn.disabled = false;

        if (!response.ok || !data.images) {
            throw new Error(data.error || 'Image generation failed');
        }

        appendMessage('user', prompt);
        data.images.forEach(imgBase64 => {
            appendMessage('assistant', '', `data:image/png;base64,${imgBase64}`);
        });
    } catch (error) {
        loadingDiv.remove();
        setLoadingState(false);
        sendImageBtn.disabled = false;
        addSystemMessage(error.message || 'Rasm yaratishda xatolik yuz berdi.');
    }
}

async function convertToAnime() {
    if (!animeImageInput || !sendAnimeBtn) return;
    const file = animeImageInput.files[0];
    if (!file) {
        addSystemMessage('Iltimos, rasm tanlang.');
        return;
    }

    const loadingDiv = showLoading();
    sendAnimeBtn.disabled = true;
    closeAnimePrompt();

    try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('gender', animeGender.value);
        formData.append('style', animeStyle.value);
        formData.append('ratio', animeRatio.value);
        if (currentTopicId) formData.append('topic_id', currentTopicId);

        const response = await fetch(API_CONVERT_TO_ANIME, {
            method: 'POST',
            headers: {
                'X-CSRFToken': CSRF_TOKEN
            },
            body: formData
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Server error: ${response.status} ${errorBody}`);
        }

        const data = await response.json();
        loadingDiv.remove();
        setLoadingState(false);
        sendAnimeBtn.disabled = false;

        if (!data.image) {
            throw new Error(data.error || 'Anime conversion failed');
        }

        appendMessage('user', 'Image to Anime conversion', URL.createObjectURL(file));
        appendMessage('assistant', '', `data:image/png;base64,${data.image}`);
    } catch (error) {
        loadingDiv.remove();
        setLoadingState(false);
        sendAnimeBtn.disabled = false;
        addSystemMessage(error.message || 'Anime conversion failed');
    }
}

function addImages(files) {
    if (isImageLimitReached) {
        const mins = imageLimitMinutesRemaining;
        let timeMsg = '';
        if (mins <= 0) {
            timeMsg = 'Biroz kutib qayta urinib ko\'ring';
        } else if (mins < 60) {
            timeMsg = `${mins} daqiqadan keyin`;
        } else {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            timeMsg = m > 0 ? `${h} soat ${m} daqiqadan keyin` : `${h} soatdan keyin`;
        }
        addSystemMessage(`Sizning kundlik rasm yaratish limitingiz (3 ta) tugagan. Iltimos, ${timeMsg} urinib ko'ring! 🛡️`);
        return;
    }
    for (const file of files) {
        if (selectedImages.length >= 3) {
            addSystemMessage("Faqat 3 tagacha rasm yuklash mumkin.");
            break;
        }
        if (!file.type.startsWith('image/')) continue;
        selectedImages.push(file);
    }
    renderImagePreviews();
}

function renderImagePreviews() {
    if(!imagePreviewBox) return;
    imagePreviewBox.innerHTML = '';
    if (selectedImages.length === 0) {
        imagePreviewBox.style.display = 'none';
        return;
    }

    selectedImages.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            previewItem.innerHTML = `
                <img src="${ev.target.result}">
                <button class="remove-img-btn" title="Oʻchirish">✕</button>
            `;
            previewItem.querySelector('.remove-img-btn').onclick = () => { 
                selectedImages.splice(index, 1); 
                renderImagePreviews(); 
            };
            imagePreviewBox.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
    imagePreviewBox.style.display = 'flex';
}

if(newChatBtn) {
    newChatBtn.onclick = () => {
        currentTopicId = null;
        msgContainer.innerHTML = `<div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--text-muted); opacity: 0.8;"><div style="width: 80px; height: 80px; background: hsla(250, 89%, 64%, 0.1); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin-bottom: 2rem;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div><h2 style="font-size: 1.5rem; color: white; margin-bottom: 0.5rem;">Qanday yordam bera olaman?</h2><p style="font-size: 0.9rem; max-width: 400px; line-height: 1.6;">Istagan savolingizni bering yoki kod yozishda yordam so'rang.</p></div>`;
        document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.remove('open');
        }
    };
}

let currentAbortController = null;
const SEND_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
const STOP_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="4" y="4" width="16" height="16" rx="3"></rect></svg>`;

function setLoadingState(isLoading) {
    if(!sendBtn) return;
    if (isLoading) {
        sendBtn.innerHTML = STOP_ICON;
        userInput.disabled = true;
    } else {
        sendBtn.innerHTML = SEND_ICON;
        userInput.disabled = false;
        userInput.focus();
        currentAbortController = null;
    }
}

async function sendMessage() {
    console.log('sendMessage called');
    const text = userInput.value.trim();
    console.log('text:', text, 'selectedImages:', selectedImages.length);
    if (!text && selectedImages.length === 0) {
        console.log('No text or images, returning');
        return;
    }

    const welcome = msgContainer.querySelector('h2')?.closest('div');
    if (welcome) welcome.remove();

    const imagesToUpload = [...selectedImages];
    if (imagesToUpload.length > 0) {
        imagesToUpload.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => appendMessage('user', (index === 0 ? text : ''), e.target.result);
            reader.readAsDataURL(file);
        });
    } else {
        appendMessage('user', text);
    }
    lastUserMessage = text;
    userInput.value = '';
    userInput.style.height = 'auto';
    selectedImages = [];
    renderImagePreviews();
    imageInput.value = '';

    const loadingDiv = showLoading();
    currentAbortController = new AbortController();
    setLoadingState(true);

    try {
        let response;
        if (imagesToUpload.length > 0) {
            const formData = new FormData();
            formData.append('message', text);
            formData.append('is_voice_mode', isVoiceModeActive);
            formData.append('is_search_mode', isSearchModeActive);
            if (currentTopicId) formData.append('topic_id', currentTopicId);
            imagesToUpload.forEach(file => formData.append('image', file));
            response = await fetch(API_CHAT, { method: 'POST', headers: { 'X-CSRFToken': CSRF_TOKEN }, body: formData, signal: currentAbortController.signal });
        } else {
            response = await fetch(API_CHAT, { method: 'POST', headers: { 'X-CSRFToken': CSRF_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ 
                message: text, 
                topic_id: currentTopicId, 
                is_voice_mode: isVoiceModeActive,
                is_search_mode: isSearchModeActive 
            }), signal: currentAbortController.signal });
        }

        const data = await response.json();
        loadingDiv.remove();
        setLoadingState(false);

        if (data.error) {
            addSystemMessage(data.error);
            return;
        }

        if (data.reply) {
            if (!currentTopicId && data.topic_id) {
                currentTopicId = data.topic_id;
                addNewHistoryItem(data.topic_id, data.topic_title);
            }
            appendMessage('assistant', data.reply);
            
            if (isVoiceModeActive) {
                try {
                    const ttsResponse = await fetch('/get-tts-audio/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': CSRF_TOKEN
                        },
                        body: JSON.stringify({text: data.reply})
                    });
                    
                    const blob = await ttsResponse.blob();
                    const url = URL.createObjectURL(blob);
                    
                    if (currentAudio) {
                        currentAudio.pause();
                    }
                    currentAudio = new Audio(url);
                    
                    currentAudio.onended = () => {
                        URL.revokeObjectURL(url);
                        // Reset mobile overlay state to listening
                        if (typeof window._mobileVoiceSetState === 'function') window._mobileVoiceSetState('listening');
                        if (isVoiceModeActive && recognition && !isRecording) setTimeout(() => recognition.start(), 300);
                    };
                    
                    currentAudio.onerror = (e) => {
                        URL.revokeObjectURL(url);
                        console.error('Audio play error:', e);
                        if (typeof window._mobileVoiceSetState === 'function') window._mobileVoiceSetState('idle');
                        if (isVoiceModeActive && recognition && !isRecording) setTimeout(() => recognition.start(), 1000);
                    };

                    currentAudio.play().catch(e => {
                        URL.revokeObjectURL(url);
                        console.error('Audio play exception:', e);
                        if (typeof window._mobileVoiceSetState === 'function') window._mobileVoiceSetState('idle');
                        if (isVoiceModeActive && recognition && !isRecording) setTimeout(() => recognition.start(), 1000);
                    });

                } catch (e) {
                    console.error("TTS Error:", e);
                    if (isVoiceModeActive && recognition && !isRecording) setTimeout(() => recognition.start(), 1000);
                }
            }
        }
        
        // Update image limit status after every message
        updateImageLimitStatus();
    } catch (e) {
        console.error('SendMessage error:', e);
        loadingDiv.remove();
        setLoadingState(false);
        addSystemMessage("Server bilan bog'lanishda xatolik yuz berdi.");
    }
}

// Core interaction logic finalized

function appendMessage(role, content, imageDataUrl = null) {
    const node = document.createElement('div');
    node.className = `message-node ${role}-message`;
    const avatar = document.createElement('div');
    avatar.className = `avatar ${role === 'user' ? 'user-avatar' : 'ai-avatar'}`;
    avatar.textContent = role === 'user' ? USER_INITIAL : 'AI';
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    if (imageDataUrl) contentDiv.innerHTML += `<img src="${imageDataUrl}" style="max-width: 300px; border-radius: 12px; margin-bottom: 15px; display: block; box-shadow: var(--shadow-sm);">`;
    if (content) {
        const span = document.createElement('span');
        
        // Simple pre-processing for MathJax to prevent marked from messing up some math formulations
        let processedContent = content;
        if (processedContent) {
            processedContent = processedContent.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');
            processedContent = processedContent.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
        }
        
        span.innerHTML = typeof marked !== 'undefined' ? marked.parse(processedContent) : processedContent;
        

        contentDiv.appendChild(span);
        
        if (window.MathJax) {
            MathJax.typesetPromise([span]).catch((err) => console.error(err));
        }
    }
    // Quick actions (Top Right)
    const quickActions = document.createElement('div');
    quickActions.className = 'message-quick-actions';
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-quick-action';
    copyBtn.title = 'Nusxa olish';
    copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    copyBtn.onclick = () => copyToClipboard(content, copyBtn);
    quickActions.appendChild(copyBtn);
    node.appendChild(quickActions);

    const actions = document.createElement('div');
    actions.className = 'message-actions';
    
    if (role === 'assistant') {
        const regenBtn = document.createElement('button');
        regenBtn.className = 'btn-message-action';
        regenBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> <span>Qayta</span>`;
        regenBtn.onclick = () => regenerateChat();
        actions.appendChild(regenBtn);
        contentDiv.appendChild(actions);
    }



    node.appendChild(avatar);
    node.appendChild(contentDiv);
    msgContainer.appendChild(node);
    msgContainer.scrollTo({ top: msgContainer.scrollHeight, behavior: 'smooth' });

    // Notify mobile voice overlay
    if (typeof window._mobileVoiceInterceptAppend === 'function') {
        window._mobileVoiceInterceptAppend(role, content);
    }
}

function showLoading() {
    const node = document.createElement('div');
    node.className = 'message-node ai-message';
    node.innerHTML = `<div class="avatar ai-avatar">AI</div><div class="message-content"><div class="typing-dots" style="display:flex; gap:4px; padding:10px 0;"><div class="dot" style="width:6px; height:6px; background:var(--accent); border-radius:50%; animation: blink 1.2s infinite both;"></div><div class="dot" style="width:6px; height:6px; background:var(--accent); border-radius:50%; animation: blink 1.2s infinite both 0.2s;"></div><div class="dot" style="width:6px; height:6px; background:var(--accent); border-radius:50%; animation: blink 1.2s infinite both 0.4s;"></div></div></div>`;
    msgContainer.appendChild(node);
    msgContainer.scrollTo({ top: msgContainer.scrollHeight, behavior: 'smooth' });
    return node;
}

function addSystemMessage(text) {
    appendMessage('assistant', `⚠️ ${text}`);
}

function addNewHistoryItem(id, title) {
    let todayGroup = null;
    document.querySelectorAll('.history-group').forEach(g => { if (g.querySelector('.history-group-header')?.textContent.trim() === 'Bugun') todayGroup = g; });
    const item = document.createElement('div');
    item.className = 'history-item active';
    item.dataset.id = id;
    item.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> ${title}`;
    item.onclick = () => {
        loadTopic(id, item);
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.remove('open');
        }
    };
    if (todayGroup) { todayGroup.querySelector('.history-group-header').insertAdjacentElement('afterend', item); } 
    else {
        const group = document.createElement('div'); group.className = 'history-group'; group.innerHTML = `<p class="history-group-header">Bugun</p>`; group.appendChild(item);
        historyList.prepend(group);
        const emptyMsg = historyList.querySelector('p[style*="text-align: center"]'); if (emptyMsg) emptyMsg.remove();
    }
}

async function loadTopic(id, element) {
    currentTopicId = id;
    document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
    element.classList.add('active');
    msgContainer.innerHTML = '';
    try {
        const res = await fetch(`${API_GET_MSG}${id}/`);
        const data = await res.json();
        data.messages.forEach(m => appendMessage(m.role, m.content, m.image || null));
    } catch (e) { console.error(e); }
}

window.clearHistory = () => { if (confirm("Suhbatlar tarixi o'chirilsinmi?")) window.location.href = URL_CLEAR_HISTORY; };
window.toggleSidebar = () => document.getElementById('sidebar').classList.toggle('open');
window.togglePlusMenu = (e, show) => {
    const menu = document.getElementById('plusMenu');
    if (!menu) return;
    
    if (typeof show === 'boolean') {
        if (show) {
            menu.style.display = 'flex';
            setTimeout(() => menu.classList.add('show'), 10);
        } else {
            menu.classList.remove('show');
            // Wait for animation on mobile
            if (window.innerWidth <= 768) {
                setTimeout(() => { if(!menu.classList.contains('show')) menu.style.display = 'none'; }, 300);
            } else {
                menu.style.display = 'none';
            }
        }
    } else {
        const isVisible = menu.classList.contains('show');
        if (isVisible) {
            window.togglePlusMenu(null, false);
        } else {
            window.togglePlusMenu(null, true);
        }
    }
};

document.addEventListener('click', (e) => {
    const menu = document.getElementById('plusMenu');
    const btn = document.getElementById('plusMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.querySelector('.mobile-menu-btn');

    // Close Plus Menu if clicked outside
    if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
        togglePlusMenu(null, false);
    }

    // Close Sidebar if clicked outside on mobile
    if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && (!menuBtn || !menuBtn.contains(e.target))) {
            sidebar.classList.remove('open');
        }
    }
});


// Set up event handlers after all functions are defined
console.log('Setting up event handlers...');

if (sendImageBtn) {
    sendImageBtn.onclick = generateImage;
    console.log('sendImageBtn handler set');
} else {
    console.log('sendImageBtn not found');
}

if (sendAnimeBtn) {
    sendAnimeBtn.onclick = convertToAnime;
    console.log('sendAnimeBtn handler set');
} else {
    console.log('sendAnimeBtn not found');
}

if (sendBtn) {
    sendBtn.onclick = sendMessage;
    console.log('sendBtn handler set');
} else {
    console.log('sendBtn not found');
}

if (plusMenuBtn) {
    plusMenuBtn.onclick = (e) => {
        console.log('plusMenuBtn clicked');
        e.stopPropagation();
        togglePlusMenu(e);
    };
    console.log('plusMenuBtn handler set');
} else {
    console.log('plusMenuBtn not found');
}

// Bind existing history items on load
document.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        if (id) {
            loadTopic(id, this);
            // Auto close sidebar on mobile
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.classList.remove('open');
            }
        }
    });
});

if (imagePrompt) {
    imagePrompt.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            generateImage();
        }
    });
    console.log('imagePrompt keypress handler set');
} else {
    console.log('imagePrompt not found');
}

// About Modal Logic
const aboutBtn = document.getElementById('aboutBtn');
const aboutModal = document.getElementById('aboutModal');
const closeModal = document.getElementById('closeModal');

function openModal() {
    aboutModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModalFunc() {
    aboutModal.classList.remove('show');
    document.body.style.overflow = '';
}

if (aboutBtn) {
    aboutBtn.addEventListener('click', openModal);
}

if (closeModal) {
    closeModal.addEventListener('click', closeModalFunc);
}

if (aboutModal) {
    aboutModal.addEventListener('click', (e) => {
        if (e.target === aboutModal) {
            closeModalFunc();
        }
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && aboutModal.classList.contains('show')) {
        closeModalFunc();
    }
});

// Pricing Modal Logic
const offerBadge = document.getElementById('offerBadge');
const pricingModal = document.getElementById('pricingModal');
const closePricingModal = document.getElementById('closePricingModal');
const toggleBtns = document.querySelectorAll('.pricing-toggle-btn');

function openPricingModal() {
    if (!pricingModal) return;
    pricingModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closePricingModalFunc() {
    if (!pricingModal) return;
    pricingModal.classList.remove('show');
    document.body.style.overflow = '';
}

if (offerBadge) {
    offerBadge.addEventListener('click', openPricingModal);
}

if (closePricingModal) {
    closePricingModal.addEventListener('click', closePricingModalFunc);
}

if (pricingModal) {
    pricingModal.addEventListener('click', (e) => {
        if (e.target === pricingModal) {
            closePricingModalFunc();
        }
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pricingModal.classList.contains('show')) {
        closePricingModalFunc();
    }
});

// Checkout Modal Logic
const checkoutModal = document.getElementById('checkoutModal');
const goToCheckoutBtn = document.getElementById('goToCheckoutBtn');
const goToPlusCheckoutBtn = document.getElementById('goToPlusCheckoutBtn');
const backToPricing = document.getElementById('backToPricing');
const closeCheckoutModal = document.getElementById('closeCheckoutModal');

const checkoutHeaderText = document.getElementById('checkoutHeaderText');
const checkoutPlanName = document.getElementById('checkoutPlanName');
const checkoutFeaturesList = document.getElementById('checkoutFeaturesList');
const checkoutPricingDetails = document.getElementById('checkoutPricingDetails');

const plansData = {
    go: {
        title: 'Настройте свой план',
        name: 'План Go',
        features: [
            { icon: 'm13 2-2 2.5h3L12 11l7-4.5-1.5 8H20l-7 7.5 2-3h-3l2-6.5-7 4.5z', text: 'Более разумные и быстрые ответы с Veltrix AI' },
            { icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', text: 'Больше сообщений и загрузок' },
            { icon: 'M3 3h18v18H3z', isRect: true, text: 'Создавайте больше изображений быстрее' },
            { icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', text: 'Дополнительная память и контекст' }
        ],
        pricing: [
            { label: 'Подписка Ежемесячно', value: '5,00 $' },
            { label: 'Расчетный налог', value: '0,00 $' }
        ],
        total: '5,00 $'
    },
    plus: {
        title: 'Начните бесплатную пробную версию Plus',
        name: 'План Plus',
        features: [
            { icon: 'M20 6L9 17l-5-5', text: 'Отменить в любое время' },
            { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', text: 'Мы напомним vam ob etom do okonchaniya probnogo perioda' },
            { icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', text: 'Rashirennoe kolichestvo soobsheniy i zagruzok' },
            { icon: 'M19 11v6m0 0l-1.5-1.5m1.5 1.5l1.5-1.5M5 8h14l-7 12-7-12z', text: 'Bolshe vozmojnostey dlya sozdaniya izobrajeniy, bolee bistraya zagruzka' },
            { icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.386l-.548-.547z', text: 'Rashirennie glubokie issledovaniya i rejim agenta' }
        ],
        pricing: [
            { label: 'Подписка Ежемесячно', value: '20,00 $' },
            { label: 'Акция', value: '-20,00 $', color: '#8b5cf6', sub: 'Скидка 100% за месяц' },
            { label: 'Расчетный налог', value: '0,00 $' }
        ],
        total: '0,00 $'
    },
    pro: {
        title: 'Настройте свой план',
        name: 'План Pro',
        features: [
            { icon: 'm13 2-2 2.5h3L12 11l7-4.5-1.5 8H20l-7 7.5 2-3h-3l2-6.5-7 4.5z', text: 'В 5 раз больше объем использования, чем с планом Plus' },
            { icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', text: 'Модель Frontier Pro' },
            { icon: 'M16 18l6-6-6-6M8 6l-6 6 6 6', text: 'Агент для написания кода Codex' },
            { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', text: 'Ранний доступ к экспериментальным функциям' }
        ],
        promo: {
            icon: 'm13 2-2 2.5h3L12 11l7-4.5-1.5 8H20l-7 7.5 2-3h-3l2-6.5-7 4.5z',
            text: 'Now until 31 мая, enjoy 10x more Codex usage than Plus.'
        },
        tiers: [
            { id: 'pro-5x', title: 'В 5 раз больше использования, чем Plus', price: '100 $', monthly: '100,00 $' },
            { id: 'pro-20x', title: 'В 20 раз больше использования, чем Plus', price: '200 $', monthly: '200,00 $' }
        ],
        total: '100,00 $'
    }
};

const goToProCheckoutBtn = document.getElementById('goToProCheckoutBtn');
const checkoutTierSelection = document.getElementById('checkoutTierSelection');
let currentProTier = 'pro-5x';

function openCheckoutModal(planType) {
    if (!checkoutModal) return;
    const data = plansData[planType];
    if (!data) return;

    // Handle Tier Selection visibility
    if (planType === 'pro') {
        renderTierSelection(data);
        checkoutTierSelection.classList.add('show');
    } else {
        checkoutTierSelection.classList.remove('show');
        checkoutTierSelection.innerHTML = '';
    }

    updateCheckoutSummary(planType);

    if (pricingModal) pricingModal.classList.remove('show');
    checkoutModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function renderTierSelection(data) {
    checkoutTierSelection.innerHTML = `
        <h4>Детали плана</h4>
        <div class="tier-cards-grid">
            ${data.tiers.map(t => `
                <div class="tier-card ${t.id === currentProTier ? 'active' : ''}" onclick="selectProTier('${t.id}')">
                    <h5>${t.title}</h5>
                    <p>${t.price} в месяц</p>
                </div>
            `).join('')}
        </div>
    `;
}

window.selectProTier = function(tierId) {
    currentProTier = tierId;
    renderTierSelection(plansData.pro);
    updateCheckoutSummary('pro');
};

function updateCheckoutSummary(planType) {
    const data = plansData[planType];
    let features = data.features;
    let pricing = [...data.pricing || []];
    let total = data.total;
    let headerText = data.title;

    if (planType === 'pro') {
        const tier = data.tiers.find(t => t.id === currentProTier);
        pricing = [
            { label: 'Подписка Ежемесячно', value: tier.monthly },
            { label: 'Расчетный налог', value: '0,00 $' }
        ];
        total = tier.monthly;
    }

    checkoutHeaderText.textContent = headerText;
    checkoutPlanName.textContent = data.name;

    // Promo Alert
    const promoHtml = data.promo ? `
        <div class="promo-alert">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${data.promo.icon}"></path></svg>
            <p>${data.promo.text}</p>
        </div>
    ` : '';

    checkoutFeaturesList.innerHTML = features.map(f => `
        <li>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5865f2" stroke-width="2">
                ${f.isRect ? `<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>` : `<path d="${f.icon}"></path>`}
            </svg>
            ${f.text}
        </li>
    `).join('');

    checkoutPricingDetails.innerHTML = promoHtml + pricing.map(p => `
        <div class="price-row" style="${p.color ? `color: ${p.color};` : ''}">
            <div style="display: flex; flex-direction: column;">
                <span>${p.label}</span>
                ${p.sub ? `<span style="font-size: 11px; opacity: 0.7;">${p.sub}</span>` : ''}
            </div>
            <span>${p.value}</span>
        </div>
    `).join('') + `
        <div class="price-total">
            <span>К оплате сегодня</span>
            <span>${total}</span>
        </div>
    `;

    // Update Link Modal Pay Button text
    const btnLinkPayAmount = document.getElementById('btnLinkPayAmount');
    if (btnLinkPayAmount) {
        btnLinkPayAmount.textContent = `Оплатить ${total}`;
    }
}

function closeCheckoutModalFunc() {
    if (!checkoutModal) return;
    checkoutModal.classList.remove('show');
    document.body.style.overflow = '';
}

function handleBackToPricing() {
    if (!checkoutModal || !pricingModal) return;
    checkoutModal.classList.remove('show');
    pricingModal.classList.add('show');
}

if (goToCheckoutBtn) {
    goToCheckoutBtn.addEventListener('click', () => openCheckoutModal('go'));
}

if (goToPlusCheckoutBtn) {
    goToPlusCheckoutBtn.addEventListener('click', () => openCheckoutModal('plus'));
}

if (goToProCheckoutBtn) {
    goToProCheckoutBtn.addEventListener('click', () => openCheckoutModal('pro'));
}


if (backToPricing) {
    backToPricing.addEventListener('click', handleBackToPricing);
}

if (closeCheckoutModal) {
    closeCheckoutModal.addEventListener('click', closeCheckoutModalFunc);
}

if (checkoutModal) {
    checkoutModal.addEventListener('click', (e) => {
        if (e.target === checkoutModal) {
            closeCheckoutModalFunc();
        }
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && checkoutModal && checkoutModal.classList.contains('show')) {
        closeCheckoutModalFunc();
    }
    if (e.key === 'Escape' && linkModal && linkModal.classList.contains('show')) {
        closeLinkModalFunc();
    }
});

// Link Modal Logic
const linkModal = document.getElementById('linkModal');
const closeLinkModal = document.getElementById('closeLinkModal');
const stripeLinkBtns = document.querySelectorAll('.stripe-link-btn');

function openLinkModal() {
    if (!linkModal) return;
    linkModal.classList.add('show');
    // keep checkoutModal open in background or hide? 
    // Usually Stripe Link opens over the checkout.
}

function closeLinkModalFunc() {
    if (!linkModal) return;
    linkModal.classList.remove('show');
}

stripeLinkBtns.forEach(btn => {
    btn.onclick = () => openLinkModal();
});

if (closeLinkModal) {
    closeLinkModal.onclick = () => closeLinkModalFunc();
}

if (linkModal) {
    linkModal.addEventListener('click', (e) => {
        if (e.target === linkModal) {
            closeLinkModalFunc();
        }
    });
}

// Card Input Masking
const cardNumberInput = document.getElementById('cardNumber');
const cardExpiryInput = document.getElementById('cardExpiry');
const cardCvcInput = document.getElementById('cardCvc');

if (cardNumberInput) {
    cardNumberInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, ''); // Facat sonlar
        let formattedValue = value.match(/.{1,4}/g)?.join(' ') || '';
        e.target.value = formattedValue.substring(0, 19); // 16 raqam + 3 bo'shliq
    });
}

if (cardExpiryInput) {
    cardExpiryInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 2) {
            e.target.value = value.substring(0, 2) + ' / ' + value.substring(2, 4);
        } else {
            e.target.value = value;
        }
    });
}

if (cardCvcInput) {
    cardCvcInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
    });
}

// Link Country Dropdown & Phone Masking
const countrySelectToggle = document.getElementById('countrySelectToggle');
const countryDropdown = document.getElementById('countryDropdown');
const selectedFlag = document.getElementById('selectedFlag');
const selectedCode = document.getElementById('selectedCode');
const linkPhoneInput = document.getElementById('linkPhoneInput');

const countries = [
    { name: 'Uzbekistan', code: '+998', iso: 'uz' },
    { name: 'Argentina', code: '+54', iso: 'ar' },
    { name: 'Armenia', code: '+374', iso: 'am' },
    { name: 'Australia', code: '+61', iso: 'au' },
    { name: 'Azerbaijan', code: '+994', iso: 'az' },
    { name: 'Bangladesh', code: '+880', iso: 'bd' },
    { name: 'Brazil', code: '+55', iso: 'br' },
    { name: 'Canada', code: '+1', iso: 'ca' },
    { name: 'China', code: '+86', iso: 'cn' },
    { name: 'Denmark', code: '+45', iso: 'dk' },
    { name: 'Egypt', code: '+20', iso: 'eg' },
    { name: 'France', code: '+33', iso: 'fr' },
    { name: 'Georgia', code: '+995', iso: 'ge' },
    { name: 'Germany', code: '+49', iso: 'de' },
    { name: 'India', code: '+91', iso: 'in' },
    { name: 'Indonesia', code: '+62', iso: 'id' },
    { name: 'Israel', code: '+972', iso: 'il' },
    { name: 'Italy', code: '+39', iso: 'it' },
    { name: 'Japan', code: '+81', iso: 'jp' },
    { name: 'Kazakhstan', code: '+7', iso: 'kz' },
    { name: 'Kyrgyzstan', code: '+996', iso: 'kg' },
    { name: 'Malaysia', code: '+60', iso: 'my' },
    { name: 'Mexico', code: '+52', iso: 'mx' },
    { name: 'Netherlands', code: '+31', iso: 'nl' },
    { name: 'Norway', code: '+47', iso: 'no' },
    { name: 'Pakistan', code: '+92', iso: 'pk' },
    { name: 'Philippines', code: '+63', iso: 'ph' },
    { name: 'Poland', code: '+48', iso: 'pl' },
    { name: 'Portugal', code: '+351', iso: 'pt' },
    { name: 'Qatar', code: '+974', iso: 'qa' },
    { name: 'Russia', code: '+7', iso: 'ru' },
    { name: 'Saudi Arabia', code: '+966', iso: 'sa' },
    { name: 'Singapore', code: '+65', iso: 'sg' },
    { name: 'South Korea', code: '+82', iso: 'kr' },
    { name: 'Spain', code: '+34', iso: 'es' },
    { name: 'Sweden', code: '+46', iso: 'se' },
    { name: 'Switzerland', code: '+41', iso: 'ch' },
    { name: 'Tajikistan', code: '+992', iso: 'tj' },
    { name: 'Thailand', code: '+66', iso: 'th' },
    { name: 'Turkey', code: '+90', iso: 'tr' },
    { name: 'UAE', code: '+971', iso: 'ae' },
    { name: 'UK', code: '+44', iso: 'gb' },
    { name: 'USA', code: '+1', iso: 'us' },
    { name: 'Ukraine', code: '+380', iso: 'ua' },
    { name: 'Vietnam', code: '+84', iso: 'vn' }
];

function renderCountries() {
    if (!countryDropdown) return;
    countryDropdown.innerHTML = countries.map(c => `
        <div class="country-option" data-code="${c.code}" data-flag="https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.5.0/flags/4x3/${c.iso}.svg">
            <img src="https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.5.0/flags/4x3/${c.iso}.svg" width="20" alt="${c.name}">
            <span>${c.name} (${c.code})</span>
        </div>
    `).join('');

    // Re-attach listeners after rendering
    document.querySelectorAll('.country-option').forEach(option => {
        option.onclick = () => {
            const code = option.getAttribute('data-code');
            const flag = option.getAttribute('data-flag');
            selectedFlag.src = flag;
            selectedCode.textContent = code;
            countryDropdown.classList.remove('show');
        };
    });
}

if (countrySelectToggle) {
    countrySelectToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        countryDropdown.classList.toggle('show');
    });
}

// Initial render
renderCountries();

document.addEventListener('click', () => {
    if (countryDropdown) countryDropdown.classList.remove('show');
});

if (linkPhoneInput) {
    linkPhoneInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, ''); // Faqat sonlar
    });
}

// ==========================================
// MOBILE VOICE CHAT OVERLAY LOGIC
// ==========================================
(function() {
    if (window.innerWidth > 768) return; // Only on mobile

    const mobileVoiceUI      = document.getElementById('mobileVoiceUI');
    const mobileBottomBar    = document.getElementById('mobileBottomBar');
    const mobileLaunchBtn    = document.getElementById('mobileLaunchVoiceBtn');
    const mobileVoiceBigBtn  = document.getElementById('mobileVoiceBigBtn');
    const mobileVoiceClose   = document.getElementById('mobileVoiceClose');
    const mobileVoiceRing    = document.getElementById('mobileVoiceRing');
    const mobileVoiceStatus  = document.getElementById('mobileVoiceStatus');
    const mobileVoiceMessages= document.getElementById('mobileVoiceMessages');

    if (!mobileVoiceUI || !mobileLaunchBtn) return;

    function addMobileMsg(role, text) {
        // Remove hint if present
        const hint = mobileVoiceMessages.querySelector('.mobile-voice-hint');
        if (hint) hint.remove();

        const div = document.createElement('div');
        div.className = `mobile-voice-msg ${role}`;
        div.textContent = text;
        mobileVoiceMessages.appendChild(div);
        mobileVoiceMessages.scrollTop = mobileVoiceMessages.scrollHeight;
    }

    function setMobileState(state) {
        mobileVoiceRing.classList.remove('listening');
        mobileVoiceBigBtn.classList.remove('recording', 'playing');

        if (state === 'listening') {
            mobileVoiceRing.classList.add('listening');
            mobileVoiceBigBtn.classList.add('recording');
            mobileVoiceStatus.textContent = 'Eshitilyapti... 🎙️';
        } else if (state === 'thinking') {
            mobileVoiceStatus.textContent = 'Veltrix AI o\'ylayapti... 💭';
        } else if (state === 'playing') {
            mobileVoiceBigBtn.classList.add('playing');
            mobileVoiceStatus.textContent = 'Veltrix AI gapirmoqda... 🔊';
        } else {
            mobileVoiceStatus.textContent = 'Bosing va gapiring 🎙️';
        }
    }
    // Expose for external callers (e.g., TTS handlers)
    window._mobileVoiceSetState = setMobileState;

    function openMobileVoice() {
        mobileVoiceUI.classList.remove('hidden');
        mobileVoiceUI.style.display = 'flex';
        setMobileState('idle');

        // Activate voice mode using the existing system
        if (!isVoiceModeActive) {
            isVoiceModeActive = true;
            if (voiceModeBtn) voiceModeBtn.classList.add('active');
            if (recognition && !isRecording) recognition.start();
        }
    }

    function closeMobileVoice() {
        mobileVoiceUI.classList.add('hidden');
        mobileVoiceUI.style.display = 'none';
        setMobileState('idle');

        // Deactivate voice mode
        if (isVoiceModeActive) {
            isVoiceModeActive = false;
            if (voiceModeBtn) voiceModeBtn.classList.remove('active');
            if (recognition && isRecording) recognition.stop();
            if (currentAudio) { currentAudio.pause(); currentAudio = null; }
        }
    }

    mobileLaunchBtn.addEventListener('click', openMobileVoice);
    mobileVoiceClose.addEventListener('click', closeMobileVoice);

    // Sync states with the global recognition events
    const _origOnStart = recognition ? recognition.onstart : null;
    const _origOnEnd   = recognition ? recognition.onend   : null;

    if (recognition) {
        recognition.addEventListener('start', () => {
            if (mobileVoiceUI.style.display !== 'none') setMobileState('listening');
        });

        recognition.addEventListener('end', () => {
            if (!mobileVoiceUI || mobileVoiceUI.style.display === 'none') return;
            if (isVoiceModeActive) setMobileState('thinking');
            else setMobileState('idle');
        });

        recognition.addEventListener('result', (event) => {
            if (!mobileVoiceUI || mobileVoiceUI.style.display === 'none') return;
            let finalTr = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) finalTr += event.results[i][0].transcript;
            }
            if (finalTr.trim()) addMobileMsg('user', finalTr.trim());
        });
    }

    // Intercept AI replies to also display in mobile overlay
    const _origAppendMessage = window.appendMessage;
    const origAppend = appendMessage;
    window._mobileVoiceInterceptAppend = function(role, content) {
        if (role === 'assistant' && content && mobileVoiceUI && mobileVoiceUI.style.display !== 'none') {
            // Strip markdown
            const plain = content.replace(/[*#_`]/g, '').substring(0, 200) + (content.length > 200 ? '...' : '');
            addMobileMsg('ai', plain);
            setMobileState('playing');
        }
    };

    // Hook into TTS end to reset state
    const _origFetch = window.fetch;
    // We patch currentAudio onended for mobile state reset
    const _origSendMessage = window.sendMessage;

})();

// Auto-close sidebar on mobile when clicking outside
document.addEventListener('click', function(e) {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && (!menuBtn || !menuBtn.contains(e.target))) {
            sidebar.classList.remove('open');
        }
    }
});

async function copyToClipboard(text, btn) {
    // Robust copy to clipboard for mobile and desktop
    const doCopy = async (val) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return await navigator.clipboard.writeText(val);
        } else {
            // Fallback for non-HTTPS or some mobile webviews
            const textArea = document.createElement("textarea");
            textArea.value = val;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                textArea.remove();
                return Promise.resolve();
            } catch (err) {
                textArea.remove();
                return Promise.reject(err);
            }
        }
    };

    try {
        await doCopy(text);
        const originalHTML = btn.innerHTML;
        // Success feedback
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        btn.classList.add('copied');
        
        // Show a temporary tooltip if it's the desktop version
        if (window.innerWidth > 768) {
            btn.setAttribute('title', 'Nusxalandi!');
        }

        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove('copied');
            btn.setAttribute('title', 'Nusxa olish');
        }, 2000);
    } catch (err) {

        console.error('Copy failed:', err);
    }
}

function regenerateChat() {
    if (!lastUserMessage) return;
    userInput.value = lastUserMessage;
    // Auto resize
    userInput.style.height = 'auto';
    userInput.style.height = (userInput.scrollHeight) + 'px';
    sendMessage();
}


function toggleWebSearch() {
    isSearchModeActive = !isSearchModeActive;
    const badge = document.getElementById('searchBadge');
    const icon = document.querySelector('#webSearchToggleBtn .globe-icon');
    
    if (isSearchModeActive) {
        if (badge) badge.style.background = '#00d66f'; // Green
        if (icon) icon.style.color = '#00d66f';
        console.log('Web Search activated');
    } else {
        if (badge) badge.style.background = '#666'; // Gray
        if (icon) icon.style.color = 'currentColor';
        console.log('Web Search deactivated');
    }
}
