# Outputs

output "resource_group_name" {
  value       = azurerm_resource_group.main.name
  description = "Name of the resource group"
}

output "app_service_url" {
  value       = "https://${azurerm_linux_web_app.main.default_hostname}"
  description = "URL of the App Service"
}

output "app_service_name" {
  value       = azurerm_linux_web_app.main.name
  description = "Name of the App Service"
}

output "postgresql_server_fqdn" {
  value       = azurerm_postgresql_flexible_server.main.fqdn
  description = "FQDN of PostgreSQL server"
}

output "postgresql_database_name" {
  value       = azurerm_postgresql_flexible_server_database.main.name
  description = "Name of the PostgreSQL database"
}

output "storage_account_name" {
  value       = azurerm_storage_account.main.name
  description = "Name of the storage account"
}

output "key_vault_name" {
  value       = azurerm_key_vault.main.name
  description = "Name of the Key Vault"
}

output "key_vault_uri" {
  value       = azurerm_key_vault.main.vault_uri
  description = "URI of the Key Vault"
}

output "application_insights_instrumentation_key" {
  value       = azurerm_application_insights.main.instrumentation_key
  description = "Instrumentation key for Application Insights"
  sensitive   = true
}

output "application_insights_connection_string" {
  value       = azurerm_application_insights.main.connection_string
  description = "Connection string for Application Insights"
  sensitive   = true
}
