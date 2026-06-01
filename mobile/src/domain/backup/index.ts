// Public surface of the backup domain module.
export type { BackupPort, BackupResult, BackupFailureReason } from '@/domain/backup/BackupPort';
export { shouldBackup, MIN_BACKUP_INTERVAL_MS } from '@/domain/backup/ScheduleBackupUseCase';
