namespace Hyperdrive.Manufacturing.Domain.Parts;

/// <summary>
/// A typed key/value attribute on a part. Examples: ("material", "Ti-6Al-4V"),
/// ("mass_g", "412.7"), ("finish", "anodize, type II, blue").
/// Kept as strings at the domain layer — interpretation belongs upstream.
/// </summary>
public sealed record PartAttribute(string Key, string Value);
