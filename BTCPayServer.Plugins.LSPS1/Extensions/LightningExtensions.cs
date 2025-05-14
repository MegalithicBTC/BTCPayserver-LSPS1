using BTCPayServer.Data;
using BTCPayServer.Payments;
using BTCPayServer.Payments.Lightning;
using BTCPayServer.Services.Stores;
using System.Linq;

namespace BTCPayServer.Plugins.LSPS1.Services
{
    public static class LightningExtensions
    {
        public static string GetLightningUrl(this LightningLikePaymentHandler handler, StoreData store)
        {
            var paymentMethodId = handler.PaymentMethodId;
            var config = store.GetPaymentMethodConfig<LightningPaymentMethodConfig>(paymentMethodId);
            return config?.GetExternalLightningUrl();
        }
    }
}