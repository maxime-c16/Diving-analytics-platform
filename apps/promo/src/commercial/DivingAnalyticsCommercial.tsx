import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type CommercialProps = {
  title: string;
  subtitle: string;
};

const palette = {
  ink: "#191510",
  paper: "#f3efe6",
  surface: "#fbf8f1",
  line: "#cfbfaa",
  accent: "#b46234",
  accentSoft: "#dfc5af",
  green: "#315f53",
  muted: "#706555",
};

const shots = {
  overview: staticFile("shots/overview.png"),
  upload: staticFile("shots/upload.png"),
  competition: staticFile("shots/competition.png"),
  athlete: staticFile("shots/athlete.png"),
  athleteMaxime: staticFile("shots/athlete-maxime.png"),
  athleteMathis: staticFile("shots/athlete-mathis.png"),
  technique: staticFile("shots/technique.png"),
  techniqueMaxime: staticFile("shots/technique-maxime.png"),
  techniqueMathis: staticFile("shots/technique-mathis.png"),
  club: staticFile("shots/club.png"),
};

const scenePadding = 96;

const storySteps = [
  "Ingest official result sheets",
  "Review extraction quality and coverage",
  "Open the competition workspace",
  "Jump into athlete and pair context",
  "Break down dive technique by group",
  "Track club intelligence and roster depth",
];

function Background() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const pan = interpolate(frame, [0, durationInFrames], [0, -140]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.paper,
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(25,21,16,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(25,21,16,0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          transform: `translate3d(${pan}px, ${pan * 0.35}px, 0)`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 20% 15%, rgba(180,98,52,0.18), transparent 26%), radial-gradient(circle at 82% 78%, rgba(49,95,83,0.12), transparent 22%)",
        }}
      />
    </AbsoluteFill>
  );
}

function FramePanel(props: React.PropsWithChildren<{ title?: string; subtitle?: string; style?: React.CSSProperties }>) {
  return (
    <div
      style={{
        border: `1px solid ${palette.line}`,
        backgroundColor: palette.surface,
        color: palette.ink,
        padding: 24,
        ...props.style,
      }}
    >
      {props.title ? (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.04em" }}>{props.title}</div>
          {props.subtitle ? (
            <div style={{ color: palette.muted, fontSize: 18, marginTop: 4 }}>{props.subtitle}</div>
          ) : null}
        </div>
      ) : null}
      {props.children}
    </div>
  );
}

function BrowserShot(props: {
  src: string;
  fromFrame: number;
  zoomFrom?: number;
  zoomTo?: number;
  xFrom?: number;
  xTo?: number;
  yFrom?: number;
  yTo?: number;
  width?: number;
  height?: number;
  label?: string;
}) {
  const frame = useCurrentFrame() - props.fromFrame;
  const { fps } = useVideoConfig();
  const reveal = spring({ frame, fps, config: { damping: 16, stiffness: 120 } });
  const zoom = interpolate(reveal, [0, 1], [props.zoomFrom ?? 1.05, props.zoomTo ?? 1]);
  const x = interpolate(reveal, [0, 1], [props.xFrom ?? 0, props.xTo ?? 0], {
    easing: Easing.bezier(0.2, 0.8, 0.2, 1),
  });
  const y = interpolate(reveal, [0, 1], [props.yFrom ?? 0, props.yTo ?? 0], {
    easing: Easing.bezier(0.2, 0.8, 0.2, 1),
  });
  const opacity = interpolate(reveal, [0, 1], [0, 1]);

  return (
    <div
      style={{
        width: props.width ?? 1280,
        height: props.height ?? 720,
        border: `1px solid ${palette.ink}`,
        backgroundColor: "#e8e0d3",
        overflow: "hidden",
        position: "relative",
        opacity,
      }}
    >
      <div
        style={{
          height: 44,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 16px",
          borderBottom: `1px solid ${palette.line}`,
          backgroundColor: "#efe8dc",
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: palette.accent }} />
        <div style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: "#cfa06b" }} />
        <div style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: palette.green }} />
        <div style={{ marginLeft: 14, fontSize: 16, color: palette.muted }}>{props.label || "Diving Analytics"}</div>
      </div>
      <div style={{ position: "absolute", inset: 44, overflow: "hidden" }}>
        <Img
          src={props.src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `translate3d(${x}px, ${y}px, 0) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        />
      </div>
    </div>
  );
}

function SceneTitle(props: { frameOffset: number; title: string; kicker?: string; copy?: string; align?: "left" | "center" }) {
  const frame = useCurrentFrame() - props.frameOffset;
  const { fps } = useVideoConfig();
  const reveal = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const y = interpolate(reveal, [0, 1], [38, 0]);
  const opacity = interpolate(reveal, [0, 1], [0, 1]);
  return (
    <div
      style={{
        transform: `translateY(${y}px)`,
        opacity,
        textAlign: props.align || "left",
      }}
    >
      {props.kicker ? (
        <div style={{ fontSize: 22, color: palette.accent, marginBottom: 10, fontWeight: 600 }}>{props.kicker}</div>
      ) : null}
      <div
        style={{
          fontSize: 86,
          lineHeight: 0.92,
          fontWeight: 700,
          letterSpacing: "-0.06em",
          color: palette.ink,
          maxWidth: 980,
        }}
      >
        {props.title}
      </div>
      {props.copy ? (
        <div
          style={{
            marginTop: 20,
            fontSize: 28,
            color: palette.muted,
            maxWidth: 860,
            lineHeight: 1.35,
          }}
        >
          {props.copy}
        </div>
      ) : null}
    </div>
  );
}

function MetricStrip(props: { items: Array<{ label: string; value: string }> }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${props.items.length}, minmax(0, 1fr))`,
        borderTop: `1px solid ${palette.line}`,
        borderBottom: `1px solid ${palette.line}`,
      }}
    >
      {props.items.map((item) => (
        <div
          key={item.label}
          style={{
            padding: "18px 20px",
            borderRight: `1px solid ${palette.line}`,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 17, color: palette.muted }}>{item.label}</span>
          <strong style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.04em" }}>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function NamedRoster(props: { title: string; names: string[]; style?: React.CSSProperties }) {
  return (
    <FramePanel title={props.title} subtitle="Real athlete examples used in the product flow" style={props.style}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        {props.names.map((name) => (
          <div
            key={name}
            style={{
              borderTop: `1px solid ${palette.line}`,
              paddingTop: 10,
              fontSize: 20,
            }}
          >
            {name}
          </div>
        ))}
      </div>
    </FramePanel>
  );
}

function StepRail(props: { active: number; frameOffset: number }) {
  const frame = useCurrentFrame() - props.frameOffset;
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {storySteps.map((step, index) => {
        const reveal = spring({
          frame: frame - index * Math.floor(fps * 0.2),
          fps,
          config: { damping: 20, stiffness: 120 },
        });
        return (
          <div
            key={step}
            style={{
              borderLeft: `3px solid ${index === props.active ? palette.accent : palette.line}`,
              padding: "10px 0 10px 16px",
              opacity: interpolate(reveal, [0, 1], [0.25, index <= props.active ? 1 : 0.48]),
              transform: `translateY(${interpolate(reveal, [0, 1], [12, 0])}px)`,
            }}
          >
            <div style={{ fontSize: 15, color: palette.muted, marginBottom: 4 }}>0{index + 1}</div>
            <div style={{ fontSize: 24, lineHeight: 1.2, fontWeight: 600 }}>{step}</div>
          </div>
        );
      })}
    </div>
  );
}

function Callout(props: {
  title: string;
  body: string;
  top: number;
  left: number;
  width?: number;
  frameOffset: number;
}) {
  const frame = useCurrentFrame() - props.frameOffset;
  const { fps } = useVideoConfig();
  const reveal = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  return (
    <div
      style={{
        position: "absolute",
        top: props.top,
        left: props.left,
        width: props.width ?? 320,
        backgroundColor: "rgba(251,248,241,0.94)",
        border: `1px solid ${palette.line}`,
        padding: 18,
        opacity: interpolate(reveal, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(reveal, [0, 1], [18, 0])}px)`,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{props.title}</div>
      <div style={{ fontSize: 18, lineHeight: 1.35, color: palette.muted }}>{props.body}</div>
    </div>
  );
}

function IntroScene({ title, subtitle }: CommercialProps) {
  return (
    <AbsoluteFill style={{ padding: scenePadding, justifyContent: "space-between" }}>
      <SceneTitle
        frameOffset={0}
        kicker="Commercial presentation"
        title={title}
        copy={subtitle}
      />
      <MetricStrip
        items={[
          { label: "Intake", value: "PDF to workspace" },
          { label: "Review", value: "Competition, athlete, club" },
          { label: "Technique", value: "Dive-group breakdown" },
          { label: "Navigation", value: "Exact deep links" },
        ]}
      />
    </AbsoluteFill>
  );
}

function WorkflowScene() {
  return (
    <AbsoluteFill style={{ padding: scenePadding, gap: 48 }}>
      <SceneTitle
        frameOffset={120}
        kicker="Real product flow"
        title="One live workflow from intake to technical review."
        copy="The presentation follows the actual routes, datasets, and deep-link behavior already in the app."
      />
      <div style={{ display: "grid", gridTemplateColumns: "520px 1fr", gap: 40, alignItems: "start" }}>
        <StepRail active={5} frameOffset={120} />
        <FramePanel title="Validated workflow" subtitle="Built from the running app, not mocked screens.">
          <MetricStrip
            items={[
              { label: "Dashboard", value: "Overview" },
              { label: "Upload", value: "Review coverage" },
              { label: "Competition", value: "Focus + ledger" },
              { label: "Profile", value: "Athlete + club" },
            ]}
          />
        </FramePanel>
      </div>
    </AbsoluteFill>
  );
}

function IntakeScene() {
  return (
    <AbsoluteFill style={{ padding: scenePadding }}>
      <SceneTitle
        frameOffset={270}
        kicker="Stage 01"
        title="Start with the official result sheet."
        copy="Ingest the PDF, review extraction confidence, and inspect event coverage before anyone trusts the import."
      />
      <div style={{ position: "absolute", right: 90, bottom: 86 }}>
        <BrowserShot src={shots.upload} fromFrame={270} width={1120} height={650} yFrom={22} label="Results intake" />
      </div>
      <Callout
        frameOffset={315}
        title="Structured intake review"
        body="Warnings, confidence, entries, and event coverage are visible before opening the workspace."
        top={462}
        left={116}
      />
      <Callout
        frameOffset={350}
        title="Open the next state"
        body="The import returns the competition workspace directly instead of leaving the user in a dead-end upload form."
        top={664}
        left={252}
        width={360}
      />
    </AbsoluteFill>
  );
}

function CompetitionScene() {
  return (
    <AbsoluteFill style={{ padding: scenePadding }}>
      <SceneTitle
        frameOffset={480}
        kicker="Stage 02"
        title="Move into the competition workspace."
        copy="Event switching, athlete or pair focus, club focus, dropped-score review, and exact ledger jumps stay in one analytic surface."
      />
      <div style={{ position: "absolute", right: 82, bottom: 82 }}>
        <BrowserShot
          src={shots.competition}
          fromFrame={480}
          width={1220}
          height={690}
          xFrom={-18}
          yFrom={16}
          label="Competition workspace"
        />
      </div>
      <Callout
        frameOffset={520}
        title="Event navigator"
        body="Large meets stay usable by keeping event switching and focus modes close to the analysis."
        top={308}
        left={122}
        width={310}
      />
      <Callout
        frameOffset={555}
        title="Exact deep links"
        body="Profiles and tables return to the right competition state, then auto-scroll and highlight the target row."
        top={704}
        left={182}
        width={380}
      />
      <div style={{ position: "absolute", left: 110, bottom: 82, width: 430 }}>
        <NamedRoster
          title="Featured competition profiles"
          names={["Maxime CAUCHY", "Mathis Pruvost", "Fanny Bayle", "Sara Garrault", "Emile Cartier"]}
        />
      </div>
    </AbsoluteFill>
  );
}

function AthleteScene() {
  return (
    <AbsoluteFill style={{ padding: scenePadding }}>
      <SceneTitle
        frameOffset={750}
        kicker="Stage 03"
        title="Open the athlete as a real working profile."
        copy="The commercial now features Maxime CAUCHY and Mathis Pruvost directly, using the live athlete routes instead of anonymous placeholder examples."
      />
      <div
        style={{
          position: "absolute",
          right: 70,
          bottom: 84,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}
      >
        <BrowserShot
          src={shots.athleteMaxime}
          fromFrame={750}
          width={580}
          height={650}
          xFrom={-10}
          yFrom={14}
          label="Athlete profile · Maxime CAUCHY"
        />
        <BrowserShot
          src={shots.athleteMathis}
          fromFrame={776}
          width={580}
          height={650}
          xFrom={8}
          yFrom={20}
          label="Athlete profile · Mathis Pruvost"
        />
      </div>
      <Callout
        frameOffset={790}
        title="Named profile examples"
        body="Maxime and Mathis show how the same profile model handles diver-specific context, best results, and route-level continuity."
        top={378}
        left={110}
        width={360}
      />
      <Callout
        frameOffset={825}
        title="Performance summary"
        body="The profile balances digestible summary cards with exact histories, not a shallow athlete bio page."
        top={634}
        left={182}
        width={360}
      />
    </AbsoluteFill>
  );
}

function TechniqueScene() {
  return (
    <AbsoluteFill style={{ padding: scenePadding }}>
      <SceneTitle
        frameOffset={1020}
        kicker="Stage 04"
        title="Break technique down by the official dive groups."
        copy="The technique workspace is shown on the real Maxime CAUCHY and Mathis Pruvost routes, so the group analysis stays grounded in live athlete data."
      />
      <div
        style={{
          position: "absolute",
          right: 72,
          bottom: 78,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}
      >
        <BrowserShot
          src={shots.techniqueMaxime}
          fromFrame={1020}
          width={580}
          height={670}
          xFrom={14}
          yFrom={20}
          label="Technique · Maxime CAUCHY"
        />
        <BrowserShot
          src={shots.techniqueMathis}
          fromFrame={1046}
          width={580}
          height={670}
          xFrom={-10}
          yFrom={16}
          label="Technique · Mathis Pruvost"
        />
      </div>
      <Callout
        frameOffset={1060}
        title="Code table"
        body="Sortable rows surface attempts, average, best score, difficulty, and the latest competition context for each diver."
        top={310}
        left={104}
        width={345}
      />
      <Callout
        frameOffset={1095}
        title="Recent technical log"
        body="Each code group stays tied to real attempts, with direct links back to the exact ledger row."
        top={666}
        left={198}
        width={350}
      />
    </AbsoluteFill>
  );
}

function ClubScene() {
  return (
    <AbsoluteFill style={{ padding: scenePadding }}>
      <SceneTitle
        frameOffset={1260}
        kicker="Stage 05"
        title="Zoom out to the club and roster level."
        copy="Track athlete roster, recent competitions, recent dives, event coverage, and club-driven deep links back into competition review."
      />
      <div style={{ position: "absolute", right: 84, bottom: 80 }}>
        <BrowserShot
          src={shots.club}
          fromFrame={1260}
          width={1220}
          height={690}
          xFrom={-12}
          yFrom={16}
          label="Club profile"
        />
      </div>
      <Callout
        frameOffset={1300}
        title="Roster and search"
        body="Coaches and analysts can move through large club rosters without drowning in a single long table."
        top={368}
        left={104}
      />
      <Callout
        frameOffset={1335}
        title="Recent competitions"
        body="Club-level cards open the corresponding competition state instead of isolating the user in a dead-end profile."
        top={648}
        left={164}
        width={370}
      />
      <div style={{ position: "absolute", left: 108, bottom: 74, width: 410 }}>
        <NamedRoster
          title="Roster examples"
          names={["Fanny Bayle", "Sara Garrault", "Maxime CAUCHY", "Mathis Pruvost"]}
        />
      </div>
    </AbsoluteFill>
  );
}

function ClosingScene({ title }: CommercialProps) {
  return (
    <AbsoluteFill style={{ padding: scenePadding, justifyContent: "space-between" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 56, alignItems: "end", flex: 1 }}>
        <div>
          <SceneTitle
            frameOffset={1500}
            kicker="Built for real review"
            title={`${title} keeps intake, competition review, profiles, and technique in one connected workflow.`}
          />
        </div>
        <FramePanel title="What the product now does" subtitle="The commercial maps directly to the live implementation.">
          <div style={{ display: "grid", gap: 16 }}>
            {[
              "Import official result sheets",
              "Review extraction quality before trusting data",
              "Work through competition, athlete, pair, club, and ledger states",
              "Open technique analysis from the athlete profile",
              "Return to exact competition rows with breadcrumb and deep-link support",
            ].map((line) => (
              <div
                key={line}
                style={{
                  padding: "12px 0",
                  borderBottom: `1px solid ${palette.line}`,
                  fontSize: 24,
                  lineHeight: 1.3,
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </FramePanel>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: `1px solid ${palette.line}`,
          paddingTop: 24,
          color: palette.muted,
          fontSize: 22,
        }}
      >
        <span>diving analytics</span>
        <span>competition intelligence, athlete profiling, club analysis</span>
      </div>
    </AbsoluteFill>
  );
}

export const DivingAnalyticsCommercial: React.FC<CommercialProps> = (props) => {
  return (
    <AbsoluteFill
      style={{
        fontFamily:
          "'Avenir Next', 'Helvetica Neue', Helvetica, Arial, sans-serif",
        color: palette.ink,
      }}
    >
      <Background />
      <Sequence from={0} durationInFrames={120}>
        <IntroScene {...props} />
      </Sequence>
      <Sequence from={120} durationInFrames={150}>
        <WorkflowScene />
      </Sequence>
      <Sequence from={270} durationInFrames={210}>
        <IntakeScene />
      </Sequence>
      <Sequence from={480} durationInFrames={270}>
        <CompetitionScene />
      </Sequence>
      <Sequence from={750} durationInFrames={270}>
        <AthleteScene />
      </Sequence>
      <Sequence from={1020} durationInFrames={240}>
        <TechniqueScene />
      </Sequence>
      <Sequence from={1260} durationInFrames={240}>
        <ClubScene />
      </Sequence>
      <Sequence from={1500} durationInFrames={180}>
        <ClosingScene {...props} />
      </Sequence>
    </AbsoluteFill>
  );
};
