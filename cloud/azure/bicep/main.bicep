@description('Location for all resources')
param location string = resourceGroup().location

@description('Name of the AKS cluster')
param aksClusterName string = 'diving-analytics-aks'

@description('DNS prefix for the AKS cluster')
param dnsPrefix string = 'diving-analytics'

@description('Number of nodes in the AKS cluster')
param agentCount int = 3

@description('VM size for the AKS nodes')
param agentVMSize string = 'Standard_D2s_v3'

@description('Container Registry name')
param acrName string = 'divinganalyticsacr'

resource aks 'Microsoft.ContainerService/managedClusters@2023-05-01' = {
  name: aksClusterName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    dnsPrefix: dnsPrefix
    agentPoolProfiles: [
      {
        name: 'agentpool'
        count: agentCount
        vmSize: agentVMSize
        mode: 'System'
      }
    ]
  }
}

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: {
    name: 'Standard'
  }
  properties: {
    adminUserEnabled: true
  }
}

// Grant AKS pull access to ACR
resource acrPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, aks.name, acr.name)
  scope: acr
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalId: aks.properties.identityProfile.kubeletidentity.objectId
    principalType: 'ServicePrincipal'
  }
}

output aksClusterName string = aks.name
output acrLoginServer string = acr.properties.loginServer
