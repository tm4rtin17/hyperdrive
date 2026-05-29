namespace Hyperdrive.SharedKernel.Results;

public readonly record struct Result
{
    public bool IsSuccess { get; }
    public DomainError Error { get; }
    public bool IsFailure => !IsSuccess;

    private Result(bool isSuccess, DomainError error)
    {
        if (isSuccess && error != DomainError.None) throw new InvalidOperationException("Success result cannot carry an error.");
        if (!isSuccess && error == DomainError.None) throw new InvalidOperationException("Failure result must carry an error.");
        IsSuccess = isSuccess;
        Error = error;
    }

    public static Result Success() => new(true, DomainError.None);
    public static Result Failure(DomainError error) => new(false, error);
    public static implicit operator Result(DomainError error) => Failure(error);

    // Factory helpers on the non-generic type to avoid CA1000 on Result<T>
    public static Result<T> Ok<T>(T value) => new(true, value, DomainError.None);
    public static Result<T> Fail<T>(DomainError error) => new(false, default, error);
}

public readonly record struct Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public DomainError Error { get; }
    public bool IsFailure => !IsSuccess;

    internal Result(bool isSuccess, T? value, DomainError error)
    {
        IsSuccess = isSuccess;
        Value = value;
        Error = error;
    }

    public static implicit operator Result<T>(T value) => new(true, value, DomainError.None);
    public static implicit operator Result<T>(DomainError error) => new(false, default, error);
}
