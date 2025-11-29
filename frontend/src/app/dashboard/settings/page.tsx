"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  User,
  Shield,
  Database,
  Cpu,
  HardDrive,
  Settings,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { healthApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useAuthStore();

  // Fetch system health
  const { data: healthData, isLoading } = useQuery({
    queryKey: ["health"],
    queryFn: healthApi.detailed,
  });

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-text-secondary mt-1">
          Manage your account and view system status
        </p>
      </div>

      {/* Account Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent/20 rounded-xl">
            <User className="w-5 h-5 text-accent" />
          </div>
          <h2 className="text-lg font-semibold">Account</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-surface-hover rounded-xl">
            <div>
              <p className="text-sm text-text-muted">Username</p>
              <p className="font-medium">{user?.username}</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-hover rounded-xl">
            <div>
              <p className="text-sm text-text-muted">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-hover rounded-xl">
            <div>
              <p className="text-sm text-text-muted">Account Status</p>
              <div className="flex items-center gap-2 mt-1">
                {user?.is_active ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="text-success font-medium">Active</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-error" />
                    <span className="text-error font-medium">Inactive</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-hover rounded-xl">
            <div>
              <p className="text-sm text-text-muted">Member Since</p>
              <p className="font-medium">
                {user?.created_at ? formatDate(user.created_at) : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* System Status Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-info/20 rounded-xl">
            <Settings className="w-5 h-5 text-info" />
          </div>
          <h2 className="text-lg font-semibold">System Status</h2>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-surface-hover rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* API Status */}
            <div className="flex items-center justify-between p-4 bg-surface-hover rounded-xl">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-text-muted" />
                <div>
                  <p className="font-medium">API Status</p>
                  <p className="text-sm text-text-muted">
                    {healthData?.app_name} v{healthData?.version}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                <span className="text-success text-sm font-medium">Online</span>
              </div>
            </div>

            {/* LLM Status */}
            <div className="flex items-center justify-between p-4 bg-surface-hover rounded-xl">
              <div className="flex items-center gap-3">
                <Cpu className="w-5 h-5 text-text-muted" />
                <div>
                  <p className="font-medium">LLM Service</p>
                  <p className="text-sm text-text-muted">
                    Model: {healthData?.services?.llm?.model || "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {healthData?.services?.llm?.llm_available ? (
                  <>
                    <div className="w-2 h-2 bg-success rounded-full" />
                    <span className="text-success text-sm font-medium">
                      Connected
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-warning rounded-full" />
                    <span className="text-warning text-sm font-medium">
                      Mock Mode
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Vector Store Status */}
            <div className="flex items-center justify-between p-4 bg-surface-hover rounded-xl">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-text-muted" />
                <div>
                  <p className="font-medium">Vector Store</p>
                  <p className="text-sm text-text-muted">
                    {healthData?.services?.vector_store?.total_embeddings?.toLocaleString() ||
                      0}{" "}
                    embeddings
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {healthData?.services?.vector_store?.available ? (
                  <>
                    <div className="w-2 h-2 bg-success rounded-full" />
                    <span className="text-success text-sm font-medium">
                      Active
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-error rounded-full" />
                    <span className="text-error text-sm font-medium">
                      Unavailable
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Configuration Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-warning/20 rounded-xl">
            <HardDrive className="w-5 h-5 text-warning" />
          </div>
          <h2 className="text-lg font-semibold">Configuration</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-surface-hover rounded-xl">
            <p className="text-sm text-text-muted">Chunk Size</p>
            <p className="font-medium">
              {healthData?.config?.chunk_size?.toLocaleString() || "N/A"} chars
            </p>
          </div>

          <div className="p-4 bg-surface-hover rounded-xl">
            <p className="text-sm text-text-muted">Chunk Overlap</p>
            <p className="font-medium">
              {healthData?.config?.chunk_overlap?.toLocaleString() || "N/A"} chars
            </p>
          </div>

          <div className="p-4 bg-surface-hover rounded-xl">
            <p className="text-sm text-text-muted">Max File Size</p>
            <p className="font-medium">
              {healthData?.config?.max_file_size_mb || "N/A"} MB
            </p>
          </div>

          <div className="p-4 bg-surface-hover rounded-xl">
            <p className="text-sm text-text-muted">Allowed Extensions</p>
            <p className="font-medium">
              {healthData?.config?.allowed_extensions?.join(", ") || "N/A"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* About Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center text-text-muted text-sm py-8"
      >
        <p>AI Knowledge Assistant</p>
        <p className="mt-1">Built with FastAPI, LangChain, Next.js & ❤️</p>
      </motion.div>
    </div>
  );
}

