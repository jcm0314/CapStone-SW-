terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

# 1. Enable Required GCP Cloud APIs
resource "google_project_service" "run_api" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "vertex_api" {
  service            = "aiplatform.googleapis.com"
  disable_on_destroy = false
}

# 2. Deploy Frontend Service on GCP Cloud Run
resource "google_cloud_run_service" "frontend" {
  name     = "hr-evaluator-frontend"
  location = var.gcp_region

  template {
    spec {
      containers {
        image = "gcr.io/${var.gcp_project_id}/hr-evaluator-frontend:latest"
        resources {
          limits = {
            memory = "256Mi"
            cpu    = "1000m"
          }
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [google_project_service.run_api]
}

# Allow Public Unauthenticated Access for Frontend Web
resource "google_cloud_run_service_iam_member" "frontend_public" {
  location = google_cloud_run_service.frontend.location
  project  = google_cloud_run_service.frontend.project
  service  = google_cloud_run_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# 3. Deploy API Gateway Service on GCP Cloud Run
resource "google_cloud_run_service" "api_gateway" {
  name     = "hr-evaluator-api-gateway"
  location = var.gcp_region

  template {
    spec {
      containers {
        image = "gcr.io/${var.gcp_project_id}/hr-evaluator-api-gateway:latest"
        env {
          name  = "NODE_ENV"
          value = "production"
        }
        resources {
          limits = {
            memory = "512Mi"
            cpu    = "1000m"
          }
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [google_project_service.run_api]
}

output "frontend_url" {
  description = "GCP Cloud Run Production Live URL for Frontend"
  value       = google_cloud_run_service.frontend.status[0].url
}

output "api_gateway_url" {
  description = "GCP Cloud Run Live URL for Express API Gateway"
  value       = google_cloud_run_service.api_gateway.status[0].url
}
