terraform {
  required_version = ">= 1.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Variables
variable "cloud_provider" {
  description = "Cloud provider to deploy to (azure, aws, gcp)"
  type        = string
  default     = "azure"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "location" {
  description = "Cloud region/location (e.g., eastus for Azure, us-east-1 for AWS, us-central1 for GCP)"
  type        = string
  default     = "eastus"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "gcp_region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

# Azure Provider Configuration
provider "azurerm" {
  features {}
  skip_provider_registration = true
}

# AWS Provider Configuration
provider "aws" {
  region = var.aws_region
}

# GCP Provider Configuration
provider "google" {
  region = var.gcp_region
}

# Output the deployment information
output "deployment_info" {
  value = {
    cloud_provider = var.cloud_provider
    environment    = var.environment
    location       = var.location
  }
}
