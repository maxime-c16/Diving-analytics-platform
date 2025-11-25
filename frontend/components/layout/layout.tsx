"use client"

import React from "react"
import { Header } from "./header"
import { cn } from "@/lib/utils"

interface LayoutProps {
  children: React.ReactNode
  className?: string
}

export function Layout({ children, className }: LayoutProps) {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 bg-background">
        <div className="absolute top-0 -z-10 h-full w-full bg-[var(--gradient-bg-light)] dark:bg-[var(--gradient-bg-dark)]" />
      </div>

      <Header />
      
      <main className={cn("container py-8", className)}>
        {children}
      </main>

      <footer className="border-t border-border/40 py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built for diving analytics. Powered by{" "}
            <span className="font-medium text-foreground">FINA</span> standards.
          </p>
        </div>
      </footer>
    </div>
  )
}
