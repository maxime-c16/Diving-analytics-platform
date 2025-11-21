# Azure-specific resources

resource "azurerm_resource_group" "main" {
  count    = var.cloud_provider == "azure" ? 1 : 0
  name     = "diving-analytics-${var.environment}-rg"
  location = var.location
}

resource "azurerm_container_registry" "acr" {
  count               = var.cloud_provider == "azure" ? 1 : 0
  name                = "divinganalytics${var.environment}acr"
  resource_group_name = azurerm_resource_group.main[0].name
  location            = azurerm_resource_group.main[0].location
  sku                 = "Standard"
  admin_enabled       = true
}

resource "azurerm_kubernetes_cluster" "aks" {
  count               = var.cloud_provider == "azure" ? 1 : 0
  name                = "diving-analytics-${var.environment}-aks"
  location            = azurerm_resource_group.main[0].location
  resource_group_name = azurerm_resource_group.main[0].name
  dns_prefix          = "divinganalytics${var.environment}"

  default_node_pool {
    name       = "default"
    node_count = 3
    vm_size    = "Standard_D2s_v3"
  }

  identity {
    type = "SystemAssigned"
  }
}

output "azure_acr_login_server" {
  value     = var.cloud_provider == "azure" ? azurerm_container_registry.acr[0].login_server : null
  sensitive = true
}

output "azure_aks_name" {
  value = var.cloud_provider == "azure" ? azurerm_kubernetes_cluster.aks[0].name : null
}
