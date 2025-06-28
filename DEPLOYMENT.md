# Deployment Process

This document outlines the steps required to deploy the ClipsCommerce application to a production environment.

## Prerequisites

*   Docker and Docker Compose are installed on the deployment server.
*   A `.env.prod` file has been created with the production environment variables.
*   The production database is running and accessible from the deployment server.

## Deployment Steps

1.  **Pull the latest code:**

    ```bash
    git pull origin main
    ```

2.  **Build the production Docker image:**

    ```bash
    docker-compose -f docker-compose.prod.yml build
    ```

3.  **Start the production containers:**

    ```bash
    docker-compose -f docker-compose.prod.yml up -d
    ```

4.  **Run database migrations:**

    ```bash
    docker-compose -f docker-compose.prod.yml exec next-app npm run migrate
    ```

5.  **Verify the deployment:**

    Open a web browser and navigate to the application's URL. You should see the ClipsCommerce homepage.

## Rollback

To roll back to a previous version of the application, you will need to check out the previous version of the code and then repeat the deployment steps.
