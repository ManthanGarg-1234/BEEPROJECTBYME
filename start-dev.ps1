$projectRoot = Split-Path -Parent $PSCommandPath

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$projectRoot\server'; npm run dev"
)

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$projectRoot\client'; npm run dev"
)
