# ⚡ TaskFlow — Project Management App

A full-stack project management application with role-based access control, built with **React + Node.js + SQLite**.

---

## 🖥️ What to Install on Your Laptop (One-Time Setup)

### 1. Node.js (v18 or higher)
👉 Download from: https://nodejs.org  
Choose the **LTS** version. This also installs `npm` automatically.

**Verify install:**
```bash
node --version   # should show v18+
npm --version    # should show 9+
```

### 2. Git
👉 Download from: https://git-scm.com  

**Verify install:**
```bash
git --version
```

### 3. Railway CLI (for deployment)
```bash
npm install -g @railway/cli
```

**Verify install:**
```bash
railway --version
```

That's it! SQLite is bundled with the project — no database server needed.

---

## 🚀 Running the Project Locally

### Step 1: Set up the project
```bash
# Navigate into the project
cd taskflow

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2: Start the backend
```bash
cd backend
npm run dev
```
The API will start at **http://localhost:5000**

### Step 3: Start the frontend (new terminal)
```bash
cd frontend
npm run dev
```
The app will open at **http://localhost:5173**

### Step 4: Create an account
Open http://localhost:5173 in your browser, click "Sign up", and create:
- An **Admin** account (for full access)
- A **Member** account (to test role restrictions)

---

## 🌐 Deploying to Railway

### Step 1: Create a GitHub repo
```bash
cd taskflow
git init
git add .
git commit -m "Initial commit: TaskFlow app"
```

Go to https://github.com/new and create a new repo, then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/taskflow.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Railway
1. Go to https://railway.app and sign up/login
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your `taskflow` repo
4. Railway will auto-detect the `railway.toml` config

### Step 3: Set environment variables in Railway
In the Railway dashboard → your service → **Variables** tab, add:
```
JWT_SECRET=your-super-secret-key-minimum-32-chars
NODE_ENV=production
```

### Step 4: Get your live URL
Railway provides a URL like `https://taskflow-production.up.railway.app`

Your app is live! 🎉

---

## 🏗️ Project Structure

```
taskflow/
├── backend/
│   ├── server.js          # Express app entry point
│   ├── db.js              # SQLite database & schema
│   ├── middleware/
│   │   └── auth.js        # JWT + RBAC middleware
│   └── routes/
│       ├── auth.js        # Signup, login, /me
│       ├── projects.js    # CRUD + member management
│       ├── tasks.js       # Task CRUD + comments
│       └── dashboard.js   # Stats & analytics
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Projects.jsx
│   │   │   └── ProjectDetail.jsx
│   │   ├── components/
│   │   │   └── Layout.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── api.js         # Axios client
│   │   └── App.jsx        # Router
│   └── index.html
├── railway.toml           # Railway deployment config
├── package.json           # Root scripts
└── README.md
```

---

## 🔐 API Endpoints

### Authentication
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /api/auth/signup | Register new user | Public |
| POST | /api/auth/login | Login | Public |
| GET | /api/auth/me | Get current user | Auth |
| GET | /api/auth/users | List all users | Auth |

### Projects
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/projects | List user's projects | Auth |
| POST | /api/projects | Create project | Auth |
| GET | /api/projects/:id | Get project details | Member+ |
| PUT | /api/projects/:id | Update project | Project Admin |
| DELETE | /api/projects/:id | Delete project | Project Admin |
| POST | /api/projects/:id/members | Add member | Project Admin |
| DELETE | /api/projects/:id/members/:uid | Remove member | Project Admin |

### Tasks
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/projects/:pid/tasks | List tasks | Member+ |
| POST | /api/projects/:pid/tasks | Create task | Member+ |
| PUT | /api/projects/:pid/tasks/:id | Update task | Assignee/Admin |
| DELETE | /api/projects/:pid/tasks/:id | Delete task | Project Admin |
| POST | /api/projects/:pid/tasks/:id/comments | Add comment | Member+ |

### Dashboard
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/dashboard | Get stats & analytics | Auth |

---

## 🛡️ Role-Based Access Control

| Permission | Global Admin | Project Admin | Member |
|------------|:---:|:---:|:---:|
| View all projects | ✅ | ❌ | ❌ |
| Create projects | ✅ | ✅ | ✅ |
| Edit/delete any project | ✅ | Own only | ❌ |
| Add/remove members | ✅ | ✅ | ❌ |
| Create tasks | ✅ | ✅ | ✅ |
| Edit any task | ✅ | ✅ | Own assigned only |
| Delete tasks | ✅ | ✅ | ❌ |

---

## 🧪 Test the App

1. **Sign up** as Admin and as Member (use different emails)
2. **Create a project** as Admin
3. **Add the Member** to the project
4. **Create tasks** and assign them to Member
5. **Login as Member** — verify they can only update their tasks
6. **Check Dashboard** for real-time stats

---

## ⚙️ Tech Stack

- **Frontend**: React 18, React Router v6, Axios, Lucide React, Vite
- **Backend**: Node.js, Express 4, better-sqlite3, JWT, bcryptjs
- **Database**: SQLite (file-based, zero config)
- **Deployment**: Railway (with nixpacks auto-build)
