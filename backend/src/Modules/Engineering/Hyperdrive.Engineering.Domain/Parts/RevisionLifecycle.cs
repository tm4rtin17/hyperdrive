namespace Hyperdrive.Engineering.Domain.Parts;

/// <summary>
/// Lifecycle of a single part revision. Each revision progresses independently:
/// a part can have rev A Released while rev B is still In Work.
/// </summary>
public enum RevisionLifecycle
{
    InWork = 0,
    Released = 1,
    Obsolete = 2,
}
