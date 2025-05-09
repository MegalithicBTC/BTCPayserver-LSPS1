// Services/DesignTimeDbContextFactory.cs  (unchanged, migrations only)
using BTCPayServer.Abstractions.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace BTCPayServer.Plugins.LSPS1.Services;

// public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<MyPluginDbContext>
// {
//     public MyPluginDbContext CreateDbContext(string[] args)
//     {
//         var builder = new DbContextOptionsBuilder<MyPluginDbContext>();

//         // Hard-coded connection just for `dotnet ef` commands
//         builder.UseNpgsql("User ID=postgres;Host=127.0.0.1;Port=39372;Database=designtimebtcpay");

//         return new MyPluginDbContext(builder.Options, true);
//     }
//}