# Clothing-Inspection Full-Stack Project

Monorepo containing a React front-end and Node/Express/Sequelize back-end.

## Structure

```
ai_001/
 ├ clothing-inspection-backend/   # Express + Sequelize API
 ├ clothing-inspection-frontend/  # React (CRA) web app
 └ uploads/                       # runtime file uploads (ignored)
```

## Prerequisites

* Node.js ≥ 18
* MySQL 8 (or compatible)
* Git

## Quick Start

1. **Clone & install**
   ```bash
   git clone https://github.com/sprjihoon/ap_002.git
   cd ai_001
   npm install           # root dev-tools (optional)
   ```

2. **Create database & .env**
   MySQL example:
   ```sql
   CREATE DATABASE clothing_inspection CHARACTER SET utf8mb4;
   CREATE USER 'ci_user'@'%' IDENTIFIED BY 'secret';
   GRANT ALL PRIVILEGES ON clothing_inspection.* TO 'ci_user'@'%';
   ```
   `.env` (root or backend folder)
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=clothing_inspection
   DB_USER=ci_user
   DB_PASS=secret

   JWT_SECRET=mySuperSecret
   SMTP_HOST=smtp.example.com
   SMTP_USER=notice@example.com
   SMTP_PASS=smtpPassword
   SMTP_PORT=465
   SMTP_SECURE=true
   ```

3. **Run migrations**
   ```bash
   cd clothing-inspection-backend
   npx sequelize-cli db:migrate
   ```

4. **Start development**
   ```bash
   # in one terminal
   cd clothing-inspection-backend && npm run dev

   # in another terminal
   cd clothing-inspection-frontend && npm start
   ```
   Front-end: http://localhost:3000  |  API: http://localhost:3002

## Production via Docker Compose
A sample `docker-compose.yml` is provided in docs/docker-compose.sample.yml to run MySQL, API, and built static front-end behind Nginx.

```bash
docker compose -f docs/docker-compose.sample.yml up --build -d
```

## Security Notes
* **Secrets** (DB, JWT, SMTP) are sourced from environment variables – never commit them.
* `.gitignore` excludes uploads, node_modules, build artefacts, and any *.env files.

## License
MIT 