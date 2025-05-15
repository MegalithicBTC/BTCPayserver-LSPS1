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
                var network = _networkProvider.GetNetwork<BTCPayNetwork>("BTC");
                if (network == null)
                {
                    _logger.LogError("BTC network not found");
                    return null;
                }

                var paymentMethod = PaymentTypes.LN.GetPaymentMethodId(network.CryptoCode);
                
                // This is how the main BTCPay Server checks for the handler
                if (_handlers.TryGet(paymentMethod) is not LightningLikePaymentHandler handler)
                {
                    _logger.LogError("Lightning payment handler not available");
                    return null;
                }

                // Get the store-specific configuration
                var paymentMethodDetails = store.GetPaymentMethodConfig<LightningPaymentMethodConfig>(paymentMethod, _handlers);
                if (paymentMethodDetails == null)
                {
                    _logger.LogError("No Lightning payment method configured for this store");
                    return null;
                }

                // Use handler's GetNodeInfo method directly like the main server
                try 
                {
                    var nodeInfo = await handler.GetNodeInfo(paymentMethodDetails, null, throws: true);
                    if (nodeInfo == null || !nodeInfo.Any())
                    {
                        _logger.LogError("No node information available");
                        return null;
                    }
                    
                    return nodeInfo.First().NodeId.ToString();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error getting node info from handler");
                    return null;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Lightning node public key");
                return null;
            }
        }

        public ILightningClient? GetLightningClient(StoreData store)
        {
            try
            {
                var network = _networkProvider.GetNetwork<BTCPayNetwork>("BTC");
                if (network == null)
                {
                    _logger.LogError("BTC network not found");
                    return null;
                }

                var paymentMethod = PaymentTypes.LN.GetPaymentMethodId(network.CryptoCode);
                if (_handlers.TryGet(paymentMethod) is not LightningLikePaymentHandler handler)
                {
                    _logger.LogError("Lightning payment handler not available");
                    return null;
                }

                // Get payment method configuration the same way as in UIPublicLightningNodeInfoController
                var paymentMethodDetails = store.GetPaymentMethodConfig<LightningPaymentMethodConfig>(paymentMethod, _handlers);
                if (paymentMethodDetails == null)
                {
                    _logger.LogError("No Lightning payment method configured for this store");
                    return null;
                }

                // For debugging - log connection string length to avoid exposing sensitive info
                int connectionStringLength = paymentMethodDetails.ConnectionString?.Length ?? 0;
                _logger.LogInformation("Connection string length: {Length}", connectionStringLength);

                try
                {
                    // First, check if we can get node info to verify connection works
                    var nodeInfo = handler.GetNodeInfo(paymentMethodDetails, null, throws: true).GetAwaiter().GetResult();
                    if (nodeInfo == null || !nodeInfo.Any())
                    {
                        _logger.LogError("Could not get node info from handler");
                        return null;
                    }
                    
                    // If connection string is empty, this might be an internal node
                    if (string.IsNullOrEmpty(paymentMethodDetails.ConnectionString))
                    {
                        _logger.LogInformation("Using internal Lightning node (empty connection string is expected)");
                        
                        // Get internal lightning client directly if available
                        if (_lightningNetworkOptions.Value.InternalLightningByCryptoCode.TryGetValue(network.CryptoCode, out var internalClient))
                        {
                            _logger.LogInformation("Using internal lightning node client");
                            return internalClient;
                        }
                        
                        _logger.LogError("No internal lightning node found for {CryptoCode}", network.CryptoCode);
                        return null;
                    }
                    
                    // Create client with connection string
                    _logger.LogInformation("Creating Lightning client with connection string");
                    return _lightningClientFactory.Create(paymentMethodDetails.ConnectionString, network);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error creating Lightning client");
                    return null;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Lightning client");
                return null;
            }
        }

        public async Task<bool> ConnectToNode(StoreData store, string nodeUri, CancellationToken cancellationToken = default)
        {
            try
            {
                var client = GetLightningClient(store);
                if (client == null)
                    return false;

                await client.ConnectTo(NodeInfo.Parse(nodeUri), cancellationToken);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error connecting to Lightning node {NodeUri}", nodeUri);
                return false;
            }
        }

        public async Task<StoreData?> GetStore(string storeId)
        {
            return await _storeRepository.FindStore(storeId);
        }

        public async Task<NodeInfo[]?> GetNodeInfo(StoreData store)
        {
            try
            {
                var network = _networkProvider.GetNetwork<BTCPayNetwork>("BTC");
                if (network == null)
                {
                    _logger.LogError("BTC network not found");
                    return null;
                }

                var paymentMethod = PaymentTypes.LN.GetPaymentMethodId(network.CryptoCode);
                if (_handlers.TryGet(paymentMethod) is not LightningLikePaymentHandler handler)
                {
                    _logger.LogError("Lightning payment handler not available");
                    return null;
                }

                // Get payment method configuration the same way as in UIPublicLightningNodeInfoController
                var paymentMethodDetails = store.GetPaymentMethodConfig<LightningPaymentMethodConfig>(paymentMethod, _handlers);
                if (paymentMethodDetails == null)
                {
                    _logger.LogError("No Lightning payment method configured for this store");
                    return null;
                }

                // Use the handler's GetNodeInfo method directly like the main server does
                try
                {
                    var nodeInfo = await handler.GetNodeInfo(paymentMethodDetails, null, throws: true);
                    return nodeInfo.ToArray();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error getting node info from handler");
                    return null;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Lightning node info");
                return null;
            }
        }

        public async Task<bool> IsNodeAvailable(StoreData store)
        {
            try
            {
                var network = _networkProvider.GetNetwork<BTCPayNetwork>("BTC");
                if (network == null)
                {
                    return false;
                }

                var paymentMethod = PaymentTypes.LN.GetPaymentMethodId(network.CryptoCode);
                if (_handlers.TryGet(paymentMethod) is not LightningLikePaymentHandler handler)
                {
                    return false;
                }

                var paymentMethodDetails = store.GetPaymentMethodConfig<LightningPaymentMethodConfig>(paymentMethod, _handlers);
                if (paymentMethodDetails == null)
                {
                    return false;
                }

                try
                {
                    // Just like the UIPublicLightningNodeInfoController, use handler.GetNodeInfo directly
                    var nodeInfo = await handler.GetNodeInfo(paymentMethodDetails, null, throws: true);
                    return nodeInfo.Any();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error checking if node is available");
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking if node is available");
                return false;
            }
        }
    }
}