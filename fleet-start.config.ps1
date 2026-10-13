# Per-repo fleet start config for overte-mcp
# Edit ports/backend target here - start.ps1 is fleet-standard.
@{
    Name         = 'overte-mcp'
    BackendPort  = 11110
    FrontendPort = 11111
    HealthPath   = '/api/health'
    WebRoot      = 'webapp'
    Backend = @{
        Kind          = 'uvicorn'
        UvicornTarget = 'overte_mcp.http_server:app'
        Env           = @{ WEB_PORT = '11110' }
    }
    Frontend = @{
        Kind           = 'vite-npm'
        PackageManager = 'npm'
        PortEnvVar     = 'VITE_PORT'
        ApiTargetEnv   = 'VITE_API_TARGET'
    }
}
