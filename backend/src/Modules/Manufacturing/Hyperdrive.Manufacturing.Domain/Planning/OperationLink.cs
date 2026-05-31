namespace Hyperdrive.Manufacturing.Domain.Planning;

/// <summary>
/// A directed precedence edge within an engineering master's operation sequence:
/// <see cref="PredecessorId"/> must be completed before <see cref="SuccessorId"/> may start.
/// The full set of links forms a DAG that defines the build order (branches allow parallel work).
/// Owned by <see cref="EngineeringMaster"/>; stored as raw operation ids in a join table.
/// </summary>
public sealed class OperationLink
{
    public Guid PredecessorId { get; private set; }
    public Guid SuccessorId { get; private set; }

    // EF
    private OperationLink() { }

    internal OperationLink(Guid predecessorId, Guid successorId)
    {
        PredecessorId = predecessorId;
        SuccessorId = successorId;
    }
}
