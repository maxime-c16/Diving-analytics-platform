"use client"

import React, { useState, useEffect } from "react"
import Head from "next/head"
import Link from "next/link"
import { motion } from "framer-motion"
import { 
  Activity, 
  Calculator, 
  BarChart3, 
  TrendingUp, 
  Award, 
  Users, 
  Trophy,
  Upload,
  ArrowRight
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from "@/components/ui"
import { BentoGrid, BentoGridItem, GradientText, ShimmerButton } from "@/components/aceternity"
import { SpotlightCard } from "@/components/aceternity/spotlight"
import { RecentCompetitions } from "@/components/competition/recent-competitions"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

export default function Home() {
  const [isApiHealthy, setIsApiHealthy] = useState<boolean | null>(null)

  useEffect(() => {
    checkApiHealth()
  }, [])

  const checkApiHealth = async () => {
    try {
      const health = await api.getHealth()
      setIsApiHealthy(health.status === "ok" || health.status === "healthy")
    } catch {
      setIsApiHealthy(false)
    }
  }

  const features = [
    {
      title: "Score Calculator",
      description: "Calculate dive scores using official FINA algorithms with 5 or 7 judge panels.",
      icon: <Calculator className="h-5 w-5 text-primary" />,
      href: "/calculator",
      header: (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/20 items-center justify-center">
          <Calculator className="h-10 w-10 text-primary" />
        </div>
      ),
    },
    {
      title: "Performance Analytics",
      description: "Advanced statistical analysis including mean, variance, and performance predictions.",
      icon: <BarChart3 className="h-5 w-5 text-blue-500" />,
      header: (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 items-center justify-center">
          <BarChart3 className="h-10 w-10 text-blue-500" />
        </div>
      ),
    },
    {
      title: "Judge Consistency",
      description: "Analyze judge scoring patterns and identify potential bias or inconsistencies.",
      icon: <Users className="h-5 w-5 text-amber-500" />,
      header: (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 items-center justify-center">
          <Users className="h-10 w-10 text-amber-500" />
        </div>
      ),
    },
    {
      title: "Score Predictions",
      description: "ML-powered score predictions based on historical performance data.",
      icon: <TrendingUp className="h-5 w-5 text-green-500" />,
      header: (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 items-center justify-center">
          <TrendingUp className="h-10 w-10 text-green-500" />
        </div>
      ),
    },
    {
      title: "Competition Insights",
      description: "Comprehensive competition analysis with rankings and performance comparisons.",
      icon: <Award className="h-5 w-5 text-purple-500" />,
      header: (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 items-center justify-center">
          <Award className="h-10 w-10 text-purple-500" />
        </div>
      ),
    },
    {
      title: "PDF/OCR Import",
      description: "Upload competition scoresheets with automatic OCR extraction.",
      icon: <Activity className="h-5 w-5 text-red-500" />,
      href: "/competitions",
      header: (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/20 items-center justify-center">
          <Activity className="h-10 w-10 text-red-500" />
        </div>
      ),
    },
  ]

  return (
    <>
      <Head>
        <title>Diving Analytics Platform</title>
        <meta name="description" content="Professional diving score calculation and analytics platform" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="space-y-12">
        {/* Hero Section - Compact */}
        <SpotlightCard className="rounded-2xl border bg-card p-6 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className={cn(
                "h-3 w-3 rounded-full",
                isApiHealthy === null ? "bg-gray-400" :
                isApiHealthy ? "bg-green-500" : "bg-red-500"
              )} />
              <span className="text-sm text-muted-foreground">
                {isApiHealthy === null ? "Checking API..." :
                 isApiHealthy ? "API Connected" : "API Offline"}
              </span>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                  <GradientText>Diving Analytics</GradientText>
                  <span className="text-foreground"> Platform</span>
                </h1>
                
                <p className="text-muted-foreground max-w-xl">
                  Professional diving score calculation and analytics using official FINA algorithms.
                  Upload competition results to get started.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/competitions">
                  <ShimmerButton className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Competition
                  </ShimmerButton>
                </Link>
                <Button variant="outline" asChild>
                  <Link href="/calculator" className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Score Calculator
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </SpotlightCard>

        {/* Recent Competitions - Primary Content */}
        <section>
          <RecentCompetitions 
            limit={6} 
            showUploadCTA={true}
            title="Recent Competitions"
          />
        </section>

        {/* Quick Stats Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Competition Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Upload PDF or CSV results, view detailed breakdowns, and analyze performance.
              </p>
              <Button variant="link" className="p-0 h-auto" asChild>
                <Link href="/competitions" className="flex items-center gap-1">
                  View Competitions <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Score Calculator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Calculate dive scores with FINA difficulty tables and dropped score logic.
              </p>
              <Button variant="link" className="p-0 h-auto" asChild>
                <Link href="/calculator" className="flex items-center gap-1">
                  Open Calculator <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Analytics Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Judge consistency analysis, performance trends, and statistical insights.
              </p>
              <Button variant="link" className="p-0 h-auto" asChild>
                <Link href="/competitions" className="flex items-center gap-1">
                  View Analytics <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Features Grid */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Platform Features</h2>
          <BentoGrid className="max-w-5xl">
            {features.map((feature, index) => (
              <BentoGridItem
                key={index}
                title={feature.title}
                description={feature.description}
                header={feature.header}
                icon={feature.icon}
                className={cn(
                  index === 3 || index === 6 ? "md:col-span-2" : "",
                  feature.href ? "cursor-pointer hover:bg-accent/50 transition-colors" : ""
                )}
                onClick={feature.href ? () => window.location.href = feature.href : undefined}
              />
            ))}
          </BentoGrid>
        </section>
      </div>
    </>
  )
}
