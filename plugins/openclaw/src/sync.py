import os
import time
import shutil
import threading
from profiles import ProfilesClient, ConflictError


class ProfileSync:
    """多文件同步逻辑"""
  
    def __init__(self, client: ProfilesClient, version_manager, workspace: str):
        self.client = client
        self.version_manager = version_manager
        self.workspace = workspace
        self._syncing_files = set()
        self._sync_lock = threading.Lock()
  
    def _get_absolute_path(self, relative_path: str) -> str:
        """获取文件的绝对路径"""
        return os.path.normpath(os.path.join(self.workspace, relative_path))
  
    def _is_syncing(self, file_path: str) -> bool:
        """检查文件是否正在同步"""
        return file_path in self._syncing_files
  
    def _mark_syncing(self, file_path: str):
        """标记文件正在同步"""
        self._syncing_files.add(file_path)
  
    def _unmark_syncing(self, file_path: str):
        """延迟取消同步标记"""
        def remove():
            time.sleep(2)
            self._syncing_files.discard(file_path)
        threading.Thread(target=remove, daemon=True).start()
  
    def _read_local_file(self, file_path: str) -> str | None:
        """读取本地文件内容"""
        absolute_path = self._get_absolute_path(file_path)
        if os.path.exists(absolute_path):
            try:
                with open(absolute_path, 'r', encoding='utf-8') as f:
                    return f.read()
            except Exception as e:
                print(f"[Sync] Error reading local file {file_path}: {e}")
                return None
        return None
  
    def _write_local_file(self, file_path: str, content: str):
        """写入本地文件"""
        absolute_path = self._get_absolute_path(file_path)
        try:
            directory = os.path.dirname(absolute_path)
            if directory and not os.path.exists(directory):
                os.makedirs(directory, exist_ok=True)
            
            with open(absolute_path, 'w', encoding='utf-8') as f:
                f.write(content)
        except Exception as e:
            print(f"[Sync] Error writing local file {file_path}: {e}")
  
    def _create_conflict_backup(self, file_path: str, local_content: str, server_content: str):
        """创建冲突备份文件"""
        absolute_path = self._get_absolute_path(file_path)
        conflict_path = absolute_path + '.conflict'
        try:
            with open(conflict_path, 'w', encoding='utf-8') as f:
                f.write(f"# Conflict: {file_path}\n")
                f.write(f"# Created at: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
                f.write("========== LOCAL VERSION ==========\n")
                f.write(local_content or "(empty)")
                f.write("\n\n========== SERVER VERSION ==========\n")
                f.write(server_content or "(empty)")
            print(f"[Sync] Conflict backup created: {conflict_path}")
        except Exception as e:
            print(f"[Sync] Error creating conflict backup: {e}")
  
    def pull_all(self):
        """Pull all profiles from cloud"""
        print("[Sync] Pulling all profiles from cloud...")
        
        try:
            result = self.client.get_profiles()
            cloud_files = result.get('files', [])
        except Exception as e:
            print(f"[Sync] Error fetching cloud profiles: {e}")
            return
        
        if not cloud_files:
            print("[Sync] No files on cloud")
            return
        
        pulled_count = 0
        pushed_count = 0
        skipped_count = 0
        
        for cloud_file in cloud_files:
            file_path = cloud_file.get('file_path')
            cloud_version = cloud_file.get('version', 0)
            cloud_content = cloud_file.get('content', '')
            
            if not file_path:
                continue
            
            local_content = self._read_local_file(file_path)
            local_version = self.version_manager.get_version(file_path)
            
            if cloud_version > local_version:
                self._mark_syncing(file_path)
                try:
                    self._write_local_file(file_path, cloud_content)
                    self.version_manager.set_version(file_path, cloud_version)
                    pulled_count += 1
                    print(f"[Sync] Pulled: {file_path} (v{cloud_version})")
                finally:
                    self._unmark_syncing(file_path)
            elif local_version > cloud_version and local_content is not None:
                try:
                    result = self.client.upload_profile(file_path, local_content, local_version)
                    self.version_manager.set_version(file_path, result.get('version', local_version))
                    pushed_count += 1
                    print(f"[Sync] Pushed: {file_path} (v{local_version})")
                except ConflictError as e:
                    self._handle_conflict(file_path, local_content, e.server_content, e.server_version)
                    pushed_count += 1
                except Exception as e:
                    print(f"[Sync] Error pushing {file_path}: {e}")
            else:
                skipped_count += 1
        
        print(f"[Sync] Sync complete: {pulled_count} pulled, {pushed_count} pushed, {skipped_count} skipped")
  
    def push_file(self, file_path: str):
        """Push a file to cloud"""
        if self._is_syncing(file_path):
            return
        
        self._mark_syncing(file_path)
        
        try:
            local_content = self._read_local_file(file_path)
            if local_content is None:
                print(f"[Sync] File not found locally: {file_path}")
                return
            
            local_version = self.version_manager.get_version(file_path)
            
            try:
                result = self.client.upload_profile(file_path, local_content, local_version)
                new_version = result.get('version', local_version + 1)
                self.version_manager.set_version(file_path, new_version)
                print(f"[Sync] Pushed: {file_path} (v{new_version})")
            except ConflictError as e:
                self._handle_conflict(file_path, local_content, e.server_content, e.server_version)
            except Exception as e:
                print(f"[Sync] Error pushing {file_path}: {e}")
        finally:
            self._unmark_syncing(file_path)
  
    def on_remote_change(self, file_path: str, version: int):
        """Handle remote file change"""
        local_version = self.version_manager.get_version(file_path)
        
        if version <= local_version:
            print(f"[Sync] Remote version not newer, skipping: {file_path} (local: v{local_version}, remote: v{version})")
            return
        
        self._mark_syncing(file_path)
        
        try:
            result = self.client.get_profiles(file_path)
            files = result.get('files', [])
            if not files:
                print(f"[Sync] File not found on cloud: {file_path}")
                return
            
            cloud_file = files[0]
            cloud_content = cloud_file.get('content', '')
            
            local_content = self._read_local_file(file_path)
            
            if local_content is not None and local_content != cloud_content:
                self._create_conflict_backup(file_path, local_content, cloud_content)
            
            self._write_local_file(file_path, cloud_content)
            self.version_manager.set_version(file_path, version)
            print(f"[Sync] Pulled remote change: {file_path} (v{version})")
        except Exception as e:
            print(f"[Sync] Error handling remote change for {file_path}: {e}")
        finally:
            self._unmark_syncing(file_path)
  
    def _handle_conflict(self, file_path: str, local_content: str, server_content: str, server_version: int):
        """Handle conflict when pushing file"""
        print(f"[Sync] CONFLICT detected for {file_path}")
        
        self._create_conflict_backup(file_path, local_content, server_content)
        
        self._write_local_file(file_path, server_content)
        self.version_manager.set_version(file_path, server_version)
        
        print(f"[Sync] Conflict resolved: server version used for {file_path}")
        print(f"[Sync] Please manually merge the conflict backup file")
