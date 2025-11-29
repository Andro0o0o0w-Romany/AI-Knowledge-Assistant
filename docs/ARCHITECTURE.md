# 🏗️ Architecture Documentation

## System Overview

The AI Knowledge Assistant is a full-stack application designed to help users build and query a personal knowledge base using AI. The system follows a modern microservices-inspired architecture with clear separation of concerns.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           User Interface                                 │
│                     (Next.js 14 + TailwindCSS)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Landing   │  │    Auth     │  │  Dashboard  │  │  Documents  │   │
│  │    Page     │  │   Pages     │  │    Chat     │  │   Manager   │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                │ HTTP/REST API
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           API Gateway                                    │
│                         (FastAPI + CORS)                                │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │    Auth     │  │  Documents  │  │    Chat     │  │   Health    │   │
│  │   Routes    │  │   Routes    │  │   Routes    │  │   Routes    │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────────────┘   │
└─────────┼────────────────┼────────────────┼─────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Service Layer                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐ │
│  │  Document Processor │  │  Vector Store       │  │  LLM Service    │ │
│  │  - Text extraction  │  │  - Embeddings       │  │  - Q&A          │ │
│  │  - Chunking        │  │  - Similarity search │  │  - Context      │ │
│  │  - Validation      │  │  - Storage          │  │  - Generation   │ │
│  └──────────┬──────────┘  └──────────┬──────────┘  └────────┬────────┘ │
└─────────────┼─────────────────────────┼─────────────────────┼───────────┘
              │                         │                     │
              ▼                         ▼                     ▼
┌─────────────────────────┐  ┌─────────────────────┐  ┌───────────────────┐
│      File Storage       │  │      ChromaDB       │  │     OpenAI API    │
│   (Local Filesystem)    │  │  (Vector Database)  │  │   (LLM + Embed)   │
└─────────────────────────┘  └─────────────────────┘  └───────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        SQLite/PostgreSQL                                 │
│                    (Users, Documents, Chat History)                      │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### Frontend (Next.js 14)

#### Structure
- **App Router**: Uses Next.js 14's App Router for file-based routing
- **Server Components**: Where possible for initial data loading
- **Client Components**: For interactive UI elements

#### Key Components
| Component | Purpose |
|-----------|---------|
| `layout.tsx` | Root layout with providers |
| `page.tsx` | Landing page |
| `(auth)/login` | Login page |
| `(auth)/register` | Registration page |
| `dashboard/` | Main dashboard layout |
| `dashboard/page.tsx` | Chat interface |
| `dashboard/documents` | Document management |
| `dashboard/settings` | User settings |

#### State Management
- **Zustand**: Global state for auth and chat
- **React Query**: Server state management
- **Local Storage**: Auth token persistence

### Backend (FastAPI)

#### Layer Architecture
```
┌─────────────────────────────────────┐
│           API Routes                 │  ← HTTP request handling
├─────────────────────────────────────┤
│           Schemas                    │  ← Request/response validation
├─────────────────────────────────────┤
│           Services                   │  ← Business logic
├─────────────────────────────────────┤
│           Models                     │  ← Database models
├─────────────────────────────────────┤
│           Core                       │  ← Config, security, database
└─────────────────────────────────────┘
```

#### Services

**Document Processor**
```python
class DocumentProcessor:
    # Handles file validation, saving, and text extraction
    async def save_file(content, filename) -> (unique_name, path)
    async def extract_text(path, file_type) -> str
    def split_text(text) -> List[str]
    def validate_file(filename, size) -> (bool, error)
```

**Vector Store Service**
```python
class VectorStoreService:
    # Manages ChromaDB operations
    async def add_documents(chunks, doc_id, name, user_id) -> count
    async def search(query, user_id, n_results) -> List[result]
    async def delete_document(doc_id) -> bool
```

**LLM Service**
```python
class LLMService:
    # Handles Q&A with LangChain
    async def answer_question(question, user_id, n_sources) -> {
        answer, sources, processing_time, question
    }
```

### Database Schema

```sql
-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE documents (
    id INTEGER PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed'),
    chunk_count INTEGER DEFAULT 0,
    embedding_count INTEGER DEFAULT 0,
    content_preview TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    user_id INTEGER REFERENCES users(id)
);

-- Chat messages table
CREATE TABLE chat_messages (
    id INTEGER PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sources JSON,
    processing_time FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users(id)
);
```

### Vector Store (ChromaDB)

#### Collection Structure
- **Collection Name**: `knowledge_base`
- **Distance Metric**: Cosine similarity
- **Metadata**: document_id, document_name, user_id, chunk_index, created_at

#### Document Structure
```json
{
    "id": "doc_123_chunk_0",
    "document": "Text content of the chunk...",
    "embedding": [0.1, 0.2, ...],  // 1536 dimensions
    "metadata": {
        "document_id": 123,
        "document_name": "report.pdf",
        "user_id": 1,
        "chunk_index": 0,
        "created_at": "2024-01-15T10:30:00"
    }
}
```

## Data Flow

### Document Upload Flow

```
1. Frontend: User drops files
   └─> FormData with files

2. Backend: POST /api/docs/upload
   └─> Validate file type & size
   └─> Save to filesystem
   └─> Create DB record (status: pending)
   └─> Queue background task
   └─> Return immediate response

3. Background Task:
   └─> Update status: processing
   └─> Extract text (pypdf / plain text)
   └─> Split into chunks (RecursiveTextSplitter)
   └─> Generate embeddings (OpenAI / mock)
   └─> Store in ChromaDB
   └─> Update DB: completed + stats
```

### Question Answering Flow

```
1. Frontend: User submits question
   └─> POST /api/ask { question }

2. Backend: LLM Service
   └─> Generate query embedding
   └─> Search ChromaDB (user-scoped)
   └─> Get top N relevant chunks
   └─> Build context string

3. LLM Chain:
   └─> System prompt + context
   └─> User question
   └─> OpenAI API call
   └─> Extract answer

4. Response:
   └─> Save to chat history
   └─> Return { answer, sources, time }
```

## Security

### Authentication
- **JWT Tokens**: Signed with HS256
- **Token Expiry**: 7 days (configurable)
- **Password Hashing**: bcrypt

### Authorization
- **User Isolation**: Each user only sees their own:
  - Documents
  - Chat history
  - Vector store results
- **Token Validation**: On every protected endpoint

### Data Protection
- **File Validation**: Type and size checks
- **SQL Injection**: SQLAlchemy ORM
- **XSS**: React's built-in escaping
- **CORS**: Configurable origins

## Scalability Considerations

### Current Limitations
- SQLite for simplicity (single-file database)
- Local filesystem for uploads
- In-memory vector store per process

### Production Recommendations
1. **Database**: PostgreSQL for concurrent access
2. **Vector Store**: Pinecone or Weaviate for scale
3. **File Storage**: S3 or similar object storage
4. **Background Jobs**: Celery with Redis
5. **Caching**: Redis for session and query cache

## Error Handling

### Backend
- Global exception handler for uncaught errors
- Structured error responses with status codes
- Logging with context (file, line, function)

### Frontend
- React Query error states
- Toast notifications for user feedback
- Graceful degradation for missing data

## Testing Strategy

### Backend Tests
- **Unit Tests**: Services and utilities
- **Integration Tests**: API endpoints
- **Fixtures**: Async database sessions

### Frontend Tests (Recommended)
- **Component Tests**: React Testing Library
- **E2E Tests**: Playwright or Cypress

## Monitoring & Observability

### Health Endpoints
- `/api/health`: Basic liveness check
- `/api/health/detailed`: Full system status

### Recommended Additions
- Prometheus metrics
- Structured logging (JSON)
- Distributed tracing (OpenTelemetry)

## Deployment

### Docker Compose (Development)
```bash
docker-compose up --build
```

### Production Checklist
- [ ] Set strong SECRET_KEY
- [ ] Configure CORS origins
- [ ] Set up reverse proxy (nginx)
- [ ] Configure TLS/SSL
- [ ] Set up backup strategy
- [ ] Configure monitoring
- [ ] Set resource limits

