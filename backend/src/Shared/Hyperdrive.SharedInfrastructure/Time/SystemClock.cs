using Hyperdrive.SharedKernel.Time;

namespace Hyperdrive.SharedInfrastructure.Time;

public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
