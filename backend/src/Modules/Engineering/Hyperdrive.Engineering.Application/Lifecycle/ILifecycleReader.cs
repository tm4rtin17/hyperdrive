namespace Hyperdrive.Engineering.Application.Lifecycle;

/// <summary>
/// Read-side abstraction for revisions and BOMs. Projects directly to DTOs and
/// joins the parts table for child-part display fields.
/// </summary>
public interface ILifecycleReader
{
    Task<IReadOnlyList<PartRevisionDto>> ListRevisionsAsync(Guid partId, CancellationToken ct);
    Task<IReadOnlyList<BomLineDto>> GetBomAsync(Guid revisionId, CancellationToken ct);
}
