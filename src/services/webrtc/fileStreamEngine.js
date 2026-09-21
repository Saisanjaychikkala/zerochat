/**
 * ZeroChat - Memory-to-Memory P2P File Streaming Engine
 * Streams files in 16KB ArrayBuffer chunks across WebRTC DataChannel with backpressure flow control.
 */

import { CHUNK_SIZE } from './constants';

export class FileStreamEngine {
  constructor() {
    this.incomingFiles = new Map(); // fileId -> { meta, chunks: [], receivedCount, receivedBytes, startTime }
    this.activeSenders = new Map(); // fileId -> { cancel: boolean }
    this.currentReceivingChunk = null; // { fileId, chunkIndex }
  }

  async sendFile(conn, file, myNickname, sendJson, emit, onProgress = null) {
    if (!conn || !conn.open) {
      throw new Error('Peer not connected');
    }

    const fileId = 'file_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    this.activeSenders.set(fileId, { cancel: false });

    // 1. Send file metadata header
    sendJson({
      type: 'file_meta',
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      totalChunks,
      senderNickname: myNickname,
      isVoiceNote: !!file.isVoiceNote,
      durationSec: file.durationSec || 0,
    });

    emit('file_start', {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isSender: true,
      isVoiceNote: !!file.isVoiceNote,
      durationSec: file.durationSec || 0,
    });

    let offset = 0;
    let chunkIndex = 0;
    const startTime = performance.now();

    while (offset < file.size) {
      if (!conn || !conn.open) {
        throw new Error('Connection lost during file transfer');
      }

      if (this.activeSenders.get(fileId)?.cancel) {
        sendJson({ type: 'file_cancel', fileId });
        emit('file_cancelled', { fileId });
        this.activeSenders.delete(fileId);
        return;
      }

      // CRITICAL BACKPRESSURE: Wait until RTCDataChannel buffer drains below 64KB
      const rawDc = conn?.dataChannel || conn?._dc;
      if (rawDc && rawDc.bufferedAmount > 64 * 1024) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        continue;
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const arrayBuffer = await slice.arrayBuffer();

      // Send chunk header then raw binary buffer
      sendJson({
        type: 'file_chunk_meta',
        fileId,
        chunkIndex,
      });

      // Send raw binary buffer across native WebRTC DataChannel
      conn.send(arrayBuffer);

      offset += CHUNK_SIZE;
      chunkIndex += 1;

      const progress = Math.min(100, Math.round((offset / file.size) * 100));
      const elapsedSec = (performance.now() - startTime) / 1000;
      const speedBps = elapsedSec > 0 ? offset / elapsedSec : 0;

      if (onProgress) onProgress(progress, speedBps);
      emit('file_progress', {
        fileId,
        progress,
        speedBps,
        isSender: true,
      });

      // Periodic yield to avoid locking UI thread on low-end devices
      if (chunkIndex % 4 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 2));
      }
    }

    this.activeSenders.delete(fileId);
    const downloadUrl = URL.createObjectURL(file);

    emit('file_complete', {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isSender: true,
      downloadUrl,
      blob: file,
      isVoiceNote: !!file.isVoiceNote,
      durationSec: file.durationSec || 0,
    });

    return fileId;
  }

  cancelFileTransfer(fileId, sendJson, emit) {
    if (this.activeSenders.has(fileId)) {
      this.activeSenders.get(fileId).cancel = true;
      this.activeSenders.delete(fileId);
    }
    if (this.incomingFiles.has(fileId)) {
      this.incomingFiles.delete(fileId);
    }
    sendJson({ type: 'file_cancel', fileId });
    emit('file_cancelled', { fileId });
  }

  handleFileMeta(packet, remoteNickname, emit) {
    this.incomingFiles.set(packet.fileId, {
      meta: packet,
      chunks: new Array(packet.totalChunks),
      receivedCount: 0,
      receivedBytes: 0,
      startTime: performance.now(),
    });

    emit('file_start', {
      fileId: packet.fileId,
      fileName: packet.fileName,
      fileSize: packet.fileSize,
      fileType: packet.fileType,
      senderNickname: packet.senderNickname || remoteNickname,
      isSender: false,
      isVoiceNote: !!packet.isVoiceNote,
      durationSec: packet.durationSec || 0,
    });
  }

  handleFileChunkMeta(packet) {
    this.currentReceivingChunk = {
      fileId: packet.fileId,
      chunkIndex: packet.chunkIndex,
    };
  }

  handleBinaryFileChunk(arrayBuffer, emit) {
    if (!this.currentReceivingChunk) return;

    const { fileId, chunkIndex } = this.currentReceivingChunk;
    const record = this.incomingFiles.get(fileId);
    if (!record) return;

    record.chunks[chunkIndex] = arrayBuffer;
    record.receivedCount += 1;
    record.receivedBytes += arrayBuffer.byteLength;

    const progress = Math.min(
      100,
      Math.round((record.receivedCount / record.meta.totalChunks) * 100)
    );
    const elapsedSec = (performance.now() - record.startTime) / 1000;
    const speedBps = elapsedSec > 0 ? record.receivedBytes / elapsedSec : 0;

    emit('file_progress', {
      fileId,
      progress,
      speedBps,
      isSender: false,
    });

    if (record.receivedCount === record.meta.totalChunks) {
      const blob = new Blob(record.chunks, { type: record.meta.fileType });
      const downloadUrl = URL.createObjectURL(blob);

      emit('file_complete', {
        fileId,
        fileName: record.meta.fileName,
        fileSize: record.meta.fileSize,
        fileType: record.meta.fileType,
        senderNickname: record.meta.senderNickname,
        downloadUrl,
        blob,
        isSender: false,
        isVoiceNote: !!record.meta.isVoiceNote,
        durationSec: record.meta.durationSec || 0,
      });

      this.incomingFiles.delete(fileId);
      this.currentReceivingChunk = null;
    }
  }

  handleFileCancel(fileId, emit) {
    if (this.activeSenders.has(fileId)) {
      this.activeSenders.get(fileId).cancel = true;
      this.activeSenders.delete(fileId);
    }
    this.incomingFiles.delete(fileId);
    emit('file_cancelled', { fileId });
  }

  clear() {
    this.incomingFiles.clear();
    this.activeSenders.clear();
    this.currentReceivingChunk = null;
  }
}
