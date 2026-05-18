import "./panel.css";
import { getCoordinatorView } from "@/lib/dashboard";
import { AutoRefresh } from "./auto-refresh";
import { PanelStage } from "./panel-stage";
import type { MapZone, MapCheckin, MapSafePoint } from "./risk-map";
import { Clock, Elapsed } from "./live";
import { DemoControls } from "./demo-controls";
import { PanelTour } from "./panel-tour";

export const dynamic = "force-dynamic";

const LEVEL: Record<
  string,
  { label: string; sev: string; chip: string; cls: string; dot: string }
> = {
  clear: { label: "SIN RIESGO", sev: "N0", chip: "green", cls: "lv-clear", dot: "green" },
  watch: { label: "VIGILANCIA", sev: "N1", chip: "amber", cls: "lv-watch", dot: "amber" },
  prealert: { label: "PREALERTA", sev: "N2", chip: "orange", cls: "lv-prealert", dot: "orange" },
  evacuate: { label: "EVACUACIÓN", sev: "N3", chip: "red", cls: "lv-evacuate", dot: "" },
};

const HERO: Record<string, { eyebrow: string; state: string }> = {
  clear: { eyebrow: "Monitoreo activo · sin alerta", state: "condiciones normales" },
  watch: { eyebrow: "Señal en revisión", state: "vigilancia preventiva" },
  prealert: { eyebrow: "Riesgo elevado", state: "prealerta activa" },
  evacuate: { eyebrow: "Riesgo crítico · en curso", state: "evacuación activa" },
};

function fmt(ts: string | null): string {
  return ts ? ts.slice(0, 16).replace("T", " ") : "—";
}

function DataRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="data-row">
      <span className="dr-k">{k}</span>
      <span className="dr-v">{v}</span>
    </div>
  );
}

export default async function Panel() {
  const view = await getCoordinatorView();
  const level = view.snapshot?.riskLevel ?? "clear";
  const lv = LEVEL[level] ?? LEVEL.clear;
  const hero = HERO[level] ?? HERO.clear;
  const snap = view.snapshot;
  const basinName = view.basin?.name ?? "Sin cuenca";
  const tone = `t-${lv.dot || "red"}`;
  const dotCls = `tp-dot${lv.dot ? " " + lv.dot : ""}`;

  const totalPop = view.zones.reduce((s, z) => s + (z.population ?? 0), 0);
  const triggers: string[] = snap
    ? [
        snap.rainTriggered ? "lluvia" : null,
        snap.officialTriggered ? "oficial" : null,
        snap.citizenTriggered ? "ciudadano" : null,
      ].filter((x): x is string => x !== null)
    : [];

  const mapZones: MapZone[] = view.zones
    .filter((z) => z.entryLat !== null && z.entryLon !== null)
    .map((z) => ({
      name: z.name,
      lat: z.entryLat as number,
      lon: z.entryLon as number,
      helpCount: z.helpCount,
      safeCount: z.safeCount,
    }));
  const mapCheckins: MapCheckin[] = view.checkins
    .filter((c) => c.lat !== null && c.lon !== null)
    .map((c) => ({
      lat: c.lat as number,
      lon: c.lon as number,
      status: c.status,
    }));
  const mapSafePoints: MapSafePoint[] = view.zones
    .filter((z) => z.safePointLat !== null && z.safePointLon !== null)
    .map((z) => ({
      lat: z.safePointLat as number,
      lon: z.safePointLon as number,
      name: z.safePoint ?? z.name,
    }));

  const queue = [...view.checkins].sort((a, b) =>
    a.status === b.status ? 0 : a.status === "help" ? -1 : 1,
  );

  const product = view.rain?.product ?? null;
  const mode =
    product === "replay"
      ? {
          label: "Modo demo · replay calibrado de Quirio",
          chip: "orange",
          dot: "orange",
        }
      : product === "open_meteo"
        ? { label: "Datos en vivo · Open-Meteo", chip: "green", dot: "green" }
        : { label: "Sin datos de lluvia", chip: "", dot: "" };
  const pipelineOk = view.lastRealPullAt !== null;

  return (
    <main className="tp-app">
      <AutoRefresh seconds={6} />

      <header className="chrome">
        <span className="logo">
          <span className="mark" />
          Tempestas
        </span>
        <span className="sep" />
        <span style={{ color: "var(--ink-1)" }}>Panel de coordinación</span>
        <span style={{ color: "var(--ink-3)" }}>/</span>
        <span>{basinName}</span>
        <a
          className="tg-link"
          data-tour="bot"
          href="https://t.me/alerta_huaicos_bot"
          target="_blank"
          rel="noreferrer"
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
          </svg>
          Probar el bot
        </a>
        <span className="spacer" />
        <span className={`chip ${lv.chip}`} data-tour="nivel">
          <span className={dotCls} style={{ width: 8, height: 8 }} />
          {lv.label}
        </span>
        <span className="chip cyan">⟳ Auto-refresh 6 s</span>
        <a className="tg-link" data-tour="admin" href="/admin">
          Admin
        </a>
        <Clock />
        <PanelTour />
      </header>

      <div className="tp-strip">
        <span className={`chip ${mode.chip}`}>
          <span
            className={`tp-dot${mode.dot ? " " + mode.dot : ""}`}
            style={{ width: 7, height: 7 }}
          />
          {mode.label}
        </span>
        <DemoControls />
        <span className="strip-item">
          Fuente lluvia · <b>Open-Meteo</b>
        </span>
        <span className="strip-item">
          Último pull real ·{" "}
          {view.lastRealPullAt ? (
            <Elapsed since={view.lastRealPullAt} />
          ) : (
            "sin registro"
          )}
        </span>
        <span className="strip-item">
          Modelo ·{" "}
          {snap ? (
            <>
              calculado <Elapsed since={snap.computedAt} />
            </>
          ) : (
            "sin correr"
          )}
        </span>
        <span className="strip-item">
          Pipeline ·{" "}
          <b style={{ color: pipelineOk ? "var(--green)" : "var(--amber)" }}>
            {pipelineOk ? "operativo" : "sin pull real"}
          </b>
        </span>
        <span style={{ flex: 1 }} />
        <span className="strip-item">
          Riesgo por cuenca · prioridad operativa por zona
        </span>
      </div>

      <div className="tp-main">
        {/* ─── Fila 1: hero + KPIs ─── */}
        <section className="row-1" data-tour="resumen">
          <div className={`hero ${lv.cls}`}>
            <span className="stripe-l" />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 18,
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span className={dotCls} />
                  <span className={`eyebrow ${tone}`}>{hero.eyebrow}</span>
                </div>
                <h1>
                  {basinName}: {hero.state}
                </h1>
                <p>{snap?.explanation ?? "Aún sin evaluación de riesgo."}</p>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    marginTop: 14,
                  }}
                >
                  {triggers.length > 0 ? (
                    triggers.map((t) => (
                      <span key={t} className="chip" style={{ fontSize: 11 }}>
                        disparador: {t}
                      </span>
                    ))
                  ) : (
                    <span className="chip" style={{ fontSize: 11 }}>
                      sin disparadores activos
                    </span>
                  )}
                  {view.incident && (
                    <span className="chip cyan" style={{ fontSize: 11 }}>
                      detectado <Elapsed since={view.incident.openedAt} />
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div className={`sev ${tone}`}>{lv.sev}</div>
                <div className="label" style={{ marginTop: 4 }}>
                  Severidad
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="label">Población expuesta</div>
            <div className="big-num" style={{ marginTop: 14 }}>
              {totalPop.toLocaleString("es-PE")}
            </div>
            <div className="kpi-foot">
              {view.zones.length} zonas monitoreadas
            </div>
          </div>

          <div className="card">
            <div className="label">Ayuda pendiente</div>
            <div
              className={`big-num ${view.helpCount > 0 ? "t-red" : "t-green"}`}
              style={{ marginTop: 14 }}
            >
              {String(view.helpCount).padStart(2, "0")}
            </div>
            <div className="kpi-foot">
              de {view.checkins.length} vecinos que respondieron
            </div>
          </div>

          <div className="card">
            <div className="label">Lluvia · 3 h</div>
            <div
              className="big-num t-cyan"
              style={{ marginTop: 14, fontSize: 40 }}
            >
              {view.rain?.rain3hMm ?? 0}
              <span style={{ fontSize: 16, color: "var(--ink-2)" }}> mm</span>
            </div>
            <div className="kpi-foot">
              umbral efectivo {snap ? `${snap.effectiveThreshold3hMm} mm` : "—"}
            </div>
          </div>
        </section>

        {/* ─── Fila 2: mapa + columna derecha ─── */}
        <PanelStage
          center={[-11.936, -76.697]}
          zones={mapZones}
          checkins={mapCheckins}
          safePoints={mapSafePoints}
        >
            <div className="card" data-tour="cola">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span className="section-title">Cola de ayuda</span>
                <span
                  className={`chip ${view.helpCount > 0 ? "orange" : "green"}`}
                  style={{ fontSize: 10, padding: "3px 8px" }}
                >
                  {view.helpCount} pendiente(s)
                </span>
              </div>
              {queue.length > 0 ? (
                <div className="queue-list">
                  {queue.map((c, i) => (
                    <div
                      key={i}
                      className={`case ${
                        c.status === "help" ? "s-help" : "s-safe"
                      }`}
                    >
                      <div className="bar" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 8,
                          }}
                        >
                          <span
                            className={`mono ${
                              c.status === "help" ? "t-red" : "t-green"
                            }`}
                            style={{ fontSize: 12, fontWeight: 600 }}
                          >
                            {c.status === "help" ? "NECESITA AYUDA" : "A SALVO"}
                          </span>
                          <span
                            className="mono t-ink2"
                            style={{ fontSize: 11 }}
                          >
                            <Elapsed since={c.createdAt} />
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--ink-2)",
                            marginTop: 4,
                          }}
                        >
                          {c.lat !== null && c.lon !== null
                            ? `Ubicación ${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}`
                            : "Ubicación pendiente"}
                          {c.status === "help" &&
                            " · brigada comunitaria por asignar"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p
                  style={{
                    color: "var(--ink-3)",
                    fontSize: 13,
                    marginTop: 12,
                  }}
                >
                  Sin respuestas de vecinos todavía.
                </p>
              )}
            </div>
        </PanelStage>

        {/* ─── Fila 3: tarjetas de detalle ─── */}
        <section className="row-3">
          <div className="card">
            <div className="label">Predicción</div>
            <div style={{ marginTop: 12 }}>
              {snap ? (
                <>
                  <DataRow k="Lluvia 3 h" v={`${view.rain?.rain3hMm ?? 0} mm`} />
                  <DataRow k="Lluvia 6 h" v={`${view.rain?.rain6hMm ?? 0} mm`} />
                  <DataRow
                    k="Lluvia 24 h"
                    v={`${view.rain?.rain24hMm ?? 0} mm`}
                  />
                  <DataRow
                    k="Umbral efectivo 3 h"
                    v={`${snap.effectiveThreshold3hMm} mm`}
                  />
                  <DataRow
                    k="Susceptibilidad"
                    v={
                      view.susceptibility
                        ? `${view.susceptibility.score} (${
                            view.susceptibility.band ?? "—"
                          })`
                        : "—"
                    }
                  />
                  <DataRow
                    k="Disparadores"
                    v={triggers.length > 0 ? triggers.join(", ") : "ninguno"}
                  />
                  <DataRow k="Último cálculo" v={fmt(snap.computedAt)} />
                </>
              ) : (
                <p style={{ color: "var(--ink-3)", fontSize: 13 }}>
                  Aún sin evaluación de riesgo.
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="label">Incidente</div>
            <div style={{ marginTop: 12 }}>
              {view.incident ? (
                <>
                  <DataRow
                    k="Nivel"
                    v={(LEVEL[view.incident.level] ?? lv).label}
                  />
                  <DataRow
                    k="Abierto"
                    v={<Elapsed since={view.incident.openedAt} />}
                  />
                  <DataRow k="Desde" v={fmt(view.incident.openedAt)} />
                </>
              ) : (
                <p style={{ color: "var(--ink-3)", fontSize: 13 }}>
                  Sin incidente abierto.
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="label">Alertas recientes</div>
            <div style={{ marginTop: 12 }}>
              {view.recentAlerts.length > 0 ? (
                view.recentAlerts.map((a, i) => (
                  <DataRow
                    key={i}
                    k={`${(LEVEL[a.level] ?? lv).label} · ${a.zone ?? "—"}`}
                    v={fmt(a.sentAt)}
                  />
                ))
              ) : (
                <p style={{ color: "var(--ink-3)", fontSize: 13 }}>
                  Sin alertas emitidas.
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="label">Zonas</div>
            <div style={{ marginTop: 12 }}>
              {view.zones.length > 0 ? (
                view.zones.map((z) => (
                  <DataRow
                    key={z.id}
                    k={z.name}
                    v={
                      <span className="mono" style={{ fontSize: 12 }}>
                        {z.population
                          ? z.population.toLocaleString("es-PE")
                          : "—"}{" "}
                        hab ·{" "}
                        <span className={z.helpCount > 0 ? "t-red" : "t-ink2"}>
                          {z.helpCount} ayuda
                        </span>
                      </span>
                    }
                  />
                ))
              ) : (
                <p style={{ color: "var(--ink-3)", fontSize: 13 }}>
                  Sin zonas configuradas.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
