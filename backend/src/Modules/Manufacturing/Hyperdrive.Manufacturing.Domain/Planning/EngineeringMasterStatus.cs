namespace Hyperdrive.Manufacturing.Domain.Planning;

/// <summary>
/// Lifecycle of an engineering master. Draft while being authored; Released once it
/// is finalized and can be used to generate work orders.
/// </summary>
public enum EngineeringMasterStatus
{
    Draft = 0,
    Released = 1,
}
