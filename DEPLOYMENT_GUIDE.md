# Production Settings for PythonAnywhere Deployment

**Before deploying, complete these steps:**

## 1. Prepare Your Local Project

```bash
# Create virtual environment locally
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from .env.example
copy .env.example .env  # Windows
cp .env.example .env    # Mac/Linux

# Test locally
python manage.py runserver
```

## 2. Update Django Settings for Production

Edit `tolibov_ai/settings.py` and modify these settings:

```python
# At the top, add environment variable support
import os
from pathlib import Path
from decouple import config

DEBUG = config('DEBUG', default=False, cast=bool)
SECRET_KEY = config('SECRET_KEY', default='unsafe-secret-key')
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=lambda v: [s.strip() for s in v.split(',')])

# Add whitenoise for static files
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Add this line
    'django.contrib.sessions.middleware.SessionMiddleware',
    # ... rest of middleware
]

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Security settings for production
CSRF_TRUSTED_ORIGINS = ['https://*.pythonanywhere.com']
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

## 3. Create PythonAnywhere Account

1. Go to https://www.pythonanywhere.com/
2. Sign up for a free account (~2GB storage) or paid account
3. Verify your email

## 4. Deploy to PythonAnywhere

### Step A: Upload Your Code

**Option 1: Using Git (Recommended)**

```bash
# In PythonAnywhere console:
cd /home/yourusername
git clone https://github.com/yourusername/your-repo.git veltrix-ai
cd veltrix-ai
```

**Option 2: Upload ZIP file**
- Compress your project folder
- Upload via Web tab > Files
- Extract it

### Step B: Set Up Python Environment

In PythonAnywhere console:

```bash
cd /home/yourusername/veltrix-ai

# Create virtual environment
mkvirtualenv --python=/usr/bin/python3.10 veltrix-ai

# Activate virtualenv
workon veltrix-ai

# Install dependencies
pip install -r requirements.txt
pip install gunicorn  # If not in requirements
```

### Step C: Collect Static Files

```bash
# In virtualenv console
python manage.py collectstatic --noinput
```

### Step D: Set Environment Variables

On PythonAnywhere:
1. Go to **Console** tab
2. Create `~/.env` file or use **Web** tab > Environment variables
3. Add your secrets:

```
DEBUG=False
SECRET_KEY=your-very-long-secret-key-here
ALLOWED_HOSTS=yourusername.pythonanywhere.com
GROQ_API_KEY=gsk_your_key_here
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret
```

### Step E: Create/Configure WSGI File

1. Go to **Web** tab
2. Click **Add a new web app**
3. Choose **Python 3.10** + **Django**
4. Edit WSGI configuration file: `/var/www/yourusername_pythonanywhere_com_wsgi.py`

Replace content with:

```python
import os
import sys

path = '/home/yourusername/veltrix-ai'
if path not in sys.path:
    sys.path.append(path)

os.environ['DJANGO_SETTINGS_MODULE'] = 'tolibov_ai.settings'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

### Step F: Configure Web App

In **Web** tab:
- **Virtualenv**: `/home/yourusername/.virtualenvs/veltrix-ai`
- **Static files**:
  - URL: `/static/`
  - Directory: `/home/yourusername/veltrix-ai/staticfiles`
- **Media files** (if needed):
  - URL: `/media/`
  - Directory: `/home/yourusername/veltrix-ai/media`

### Step G: Database Migration

In console (with virtualenv activated):

```bash
python manage.py migrate
python manage.py createsuperuser  # Create admin account
```

### Step H: Enable HTTPS (Important!)

In **Web** tab:
- Force HTTPS: ✓ Enabled
- HSTS headers: ✓ Enabled

### Step I: Reload Web App

In **Web** tab > Click **Reload** button

## 5. Troubleshooting

### Check Error Logs

```bash
# In PythonAnywhere console
tail -f /var/log/yourusername.pythonanywhere.com.error.log
```

### Common Issues

**Issue: "No module named 'chat'"**
- Solution: Make sure your virtualenv is activated
- Reinstall dependencies: `pip install -r requirements.txt`

**Issue: Static files not loading**
```bash
python manage.py collectstatic --noinput --clear
```

**Issue: "GROQ_API_KEY not found"**
- Ensure `.env` file exists with correct path
- Use **Web** > Environment variables instead

**Issue: Database locked**
```bash
rm db.sqlite3
python manage.py migrate
```

## 6. Update Project Settings (Final)

Modify `tolibov_ai/settings.py`:

```python
# Add this near top
from decouple import config, Csv

DEBUG = config('DEBUG', default=False, cast=bool)
SECRET_KEY = config('SECRET_KEY')
ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=Csv())

# Add for static files
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Enable compression
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

## 7. Final Checklist

- [ ] `requirements.txt` created
- [ ] `.env` file set up with secrets
- [ ] Virtual environment created on PythonAnywhere
- [ ] Git repository cloned or files uploaded
- [ ] `python manage.py migrate` completed
- [ ] `python manage.py collectstatic` completed
- [ ] WSGI file configured correctly
- [ ] Static/Media files configured
- [ ] Web app reloaded
- [ ] HTTPS enabled
- [ ] Site accessible at `yourusername.pythonanywhere.com`

## 8. Updating Your Site

After making changes locally:

```bash
git add .
git commit -m "your message"
git push

# On PythonAnywhere console:
cd /home/yourusername/veltrix-ai
git pull
python manage.py migrate  # if DB changes
python manage.py collectstatic --noinput
# Then reload web app in Web tab
```

---

**Need Help?**
- PythonAnywhere Docs: https://help.pythonanywhere.com/
- Django Deployment: https://docs.djangoproject.com/en/6.0/howto/deployment/
