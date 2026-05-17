import "../panel/panel.css";
import { getCoordinatorView } from "@/lib/dashboard";
import { Clock, Elapsed } from "../panel/live";
import { AdminControls } from "./admin-controls";

export const dynamic = "force-dynamic";

const LEVEL_LABEL: Record<string, string> = {
  clear: "Sin riesgo",
  watch: "Vigilancia",
  prealert: "Prealerta",
  evacuate: "Evacuación",
};

export default async function Admin() {
  const view = await getCoordinatorView();
  const level = view.snapshot?.riskLevel ?? "clear";

  return (
    <main className="tp-app">
      <header className="chrome">
        <span className="logo">
          <span className="mark" />
          Tempestas
        </span>
        <span className="sep" />
        <span style={{ color: "var(--ink-1)" }}>
          Consola de administración
        </span>
        <span className="spacer" />
        <a className="tg-link" href="/panel">
          Volver al panel
        </a>
        <Clock />
      </header>

      <div className="tp-main">
        <section className="row-3">
          <div className="card">
            <div className="label">Última ingesta de lluvia</div>
            <div className="big-num" style={{ fontSize: 30, marginTop: 12 }}>
              {view.lastRealPullAt ? (
                <Elapsed since={view.lastRealPullAt} />
              ) : (
                "sin registro"
              )}
            </div>
            <div className="kpi-foot">Fuente: Open-Meteo</div>
          </div>

          <div className="card">
            <div className="label">Último cálculo del modelo</div>
            <div className="big-num" style={{ fontSize: 30, marginTop: 12 }}>
              {view.snapshot ? (
                <Elapsed since={view.snapshot.computedAt} />
              ) : (
                "sin correr"
              )}
            </div>
            <div className="kpi-foot">Motor de riesgo determinista</div>
          </div>

          <div className="card">
            <div className="label">Estado actual</div>
            <div className="big-num" style={{ fontSize: 30, marginTop: 12 }}>
              {LEVEL_LABEL[level] ?? "—"}
            </div>
            <div className="kpi-foot">
              {view.basin?.name ?? "—"} · lluvia 3 h{" "}
              {view.rain?.rain3hMm ?? 0} mm
            </div>
          </div>
        </section>

        <AdminControls />
      </div>
    </main>
  );
}
