namespace Hyperdrive.SharedKernel.Results;

public sealed record DomainError(string Code, string Message, ErrorType Type)
{
    public static readonly DomainError None = new(string.Empty, string.Empty, ErrorType.None);

    public static DomainError Validation(string code, string message) => new(code, message, ErrorType.Validation);
    public static DomainError NotFound(string code, string message) => new(code, message, ErrorType.NotFound);
    public static DomainError Conflict(string code, string message) => new(code, message, ErrorType.Conflict);
    public static DomainError Unexpected(string code, string message) => new(code, message, ErrorType.Unexpected);
}

public enum ErrorType
{
    None = 0,
    Validation,
    NotFound,
    Conflict,
    Unexpected,
}
