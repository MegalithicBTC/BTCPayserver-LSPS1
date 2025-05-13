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
                
                // Following exactly how UIPublicLightningNodeInfoController does it
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
                
                _logger.LogInformation("Found Lightning configuration for store {StoreId}, retrieving node info", storeId);
                
                // Get node info directly using the handler
                var nodeInfoList = await handler.GetNodeInfo(lightningConfig, null);
                
                // Extract the public key from node URI (pubkey@host:port)
                if (nodeInfoList.Any())
                {
                    string nodeUri = nodeInfoList.First().ToString();
                    _logger.LogInformation("Found Lightning node URI: {NodeUri}", nodeUri);
                    
                    int atIndex = nodeUri.IndexOf('@');
                    
                    if (atIndex > 0)
                    {
                        string pubKey = nodeUri.Substring(0, atIndex);
                        _logger.LogInformation("Successfully extracted Lightning node public key: {PubKey}", pubKey);
                        return pubKey;
                    }
                }
                
                // If we couldn't extract the public key from the URI, try another approach
                if (nodeInfoList.Any())
                {
                    var nodeInfo = nodeInfoList.First();
                    // The NodeId property is a PubKey object, need to convert to string
                    if (nodeInfo.NodeId != null)
                    {
                        string pubKey = nodeInfo.NodeId.ToString();
                        _logger.LogInformation("Successfully retrieved Lightning node public key from NodeId: {PubKey}", pubKey);
                        return pubKey;
                    }
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
                
                // Get the list of channels
                var channels = await lightningClient.ListChannels(cancellationToken);
                
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