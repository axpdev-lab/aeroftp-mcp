## Verify Setup

After installation, Claude Code can use 16 file management tools:

| Category | Tools |
|----------|-------|
| **Browse** | list_directory, stat, search, get_quota |
| **Read** | read_file, download_file |
| **Write** | upload_file, create_directory, rename, copy |
| **Delete** | delete_file, delete_directory |
| **Session** | list_profiles, connect, disconnect, server_info |

### Supported Protocols

FTP, FTPS, SFTP, WebDAV, S3 (+ Wasabi, R2, DO Spaces, Backblaze B2, MinIO), Google Drive, Dropbox, OneDrive, MEGA, Box, pCloud, Azure Blob, 4shared, Filen, Zoho WorkDrive, Internxt, kDrive, Koofr, Jottacloud, FileLu, Yandex Disk, OpenDrive

### Rate Limits

- Read operations: 60/min
- Write operations: 30/min
- Delete operations: 10/min
