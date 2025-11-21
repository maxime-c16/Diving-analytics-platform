# Diving Analytics Platform

A comprehensive analytics platform for diving operations and data management.

## Overview

Diving Software Inc. presents the Diving Analytics Platform - a cloud-native solution for diving data analytics, monitoring, and management.

## Features

- Real-time diving analytics
- Data visualization and reporting
- Cloud-native architecture
- Scalable deployment options
- Multi-cloud support (Azure, AWS, GCP)
- Containerized deployment with Docker
- Kubernetes orchestration support

## Quick Start

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/maxime-c16/Diving-analytics-platform.git
cd Diving-analytics-platform
```

2. Run with Docker Compose:
```bash
docker-compose up -d
```

3. Access the application at `http://localhost:3000`

## Deployment

This platform supports deployment to multiple cloud providers:

- **Azure**: Azure Kubernetes Service (AKS) with Azure Container Registry
- **AWS**: Amazon ECS/EKS with Elastic Container Registry
- **GCP**: Google Kubernetes Engine or Cloud Run

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

## Architecture

- **Application Layer**: Node.js application
- **Database**: PostgreSQL
- **Cache**: Redis
- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **CI/CD**: Azure Pipelines, AWS CodeBuild, Google Cloud Build

## Project Structure

```
.
├── Dockerfile              # Container image definition
├── docker-compose.yml      # Local development stack
├── k8s/                    # Kubernetes manifests
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   └── secret.yaml
├── cloud/                  # Cloud provider configurations
│   ├── azure/
│   ├── aws/
│   └── gcp/
└── DEPLOYMENT.md          # Deployment guide
```

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## License

© Diving Software Inc. All rights reserved.

## Support

For questions and support, please open an issue in the repository.
