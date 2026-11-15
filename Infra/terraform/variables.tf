variable "gcp_project_id" {
  description = "Google Cloud Platform Project ID"
  type        = string
  default     = "hr-evaluator-production"
}

variable "gcp_region" {
  description = "GCP Cloud Region for deployment (e.g. asia-northeast3 for Seoul)"
  type        = string
  default     = "asia-northeast3"
}
