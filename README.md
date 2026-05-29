# SkyLearn AI

SkyLearn AI is a Django-based Learning Management System forked from [SkyCascade/SkyLearn](https://github.com/SkyCascade/SkyLearn). This version adds AI lesson generation, RAG-based document retrieval, AI quiz generation, chatbot tutoring, and Yolo:Farm AIoT lesson support with Google Gemini.

![SkyLearn AI preview](https://github.com/user-attachments/assets/4e84251a-27b0-462b-bd5e-fb0bcadc4694)

<img width="1440" alt="SkyLearn AI screenshot" src="https://github.com/user-attachments/assets/08644f49-6ae0-4695-86cc-afe331c6f61a">

## Demo

Video demo: [Google Drive](https://drive.google.com/file/d/12i_QWihgUOlkC_BBXRLqWTZ24wdfYNwh/view?usp=sharing)

## Features

- Course, user, role, semester, grade, quiz, payment, and material management
- Student, lecturer, parent, department head, and admin workflows
- AI lesson generation from topics and uploaded documents
- RAG pipeline for PDF, DOCX, and PPTX context retrieval
- AI quiz generation from lesson content
- Floating AI chatbot tutor
- Yolo:Farm lessons with MicroPython code and Web Serial upload support
- DOCX export for generated lessons

## Tech Stack

| Area | Technology |
|------|------------|
| Backend | Django 4.2, Python 3.8+ |
| AI | Google Gemini, LangChain |
| Database | PostgreSQL or Neon |
| Media | Cloudinary |
| Frontend | Bootstrap, jQuery, FontAwesome, SCSS |
| Documents | PyPDF2, python-docx, python-pptx, htmldocx |
| Payments | Stripe |

## Project Structure

```text
SkyLearnAI/
|-- ai_core/       # AI lesson, quiz, chatbot, RAG services
|-- accounts/      # User management
|-- config/        # Django settings and root URLs
|-- core/          # News, events, sessions, semesters
|-- course/        # Programs, courses, uploads, videos
|-- payments/      # Stripe payment and invoicing
|-- quiz/          # Quiz system
|-- result/        # Grades, GPA, CGPA
|-- search/        # Search
|-- static/        # CSS, JS, assets
|-- templates/     # Django templates
|-- requirements/  # Dependency files
`-- manage.py
```

## Requirements

- Python 3.8+
- PostgreSQL or Neon
- Google Gemini API key
- Cloudinary account

## Installation

```bash
git clone https://github.com/nat50/SkyLearnAI.git
cd SkyLearnAI
python -m venv .venv
```

Activate the virtual environment:

```bash
# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

Install dependencies and set up the app:

```bash
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Open http://127.0.0.1:8000 in your browser.

## Environment Variables

Create `.env` from `.env.example` and update these values:

```env
DEBUG=True
SECRET_KEY=your-secret-key

EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_FROM_ADDRESS=SkyLearn <youremail@example.com>
EMAIL_HOST_USER=youremail@example.com
EMAIL_HOST_PASSWORD=yourpassword

DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=your_db_host
DB_PORT=5432

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

GOOGLE_API_KEY=your_gemini_api_key
```

## AI Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/ai/lesson/generate/` | POST | Generate a lesson |
| `/ai/lesson/save-doc/` | POST | Save a lesson as DOCX |
| `/ai/lesson/<id>/html/` | GET | Retrieve lesson HTML |
| `/ai/quiz/generate/` | POST | Generate a quiz |
| `/ai/chatbot/` | POST | Send a chatbot message |

## References

- [SkyCascade/SkyLearn](https://github.com/SkyCascade/SkyLearn)
- [tomwalker/django_quiz](https://github.com/tomwalker/django_quiz)
- [Google Gemini](https://ai.google.dev/)
- [LangChain](https://www.langchain.com/)
- [Yolo:Bit / OhStem](https://ohstem.vn/)

## License

This project is licensed under the [MIT License](LICENSE).

Original SkyLearn (c) 2023 [Adil Mohak](https://github.com/adilmohak).
