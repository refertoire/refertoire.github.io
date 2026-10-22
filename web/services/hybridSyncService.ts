import { Platform } from 'react-native';
import JSZip from 'jszip';
import { RepertoireInstance, ScoreItem, Setlist } from '@/types/repertoire';

export type HierarchyMode = 'by_program' | 'by_voicing' | 'by_season';

export interface SyncFileNode {
  folder: string;
  filename: string;
  score: ScoreItem;
  size?: number;
}

export interface SyncProgressUpdate {
  current: number;
  total: number;
  currentFile: string;
  status: 'idle' | 'syncing' | 'synced' | 'error';
  errorMessage?: string;
}

export interface SyncManifest {
  ensembleName: string;
  ensembleCode: string;
  syncedAt: string;
  hierarchyMode: HierarchyMode;
  fileCount: number;
  files: Array<{ folder: string; filename: string; scoreId: string }>;
}

const IDB_NAME = 'refertoire_sync_db';
const IDB_STORE = 'handles';
const IDB_KEY = 'choir_root_folder';

export class HybridSyncService {
  /**
   * Check if the browser supports Direct Local Folder Access (File System Access API)
   */
  static isFileSystemAccessSupported(): boolean {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
    return 'showDirectoryPicker' in window;
  }

  /**
   * Check if running on iOS / iPadOS Safari
   */
  static isIOS(): boolean {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }

  /**
   * Open IndexedDB to store/retrieve Directory Handle
   */
  private static async getIDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get previously linked folder handle from IndexedDB
   */
  static async getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
    if (!this.isFileSystemAccessSupported()) return null;
    try {
      const db = await this.getIDB();
      return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(IDB_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Store directory handle in IndexedDB
   */
  static async saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    if (!this.isFileSystemAccessSupported()) return;
    try {
      const db = await this.getIDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        const req = store.put(handle, IDB_KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed to save directory handle in IndexedDB:', e);
    }
  }

  /**
   * Disconnect the currently linked local folder
   */
  static async removeDirectoryHandle(): Promise<void> {
    if (!this.isFileSystemAccessSupported()) return;
    try {
      const db = await this.getIDB();
      return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        const req = store.delete(IDB_KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    } catch (e) {
      console.warn('Failed to remove directory handle:', e);
    }
  }

  /**
   * Prompt user to pick a folder on their computer (Desktop Chrome / Edge)
   */
  static async pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
    if (!this.isFileSystemAccessSupported()) {
      throw new Error('File System Access API is not supported on this browser.');
    }
    // @ts-ignore
    const handle = (await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'music',
    })) as FileSystemDirectoryHandle;

    await this.saveDirectoryHandle(handle);
    return handle;
  }

  /**
   * Verify readwrite permission for an existing handle
   */
  static async verifyPermission(
    handle: FileSystemDirectoryHandle,
    readWrite = true
  ): Promise<boolean> {
    const opts = { mode: readWrite ? 'readwrite' : 'read' };
    // @ts-ignore
    if ((await handle.queryPermission(opts)) === 'granted') {
      return true;
    }
    // @ts-ignore
    if ((await handle.requestPermission(opts)) === 'granted') {
      return true;
    }
    return false;
  }

  /**
   * Sanitize directory or file name
   */
  private static sanitizeName(name: string): string {
    return name.replace(/[<>:"/\\|?*]+/g, '-').trim();
  }

  /**
   * Generate expected folder tree based on organization mode
   */
  static buildSyncTree(
    instance: RepertoireInstance,
    mode: HierarchyMode = 'by_program'
  ): SyncFileNode[] {
    const nodes: SyncFileNode[] = [];
    const scoreMap = new Map<string, ScoreItem>();
    instance.scores.forEach((s) => scoreMap.set(s.id, s));

    if (mode === 'by_program') {
      const usedScoreIds = new Set<string>();

      (instance.setlists || []).forEach((setlist, pIdx) => {
        const folderName = `${String(pIdx + 1).padStart(2, '0')} - ${this.sanitizeName(setlist.title)}`;
        (setlist.scoreIds || []).forEach((scoreId, sIdx) => {
          const score = scoreMap.get(scoreId);
          if (score) {
            usedScoreIds.add(score.id);
            const prefix = String(sIdx + 1).padStart(2, '0');
            const composerPart = score.composer ? ` (${this.sanitizeName(score.composer)})` : '';
            const filename = `${prefix} - ${this.sanitizeName(score.title)}${composerPart}.pdf`;
            nodes.push({ folder: folderName, filename, score });
          }
        });
      });

      // Remaining general scores not assigned to a program
      const generalScores = instance.scores.filter((s) => !usedScoreIds.has(s.id));
      if (generalScores.length > 0) {
        const generalFolder = 'General Repertoire';
        generalScores.forEach((score) => {
          const composerPart = score.composer ? ` (${this.sanitizeName(score.composer)})` : '';
          const filename = `${this.sanitizeName(score.title)}${composerPart}.pdf`;
          nodes.push({ folder: generalFolder, filename, score });
        });
      }
    } else if (mode === 'by_voicing') {
      instance.scores.forEach((score) => {
        const folderName = score.voicing || 'General';
        const composerPart = score.composer ? ` (${this.sanitizeName(score.composer)})` : '';
        const filename = `${this.sanitizeName(score.title)}${composerPart}.pdf`;
        nodes.push({ folder: folderName, filename, score });
      });
    } else if (mode === 'by_season') {
      instance.scores.forEach((score) => {
        const folderName = score.season || 'General Season';
        const composerPart = score.composer ? ` (${this.sanitizeName(score.composer)})` : '';
        const filename = `${this.sanitizeName(score.title)}${composerPart}.pdf`;
        nodes.push({ folder: folderName, filename, score });
      });
    }

    return nodes;
  }

  /**
   * Fetch PDF Blob helper
   */
  private static async fetchPdfBlob(url: string): Promise<Blob> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching PDF: ${url}`);
    return await res.blob();
  }

  /**
   * Perform direct disk sync into local folder (Desktop Chrome / Edge)
   */
  static async syncToLocalDisk(
    handle: FileSystemDirectoryHandle,
    instance: RepertoireInstance,
    mode: HierarchyMode = 'by_program',
    onProgress?: (update: SyncProgressUpdate) => void
  ): Promise<{ syncedCount: number; updatedCount: number }> {
    const hasPerm = await this.verifyPermission(handle, true);
    if (!hasPerm) {
      throw new Error('Permission to write to the selected local folder was denied.');
    }

    const tree = this.buildSyncTree(instance, mode);
    let syncedCount = 0;
    let updatedCount = 0;

    for (let i = 0; i < tree.length; i++) {
      const item = tree[i];
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: tree.length,
          currentFile: `${item.folder}/${item.filename}`,
          status: 'syncing',
        });
      }

      try {
        // 1. Get or create target directory
        const folderHandle = await handle.getDirectoryHandle(item.folder, { create: true });

        // 2. Check if file exists and matches size
        let needsDownload = true;
        try {
          const existingFileHandle = await folderHandle.getFileHandle(item.filename);
          const existingFile = await existingFileHandle.getFile();
          if (existingFile.size > 0 && item.score.fileSize && Math.abs(existingFile.size - item.score.fileSize) < 1024) {
            needsDownload = false; // already up to date
          }
        } catch {
          // File does not exist yet
          needsDownload = true;
        }

        if (needsDownload) {
          const blob = await this.fetchPdfBlob(item.score.sourceUrl);
          const fileHandle = await folderHandle.getFileHandle(item.filename, { create: true });
          // @ts-ignore
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          updatedCount++;
        }
        syncedCount++;
      } catch (err) {
        console.warn(`Failed to sync file ${item.folder}/${item.filename}:`, err);
      }
    }

    // Write a .refertoire-sync.json manifest
    try {
      const manifest: SyncManifest = {
        ensembleName: instance.name,
        ensembleCode: instance.code,
        syncedAt: new Date().toISOString(),
        hierarchyMode: mode,
        fileCount: syncedCount,
        files: tree.map((t) => ({
          folder: t.folder,
          filename: t.filename,
          scoreId: t.score.id,
        })),
      };
      const manifestHandle = await handle.getFileHandle('.refertoire-sync.json', { create: true });
      // @ts-ignore
      const writable = await manifestHandle.createWritable();
      await writable.write(JSON.stringify(manifest, null, 2));
      await writable.close();
    } catch (e) {
      console.warn('Failed to write .refertoire-sync.json:', e);
    }

    if (onProgress) {
      onProgress({
        current: tree.length,
        total: tree.length,
        currentFile: 'Sync complete',
        status: 'synced',
      });
    }

    return { syncedCount, updatedCount };
  }

  /**
   * Export folder hierarchy as a structured ZIP archive (iOS Files & universal fallback)
   */
  static async exportZipArchive(
    instance: RepertoireInstance,
    mode: HierarchyMode = 'by_program',
    onProgress?: (update: SyncProgressUpdate) => void
  ): Promise<Blob> {
    const zip = new JSZip();
    const tree = this.buildSyncTree(instance, mode);

    for (let i = 0; i < tree.length; i++) {
      const item = tree[i];
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: tree.length,
          currentFile: `${item.folder}/${item.filename}`,
          status: 'syncing',
        });
      }

      try {
        const blob = await this.fetchPdfBlob(item.score.sourceUrl);
        const folder = zip.folder(item.folder);
        if (folder) {
          folder.file(item.filename, blob);
        }
      } catch (e) {
        console.warn(`Failed to package ${item.filename} into zip:`, e);
      }
    }

    // Add sync manifest into the zip
    const manifest: SyncManifest = {
      ensembleName: instance.name,
      ensembleCode: instance.code,
      syncedAt: new Date().toISOString(),
      hierarchyMode: mode,
      fileCount: tree.length,
      files: tree.map((t) => ({
        folder: t.folder,
        filename: t.filename,
        scoreId: t.score.id,
      })),
    };
    zip.file('00-REPERTOIRE-SYNC-INFO.json', JSON.stringify(manifest, null, 2));

    const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
      if (onProgress) {
        onProgress({
          current: tree.length,
          total: tree.length,
          currentFile: `Compressing package (${Math.round(metadata.percent)}%)...`,
          status: 'syncing',
        });
      }
    });

    if (onProgress) {
      onProgress({
        current: tree.length,
        total: tree.length,
        currentFile: 'Zip package ready',
        status: 'synced',
      });
    }

    return zipBlob;
  }

  /**
   * Trigger download or iOS Web Share for a generated Blob
   */
  static async shareOrDownloadFile(
    blob: Blob,
    filename: string,
    title = 'Refertoire Repertoire Archive'
  ): Promise<void> {
    if (typeof window === 'undefined') return;

    // Check if Web Share API with files is available (iOS / iPadOS)
    const file = new File([blob], filename, { type: blob.type || 'application/zip' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title,
          text: `Refertoire folder hierarchy for ${filename}`,
        });
        return;
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.warn('Web Share failed, falling back to download:', e);
        } else {
          return; // user cancelled share sheet
        }
      }
    }

    // Standard download link trigger
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }

  /**
   * Open / Share a single PDF directly into sheet music apps (forScore, PiaScore, etc.)
   */
  static async openInSheetMusicApp(score: ScoreItem): Promise<void> {
    try {
      const blob = await this.fetchPdfBlob(score.sourceUrl);
      const filename = `${this.sanitizeName(score.title)}.pdf`;
      const file = new File([blob], filename, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: score.title,
          text: `${score.title} (${score.composer || 'Sheet Music'})`,
        });
        return;
      }

      // Fallback: open in new tab or download
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.warn('Failed to open score in app:', e);
    }
  }
}
