## 🐳 Docker Deployment

SkyPANEL can be easily deployed using Docker. Follow these steps to build and run the application in a containerized environment.

### Prerequisites
- Docker installed on your system
- Docker Hub account (for pushing/pulling images)
- Environment variables configured in `.env` file

### Building the Docker Image

1. Build the Docker image:
   ```bash
   docker-compose build
   ```
   or
   ```bash
   docker build -t skyvps360/skypanel-app .
   ```
   or for a clean build using no cache:
   ```bash
   docker builder prune -f
   docker build --no-cache -t skyvps360/skypanel-app .
   ```
### Pushing to Docker Hub

1. Log in to Docker Hub:
   ```bash
   docker login
   ```

2. Tag the image (if not already tagged during build):
   ```bash
   docker tag skypanel-app skyvps360/skypanel-app:latest
   ```

3. Push the image to Docker Hub:
   ```bash
   docker push skyvps360/skypanel-app:latest
   ```

### Running the Container

1. Create a `.env` file with all required environment variables

2. Run the container:
   ```bash
   docker run -d -p 3333:3333 --env-file .env skyvps360/skypanel-app:latest
   ```

   The application will be available at `http://localhost:3333`

### Using Docker Compose

1. Ensure `docker-compose.yml` is configured with your environment
2. Start the services:
   ```bash
   docker-compose up -d
   ```

### Updating the Application

1. Pull the latest image:
   ```bash
   docker pull skyvps360/skypanel-app:latest
   ```

2. Recreate the container:
   ```bash
   docker-compose down
   docker-compose up -d
   ```
