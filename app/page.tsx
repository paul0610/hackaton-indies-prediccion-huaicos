import "./panel/panel.css";

const STEPS = [
  {
    t: "Ingesta de lluvia",
    d: "Cada cuenca lee la lluvia real desde Open-Meteo — observada y pronosticada.",
  },
  {
    t: "Motor de riesgo",
    d: "Un motor determinista compara la lluvia con el umbral de la quebrada, ajustado por el terreno y la humedad del suelo.",
  },
  {
    t: "Alerta por Telegram",
    d: "Si el riesgo sube, el vecino recibe la alerta y responde: 'estoy a salvo' o 'necesito ayuda', con su ubicación.",
  },
  {
    t: "Panel del coordinador",
    d: "Mapa en vivo, cola de ayuda y un copiloto con IA — para decidir y responder a tiempo.",
  },
];

export default function Home() {
  return (
    <main className="tp-app">
      <section className="lp-hero">
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            fontWeight: 600,
            fontSize: 19,
            color: "var(--ink-0)",
          }}
        >
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 5,
              background: "linear-gradient(135deg,#4fc3f7,#6e8bff)",
            }}
          />
          Tempestas
        </span>

        <span className="chip" style={{ marginTop: 20 }}>
          hack@latam · Environment &amp; Climate Risk
        </span>

        <h1 className="lp-h1">
          El huaico baja en minutos.
          <br />
          Predecir a tiempo salva vidas.
        </h1>

        <p className="lp-lead">
          Sistema de alerta temprana de huaicos: predice el riesgo con datos
          reales de lluvia, avisa por Telegram a los vecinos de la quebrada y le
          da al coordinador de emergencias un panel para responder a tiempo.
        </p>

        <div className="lp-actions">
          <a className="lp-cta" href="/panel">
            Entrar al panel de coordinación
          </a>
          <a
            className="lp-cta-ghost"
            href="https://t.me/alerta_huaicos_bot"
            target="_blank"
            rel="noreferrer"
          >
            Probar el bot de alertas
          </a>
        </div>
      </section>

      <section className="lp-section">
        <div className="label">Cómo funciona</div>
        <div className="lp-steps">
          {STEPS.map((s, i) => (
            <div className="card" key={i}>
              <div className="lp-step-n">PASO {i + 1}</div>
              <div className="lp-step-t">{s.t}</div>
              <div className="lp-step-d">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-steps">
          <div className="card">
            <div className="label">Inteligencia artificial</div>
            <div className="lp-step-d" style={{ marginTop: 10 }}>
              Mistral AI redacta las alertas y mueve un copiloto agéntico: el
              coordinador pregunta en lenguaje natural y el agente consulta el
              estado real, su base de conocimiento y hasta enfoca el mapa. El
              motor de riesgo es determinista y auditable — la IA acompaña, la
              regla decide.
            </div>
          </div>
          <div className="card">
            <div className="label">Validado con datos reales</div>
            <div className="lp-step-d" style={{ marginTop: 10 }}>
              El umbral se probó contra el huaico real de Chosica de marzo de
              2017 (El Niño Costero): con la calibración actual, el sistema sí
              habría detectado ese evento.
            </div>
          </div>
        </div>
      </section>

      <footer className="lp-foot">
        <span>
          Piloto: Quebrada Quirio, Chosica · diseñado para generalizarse por
          cuenca.
        </span>
        <span style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <a href="/panel">Panel</a>
          <a href="/admin">Admin</a>
          <a
            href="https://t.me/alerta_huaicos_bot"
            target="_blank"
            rel="noreferrer"
          >
            Bot de Telegram
          </a>
          <a
            href="https://github.com/paul0610/hackaton-indies-prediccion-huaicos"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </span>
      </footer>
    </main>
  );
}
