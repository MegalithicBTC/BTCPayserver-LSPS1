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
                if (_handlers.TryGet(paymentMethod) is not LightningLikePaymentHandler handler)
                {
                    _logger.LogError("Lightning payment handler not available");
                    return null;
                }

                var lightningConfig = handler.GetLightningUrl(store);
                if (lightningConfig == null)
                {
                    _logger.LogError("No Lightning node configured for this store");
                    return null;
                }

                var client = _lightningClientFactory.Create(lightningConfig, network);
                if (client == null)
                {
                    _logger.LogError("Could not create Lightning client");
                    return null;
                }

                var nodeInfo = await client.GetInfo();
                return nodeInfo.NodeInfoList.Count > 0 ? nodeInfo.NodeInfoList[0].NodeId.ToString() : null;
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

                var lightningConfig = handler.GetLightningUrl(store);
                if (lightningConfig == null)
                {
                    _logger.LogError("No Lightning node configured for this store");
                    return null;
                }

                var client = _lightningClientFactory.Create(lightningConfig, network);
                return client;
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
    }
}