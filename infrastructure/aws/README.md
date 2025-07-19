# AWS Deployment Infrastructure for AI Customer Support Platform

This directory contains CloudFormation templates and deployment scripts for deploying the AI Customer Support Platform on AWS.

## Architecture Overview

The deployment architecture consists of the following components:

1. **Main Stack (`cloudformation-main.yaml`)**
   - ECS Cluster with Fargate and Fargate Spot capacity providers
   - ECR Repositories for all services
   - CloudWatch Log Groups
   - Security Groups for load balancer and services
   - IAM Roles including ECS Task Execution Role
   - AWS Secrets Manager for sensitive environment variables
   - Application Load Balancer with HTTP and HTTPS listeners
   - Target Groups for routing traffic to services

2. **Memory Engine Service Stack (`memory-engine-service.yaml`)**
   - ECS Task Definition for Memory Engine service
   - ECS Task Definition for ChromaDB service
   - ECS Task Definition for Redis service
   - EFS File Systems for persistent storage
   - ECS Services for Memory Engine, ChromaDB, and Redis
   - Service Discovery for internal service communication

3. **Chatbot Core Service Stack (`chatbot-core-service.yaml`)**
   - ECS Task Definition for Chatbot Core service
   - ECS Service for Chatbot Core
   - Auto Scaling configuration
   - CloudWatch Alarms for monitoring

4. **Admin Dashboard Service Stack (`admin-dashboard-service.yaml`)**
   - ECS Task Definition for Admin Dashboard service
   - ECS Service for Admin Dashboard
   - CloudWatch Alarms for monitoring

## Prerequisites

Before deploying the platform, ensure you have:

1. AWS CLI installed and configured with appropriate credentials
2. Docker installed for building and pushing images
3. The following information ready:
   - OpenAI API Key
   - Memory Engine API Key (can be generated)
   - Redis Password (can be generated)
   - WhatsApp API Key (optional)
   - VPC ID and subnet IDs for deployment
   - SSL Certificate ARN (optional, for HTTPS support)

## Deployment Instructions

### Option 1: Using the Deployment Script

The `deploy.sh` script automates the deployment process:

```bash
# Make the script executable
chmod +x deploy.sh

# Deploy to development environment
./deploy.sh --environment dev --region us-east-1 --tag latest --action deploy

# Deploy to production environment
./deploy.sh --environment prod --region us-east-1 --tag v1.0.0 --action deploy

# Delete the deployment
./deploy.sh --environment dev --region us-east-1 --action delete
```

### Option 2: Manual Deployment

If you prefer to deploy manually:

1. **Create ECR repositories and push Docker images**

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push images
docker build -t <account-id>.dkr.ecr.us-east-1.amazonaws.com/ai-customer-support/chatbot-core-dev:latest -f ../../services/chatbot-core/Dockerfile ../../services/chatbot-core
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/ai-customer-support/chatbot-core-dev:latest

# Repeat for memory-engine and admin-dashboard
```

2. **Deploy CloudFormation stacks**

```bash
# Deploy main stack
aws cloudformation create-stack \
  --stack-name ai-customer-support-main-dev \
  --template-body file://cloudformation-main.yaml \
  --parameters ParameterKey=Environment,ParameterValue=dev \
               ParameterKey=OpenAIApiKey,ParameterValue=<your-openai-api-key> \
               ParameterKey=MemoryEngineApiKey,ParameterValue=<your-memory-engine-api-key> \
               ParameterKey=RedisPassword,ParameterValue=<your-redis-password> \
               ParameterKey=DockerImageTag,ParameterValue=latest \
               ParameterKey=VpcId,ParameterValue=<your-vpc-id> \
               ParameterKey=PublicSubnets,ParameterValue=<your-public-subnets> \
               ParameterKey=PrivateSubnets,ParameterValue=<your-private-subnets> \
  --capabilities CAPABILITY_IAM

# Wait for stack creation to complete
aws cloudformation wait stack-create-complete --stack-name ai-customer-support-main-dev

# Deploy memory-engine stack
aws cloudformation create-stack \
  --stack-name ai-customer-support-memory-engine-dev \
  --template-body file://memory-engine-service.yaml \
  --parameters ParameterKey=Environment,ParameterValue=dev \
               ParameterKey=ParentStackName,ParameterValue=ai-customer-support-main-dev \
               ParameterKey=DockerImageTag,ParameterValue=latest \
  --capabilities CAPABILITY_IAM

# Deploy remaining stacks similarly
```

## Stack Parameters

### Main Stack Parameters

| Parameter | Description |
|-----------|-------------|
| Environment | Deployment environment (dev, staging, prod) |
| OpenAIApiKey | OpenAI API Key |
| MemoryEngineApiKey | Memory Engine API Key |
| RedisPassword | Redis password |
| WhatsAppApiKey | WhatsApp API Key (optional) |
| DockerImageTag | Docker image tag to deploy |
| VpcId | VPC ID where resources will be deployed |
| PublicSubnets | Public subnets for load balancers |
| PrivateSubnets | Private subnets for ECS tasks |
| SSLCertificateArn | ARN of SSL certificate for HTTPS (optional) |

### Memory Engine Stack Parameters

| Parameter | Description |
|-----------|-------------|
| Environment | Deployment environment |
| ParentStackName | Name of the parent stack |
| DockerImageTag | Docker image tag to deploy |
| MemoryEnginePort | Port for Memory Engine service (default: 8000) |
| ChromaDBPort | Port for ChromaDB service (default: 8001) |
| RedisPort | Port for Redis service (default: 6379) |
| TaskCpu | CPU units for the task (default: 1024) |
| TaskMemory | Memory for the task in MB (default: 2048) |
| DesiredCount | Desired count of tasks (default: 1) |

### Chatbot Core Stack Parameters

| Parameter | Description |
|-----------|-------------|
| Environment | Deployment environment |
| ParentStackName | Name of the parent stack |
| MemoryEngineStackName | Name of the memory engine stack |
| DockerImageTag | Docker image tag to deploy |
| ChatbotCorePort | Port for Chatbot Core service (default: 8080) |
| TaskCpu | CPU units for the task (default: 1024) |
| TaskMemory | Memory for the task in MB (default: 2048) |
| DesiredCount | Desired count of tasks (default: 2) |
| AutoScalingMinCapacity | Minimum capacity for auto scaling (default: 2) |
| AutoScalingMaxCapacity | Maximum capacity for auto scaling (default: 10) |
| CPUUtilizationThreshold | CPU utilization threshold for scaling (default: 70) |

### Admin Dashboard Stack Parameters

| Parameter | Description |
|-----------|-------------|
| Environment | Deployment environment |
| ParentStackName | Name of the parent stack |
| ChatbotCoreStackName | Name of the chatbot core stack |
| MemoryEngineStackName | Name of the memory engine stack |
| DockerImageTag | Docker image tag to deploy |
| AdminDashboardPort | Port for Admin Dashboard service (default: 3000) |
| TaskCpu | CPU units for the task (default: 1024) |
| TaskMemory | Memory for the task in MB (default: 2048) |
| DesiredCount | Desired count of tasks (default: 2) |

## Security Considerations

1. **API Keys and Secrets**: All sensitive information is stored in AWS Secrets Manager and securely injected into containers at runtime.
2. **Network Security**: Services run in private subnets and communicate through Service Discovery. Only the load balancer is exposed publicly.
3. **HTTPS**: HTTPS is enforced when an SSL certificate is provided.
4. **IAM Roles**: Least privilege principle is applied to IAM roles.
5. **Security Groups**: Inbound traffic is restricted to necessary ports and sources.

## Monitoring and Logging

1. **CloudWatch Logs**: All container logs are sent to CloudWatch Logs with a 30-day retention period.
2. **CloudWatch Alarms**: CPU utilization alarms are configured for services.
3. **Health Checks**: Health checks are configured for all services and target groups.

## Scaling

1. **Auto Scaling**: Chatbot Core service is configured with auto scaling based on CPU utilization.
2. **Fargate Spot**: The ECS cluster is configured to use Fargate Spot for cost optimization.

## Troubleshooting

1. **Deployment Failures**: Check CloudFormation events for error messages.
2. **Service Failures**: Check CloudWatch Logs for container logs.
3. **Health Check Failures**: Verify that health check endpoints are responding correctly.
4. **Connectivity Issues**: Verify security group rules and network configuration.

## Cost Optimization

1. **Fargate Spot**: Use Fargate Spot for non-critical workloads.
2. **Auto Scaling**: Configure appropriate scaling policies to scale down during low traffic periods.
3. **Log Retention**: Adjust log retention periods based on requirements.
4. **Resource Allocation**: Adjust CPU and memory allocations based on actual usage.

## Future Enhancements

1. **CI/CD Integration**: Integrate with CI/CD pipelines for automated deployments.
2. **Multi-Region Deployment**: Extend templates for multi-region deployment.
3. **Backup and Disaster Recovery**: Implement backup and disaster recovery solutions.
4. **Enhanced Monitoring**: Add custom metrics and dashboards.
5. **WAF Integration**: Add AWS WAF for additional security.
