namespace Hyperdrive.Manufacturing.Domain.Planning;

public readonly record struct MasterAttachmentId(Guid Value)
{
    public static MasterAttachmentId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}
