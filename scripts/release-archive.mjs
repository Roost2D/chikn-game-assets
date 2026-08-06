import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * Create a byte-reproducible ZIP on the supported Windows release host.
 * Entry order, path separators, timestamps, and external attributes are fixed.
 */
export async function zipDirectory(source, destination) {
  const quote = (value) => value.replace(/'/g, "''");
  const sourcePath = quote(resolve(source));
  const destinationPath = quote(resolve(destination));
  const script = `
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$source = [IO.Path]::GetFullPath('${sourcePath}').TrimEnd('\\')
$destination = [IO.Path]::GetFullPath('${destinationPath}')
if ([IO.File]::Exists($destination)) { [IO.File]::Delete($destination) }
$archive = [IO.Compression.ZipFile]::Open($destination, [IO.Compression.ZipArchiveMode]::Create)
try {
  $files = [IO.Directory]::EnumerateFiles($source, '*', [IO.SearchOption]::AllDirectories) | Sort-Object
  foreach ($file in $files) {
    $entryName = $file.Substring($source.Length + 1).Replace('\\', '/')
    # PNG/JSON release payloads gain little from a second deflate pass. Store mode
    # is deterministic and avoids multi-minute .NET compression on Windows hosts.
    $entry = $archive.CreateEntry($entryName, [IO.Compression.CompressionLevel]::NoCompression)
    $entry.LastWriteTime = [DateTimeOffset]::Parse('1980-01-01T00:00:00Z')
    $entry.ExternalAttributes = 0
    $input = [IO.File]::OpenRead($file)
    $output = $entry.Open()
    try { $input.CopyTo($output) } finally { $output.Dispose(); $input.Dispose() }
  }
} finally {
  $archive.Dispose()
}
`;
  const encodedScript = Buffer.from(script, 'utf16le').toString('base64');
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encodedScript], {
    stdio: 'pipe',
    windowsHide: true,
  });
}
