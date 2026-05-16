import { getCoordinatorView } from "@/lib/dashboard";
import { AutoRefresh } from "./auto-refresh";
import { Copilot } from "./copilot";

export const dynamic = "force-dynamic";

const LEVEL: Record<string, { bg: string; label: string }> = {
  clear: { bg: "#15803d", label: "SIN RIESGO" },
  watch: { bg: "#ca8a04", label: "VIGILANCIA" },
  prealert: { bg: "#ea580c", label: "PREALERTA" },
  evacuate: { bg: "#dc2626", label: "EVACUACIÓN" },
};

function fmt(ts: string | null): string {
  if (!ts) return "—";
  return ts.slice(0, 16);
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "1rem 1.25rem",
      }}
    >
      <h2
        style={{
          margin: "0 0 .6rem",
          fontSize: 13,
          textTransform: "uppercase",
          letterSpacing: ".06em",
          color: "#6b7280",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "1rem",
        padding: ".3rem 0",
        borderBottom: "1px solid #f3f4f6",
      }}
    >
      <span style={{ color: "#6b7280" }}>{label}</span>
      <strong style={{ textAlign: "right" }}>{value}</strong>
    </div>
  );
}

export default async function Panel() {
  const view = await getCoordinatorView();
  const level = view.snapshot?.riskLevel ?? "clear";
  const lv = LEVEL[level] ?? LEVEL.clear;
  const snap = view.snapshot;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        color: "#111827",
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <AutoRefresh seconds={6} />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1.25rem" }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Panel del Coordinador</h1>
        <p style={{ marginTop: 4, color: "#6b7280" }}>
          {view.basin?.name ?? "Sin cuenca"} · actualización automática cada 6 s
        </p>

        <div
          style={{
            background: lv.bg,
            color: "#ffffff",
            borderRadius: 14,
            padding: "1.5rem 1.75rem",
            margin: "1.25rem 0",
          }}
        >
          <div style={{ fontSize: 13, letterSpacing: ".08em", opacity: 0.85 }}>
            NIVEL DE RIESGO ACTUAL
          </div>
          <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.1 }}>
            {lv.label}
          </div>
          {snap && (
            <div style={{ marginTop: ".5rem", opacity: 0.95 }}>
              {snap.explanation}
            </div>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          <Card title="Predicción">
            {snap ? (
              <>
                <Row label="Lluvia 3 h" value={`${view.rain?.rain3hMm ?? 0} mm`} />
                <Row label="Lluvia 6 h" value={`${view.rain?.rain6hMm ?? 0} mm`} />
                <Row
                  label="Lluvia 24 h"
                  value={`${view.rain?.rain24hMm ?? 0} mm`}
                />
                <Row
                  label="Umbral efectivo 3 h"
                  value={`${snap.effectiveThreshold3hMm} mm`}
                />
                <Row
                  label="Susceptibilidad ML"
                  value={
                    view.susceptibility
                      ? `${view.susceptibility.score} (${view.susceptibility.band ?? "—"})`
                      : "—"
                  }
                />
                <Row
                  label="Disparadores"
                  value={
                    [
                      snap.rainTriggered ? "lluvia" : null,
                      snap.officialTriggered ? "oficial" : null,
                      snap.citizenTriggered ? "ciudadano" : null,
                    ]
                      .filter(Boolean)
                      .join(", ") || "ninguno"
                  }
                />
                <Row label="Último cálculo" value={fmt(snap.computedAt)} />
              </>
            ) : (
              <p style={{ color: "#6b7280" }}>Aún sin evaluación de riesgo.</p>
            )}
          </Card>

          <Card title="Incidente">
            {view.incident ? (
              <>
                <Row
                  label="Nivel"
                  value={(LEVEL[view.incident.level] ?? lv).label}
                />
                <Row label="Abierto desde" value={fmt(view.incident.openedAt)} />
              </>
            ) : (
              <p style={{ color: "#6b7280" }}>Sin incidente abierto.</p>
            )}
          </Card>

          <Card title="Zonas">
            {view.zones.length > 0 ? (
              view.zones.map((z) => (
                <Row key={z.name} label={z.name} value={z.safePoint ?? "—"} />
              ))
            ) : (
              <p style={{ color: "#6b7280" }}>Sin zonas configuradas.</p>
            )}
          </Card>

          <Card title="Alertas recientes">
            {view.recentAlerts.length > 0 ? (
              view.recentAlerts.map((a, i) => (
                <Row
                  key={i}
                  label={`${(LEVEL[a.level] ?? lv).label} · ${a.zone ?? "—"}`}
                  value={fmt(a.sentAt)}
                />
              ))
            ) : (
              <p style={{ color: "#6b7280" }}>Sin alertas emitidas.</p>
            )}
          </Card>
        </div>

        <Copilot />
      </div>
    </main>
  );
}
