using Hyperdrive.SharedKernel.Domain;
using Microsoft.Extensions.DependencyInjection;

namespace Hyperdrive.SharedInfrastructure.Events;

internal sealed class DomainEventDispatcher(IServiceProvider provider) : IDomainEventDispatcher
{
    public async Task DispatchAsync(IEnumerable<IDomainEvent> events, CancellationToken ct = default)
    {
        foreach (var domainEvent in events)
        {
            var handlerType = typeof(IDomainEventHandler<>).MakeGenericType(domainEvent.GetType());
            var handlers = provider.GetServices(handlerType);

            foreach (var handler in handlers)
            {
                if (handler is null) continue;
                var method = handlerType.GetMethod(nameof(IDomainEventHandler<IDomainEvent>.HandleAsync))!;
                var task = (Task)method.Invoke(handler, [domainEvent, ct])!;
                await task.ConfigureAwait(false);
            }
        }
    }
}
