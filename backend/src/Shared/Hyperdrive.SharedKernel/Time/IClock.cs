namespace Hyperdrive.SharedKernel.Time;

public interface IClock
{
    DateTimeOffset UtcNow { get; }
}
