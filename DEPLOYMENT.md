# Cloud Deployment Guide

This guide covers deploying the Diving Analytics Platform to various cloud providers.

## Table of Contents

- [Docker](#docker)
- [Azure](#azure-deployment)
- [AWS](#aws-deployment)
- [Google Cloud Platform](#gcp-deployment)
- [Kubernetes](#kubernetes-deployment)

## Docker

### Local Development with Docker Compose

1. Build and run the application:
```bash
docker-compose up -d
```

2. Access the application at `http://localhost:3000`

3. Stop the application:
```bash
docker-compose down
```

### Build Docker Image

```bash
docker build -t diving-analytics:latest .
```

### Run Docker Container

```bash
docker run -p 3000:3000 -e NODE_ENV=production diving-analytics:latest
```

## Azure Deployment

### Prerequisites
- Azure CLI installed
- Azure subscription
- kubectl installed

### Deploy with Bicep

1. Login to Azure:
```bash
az login
```

2. Create a resource group:
```bash
az group create --name diving-analytics-rg --location eastus
```

3. Deploy the infrastructure:
```bash
az deployment group create \
  --resource-group diving-analytics-rg \
  --template-file cloud/azure/bicep/main.bicep
```

4. Get AKS credentials:
```bash
az aks get-credentials --resource-group diving-analytics-rg --name diving-analytics-aks
```

5. Deploy the application:
```bash
kubectl apply -f k8s/
```

### Azure DevOps Pipeline

The `cloud/azure/azure-pipelines.yml` file contains the CI/CD pipeline configuration. Connect your repository to Azure DevOps to enable automated deployments.

## AWS Deployment

### Prerequisites
- AWS CLI installed
- AWS account with appropriate permissions
- kubectl installed

### Deploy with CloudFormation

1. Configure AWS credentials:
```bash
aws configure
```

2. Create ECR repository:
```bash
aws ecr create-repository --repository-name diving-analytics
```

3. Build and push Docker image:
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag diving-analytics:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/diving-analytics:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/diving-analytics:latest
```

4. Deploy the CloudFormation stack:
```bash
aws cloudformation create-stack \
  --stack-name diving-analytics \
  --template-body file://cloud/aws/cloudformation.yaml \
  --capabilities CAPABILITY_IAM
```

### AWS CodeBuild

The `cloud/aws/buildspec.yml` file contains the build specification for AWS CodeBuild. Configure CodeBuild to use this file for automated builds.

## GCP Deployment

### Prerequisites
- Google Cloud SDK installed
- GCP project created
- gcloud CLI configured

### Deploy to Cloud Run

1. Authenticate with GCP:
```bash
gcloud auth login
```

2. Set your project:
```bash
gcloud config set project YOUR_PROJECT_ID
```

3. Build and deploy using Cloud Build:
```bash
gcloud builds submit --config=cloud/gcp/cloudbuild.yaml
```

### Deploy to Google Kubernetes Engine (GKE)

1. Create a GKE cluster:
```bash
gcloud container clusters create diving-analytics-cluster \
  --num-nodes=3 \
  --zone=us-central1-a
```

2. Get cluster credentials:
```bash
gcloud container clusters get-credentials diving-analytics-cluster --zone=us-central1-a
```

3. Deploy the application:
```bash
kubectl apply -f k8s/
```

### App Engine Deployment

```bash
gcloud app deploy cloud/gcp/app.yaml
```

## Kubernetes Deployment

### Generic Kubernetes Cluster

1. Ensure kubectl is configured to connect to your cluster:
```bash
kubectl cluster-info
```

2. Create namespace (optional):
```bash
kubectl create namespace diving-analytics
```

3. Apply Kubernetes manifests:
```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

4. Check deployment status:
```bash
kubectl get pods -n diving-analytics
kubectl get services -n diving-analytics
```

5. Get the external IP:
```bash
kubectl get service diving-analytics-service -n diving-analytics
```

### Update Secrets

Before deploying to production, update the secrets in `k8s/secret.yaml` with your actual credentials:

```bash
# Encode your values
echo -n "your-database-url" | base64
echo -n "your-redis-url" | base64
echo -n "your-jwt-secret" | base64
```

Then update the secret.yaml file with the base64-encoded values.

## Environment Variables

The following environment variables should be configured:

- `NODE_ENV`: Environment mode (development, production)
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `PORT`: Application port (default: 3000)

## Monitoring and Logging

### Health Checks

The application exposes health check endpoints:
- `/health` - Liveness probe
- `/ready` - Readiness probe

### Logs

View logs in Kubernetes:
```bash
kubectl logs -f deployment/diving-analytics -n diving-analytics
```

## Scaling

### Kubernetes Horizontal Pod Autoscaler

Create an HPA:
```bash
kubectl autoscale deployment diving-analytics \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n diving-analytics
```

### Manual Scaling

Scale the deployment:
```bash
kubectl scale deployment diving-analytics --replicas=5 -n diving-analytics
```

## Security Considerations

1. Always use HTTPS in production
2. Store secrets in cloud provider secret management services (Azure Key Vault, AWS Secrets Manager, GCP Secret Manager)
3. Enable network policies in Kubernetes
4. Use private container registries
5. Implement proper RBAC policies
6. Enable audit logging
7. Regularly update base images and dependencies

## Troubleshooting

### Check Pod Status
```bash
kubectl describe pod <pod-name> -n diving-analytics
```

### View Pod Logs
```bash
kubectl logs <pod-name> -n diving-analytics
```

### Debug Container
```bash
kubectl exec -it <pod-name> -n diving-analytics -- /bin/sh
```

## Support

For issues and questions, please refer to the project repository or contact the development team.
