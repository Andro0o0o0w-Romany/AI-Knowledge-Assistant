"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { Brain, FileText, MessageSquare, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const features = [
    {
      icon: FileText,
      title: "Upload Documents",
      description:
        "Upload .txt and .pdf files to build your personal knowledge base",
    },
    {
      icon: Brain,
      title: "AI-Powered Search",
      description:
        "Semantic search through your documents using advanced embeddings",
    },
    {
      icon: MessageSquare,
      title: "Ask Questions",
      description:
        "Get intelligent answers based on your uploaded documents",
    },
    {
      icon: Sparkles,
      title: "Source References",
      description:
        "View the exact sources used to generate each response",
    },
  ];

  return (
    <main className="min-h-screen bg-background bg-gradient-mesh">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-info/5 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-6 py-6">
          <nav className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="p-2 bg-accent/20 rounded-xl">
                <Brain className="w-8 h-8 text-accent" />
              </div>
              <span className="text-xl font-semibold">Knowledge Assistant</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <Link href="/login" className="btn-ghost">
                Sign In
              </Link>
              <Link href="/register" className="btn-primary">
                Get Started
              </Link>
            </motion.div>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-6 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 rounded-full text-accent mb-8">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">
                Powered by AI & LangChain
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Your{" "}
              <span className="text-gradient">AI Knowledge</span>
              <br />
              Assistant
            </h1>

            <p className="text-xl text-text-secondary mb-10 max-w-2xl mx-auto">
              Upload your documents, ask questions, and get intelligent answers
              backed by your own knowledge base. Built with FastAPI, LangChain,
              and Next.js.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link href="/register" className="btn-primary text-lg px-8 py-4">
                Start for Free
              </Link>
              <Link
                href="/login"
                className="btn-secondary text-lg px-8 py-4"
              >
                Sign In
              </Link>
            </div>
          </motion.div>

          {/* Feature cards */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="glass-panel p-6 text-left group hover:border-accent/30 transition-all duration-300"
              >
                <div className="p-3 bg-accent/10 rounded-xl w-fit mb-4 group-hover:bg-accent/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-text-secondary text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Tech Stack Section */}
        <section className="container mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Built with Modern Stack</h2>
            <p className="text-text-secondary">
              Powered by cutting-edge technologies for reliability and
              performance
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-4">
            {[
              "FastAPI",
              "LangChain",
              "Next.js 14",
              "PostgreSQL",
              "ChromaDB",
              "OpenAI",
              "TailwindCSS",
              "Docker",
            ].map((tech, index) => (
              <motion.div
                key={tech}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="px-5 py-2.5 bg-surface border border-border rounded-full text-sm font-medium text-text-secondary hover:text-accent hover:border-accent/50 transition-colors"
              >
                {tech}
              </motion.div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-6 py-10 border-t border-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-text-secondary">
              <Brain className="w-5 h-5 text-accent" />
              <span className="font-medium">AI Knowledge Assistant</span>
            </div>
            <p className="text-text-muted text-sm">
              Built for Nixai Labs Challenge
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}

