# 🧠 AI Knowledge Assistant Dashboard

A powerful AI-powered knowledge management system that allows you to upload documents, ask questions, and get intelligent answers based on your personal knowledge base.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![Next.js](https://img.shields.io/badge/next.js-14-black.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green.svg)

## ✨ Features

- **📄 Document Upload**: Upload .txt and .pdf files to build your knowledge base
- **🧠 AI-Powered Search**: Semantic search using vector embeddings
- **💬 Chat Interface**: Ask questions and get AI-generated answers
- **📚 Source References**: View the exact sources used for each response
- **🔐 Authentication**: JWT-based auth with user isolation
- **📊 Chat History**: Persistent conversation history per user
- **🎨 Modern UI**: Beautiful, responsive dashboard with TailwindCSS

## 🛠️ Tech Stack

### Backend
- **FastAPI** - High-performance Python web framework
- **LangChain** - LLM orchestration and document processing
- **ChromaDB** - Vector database for embeddings
- **SQLAlchemy** - Async ORM for SQLite/PostgreSQL
- **OpenAI** - GPT and embedding models

### Frontend
- **Next.js 14** - React framework with App Router
- **TailwindCSS** - Utility-first CSS framework
- **React Query** - Data fetching and caching
- **Framer Motion** - Animations
- **Zustand** - State management

### Infrastructure
- **Docker & Docker Compose** - Containerization
- **SQLite** (dev) / **PostgreSQL** (prod) - Database

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker & Docker Compose (optional)
- OpenAI API Key (optional, works with mock mode)

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-knowledge-assistant.git
cd ai-knowledge-assistant

# Set your OpenAI API key (optional)
export OPENAI_API_KEY=your-api-key-here

# Start all services
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Option 2: Manual Setup

#### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export SECRET_KEY="your-secret-key"
export OPENAI_API_KEY="your-openai-key"  # Optional

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

## 📁 Project Structure

```
ai-knowledge-assistant/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── auth.py         # Authentication endpoints
│   │   │       ├── chat.py         # Q&A endpoints
│   │   │       ├── documents.py    # Document management
│   │   │       └── health.py       # Health checks
│   │   ├── core/
│   │   │   ├── config.py          # App configuration
│   │   │   ├── database.py        # Database setup
│   │   │   └── security.py        # JWT & password utils
│   │   ├── models/
│   │   │   ├── user.py            # User model
│   │   │   ├── document.py        # Document model
│   │   │   └── chat.py            # Chat history model
│   │   ├── schemas/               # Pydantic schemas
│   │   ├── services/
│   │   │   ├── document_processor.py  # Text extraction
│   │   │   ├── vector_store.py        # ChromaDB integration
│   │   │   └── llm_service.py         # LangChain Q&A
│   │   └── main.py               # FastAPI app
│   ├── tests/                    # Unit tests
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/           # Auth pages
│   │   │   ├── dashboard/        # Dashboard pages
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   └── lib/
│   │       ├── api.ts            # API client
│   │       ├── store.ts          # Zustand store
│   │       └── utils.ts          # Utilities
│   ├── package.json
│   └── Dockerfile
├── docs/
│   └── ARCHITECTURE.md
├── docker-compose.yml
└── README.md
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (form data) |
| POST | `/api/auth/login/json` | Login (JSON) |
| GET | `/api/auth/me` | Get current user |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/docs/upload` | Upload documents |
| GET | `/api/docs` | List all documents |
| GET | `/api/docs/{id}` | Get document details |
| DELETE | `/api/docs/{id}` | Delete document |
| POST | `/api/docs/{id}/reprocess` | Reprocess document |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ask` | Ask a question |
| GET | `/api/ask/history` | Get chat history |
| DELETE | `/api/ask/history` | Clear chat history |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Basic health check |
| GET | `/api/health/detailed` | Detailed system status |

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | JWT signing key | Required |
| `DATABASE_URL` | Database connection URL | `sqlite+aiosqlite:///./knowledge_assistant.db` |
| `OPENAI_API_KEY` | OpenAI API key | Optional (mock mode) |
| `OPENAI_MODEL` | GPT model to use | `gpt-3.5-turbo` |
| `OPENAI_EMBEDDING_MODEL` | Embedding model | `text-embedding-3-small` |
| `CHUNK_SIZE` | Text chunk size | `1000` |
| `CHUNK_OVERLAP` | Chunk overlap | `200` |
| `MAX_FILE_SIZE` | Max upload size (bytes) | `10485760` (10MB) |
| `CORS_ORIGINS` | Allowed origins | `["http://localhost:3000"]` |

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest -v

# Frontend linting
cd frontend
npm run lint
```

## 📊 API Flow

```
1. User uploads documents
   └─> POST /api/docs/upload
       └─> Extract text (PDF/TXT)
       └─> Split into chunks
       └─> Generate embeddings
       └─> Store in ChromaDB

2. User asks a question
   └─> POST /api/ask
       └─> Generate query embedding
       └─> Search ChromaDB for relevant chunks
       └─> Build context from top matches
       └─> Send to LLM with context
       └─> Return answer + sources
```

## 🎯 Key Features Explained

### Document Processing
- Supports `.txt` and `.pdf` files
- Uses LangChain's `RecursiveCharacterTextSplitter` for intelligent chunking
- Async background processing for large files

### Vector Search
- ChromaDB with persistent storage
- Cosine similarity for relevance ranking
- User-scoped search for data isolation

### LLM Integration
- LangChain for prompt management
- Context-aware Q&A with source attribution
- Mock mode available without API key

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - API framework
- [LangChain](https://langchain.com/) - LLM orchestration
- [Next.js](https://nextjs.org/) - React framework
- [TailwindCSS](https://tailwindcss.com/) - CSS framework
- [OpenAI](https://openai.com/) - AI models

---

Built with ❤️ for the Nixai Labs Challenge

