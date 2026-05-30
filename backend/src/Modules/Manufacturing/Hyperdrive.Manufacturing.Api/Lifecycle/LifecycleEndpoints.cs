using Hyperdrive.Manufacturing.Application.Lifecycle;
using Hyperdrive.SharedKernel.Results;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Routing;

namespace Hyperdrive.Manufacturing.Api.Lifecycle;

internal static class LifecycleEndpoints
{
    public static RouteGroupBuilder MapLifecycleEndpoints(this RouteGroupBuilder group)
    {
        var revs = group.MapGroup("/parts/{partId:guid}/revisions").WithTags("Manufacturing.Lifecycle");

        revs.MapGet("/", ListRevisions).WithName("ListRevisions");
        revs.MapPost("/", CreateNextRevision).WithName("CreateNextRevision");
        revs.MapPost("/{revId:guid}/release", ReleaseRevision).WithName("ReleaseRevision");
        revs.MapPost("/{revId:guid}/obsolete", ObsoleteRevision).WithName("ObsoleteRevision");
        revs.MapGet("/{revId:guid}/bom", GetBom).WithName("GetBom");
        revs.MapPost("/{revId:guid}/bom", AddBomLine).WithName("AddBomLine");
        revs.MapPut("/{revId:guid}/bom/{lineId:guid}", UpdateBomLine).WithName("UpdateBomLine");
        revs.MapDelete("/{revId:guid}/bom/{lineId:guid}", RemoveBomLine).WithName("RemoveBomLine");

        return group;
    }

    private static async Task<Ok<IReadOnlyList<PartRevisionDto>>> ListRevisions(
        Guid partId, ILifecycleReader reader, CancellationToken ct) =>
        TypedResults.Ok(await reader.ListRevisionsAsync(partId, ct));

    private static async Task<IResult> CreateNextRevision(
        Guid partId, CreateNextRevisionHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(new CreateNextRevisionCommand(partId), ct);
        return result.IsSuccess ? TypedResults.Ok(result.Value) : ToProblem(result.Error);
    }

    private static async Task<IResult> ReleaseRevision(
        Guid partId, Guid revId, ReleaseRevisionHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(new ReleaseRevisionCommand(partId, revId), ct);
        return result.IsSuccess ? TypedResults.NoContent() : ToProblem(result.Error);
    }

    private static async Task<IResult> ObsoleteRevision(
        Guid partId, Guid revId, ObsoleteRevisionHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(new ObsoleteRevisionCommand(partId, revId), ct);
        return result.IsSuccess ? TypedResults.NoContent() : ToProblem(result.Error);
    }

    private static async Task<Ok<IReadOnlyList<BomLineDto>>> GetBom(
        Guid revId, ILifecycleReader reader, CancellationToken ct) =>
        TypedResults.Ok(await reader.GetBomAsync(revId, ct));

    private static async Task<IResult> AddBomLine(
        Guid partId, Guid revId, AddBomLineBody body, AddBomLineHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(
            new AddBomLineCommand(partId, revId, body.ChildPartNumber, body.Quantity, body.FindNumber, body.ReferenceDesignator), ct);
        return result.IsSuccess ? TypedResults.NoContent() : ToProblem(result.Error);
    }

    private static async Task<IResult> UpdateBomLine(
        Guid partId, Guid revId, Guid lineId, UpdateBomLineBody body, UpdateBomLineHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(
            new UpdateBomLineCommand(partId, revId, lineId, body.Quantity, body.FindNumber, body.ReferenceDesignator), ct);
        return result.IsSuccess ? TypedResults.NoContent() : ToProblem(result.Error);
    }

    private static async Task<IResult> RemoveBomLine(
        Guid partId, Guid revId, Guid lineId, RemoveBomLineHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(new RemoveBomLineCommand(partId, revId, lineId), ct);
        return result.IsSuccess ? TypedResults.NoContent() : ToProblem(result.Error);
    }

    private static ProblemHttpResult ToProblem(DomainError error) => error.Type switch
    {
        ErrorType.Validation => TypedResults.Problem(detail: error.Message, statusCode: 400, title: error.Code),
        ErrorType.NotFound   => TypedResults.Problem(detail: error.Message, statusCode: 404, title: error.Code),
        ErrorType.Conflict   => TypedResults.Problem(detail: error.Message, statusCode: 409, title: error.Code),
        _                    => TypedResults.Problem(detail: error.Message, statusCode: 500, title: error.Code),
    };
}

internal sealed record AddBomLineBody(string ChildPartNumber, decimal Quantity, int? FindNumber, string? ReferenceDesignator);
internal sealed record UpdateBomLineBody(decimal Quantity, int? FindNumber, string? ReferenceDesignator);
