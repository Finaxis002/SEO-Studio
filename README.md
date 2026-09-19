# SEO Studio

An all-in-one SEO and Content Management platform built with **Next.js**, **MongoDB**, **Tailwind CSS**, and **Google AI (Gemini)**.

## 🚀 Features

- **Dashboard**: High-level SEO metrics, organic search insights, and performance overview.
- **Blog & Content Editor**: Rich text editor with SEO scoring, readability analysis, and AI-assisted content generation.
- **Keywords Management**: Track ranking keywords, search volume, difficulty, and intent.
- **Media Library**: Integrated with Cloudinary for fast, optimized image uploads and management.
- **Analytics**: Google Analytics 4 (GA4) and Google Search Console (GSC) reporting.
- **Team & Permissions**: Role-based access control (Admin, Editor, Viewer).
- **Dark / Light Mode**: Seamless theme switching with `next-themes`.

---

## 🛠 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Database**: [MongoDB](https://www.mongodb.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Radix UI](https://www.radix-ui.com/)
- **AI Integration**: [Google Gemini API](https://ai.google.dev/)
- **Cloud Storage**: [Cloudinary](https://cloudinary.com/)
- **Analytics**: Google Analytics Data API & Google Search Console API

---

## ⚙️ Getting Started

### 1. Prerequisites

- Node.js 18+ installed
- MongoDB instance (local or MongoDB Atlas)

### 2. Installation

Clone the repository and install dependencies:

```bash
npm install
# or
yarn install
```

### 3. Environment Configuration

Copy the sample `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your configuration in `.env`:

```env
MONGODB_URI=your-mongodb-connection-string
DB_NAME=seo_studio
AUTH_SECRET=your-random-secret
SEED_USER_PASSWORD=your-password
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=seo-studio
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_SERVICE_ACCOUNT_JSON=./secrets/your-service-account.json
GA4_PROPERTY_ID=your-ga4-id
GSC_SITE_URL=https://example.com/
```

### 4. Run Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Security & Secrets

Do **NOT** commit your `.env` or files in the `secrets/` directory. These are already excluded by `.gitignore`. Always use `.env.example` for environment variable templates.
