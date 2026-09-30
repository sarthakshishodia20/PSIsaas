# 🚀 Multi-Tenant AI Knowledge Assistant (RAG)

A production-grade, multi-tenant AI Knowledge Assistant platform built with **Node.js, PostgreSQL (pgvector), Google Gemini, and React (Dark Mode)**. 

Organizations (universities, colleges, companies) can create accounts, upload official policy/guideline PDFs, and get a custom embeddable AI assistant that answers user questions **strictly grounded in uploaded documents with exact document and page citations**.

---

## 🌟 Key Features

* **🛡️ Complete Multi-Tenant Isolation:**
  * Strict database-level isolation (`WHERE c.org_id = $orgId`).
  * One organization can never access or query another organization's documents.
* **📄 Automated PDF Ingestion & Parsing:**
  * Validates: Max 10 PDFs per org, max 20 pages per PDF, max 10MB file size.
  * Node.js v24 compatible extraction via `pdf2json` with exact page-number tracking.
* **⚡ Vector Similarity Search (`pgvector`):**
  * Chunks text into ~500 character pieces with overlap.
  * Generates 768-dimensional dense vector embeddings using Google Gemini (`gemini-embedding-001`).
  * Fast cosine distance search (`<=>`) in PostgreSQL.
* **🤖 Grounded Q&A with Strict Citations (Zero Hallucination):**
  * LLM generation strictly relies on retrieved document context.
  * Inline & source citations with **Document Name and Page Number**.
  * Out-of-context or general knowledge queries outside uploaded documents are politely rejected.
* **🖤 Sleek Dark Mode UI:**
  * Clean, minimal, non-bloated dark theme (Obsidian Slate).
  * Organization portal with drag-and-drop document upload, live assistant test preview, query history logs, and embed codes.
* **🌐 Standalone & Embeddable Student Chat:**
  * Public access endpoint (`/chat/:token`) for students.
  * Ready-to-use `<iframe>` embed code for any website.

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| **Backend** | Node.js, Express.js |
| **Database** | PostgreSQL 16+ with `pgvector` extension |
| **AI / LLM** | Google Gemini (`gemini-embedding-001`, `gemini-3.5-flash-lite`, `gemini-2.5-flash`) |
| **PDF Processing** | `pdf2json`, `multer` |
| **Security / Auth** | JWT (`jsonwebtoken`), `bcryptjs` password hashing |
| **Frontend** | React 18, Vite, `lucide-react`, Custom Dark CSS |

---

## 📁 Project Architecture

```
PSIAssi/
├── backend/
│   ├── index.js               # Express application entry point
│   ├── db.js                  # PostgreSQL connection pool
│   ├── setup.js               # Database schema initialization script
│   ├── .env                   # Configuration & API keys
│   ├── uploads/               # Local PDF storage directory
│   ├── middleware/
│   │   └── auth.js            # JWT verification middleware
│   ├── routes/
│   │   ├── auth.js            # Register & Login endpoints
│   │   ├── documents.js       # PDF upload, chunking & management
│   │   └── assistant.js       # RAG Query, widget info & analytics
│   └── services/
│       ├── pdfService.js      # PDF extraction & page-level chunking
│       └── aiService.js       # Gemini 768-D embeddings & grounded answers
│
└── frontend/
    ├── index.html             # Vite HTML template
    ├── vite.config.js         # Proxy configuration to backend (:5000)
    └── src/
        ├── App.jsx            # Main view switcher (Portal vs Public Chat)
        ├── index.css          # Sleek minimalist dark-mode styling
        └── components/
            ├── Auth.jsx       # Login & Register modal
            ├── Dashboard.jsx  # Knowledge base, live test, analytics, embed
            └── ChatWidget.jsx # Student conversational UI with source tags
```

---

## 🚀 Getting Started

### 1. Prerequisites
* **Node.js** (v18 or higher)
* **PostgreSQL** with `pgvector` installed (`sudo apt install postgresql-16-pgvector`)
* **Google Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/))

---

### 2. Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment Variables (`backend/.env`):**
   ```env
   PORT=5000

   # PostgreSQL Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=psi_assistant
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password

   # JWT Secret
   JWT_SECRET=supersecretkey123

   # Google Gemini API Key
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Initialize the Database Schema:**
   ```bash
   node setup.js
   ```
   *Creates `vector` extension, `organizations`, `documents`, `chunks`, `assistants`, and `conversations` tables.*

4. **Start the Backend Server:**
   ```bash
   node index.js
   ```
   *Runs on `http://localhost:5000`.*

---

### 3. Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd ../frontend
   npm install
   ```

2. **Start the Frontend Development Server:**
   ```bash
   npm run dev
   ```
   *Runs on `http://localhost:3000` with API proxy to port 5000.*

3. **Open in Browser:**
   Visit **[http://localhost:3000](http://localhost:3000)**

---

## 📡 API Reference

### 🔐 Authentication (`/api/auth`)
* `POST /api/auth/register` — Register new organization (returns JWT & unique assistant token).
* `POST /api/auth/login` — Login existing organization (returns JWT & assistant token).

### 📄 Documents (`/api/documents`) *(Protected by JWT)*
* `POST /api/documents/upload` — Upload PDF (multipart/form-data with key `pdf`). Parses, chunks, creates embeddings, and stores in PostgreSQL.
* `GET /api/documents` — List all uploaded documents for the organization.
* `DELETE /api/documents/:id` — Delete a document and its associated vector chunks.

### 🤖 Assistant & RAG (`/api/assistant`)
* `GET /api/assistant/:token` — Public endpoint returning organization name and welcome message.
* `POST /api/assistant/:token/query` — Public RAG endpoint for students:
  * **Payload:** `{ "question": "What is the scholarship policy?" }`
  * **Response:** `{ "success": true, "answer": "...", "sources": [{ "document": "...", "page": 1 }] }`
* `GET /api/assistant/analytics/history` *(Protected by JWT)* — Organization query history and AI response logs.

---

## 🧪 Testing & Verification

1. **Multi-Tenancy Isolation Test:**
   * Create Org A (e.g. GLA) and upload a PDF.
   * Create Org B (e.g. Galgotias) without any PDF.
   * Ask Org B's assistant a question from Org A's document.
   * **Result:** Org B returns *"I could not find information regarding this in the uploaded documents for Galgotias."* (Zero data leakage).

2. **Hallucination Prevention Test:**
   * Ask the assistant an out-of-context question (e.g., *"What is the capital of France?"*).
   * **Result:** The assistant politely declines to answer general knowledge questions outside its uploaded documents.

---

## 📄 License
ISC
