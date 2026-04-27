# Veltrix AI - LifeOS Dashboard

Modern, AI-powered LifeOS Dashboard built with Django.

## Features
- **AI Chat**: Powered by Groq (Llama 3/4 models) with web search and YouTube summarization.
- **LifeOS Dashboard**: Modern, dark-themed UI for managing your life.
- **Planner**: Integrated task manager.
- **Finance Tracker**: Manage your expenses and income.
- **Goals**: Track your long-term objectives.

## Tech Stack
- **Backend**: Django (Python)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Database**: SQLite (Development) / PostgreSQL (Production ready)
- **AI Engine**: Groq SDK
- **Styling**: Custom CSS with Glassmorphism and modern animations

## Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/veltrix-ai.git
   cd veltrix-ai
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up Environment Variables**:
   Create a `.env` file based on `.env.example`:
   ```bash
   DEBUG=True
   SECRET_KEY=your_secret_key
   GROQ_API_KEY=your_groq_api_key
   ```

4. **Run Migrations**:
   ```bash
   python manage.py migrate
   ```

5. **Start the server**:
   ```bash
   python manage.py runserver
   ```

## Deployment
The project is configured for deployment on platforms like Render or PythonAnywhere. Use `build.sh` for automated deployment setup.

## License
MIT License
