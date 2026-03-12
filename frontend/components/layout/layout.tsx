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
      {/* Skip to main content link for keyboard users (WCAG 2.1 AA) */}
      <a
        href="#main-content"
        className="skip-link"
      >
        Skip to main content
      </a>

      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 bg-background">
        <div className="absolute top-0 -z-10 h-full w-full bg-[var(--gradient-bg-light)] dark:bg-[var(--gradient-bg-dark)]" />
      </div>

      <Header />
      
      <main 
        id="main-content"
        className={cn("container py-8", className)}
        role="main"
        tabIndex={-1}
      >
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
