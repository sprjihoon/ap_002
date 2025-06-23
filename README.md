# Clothing-Inspection Full-Stack Project

Monorepo containing a React front-end and Node/Express/Sequelize back-end.

## Structure

```
ap_002/
 ├ clothing-inspection-backend/   # Express + Sequelize API
 ├ clothing-inspection-frontend/  # React (CRA) web app
 ├ uploads/                       # runtime file uploads (ignored)
 ├ docker-compose.yml            # Docker Compose configuration
 └ env.example                   # Environment variables template
```

## Prerequisites

* Node.js ≥ 18
* MySQL 8 (or compatible)
* Git
* Docker & Docker Compose (for production deployment)

## Quick Start

1. **Clone & install**
   ```bash
   git clone https://github.com/sprjihoon/ap_002.git
   cd ap_002
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

## Production Deployment with Docker Compose

### Prerequisites
- Docker and Docker Compose installed
- Ports 80, 3000, 3002, 3306 available

### Quick Deployment

1. **Setup environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your production values
   ```

2. **Start all services**
   ```bash
   docker-compose up -d --build
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3002
   - MySQL: localhost:3306

### Services Included
- **MySQL 8.0**: Database server
- **Backend**: Node.js/Express API server
- **Frontend**: React app served by Nginx
- **Nginx**: Reverse proxy (optional, ports 80/443)

### Environment Variables
Copy `env.example` to `.env` and configure:
```env
# Database
DB_ROOT_PASSWORD=your-root-password
DB_NAME=clothing_inspection
DB_USER=clothing_user
DB_PASSWORD=your-db-password

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_DISABLED=true
```

### Useful Commands
```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Access MySQL
docker-compose exec mysql mysql -u root -p

# Access backend container
docker-compose exec backend sh

# Backup database
docker-compose exec mysql mysqldump -u root -p clothing_inspection > backup.sql
```

## Security Notes
* **Secrets** (DB, JWT, SMTP) are sourced from environment variables – never commit them.
* `.gitignore` excludes uploads, node_modules, build artefacts, and any *.env files.
* Production deployments should use proper SSL certificates and secure database passwords.

## License
MIT 