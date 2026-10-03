import { CHUNK_SIZE } from './constants.js';

const MAGIC = [0x5A, 0x43, 0x46, 0x43]; // "ZCFC"

export function packBinaryChunk(fileId, chunkIndex, totalChunks, rawBuffer) {
  const enc = new TextEncoder();
  const idBytes = enc.encode(fileId);
  const idLen = idBytes.length;
  const headerLen = 4 + 1 + idLen + 4 + 4;
  const combined = new Uint8Array(headerLen + rawBuffer.byteLength);
  combined.set(MAGIC, 0);
  combined[4] = idLen;
  combined.set(idBytes, 5);
  const view = new DataView(combined.buffer, combined.byteOffset, combined.byteLength);
  const indexOffset = 5 + idLen;
  view.setUint32(indexOffset, chunkIndex, false);
  view.setUint32(indexOffset + 4, totalChunks, false);
  combined.set(new Uint8Array(rawBuffer), headerLen);
  return combined.buffer;
}

export function unpackBinaryChunk(input) {
  if (!input) return null;
  const isView = ArrayBuffer.isView(input);
  const arrayBuffer = isView ? input.buffer : input;
  if (!(arrayBuffer instanceof ArrayBuffer)) return null;

  const byteOffset = isView ? input.byteOffset : 0;
  const totalLength = isView ? input.byteLength : arrayBuffer.byteLength;
  if (totalLength < 14) return null;

  const u8 = new Uint8Array(arrayBuffer, byteOffset, totalLength);
  if (u8[0] !== 0x5A || u8[1] !== 0x43 || u8[2] !== 0x46 || u8[3] !== 0x43) {
    return null;
  }
  const idLen = u8[4];
  if (totalLength < 13 + idLen) return null;

  const dec = new TextDecoder();
  const fileId = dec.decode(u8.subarray(5, 5 + idLen));
  const view = new DataView(arrayBuffer, byteOffset + 5 + idLen, 8);
  const chunkIndex = view.getUint32(0, false);
  const totalChunks = view.getUint32(4, false);
  const payload = u8.subarray(13 + idLen);
  return { fileId, chunkIndex, totalChunks, payload };
}

export class FileStreamEngine {
  constructor() {
    this.incomingFiles = new Map(); // fileId -> { meta, chunks: [], receivedCount, receivedBytes, startTime }
    this.activeSenders = new Map(); // fileId -> { cancel: boolean }
    this.inMemoryFiles = new Map(); // fileId -> { file, previewData, createdAt, isVoiceNote, durationSec }
    this.currentReceivingChunk = null; // { fileId, chunkIndex }
  }

  stageFileOffer(file, previewData = null) {
    const fileId = 'file_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const waveform = file.waveform || (previewData && previewData.waveform) || null;
    this.inMemoryFiles.set(fileId, {
      file,
      previewData,
      createdAt: Date.now(),
      isVoiceNote: !!file.isVoiceNote,
      durationSec: file.durationSec || 0,
      waveform,
    });

    return {
      type: 'file_offer',
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      totalChunks,
      previewData,
      isVoiceNote: !!file.isVoiceNote,
      durationSec: file.durationSec || 0,
      waveform,
      timestamp: Date.now()
    };
  }

  async serveFileRequest(conn, fileId, myNickname, sendJson, emit, onProgress = null) {
    const record = this.inMemoryFiles.get(fileId);
    if (!record || !record.file) {
      sendJson({
        type: 'file_error',
        fileId,
        reason: 'Media expired from RAM. Sender session reset or file purged.'
      });
      return;
    }
    return this.sendFile(conn, record.file, myNickname, sendJson, emit, onProgress, fileId);
  }

  async sendFile(conn, file, myNickname, sendJson, emit, onProgress = null, existingFileId = null) {
    if (!conn || !conn.open) {
      throw new Error('Peer not connected');
    }

    const fileId = existingFileId || ('file_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now());
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

      // CRITICAL BACKPRESSURE & TRAFFIC PRIORITIZATION: 
      // Keep DataChannel buffer below 48KB so interactive game moves and control packets interleave with sub-frame delivery
      const rawDc = conn?.dataChannel || conn?._dc;
      if (rawDc && rawDc.bufferedAmount > 48 * 1024) {
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

      // Pack chunk with zero-copy binary header and send
      const packedBuffer = packBinaryChunk(fileId, chunkIndex, totalChunks, arrayBuffer);
      conn.send(packedBuffer);

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
    const unpacked = unpackBinaryChunk(arrayBuffer);
    let fileId, chunkIndex, chunkData;

    if (unpacked) {
      fileId = unpacked.fileId;
      chunkIndex = unpacked.chunkIndex;
      chunkData = unpacked.payload;
    } else if (this.currentReceivingChunk) {
      fileId = this.currentReceivingChunk.fileId;
      chunkIndex = this.currentReceivingChunk.chunkIndex;
      chunkData = arrayBuffer;
    } else {
      return;
    }

    const record = this.incomingFiles.get(fileId);
    if (!record) return;

    record.chunks[chunkIndex] = chunkData;
    record.receivedCount += 1;
    record.receivedBytes += chunkData.byteLength;

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

  handleFileError(packet, emit) {
    emit('file_error', {
      fileId: packet.fileId,
      reason: packet.reason || 'Media expired from RAM. Sender session reset.'
    });
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
    this.inMemoryFiles.clear();
    this.currentReceivingChunk = null;
  }
}
