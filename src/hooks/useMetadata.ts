import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { AudioMetadata, AudioFileEntry } from "../types/download";

export function useMetadata() {
  const [fileList, setFileList] = useState<AudioFileEntry[]>([]);
  const [modifiedFiles, setModifiedFiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadDirectory = useCallback(async (dir: string) => {
    setIsLoading(true);
    try {
      const files = await invoke<AudioFileEntry[]>("list_audio_files", { dirPath: dir });
      setFileList(files);
      setModifiedFiles(new Set());
    } catch (err) {
      console.error("디렉토리 읽기 실패:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMetadata = useCallback(async (path: string) => {
    try {
      const data = await invoke<AudioMetadata>("read_metadata", { filePath: path });
      return data;
    } catch (err) {
      console.error("메타데이터 읽기 실패:", err);
      throw err;
    }
  }, []);

  const selectAudioFile = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Audio", extensions: ["m4a", "mp3", "flac"] }],
      });
      if (selected && typeof selected === "string") {
        return selected;
      }
      return null;
    } catch (err) {
      console.error("오디오 파일 선택 실패:", err);
      throw err;
    }
  }, []);

  const selectCoverImage = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Image", extensions: ["jpg", "jpeg", "png"] }],
      });
      if (selected && typeof selected === "string") {
        const contents = await readFile(selected);
        let binary = "";
        const bytes = new Uint8Array(contents);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        const ext = selected.toLowerCase().endsWith("png") ? "png" : "jpeg";
        return `data:image/${ext};base64,${base64}`;
      }
      return null;
    } catch (err) {
      console.error("이미지 선택 실패:", err);
      throw err;
    }
  }, []);

  const updateFileInGrid = useCallback((path: string, field: keyof AudioMetadata, value: string) => {
    setFileList((prev) =>
      prev.map((f) => {
        if (f.file_path === path) {
          return { ...f, metadata: { ...f.metadata, [field]: value } };
        }
        return f;
      })
    );
    setModifiedFiles((prev) => new Set(prev).add(path));
  }, []);

  const saveAllMetadata = useCallback(async () => {
    if (modifiedFiles.size === 0) return;
    setIsSaving(true);
    try {
      for (const path of modifiedFiles) {
        const file = fileList.find((f) => f.file_path === path);
        if (file) {
          await invoke("write_metadata", { filePath: path, metadata: file.metadata });
        }
      }
      setModifiedFiles(new Set());
    } catch (err) {
      console.error("메타데이터 일괄 저장 실패:", err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [modifiedFiles, fileList]);

  const saveSingleMetadata = useCallback(async (filePath: string, metadata: AudioMetadata) => {
    setIsSaving(true);
    try {
      await invoke("write_metadata", { filePath, metadata });
      setFileList((prev) =>
        prev.map((f) => (f.file_path === filePath ? { ...f, metadata } : f))
      );
      setModifiedFiles((prev) => {
        const next = new Set(prev);
        next.delete(filePath);
        return next;
      });
    } catch (err) {
      console.error("메타데이터 저장 실패:", err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    fileList,
    modifiedFiles,
    isLoading,
    isSaving,
    loadDirectory,
    loadMetadata,
    selectAudioFile,
    selectCoverImage,
    updateFileInGrid,
    saveAllMetadata,
    saveSingleMetadata,
  };
}
