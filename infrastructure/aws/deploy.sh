#!/bin/bash
# AWS Deployment Script for AI Customer Support Platform

set -e

# Default values
ENVIRONMENT="dev"
REGION="us-east-1"
STACK_NAME_PREFIX="ai-customer-support"
IMAGE_TAG="latest"
ACTION="deploy"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    -e|--environment)
      ENVIRONMENT="$2"
      shift
      shift
      ;;
    -r|--region)
      REGION="$2"
      shift
      shift
      ;;
    -t|--tag)
      IMAGE_TAG="$2"
      shift
      shift
      ;;
    -a|--action)
      ACTION="$2"
      shift
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  -e, --environment    Deployment environment (dev, staging, prod) [default: dev]"
      echo "  -r, --region         AWS region [default: us-east-1]"
      echo "  -t, --tag            Docker image tag [default: latest]"
      echo "  -a, --action         Action to perform (deploy, update, delete) [default: deploy]"
      echo "  -h, --help           Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Set stack names
MAIN_STACK_NAME="${STACK_NAME_PREFIX}-main-${ENVIRONMENT}"
MEMORY_ENGINE_STACK_NAME="${STACK_NAME_PREFIX}-memory-engine-${ENVIRONMENT}"
CHATBOT_CORE_STACK_NAME="${STACK_NAME_PREFIX}-chatbot-core-${ENVIRONMENT}"
ADMIN_DASHBOARD_STACK_NAME="${STACK_NAME_PREFIX}-admin-dashboard-${ENVIRONMENT}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
  echo "AWS CLI is not installed. Please install it first."
  exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
  echo "AWS credentials are not configured. Please run 'aws configure' first."
  exit 1
fi

# Function to deploy a CloudFormation stack
deploy_stack() {
  local stack_name=$1
  local template_file=$2
  local parameters=$3
  local capabilities=$4

  echo "Deploying stack: $stack_name"
  
  if aws cloudformation describe-stacks --stack-name $stack_name --region $REGION &> /dev/null; then
    echo "Stack $stack_name already exists, updating..."
    aws cloudformation update-stack \
      --stack-name $stack_name \
      --template-body file://$template_file \
      --parameters $parameters \
      --capabilities $capabilities \
      --region $REGION
  else
    echo "Creating new stack $stack_name..."
    aws cloudformation create-stack \
      --stack-name $stack_name \
      --template-body file://$template_file \
      --parameters $parameters \
      --capabilities $capabilities \
      --region $REGION
  fi
  
  echo "Waiting for stack $stack_name to complete..."
  aws cloudformation wait stack-create-complete --stack-name $stack_name --region $REGION || \
  aws cloudformation wait stack-update-complete --stack-name $stack_name --region $REGION
  
  echo "Stack $stack_name deployed successfully!"
}

# Function to delete a CloudFormation stack
delete_stack() {
  local stack_name=$1
  
  echo "Deleting stack: $stack_name"
  
  if aws cloudformation describe-stacks --stack-name $stack_name --region $REGION &> /dev/null; then
    aws cloudformation delete-stack --stack-name $stack_name --region $REGION
    echo "Waiting for stack $stack_name to be deleted..."
    aws cloudformation wait stack-delete-complete --stack-name $stack_name --region $REGION
    echo "Stack $stack_name deleted successfully!"
  else
    echo "Stack $stack_name does not exist, skipping deletion."
  fi
}

# Function to build and push Docker images
build_and_push_images() {
  local account_id=$(aws sts get-caller-identity --query Account --output text)
  
  # Get ECR repository URIs
  local chatbot_core_repo="${account_id}.dkr.ecr.${REGION}.amazonaws.com/ai-customer-support/chatbot-core-${ENVIRONMENT}"
  local memory_engine_repo="${account_id}.dkr.ecr.${REGION}.amazonaws.com/ai-customer-support/memory-engine-${ENVIRONMENT}"
  local admin_dashboard_repo="${account_id}.dkr.ecr.${REGION}.amazonaws.com/ai-customer-support/admin-dashboard-${ENVIRONMENT}"
  
  # Login to ECR
  echo "Logging in to ECR..."
  aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin ${account_id}.dkr.ecr.${REGION}.amazonaws.com
  
  # Build and push chatbot-core
  echo "Building and pushing chatbot-core image..."
  docker build -t ${chatbot_core_repo}:${IMAGE_TAG} -f ../../services/chatbot-core/Dockerfile ../../services/chatbot-core
  docker push ${chatbot_core_repo}:${IMAGE_TAG}
  
  # Build and push memory-engine
  echo "Building and pushing memory-engine image..."
  docker build -t ${memory_engine_repo}:${IMAGE_TAG} -f ../../memory-engine/Dockerfile ../../memory-engine
  docker push ${memory_engine_repo}:${IMAGE_TAG}
  
  # Build and push admin-dashboard
  echo "Building and pushing admin-dashboard image..."
  docker build -t ${admin_dashboard_repo}:${IMAGE_TAG} -f ../../frontend/admin-dashboard/Dockerfile ../../frontend/admin-dashboard
  docker push ${admin_dashboard_repo}:${IMAGE_TAG}
  
  echo "All images built and pushed successfully!"
}

# Main deployment logic
if [[ "$ACTION" == "deploy" || "$ACTION" == "update" ]]; then
  # Prompt for sensitive information
  read -sp "Enter OpenAI API Key: " OPENAI_API_KEY
  echo
  read -sp "Enter Memory Engine API Key: " MEMORY_ENGINE_API_KEY
  echo
  read -sp "Enter Redis Password: " REDIS_PASSWORD
  echo
  read -sp "Enter WhatsApp API Key (optional): " WHATSAPP_API_KEY
  echo
  
  # Get VPC information
  echo "Fetching VPC information..."
  VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region $REGION)
  
  # Get subnet information
  echo "Fetching subnet information..."
  PUBLIC_SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" "Name=map-public-ip-on-launch,Values=true" --query "Subnets[*].SubnetId" --output text --region $REGION | tr '\t' ',')
  PRIVATE_SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" "Name=map-public-ip-on-launch,Values=false" --query "Subnets[*].SubnetId" --output text --region $REGION | tr '\t' ',')
  
  # If no private subnets found, use public subnets
  if [[ -z "$PRIVATE_SUBNETS" ]]; then
    echo "No private subnets found, using public subnets for both..."
    PRIVATE_SUBNETS=$PUBLIC_SUBNETS
  fi
  
  # Build and push Docker images
  echo "Building and pushing Docker images..."
  build_and_push_images
  
  # Deploy main stack
  echo "Deploying main infrastructure stack..."
  deploy_stack $MAIN_STACK_NAME "cloudformation-main.yaml" \
    "ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
     ParameterKey=OpenAIApiKey,ParameterValue=$OPENAI_API_KEY \
     ParameterKey=MemoryEngineApiKey,ParameterValue=$MEMORY_ENGINE_API_KEY \
     ParameterKey=RedisPassword,ParameterValue=$REDIS_PASSWORD \
     ParameterKey=WhatsAppApiKey,ParameterValue=$WHATSAPP_API_KEY \
     ParameterKey=DockerImageTag,ParameterValue=$IMAGE_TAG \
     ParameterKey=VpcId,ParameterValue=$VPC_ID \
     ParameterKey=PublicSubnets,ParameterValue=\"$PUBLIC_SUBNETS\" \
     ParameterKey=PrivateSubnets,ParameterValue=\"$PRIVATE_SUBNETS\"" \
    "CAPABILITY_IAM"
  
  # Deploy memory engine stack
  echo "Deploying memory engine stack..."
  deploy_stack $MEMORY_ENGINE_STACK_NAME "memory-engine-service.yaml" \
    "ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
     ParameterKey=ParentStackName,ParameterValue=$MAIN_STACK_NAME \
     ParameterKey=DockerImageTag,ParameterValue=$IMAGE_TAG" \
    "CAPABILITY_IAM"
  
  # Deploy chatbot core stack
  echo "Deploying chatbot core stack..."
  deploy_stack $CHATBOT_CORE_STACK_NAME "chatbot-core-service.yaml" \
    "ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
     ParameterKey=ParentStackName,ParameterValue=$MAIN_STACK_NAME \
     ParameterKey=MemoryEngineStackName,ParameterValue=$MEMORY_ENGINE_STACK_NAME \
     ParameterKey=DockerImageTag,ParameterValue=$IMAGE_TAG" \
    "CAPABILITY_IAM"
  
  # Deploy admin dashboard stack
  echo "Deploying admin dashboard stack..."
  deploy_stack $ADMIN_DASHBOARD_STACK_NAME "admin-dashboard-service.yaml" \
    "ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
     ParameterKey=ParentStackName,ParameterValue=$MAIN_STACK_NAME \
     ParameterKey=ChatbotCoreStackName,ParameterValue=$CHATBOT_CORE_STACK_NAME \
     ParameterKey=MemoryEngineStackName,ParameterValue=$MEMORY_ENGINE_STACK_NAME \
     ParameterKey=DockerImageTag,ParameterValue=$IMAGE_TAG" \
    "CAPABILITY_IAM"
  
  # Get load balancer DNS name
  LB_DNS_NAME=$(aws cloudformation describe-stacks --stack-name $MAIN_STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerDnsName'].OutputValue" --output text --region $REGION)
  
  echo "Deployment completed successfully!"
  echo "Access your AI Customer Support Platform at: http://$LB_DNS_NAME"
  
elif [[ "$ACTION" == "delete" ]]; then
  # Delete stacks in reverse order
  echo "Deleting all stacks..."
  
  delete_stack $ADMIN_DASHBOARD_STACK_NAME
  delete_stack $CHATBOT_CORE_STACK_NAME
  delete_stack $MEMORY_ENGINE_STACK_NAME
  delete_stack $MAIN_STACK_NAME
  
  echo "All stacks deleted successfully!"
else
  echo "Unknown action: $ACTION"
  exit 1
fi
