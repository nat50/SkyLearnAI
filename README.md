# SkyLearn AI — AI-Powered Learning Management System

> Forked from [SkyCascade/SkyLearn](https://github.com/SkyCascade/SkyLearn) and extended with **AI-driven lesson generation**, **RAG-based document retrieval**, **automated quiz creation**, **AI chatbot tutoring**, and **Yolo:Farm AIoT education** features.

![Group 23](https://github.com/user-attachments/assets/4e84251a-27b0-462b-bd5e-fb0bcadc4694)

<img width="1440" alt="screenshot" src="https://github.com/user-attachments/assets/08644f49-6ae0-4695-86cc-afe331c6f61a">

---

## Table of Contents

- [Overview](#overview)
- [What Changed from the Original SkyLearn](#what-changed-from-the-original-skylearn)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [AI Features in Detail](#ai-features-in-detail)
- [References](#references)
- [License](#license)

---

## Overview

**SkyLearn AI** is a full-featured Learning Management System built with Django, enhanced with AI capabilities powered by Google Gemini. It provides traditional LMS functions (course management, grading, quizzes, student/lecturer management) alongside modern AI-powered tools for automated lesson generation, intelligent quiz creation, and an AI chatbot tutor.

The project is designed as a university-level LMS with support for multiple user roles (Admin, Lecturer, Student, Parent, Department Head), course enrollment, grade tracking, payment integration (Stripe), and internationalization (English, French, Spanish, Russian).

---

## What Changed from the Original SkyLearn

This fork introduces the following major additions and modifications on top of [SkyCascade/SkyLearn](https://github.com/SkyCascade/SkyLearn):

### New: `ai_core` Module
An entirely new Django app (`ai_core/`) containing:
- **Gemini LLM integration** via LangChain (`langchain-google-genai`)
- **AI Lesson Generator** — generates structured HTML lessons from any topic
- **AI Quiz Generator** — auto-creates multiple-choice questions from lesson content
- **RAG (Retrieval-Augmented Generation)** pipeline — parses uploaded documents (PDF, DOCX, PPTX), chunks them, embeds with Gemini Embedding API, and performs cosine-similarity semantic search to enrich lesson generation
- **AI Chatbot** — a floating conversational assistant (SkyLearn AI Assistant) available on every page
- **Yolo:Farm AIoT Lesson Service** — specialized lesson pipeline for IoT education with Yolo:Bit microcontroller, generating real MicroPython code that can be flashed to hardware via Web Serial API

### New: Frontend Components
- **Chatbot widget** (`templates/snippets/chatbot_widget.html`, `static/css/chatbot.css`, `static/js/chatbot.js`)
- **Yolo:Farm UI** (`static/css/yolo_farm.css`, `static/js/yolo_farm.js`) — interactive lesson viewer with code blocks, serial monitor, and hardware upload functionality

### Infrastructure Changes
- **Database**: Switched from SQLite to **PostgreSQL** (Neon serverless)
- **Media storage**: Added **Cloudinary** integration for cloud file storage
- **Dependencies**: Added `langchain`, `langchain-google-genai`, `PyPDF2`, `python-docx`, `python-pptx`, `htmldocx`, `numpy`, `psycopg2-binary`, `dj-database-url`, `cloudinary`, `django-cloudinary-storage`
- **Font**: Added Google Inter font with Vietnamese support

### Modified Files
- `config/settings.py` — added `ai_core` to installed apps, PostgreSQL database config, Cloudinary storage config
- `config/urls.py` — added `ai/` URL prefix for AI endpoints
- `templates/base.html` — included chatbot widget, Yolo:Farm CSS/JS, Inter font
- `course/models.py` — added `html_content` field to `Upload` model for storing generated lessons
- `requirements/base.txt` — added AI and cloud dependencies

---

## Features

### LMS Core (from upstream SkyLearn)
- **Dashboard** — School demographics and analytics (admin only)
- **News & Events** — Accessible to all users
- **User Management** — Admin manages students, lecturers, parents, department heads
- **Course Management** — Add/drop courses, course allocation to lecturers
- **Grading System** — Attendance, mid exam, final exam, assignment, quiz scores; auto-calculated total, grade (A+ to F), GPA, and CGPA
- **Grade Comments** — Automatic pass/fail classification
- **Assessment & Grade Results** — Dedicated pages for students
- **Session/Semester Management** — Grouped assessments and grades by semester
- **Course Materials** — Upload documents (PDF, DOCX, PPTX, XLS, ZIP, etc.) and videos per course
- **PDF Generator** — Registration slips and grade result reports
- **Search** — Full-text search across users, courses, and programs
- **Payment Integration** — Stripe-based invoicing
- **Quiz System** — Multiple choice, True/False, question categories, progress tracking, pass marks, score history, randomized question order
- **Internationalization** — English, French, Spanish, Russian (via `django-modeltranslation`)
- **Page Access Restriction** — Role-based permissions

### AI-Powered Features (new in this fork)
- **🤖 AI Lesson Generation** — Generate complete HTML lessons from a topic using Gemini LLM
- **📚 RAG-Enhanced Lessons** — Select uploaded course documents as context; the system parses, chunks, embeds, and semantically retrieves relevant content to produce more accurate lessons
- **📝 AI Quiz Generation** — Auto-create multiple-choice quizzes from any lesson content with configurable difficulty (easy/medium/hard) and question count
- **💬 AI Chatbot Tutor** — Floating chat widget on every page; supports multi-turn conversation, answers academic questions, provides study tips
- **🌾 Yolo:Farm AIoT Lessons** — Specialized lesson pipeline for IoT education with the Yolo:Bit microcontroller (OhStem platform); generates real MicroPython code blocks
- **🔌 Web Serial API** — Upload generated MicroPython code directly to physical Yolo:Bit hardware from the browser
- **📄 Lesson to DOCX Export** — Save AI-generated lessons as Word documents in course materials

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Django 4.2 (LTS), Python 3.8+ |
| **AI / LLM** | Google Gemini (via LangChain), Gemini Embedding API |
| **RAG** | Custom pipeline: PyPDF2, python-docx, python-pptx → chunking → Gemini embeddings → cosine similarity (NumPy) |
| **Database** | PostgreSQL (Neon serverless) |
| **Media Storage** | Cloudinary |
| **Frontend** | Bootstrap 5.3, jQuery 3.7, FontAwesome 6.5, SCSS |
| **Payments** | Stripe |
| **PDF Generation** | xhtml2pdf, ReportLab |
| **DOCX Generation** | python-docx, htmldocx |
| **Admin Panel** | Django JET (reboot) |
| **i18n** | django-modeltranslation (EN, FR, ES, RU) |
| **Static Files** | WhiteNoise |

---

## Project Structure

```
SkyLearnAI/
├── ai_core/                    # 🆕 AI module (lesson, quiz, chatbot, RAG)
│   ├── models.py               #    AIGeneration, DocumentChunk models
│   ├── views.py                #    API endpoints for AI features
│   ├── urls.py                 #    /ai/ URL routes
│   └── services/
│       ├── base.py             #    Abstract LLM service (LangChain)
│       ├── gemini.py           #    Google Gemini provider
│       ├── lesson.py           #    General lesson generation
│       ├── yolo_farm_lesson.py #    Yolo:Farm IoT lesson generation
│       ├── quiz.py             #    Quiz generation with JSON parsing
│       ├── chatbot.py          #    Conversational AI assistant
│       ├── rag.py              #    Embedding, indexing, semantic search
│       └── document_parser.py  #    PDF/DOCX/PPTX text extraction + chunking
│
├── accounts/                   # User management (Student, Lecturer, Parent, etc.)
├── config/                     # Django settings, root URLs, WSGI/ASGI
├── core/                       # News & Events, Session, Semester, ActivityLog
├── course/                     # Programs, Courses, Uploads, Videos
├── quiz/                       # Quiz system (MCQ, True/False, categories)
├── result/                     # Grading: TakenCourse, Result (GPA/CGPA)
├── search/                     # Full-text search
├── payments/                   # Stripe payment & invoicing
│
├── templates/                  # Django HTML templates
│   └── snippets/
│       └── chatbot_widget.html # 🆕 Floating chatbot UI
├── static/
│   ├── css/
│   │   ├── chatbot.css         # 🆕 Chatbot styles
│   │   └── yolo_farm.css       # 🆕 Yolo:Farm lesson UI styles
│   └── js/
│       ├── chatbot.js          # 🆕 Chatbot client logic
│       └── yolo_farm.js        # 🆕 Yolo:Farm + Web Serial API logic
│
├── requirements/
│   ├── base.txt                # All dependencies
│   ├── local.txt               # Development extras (black, factory-boy)
│   └── production.txt          # Production extras
├── manage.py
└── .env.example                # Environment variable template
```

---

## Requirements

- [Python 3.8+](https://www.python.org/downloads/)
- [PostgreSQL](https://www.postgresql.org/) (or [Neon](https://neon.tech/) serverless)
- [Google Gemini API Key](https://aistudio.google.com/apikey) (for AI features)
- [Cloudinary Account](https://cloudinary.com/) (for media storage)

---

## Installation

1. **Clone the repository**

```bash
git clone https://github.com/nat50/SkyLearnAI.git
cd SkyLearnAI
```

2. **Create and activate a virtual environment**

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

3. **Install dependencies**

```bash
pip install -r requirements.txt
```

4. **Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your actual credentials (see [Environment Variables](#environment-variables) below).

5. **Run database migrations**

```bash
python manage.py migrate
```

6. **Create a superuser (admin)**

```bash
python manage.py createsuperuser
```

7. **Start the development server**

```bash
python manage.py runserver
```

8. Open http://127.0.0.1:8000 in your browser.

---

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Django
DEBUG=True
SECRET_KEY=your-random-secret-key

# Email
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_FROM_ADDRESS=SkyLearn <youremail@example.com>
EMAIL_HOST_USER=youremail@example.com
EMAIL_HOST_PASSWORD=yourpassword

# PostgreSQL Database
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=your_db_host
DB_PORT=5432

# Cloudinary (media storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Google Gemini AI (required for AI features)
GOOGLE_API_KEY=your_gemini_api_key
```

---

## Usage

| Role | Access |
|------|--------|
| **Admin** | Full dashboard, manage students/lecturers/courses, view analytics |
| **Lecturer** | Submit grades, view allocated courses, upload materials, generate AI lessons |
| **Student** | Enroll in courses, view grades/results, take quizzes, use AI chatbot |
| **Parent** | View connected student's information |

### AI Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ai/lesson/generate/` | POST | Generate an AI lesson (with optional RAG context) |
| `/ai/lesson/save-doc/` | POST | Save generated lesson as DOCX to course materials |
| `/ai/lesson/<id>/html/` | GET | Retrieve stored HTML lesson content |
| `/ai/quiz/generate/` | POST | Generate MCQ quiz from lesson content |
| `/ai/chatbot/` | POST | Send message to AI chatbot |

---

## AI Features in Detail

### RAG Pipeline
1. **Document Upload** — Lecturers upload PDF/DOCX/PPTX files to a course
2. **Text Extraction** — `document_parser.py` extracts text using PyPDF2, python-docx, or python-pptx
3. **Chunking** — Text is split into 4000-character overlapping chunks (200-char overlap)
4. **Embedding** — Each chunk is embedded using `gemini-embedding-001` via LangChain
5. **Storage** — Chunks and embeddings are stored in the `DocumentChunk` model (PostgreSQL JSON field)
6. **Retrieval** — At lesson generation time, the user's topic is embedded and compared against stored chunks using cosine similarity (NumPy)
7. **Generation** — Top-K relevant chunks are injected into the Gemini prompt as context

### Yolo:Farm AIoT
- Generates lessons specifically for the Yolo:Bit microcontroller (OhStem platform)
- Code blocks contain real MicroPython code using OhStem libraries (`from yolobit import *`)
- Lessons can use the Yolo:Farm textbook PDF as RAG context (auto-detected)
- Generated code can be uploaded to physical hardware via the **Web Serial API** directly from the browser

---

## References

- **Upstream LMS**: [SkyCascade/SkyLearn](https://github.com/SkyCascade/SkyLearn)
- **Quiz module**: [tomwalker/django_quiz](https://github.com/tomwalker/django_quiz)
- **AI Provider**: [Google Gemini](https://ai.google.dev/)
- **LangChain**: [langchain.com](https://www.langchain.com/)
- **Yolo:Bit / OhStem**: [ohstem.vn](https://ohstem.vn/)

---

## License

This project is licensed under the [MIT License](LICENSE).

Original SkyLearn © 2023 [Adil Mohak](https://github.com/adilmohak).
