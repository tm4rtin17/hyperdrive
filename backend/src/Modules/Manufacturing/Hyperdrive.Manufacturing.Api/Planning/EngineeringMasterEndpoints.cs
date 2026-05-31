using Hyperdrive.Manufacturing.Application.Planning;
using Hyperdrive.SharedKernel.Results;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Routing;

namespace Hyperdrive.Manufacturing.Api.Planning;

internal static class EngineeringMasterEndpoints
{
    public static RouteGroupBuilder MapEngineeringMasterEndpoints(this RouteGroupBuilder group)
    {
        var masters = group.MapGroup("/engineering-masters").WithTags("Manufacturing.Planning");

        masters.MapGet("/", List).WithName("ListEngineeringMasters");
        masters.MapPost("/", Create).WithName("CreateEngineeringMaster");
        masters.MapGet("/{id:guid}", Get).WithName("GetEngineeringMaster");

        masters.MapPost("/{id:guid}/operations", AddOperation).WithName("AddOperation");
        masters.MapPut("/{id:guid}/operations/{opId:guid}", UpdateOperation).WithName("UpdateOperation");
        masters.MapDelete("/{id:guid}/operations/{opId:guid}", RemoveOperation).WithName("RemoveOperation");

        masters.MapPut("/{id:guid}/sequence", UpdateSequence).WithName("UpdateSequence");

        masters.MapPost("/{id:guid}/operations/{opId:guid}/steps", AddStep).WithName("AddStep");
        masters.MapPut("/{id:guid}/operations/{opId:guid}/steps/{stepId:guid}", UpdateStep).WithName("UpdateStep");
        masters.MapDelete("/{id:guid}/operations/{opId:guid}/steps/{stepId:guid}", RemoveStep).WithName("RemoveStep");

        // Attachment upload uses multipart/form-data — antiforgery is disabled for API clients.
        masters.MapPost("/{id:guid}/operations/{opId:guid}/steps/{stepId:guid}/attachments",
            UploadAttachment).WithName("UploadStepAttachment").DisableAntiforgery();
        masters.MapDelete("/{id:guid}/operations/{opId:guid}/steps/{stepId:guid}/attachments/{attachmentId:guid}",
            DeleteAttachment).WithName("DeleteStepAttachment");
        masters.MapGet("/{id:guid}/operations/{opId:guid}/steps/{stepId:guid}/attachments/{attachmentId:guid}/file",
            DownloadAttachment).WithName("DownloadStepAttachment");

        return group;
    }

    private static async Task<Ok<IReadOnlyList<EngineeringMasterSummaryDto>>> List(
        string? search, int? limit, IEngineeringMasterReader reader, CancellationToken ct) =>
        TypedResults.Ok(await reader.ListAsync(search, limit ?? 50, ct));

    private static async Task<Results<Ok<EngineeringMasterDto>, NotFound>> Get(
        Guid id, IEngineeringMasterReader reader, CancellationToken ct)
    {
        var master = await reader.GetAsync(id, ct);
        return master is null ? TypedResults.NotFound() : TypedResults.Ok(master);
    }

    private static async Task<IResult> Create(
        CreateMasterBody body, CreateEngineeringMasterHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(
            new CreateEngineeringMasterCommand(body.PartNumber, body.PartId, body.PartName), ct);
        return result.IsSuccess
            ? TypedResults.Created($"/api/manufacturing/engineering-masters/{result.Value!.Id}", result.Value)
            : ToProblem(result.Error);
    }

    private static async Task<IResult> AddOperation(
        Guid id, AddOperationBody body, AddOperationHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(new AddOperationCommand(id, body.Name), ct);
        return result.IsSuccess ? TypedResults.Ok(result.Value) : ToProblem(result.Error);
    }

    private static async Task<IResult> UpdateOperation(
        Guid id, Guid opId, UpdateOperationBody body, UpdateOperationHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(new UpdateOperationCommand(id, opId, body.Sequence, body.Name), ct);
        return result.IsSuccess ? TypedResults.NoContent() : ToProblem(result.Error);
    }

    private static async Task<IResult> RemoveOperation(
        Guid id, Guid opId, RemoveOperationHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(new RemoveOperationCommand(id, opId), ct);
        return result.IsSuccess ? TypedResults.NoContent() : ToProblem(result.Error);
    }

    private static async Task<IResult> UpdateSequence(
        Guid id, UpdateSequenceBody body, UpdateSequenceHandler handler, CancellationToken ct)
    {
        var links = (body.Links ?? [])
            .Select(l => new OperationLinkInput(l.PredecessorId, l.SuccessorId))
            .ToList();
        var result = await handler.HandleAsync(new UpdateSequenceCommand(id, links), ct);
        return result.IsSuccess ? TypedResults.NoContent() : ToProblem(result.Error);
    }

    private static async Task<IResult> AddStep(
        Guid id, Guid opId, AddStepBody body, AddStepHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(new AddStepCommand(id, opId, body.Title), ct);
        return result.IsSuccess ? TypedResults.Ok(result.Value) : ToProblem(result.Error);
    }

    private static async Task<IResult> UpdateStep(
        Guid id, Guid opId, Guid stepId, UpdateStepBody body, UpdateStepHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(new UpdateStepCommand(id, opId, stepId, body.Order, body.Title, body.Body), ct);
        return result.IsSuccess ? TypedResults.NoContent() : ToProblem(result.Error);
    }

    private static async Task<IResult> RemoveStep(
        Guid id, Guid opId, Guid stepId, RemoveStepHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(new RemoveStepCommand(id, opId, stepId), ct);
        return result.IsSuccess ? TypedResults.NoContent() : ToProblem(result.Error);
    }

    private static async Task<IResult> UploadAttachment(
        Guid id, Guid opId, Guid stepId,
        IFormFile file,
        UploadStepAttachmentHandler handler,
        CancellationToken ct)
    {
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        var result = await handler.HandleAsync(
            new UploadStepAttachmentCommand(id, opId, stepId, file.FileName, file.ContentType, ms.ToArray()), ct);
        return result.IsSuccess ? TypedResults.Ok(result.Value) : ToProblem(result.Error);
    }

    private static async Task<IResult> DeleteAttachment(
        Guid attachmentId, DeleteStepAttachmentHandler handler, CancellationToken ct)
    {
        var result = await handler.HandleAsync(new DeleteStepAttachmentCommand(attachmentId), ct);
        return result.IsSuccess ? TypedResults.NoContent() : ToProblem(result.Error);
    }

    private static async Task<IResult> DownloadAttachment(
        Guid attachmentId,
        Hyperdrive.Manufacturing.Domain.Planning.IStepAttachmentRepository repo,
        CancellationToken ct)
    {
        var a = await repo.GetAsync(new Hyperdrive.Manufacturing.Domain.Planning.StepAttachmentId(attachmentId), ct);
        return a is null
            ? TypedResults.NotFound()
            : Results.File(a.Data, a.ContentType, a.FileName);
    }

    private static ProblemHttpResult ToProblem(DomainError error) => error.Type switch
    {
        ErrorType.Validation => TypedResults.Problem(detail: error.Message, statusCode: 400, title: error.Code),
        ErrorType.NotFound   => TypedResults.Problem(detail: error.Message, statusCode: 404, title: error.Code),
        ErrorType.Conflict   => TypedResults.Problem(detail: error.Message, statusCode: 409, title: error.Code),
        _                    => TypedResults.Problem(detail: error.Message, statusCode: 500, title: error.Code),
    };
}

internal sealed record CreateMasterBody(string PartNumber, Guid? PartId, string? PartName);
internal sealed record AddOperationBody(string Name);
internal sealed record UpdateOperationBody(int Sequence, string Name);
internal sealed record OperationLinkBody(Guid PredecessorId, Guid SuccessorId);
internal sealed record UpdateSequenceBody(IReadOnlyList<OperationLinkBody> Links);
internal sealed record AddStepBody(string Title);
internal sealed record UpdateStepBody(int Order, string Title, string Body);
