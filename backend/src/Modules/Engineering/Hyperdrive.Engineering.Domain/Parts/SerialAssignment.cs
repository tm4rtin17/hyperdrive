namespace Hyperdrive.Engineering.Domain.Parts;

/// <summary>
/// For serial-tracked parts, who assigns the serial number.
/// </summary>
public enum SerialAssignment
{
    /// <summary>The user assigns serials following a pre-defined scheme.</summary>
    Manual = 0,
    /// <summary>The system auto-generates the next serial.</summary>
    Auto = 1,
}
