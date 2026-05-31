using Hyperdrive.Manufacturing.Api.Planning;
using Hyperdrive.Manufacturing.Application.Planning;
using Hyperdrive.Manufacturing.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Hyperdrive.Manufacturing.Api;

public static class ManufacturingModule
{
    public static IServiceCollection AddManufacturingModule(
        this IServiceCollection services,
        string connectionString)
    {
        services.AddManufacturingInfrastructure(connectionString);

        services.AddScoped<CreateEngineeringMasterHandler>();
        services.AddScoped<AddOperationHandler>();
        services.AddScoped<UpdateOperationHandler>();
        services.AddScoped<RemoveOperationHandler>();
        services.AddScoped<AddStepHandler>();
        services.AddScoped<UpdateStepHandler>();
        services.AddScoped<RemoveStepHandler>();
        services.AddScoped<UploadStepAttachmentHandler>();
        services.AddScoped<DeleteStepAttachmentHandler>();

        return services;
    }

    public static IEndpointRouteBuilder MapManufacturingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/manufacturing");

        group.MapEngineeringMasterEndpoints();

        return app;
    }
}
