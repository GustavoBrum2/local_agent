# PC Match Desktop MVP - coletor Windows
# Adaptado do native-host/local_agent-host.ps1 da extensão.
# Diferença principal: retorna JSON diretamente no stdout, pois o Tauri
# substitui o protocolo length-prefixed do Chrome Native Messaging.

$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$data = [ordered]@{
    cpu           = $null
    system        = $null
    motherboard   = $null
    gpus          = @()
    disks         = @()
    physicalDisks = @()
    ramSticks     = @()
}

try {
    $data.cpu = Get-CimInstance Win32_Processor |
        Select-Object -First 1 Name, Manufacturer, NumberOfCores, NumberOfLogicalProcessors
} catch {}

try {
    $data.system = Get-CimInstance Win32_ComputerSystem |
        Select-Object -First 1 Manufacturer, Model
} catch {}

try {
    $data.motherboard = Get-CimInstance Win32_BaseBoard |
        Select-Object -First 1 Manufacturer, Product, SerialNumber
} catch {}

try {
    $allGpus = @(Get-CimInstance Win32_VideoController |
        Select-Object Name, PNPDeviceID, DriverVersion)

    $data.gpus = @($allGpus | Where-Object {
        $_.Name -notmatch 'MS Idd|Idd Device|Indirect Display|Microsoft.*Indirect|Microsoft.*Remote|Microsoft.*Basic|Remote Desktop|RDP|Virtual|Parsec|TeamViewer|VNC'
    })

    if ($data.gpus.Count -eq 0) { $data.gpus = $allGpus }
} catch {}

try {
    $data.disks = @(Get-CimInstance Win32_DiskDrive |
        Select-Object Manufacturer, Model, InterfaceType, MediaType, Size, SerialNumber)
} catch {}

try {
    $data.physicalDisks = @(Get-PhysicalDisk |
        Select-Object FriendlyName, Manufacturer, Model, SerialNumber, Size)
} catch {}

try {
    $data.ramSticks = @(Get-CimInstance Win32_PhysicalMemory |
        Select-Object Manufacturer, PartNumber, Capacity, Speed, DeviceLocator)
} catch {}

$data | ConvertTo-Json -Depth 6 -Compress
