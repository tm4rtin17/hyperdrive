namespace Hyperdrive.Manufacturing.Domain.Planning;

/// <summary>
/// A role responsible for buying off (signing off / completing) work in a work order.
/// Assigned as the "primary buyoff" on operations and steps in an engineering master;
/// later used to gate completions on the generated work orders.
/// </summary>
public enum WorkRole
{
    AssemblyTechnician = 1,
    QualityInspector = 2,
    TestTechnician = 3,
    ManufacturingEngineer = 4,
    ResponsibleEngineer = 5,
    QualityEngineer = 6,
}

/// <summary>Display metadata for <see cref="WorkRole"/> values, exposed to clients.</summary>
public static class WorkRoles
{
    /// <summary>Human-readable label for each role, in display order.</summary>
    public static IReadOnlyList<(WorkRole Role, string Label)> All { get; } = new[]
    {
        (WorkRole.AssemblyTechnician,    "Assembly Technician"),
        (WorkRole.QualityInspector,      "Quality Inspector"),
        (WorkRole.TestTechnician,        "Test Technician"),
        (WorkRole.ManufacturingEngineer, "Manufacturing Engineer"),
        (WorkRole.ResponsibleEngineer,   "Responsible Engineer"),
        (WorkRole.QualityEngineer,       "Quality Engineer"),
    };

    public static string Label(WorkRole role) =>
        All.First(r => r.Role == role).Label;
}
