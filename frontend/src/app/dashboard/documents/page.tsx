"use client";

import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Loader2,
  Trash2,
  RefreshCw,
  Check,
  AlertCircle,
  Clock,
  HardDrive,
  Layers,
  Search,
  X,
} from "lucide-react";
import { documentsApi, Document } from "@/lib/api";
import {
  cn,
  formatFileSize,
  formatDate,
  formatRelativeTime,
  getStatusColor,
  getFileIcon,
} from "@/lib/utils";
import toast from "react-hot-toast";

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  // Fetch documents
  const {
    data: docsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["documents"],
    queryFn: documentsApi.list,
    refetchInterval: 5000, // Refetch every 5 seconds to check processing status
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: documentsApi.upload,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      if (data.successful > 0) {
        toast.success(`Uploaded ${data.successful} file(s) successfully`);
      }
      if (data.failed > 0) {
        toast.error(`Failed to upload ${data.failed} file(s)`);
      }
    },
    onError: () => {
      toast.error("Upload failed. Please try again.");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted");
      setSelectedDoc(null);
    },
    onError: () => {
      toast.error("Failed to delete document");
    },
  });

  // Reprocess mutation
  const reprocessMutation = useMutation({
    mutationFn: documentsApi.reprocess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document queued for reprocessing");
    },
    onError: () => {
      toast.error("Failed to reprocess document");
    },
  });

  // Dropzone
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        uploadMutation.mutate(acceptedFiles);
      }
    },
    [uploadMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  // Filter documents
  const filteredDocs =
    docsData?.documents.filter((doc) =>
      doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [];

  // Stats
  const stats = [
    {
      icon: FileText,
      label: "Documents",
      value: docsData?.total ?? 0,
      color: "text-info",
    },
    {
      icon: Layers,
      label: "Chunks",
      value: docsData?.total_chunks ?? 0,
      color: "text-warning",
    },
    {
      icon: HardDrive,
      label: "Embeddings",
      value: docsData?.total_embeddings ?? 0,
      color: "text-accent",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <Check className="w-4 h-4" />;
      case "processing":
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "failed":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-text-secondary mt-1">
            Upload and manage your knowledge base
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn-secondary flex items-center gap-2 w-fit"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card flex items-center gap-4"
          >
            <div className={cn("p-3 rounded-xl bg-surface-active", stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
              <p className="text-sm text-text-muted">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Upload Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200",
            isDragActive
              ? "border-accent bg-accent/10"
              : "border-border hover:border-accent/50 hover:bg-surface"
          )}
        >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          {uploadMutation.isPending ? (
            <>
              <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
              <p className="text-lg font-medium">Uploading...</p>
            </>
          ) : (
            <>
              <div
                className={cn(
                  "p-4 rounded-2xl mb-4 transition-colors",
                  isDragActive ? "bg-accent/20" : "bg-surface-active"
                )}
              >
                <Upload
                  className={cn(
                    "w-8 h-8",
                    isDragActive ? "text-accent" : "text-text-muted"
                  )}
                />
              </div>
              <p className="text-lg font-medium mb-1">
                {isDragActive
                  ? "Drop files here"
                  : "Drag & drop files or click to upload"}
              </p>
              <p className="text-sm text-text-muted">
                Supports .txt and .pdf files up to 10MB
              </p>
            </>
          )}
        </div>
        </div>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search documents..."
          className="input-field pl-12"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Documents List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-surface-active rounded-2xl w-fit mx-auto mb-4">
              <FileText className="w-8 h-8 text-text-muted" />
            </div>
            <p className="text-lg font-medium mb-1">No documents found</p>
            <p className="text-text-secondary">
              {searchQuery
                ? "Try a different search term"
                : "Upload some documents to get started"}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredDocs.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedDoc(doc)}
                className={cn(
                  "card-interactive flex items-center gap-4",
                  selectedDoc?.id === doc.id && "border-accent/50 bg-surface-hover"
                )}
              >
                {/* File Icon */}
                <div className="text-3xl">{getFileIcon(doc.file_type)}</div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{doc.filename}</p>
                  <div className="flex items-center gap-3 text-sm text-text-muted mt-1">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>•</span>
                    <span>{formatRelativeTime(doc.created_at)}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-text-primary">
                      {doc.chunk_count}
                    </p>
                    <p className="text-text-muted text-xs">Chunks</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-text-primary">
                      {doc.embedding_count}
                    </p>
                    <p className="text-text-muted text-xs">Embeddings</p>
                  </div>
                </div>

                {/* Status */}
                <div className={cn("flex items-center gap-1.5", getStatusColor(doc.status))}>
                  {getStatusIcon(doc.status)}
                  <span className="text-sm capitalize">{doc.status}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {doc.status === "failed" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        reprocessMutation.mutate(doc.id);
                      }}
                      disabled={reprocessMutation.isPending}
                      className="p-2 hover:bg-surface-active rounded-lg transition-colors text-warning"
                      title="Reprocess"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this document?")) {
                        deleteMutation.mutate(doc.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="p-2 hover:bg-surface-active rounded-lg transition-colors text-text-muted hover:text-error"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Document Detail Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setSelectedDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border border-border rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-auto"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">
                    {getFileIcon(selectedDoc.file_type)}
                  </span>
                  <div>
                    <h2 className="font-semibold text-lg">
                      {selectedDoc.filename}
                    </h2>
                    <p className="text-sm text-text-muted">
                      {formatFileSize(selectedDoc.file_size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="p-2 hover:bg-surface-hover rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center justify-between p-3 bg-surface-hover rounded-xl">
                  <span className="text-text-secondary">Status</span>
                  <div
                    className={cn(
                      "flex items-center gap-1.5",
                      getStatusColor(selectedDoc.status)
                    )}
                  >
                    {getStatusIcon(selectedDoc.status)}
                    <span className="capitalize">{selectedDoc.status}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-surface-hover rounded-xl">
                    <p className="text-2xl font-bold">{selectedDoc.chunk_count}</p>
                    <p className="text-sm text-text-muted">Chunks</p>
                  </div>
                  <div className="p-3 bg-surface-hover rounded-xl">
                    <p className="text-2xl font-bold">
                      {selectedDoc.embedding_count}
                    </p>
                    <p className="text-sm text-text-muted">Embeddings</p>
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">Uploaded</span>
                    <span>{formatDate(selectedDoc.created_at)}</span>
                  </div>
                  {selectedDoc.processed_at && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-muted">Processed</span>
                      <span>{formatDate(selectedDoc.processed_at)}</span>
                    </div>
                  )}
                </div>

                {/* Content Preview */}
                {selectedDoc.content_preview && (
                  <div>
                    <p className="text-sm text-text-muted mb-2">Content Preview</p>
                    <div className="p-3 bg-surface-hover rounded-xl max-h-40 overflow-auto">
                      <p className="text-sm font-mono text-text-secondary whitespace-pre-wrap">
                        {selectedDoc.content_preview}
                      </p>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {selectedDoc.error_message && (
                  <div className="p-3 bg-error/10 border border-error/30 rounded-xl">
                    <p className="text-sm text-error">{selectedDoc.error_message}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  {selectedDoc.status === "failed" && (
                    <button
                      onClick={() => reprocessMutation.mutate(selectedDoc.id)}
                      disabled={reprocessMutation.isPending}
                      className="btn-secondary flex-1 flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reprocess
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm("Delete this document?")) {
                        deleteMutation.mutate(selectedDoc.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2 text-error hover:bg-error/10"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

