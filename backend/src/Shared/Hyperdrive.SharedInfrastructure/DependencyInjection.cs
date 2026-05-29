using Hyperdrive.SharedInfrastructure.Events;
using Hyperdrive.SharedInfrastructure.Time;
using Hyperdrive.SharedKernel.Time;
using Microsoft.Extensions.DependencyInjection;

namespace Hyperdrive.SharedInfrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddSharedInfrastructure(this IServiceCollection services)
    {
        services.AddSingleton<IClock, SystemClock>();
        services.AddScoped<IDomainEventDispatcher, DomainEventDispatcher>();
        return services;
    }
}
