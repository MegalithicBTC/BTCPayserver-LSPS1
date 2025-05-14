using BTCPayServer.Data;
using BTCPayServer.Payments;
using BTCPayServer.Payments.Lightning;
using BTCPayServer.Services.Invoices;
using BTCPayServer.Services.Stores;
using System.Linq;
using System;

namespace BTCPayServer.Plugins.LSPS1.Services
{
    public static class LightningExtensions
    {
        // Original method signature that the LightningNodeService uses
        public static string? GetLightningUrl(this LightningLikePaymentHandler handler, StoreData store)
        {
            var paymentMethodId = handler.PaymentMethodId;
            var config = store.GetPaymentMethodConfig(paymentMethodId);
            if (config == null)
                return null;
            
            var lightningConfig = handler.ParsePaymentMethodConfig(config) as LightningPaymentMethodConfig;
            return lightningConfig?.GetExternalLightningUrl();
        }
    }
}