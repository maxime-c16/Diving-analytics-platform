"use client"

import React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Activity, BarChart3, FileUp, Settings, Users } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

interface HeaderProps {
  className?: string
}

const navItems = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Score Calculator", href: "/calculator", icon: Activity },
  { name: "Data Import", href: "/import", icon: FileUp },
  { name: "Athletes", href: "/athletes", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Header({ className }: HeaderProps) {
  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
      className={cn(
        "sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              Diving Analytics
            </span>
          </Link>
        </div>
        
        <nav className="flex items-center gap-6 text-sm flex-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-2 text-foreground/60 transition-colors hover:text-foreground"
            >
              <item.icon className="h-4 w-4" />
              <span className="hidden md:inline-block">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </motion.header>
  )
}
