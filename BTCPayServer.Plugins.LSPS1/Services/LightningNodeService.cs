using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BTCPayServer.Configuration;
using BTCPayServer.Data;
using BTCPayServer.Lightning;
using BTCPayServer.Payments;
using BTCPayServer.Payments.Lightning;
using BTCPayServer.Services;
using BTCPayServer.Services.Invoices;
using BTCPayServer.Services.Stores;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BTCPayServer.Plugins.LSPS1.Services
{
    public class LightningNodeService
    {
        private readonly ILogger<LightningNodeService> _logger;
        private readonly LightningClientFactoryService _lightningClientFactory;
        private readonly BTCPayNetworkProvider _networkProvider;
        private readonly IOptions<LightningNetworkOptions> _lightningNetworkOptions;
        private readonly StoreRepository _storeRepository;
        private readonly PaymentMethodHandlerDictionary _handlers;

        public LightningNodeService(
            ILogger<LightningNodeService> logger,
            LightningClientFactoryService lightningClientFactory,
            BTCPayNetworkProvider networkProvider,
            IOptions<LightningNetworkOptions> lightningNetworkOptions,
            StoreRepository storeRepository,
            PaymentMethodHandlerDictionary handlers)
        {
            _logger = logger;
            _lightningClientFactory = lightningClientFactory;
            _networkProvider = networkProvider;
            _lightningNetworkOptions = lightningNetworkOptions;
            _storeRepository = storeRepository;
            _handlers = handlers;
        }

        public async Task<string?> GetNodePublicKey(StoreData store)
        {
            try
            {
                // Get store ID for logging
                string storeId = store.Id;
                
                _logger.LogInformation("Attempting to retrieve Lightning node public key for store {StoreId}", storeId);
                
                // Direct approach: Get node info using ILightningClient which is the most reliable way
                // This directly maps to the "id" field in lightning-cli getinfo for Core Lightning
                try
                {
                    // Get the Lightning client
                    var client = GetLightningClient(store);
                    if (client != null)
                    {
                        _logger.LogInformation("Retrieving node info directly from Lightning client");
                        var nodeInfo = await client.GetInfo();
                        
                        // Log the complete nodeInfo object for debugging
                        _logger.LogDebug("Complete GetInfo response: {@NodeInfo}", nodeInfo);
                        
                        // Log each node in NodeInfoList if available
                        if (nodeInfo?.NodeInfoList != null)
                        {
                            foreach (var node in nodeInfo.NodeInfoList)
                            {
                                _logger.LogDebug("Node info detail: NodeId={NodeId}", 
                                    node.NodeId);
                            }
                        }
                        else
                        {
                            _logger.LogWarning("GetInfo response contains null or empty NodeInfoList");
                        }

                        // For Core Lightning, the NodeId is available in the NodeInfoList (corresponds to 'id' in getinfo)
                        var firstNode = nodeInfo?.NodeInfoList?.FirstOrDefault();
                        if (firstNode?.NodeId != null)
                        {
                            string pubKey = firstNode.NodeId.ToString();
                            _logger.LogInformation("Successfully retrieved Lightning node public key directly: {PubKey}", pubKey);
                            return pubKey;
                        }
                        
                        _logger.LogWarning("Lightning client.GetInfo() did not return a valid NodeId");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("Error retrieving node info directly: {Message}", ex.Message);
                }
                
                // Fallback: Try via lightning payment handler if direct approach fails
                var paymentMethodId = PaymentTypes.LN.GetPaymentMethodId("BTC");
                
                // Check if handler exists for the payment method
                if (_handlers.TryGet(paymentMethodId) is not LightningLikePaymentHandler handler)
                {
                    _logger.LogWarning("Lightning payment handler not found for store {StoreId}", storeId);
                    return null;
                }
                
                // Get Lightning config from store
                var lightningConfig = store.GetPaymentMethodConfig<LightningPaymentMethodConfig>(
                    paymentMethodId, 
                    _handlers);
                    
                if (lightningConfig == null)
                {
                    _logger.LogWarning("Store {StoreId} has no Lightning configuration", storeId);
                    return null;
                }
                
                _logger.LogInformation("Found Lightning configuration for store {StoreId}, trying handler approach", storeId);
                
                try
                {
                    // Get node info using the handler
                    var nodeInfoList = await handler.GetNodeInfo(lightningConfig, null);
                    
                    if (nodeInfoList.Any())
                    {
                        _logger.LogInformation("Retrieved {Count} node info entries via handler", nodeInfoList.Count());
                        
                        // Extract the NodeId directly from the first node info
                        var firstNodeInfo = nodeInfoList.First();
                        if (firstNodeInfo.NodeId != null)
                        {
                            string pubKey = firstNodeInfo.NodeId.ToString();
                            _logger.LogInformation("Successfully retrieved Lightning node public key from handler: {PubKey}", pubKey);
                            return pubKey;
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("Error retrieving node info via handler: {Message}", ex.Message);
                }
                
                _logger.LogWarning("Could not extract public key from Lightning node for store {StoreId}", storeId);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving Lightning node public key for store {StoreId}: {Message}", store.Id, ex.Message);
                return null;
            }
        }

        public ILightningClient? GetLightningClient(StoreData store)
        {
            try
            {
                // Following exactly how UIPublicLightningNodeInfoController does it
                var paymentMethodId = PaymentTypes.LN.GetPaymentMethodId("BTC");
                
                // Check if handler exists for the payment method
                if (_handlers.TryGet(paymentMethodId) is not LightningLikePaymentHandler handler)
                {
                    _logger.LogWarning("Lightning payment handler not found for store {StoreId}", store.Id);
                    return null;
                }
                
                // Get Lightning config from store
                var lightningConfig = store.GetPaymentMethodConfig<LightningPaymentMethodConfig>(
                    paymentMethodId, 
                    _handlers);
                    
                if (lightningConfig == null)
                {
                    _logger.LogWarning("Store {StoreId} has no Lightning configuration", store.Id);
                    return null;
                }

                // Get the network for BTC
                var network = _networkProvider.GetNetwork<BTCPayNetwork>("BTC");
                
                // Create the Lightning client
                return lightningConfig.CreateLightningClient(network, 
                    _lightningNetworkOptions.Value, 
                    _lightningClientFactory);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating Lightning client for store {StoreId}: {Message}", 
                    store.Id, ex.Message);
                return null;
            }
        }

        public async Task<bool> ConnectToNode(StoreData store, string nodeUri, CancellationToken cancellationToken = default)
        {
            try
            {
                _logger.LogInformation("Attempting to connect to Lightning node {NodeUri} for store {StoreId}", nodeUri, store.Id);
                
                // Get Lightning client for this store
                var lightningClient = GetLightningClient(store);
                if (lightningClient == null)
                {
                    _logger.LogWarning("Could not get Lightning client for store {StoreId}", store.Id);
                    return false;
                }
                
                // Convert string URI to NodeInfo
                if (!NodeInfo.TryParse(nodeUri, out var nodeInfo))
                {
                    _logger.LogWarning("Invalid node URI format: {Uri}", nodeUri);
                    return false;
                }
                
                // Connect to the node
                var result = await lightningClient.ConnectTo(nodeInfo, cancellationToken);
                bool success = result == ConnectionResult.Ok;
                
                if (success)
                    _logger.LogInformation("Successfully connected to Lightning node {NodeUri} for store {StoreId}", nodeUri, store.Id);
                else
                    _logger.LogWarning("Failed to connect to Lightning node {NodeUri} for store {StoreId}", nodeUri, store.Id);
                    
                return success;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error connecting to Lightning node {NodeUri} for store {StoreId}: {Message}", 
                    nodeUri, store.Id, ex.Message);
                return false;
            }
        }
        
        public async Task<IEnumerable<LightningChannel>> GetLightningChannels(StoreData store, CancellationToken cancellationToken = default)
        {
            try
            {
                _logger.LogInformation("Retrieving Lightning channels for store {StoreId}", store.Id);
                
                // Get Lightning client for this store
                var lightningClient = GetLightningClient(store);
                if (lightningClient == null)
                {
                    _logger.LogWarning("Could not get Lightning client for store {StoreId}", store.Id);
                    return Array.Empty<LightningChannel>();
                }

                _logger.LogDebug("Obtained Lightning client {ClientType}, about to call ListChannels", lightningClient.GetType().Name);
                
                // Get the list of channels
                LightningChannel[] channels;
                try 
                {
                    channels = await lightningClient.ListChannels(cancellationToken);
                }
                catch (NotSupportedException)
                {
                    _logger.LogWarning("ListChannels not supported by lightning client {ClientType}", lightningClient.GetType().Name);
                    return Array.Empty<LightningChannel>();
                }
                catch (NullReferenceException ex)
                {
                    _logger.LogWarning("ListChannels threw NullReferenceException from client {ClientType}: {Message}", 
                        lightningClient.GetType().Name, ex.Message);
                    return Array.Empty<LightningChannel>();
                }
                
                // Log the channels response
                _logger.LogDebug("Raw ListChannels response: {@Channels}", channels);
                
                if (channels == null)
                {
                    _logger.LogWarning("ListChannels returned null for store {StoreId}", store.Id);
                    return Array.Empty<LightningChannel>();
                }

                // Log details of each channel
                foreach (var channel in channels)
                {
                    _logger.LogDebug("Channel details: RemoteNode={RemoteNode}, Capacity={Capacity}, IsActive={IsActive}, IsPublic={IsPublic}", 
                        channel.RemoteNode,
                        channel.Capacity,
                        channel.IsActive,
                        channel.IsPublic);
                }
                
                _logger.LogInformation("Retrieved {Count} Lightning channels for store {StoreId}", 
                    channels.Length, store.Id);
                
                return channels;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving Lightning channels for store {StoreId}: {Message}", 
                    store.Id, ex.Message);
                return Array.Empty<LightningChannel>();
            }
        }

        public async Task<StoreData?> GetStore(string storeId)
        {
            try
            {
                var store = await _storeRepository.FindStore(storeId);
                if (store == null)
                {
                    _logger.LogWarning("Store with ID {StoreId} not found", storeId);
                }
                return store;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving store {StoreId}: {Message}", storeId, ex.Message);
                return null;
            }
        }
    }
}