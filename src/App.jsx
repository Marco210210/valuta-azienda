import { useState, useMemo, useEffect } from 'react'

/* ------------------------------------------------------------------ */
/*  Utilità                                                           */
/* ------------------------------------------------------------------ */

const uid = () => Math.random().toString(36).slice(2, 9)

const euro = (n) =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(Number.isFinite(n) ? n : 0)

const num = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

/* ------------------------------------------------------------------ */
/*  Dati di partenza (esempio modificabile)                           */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'valuta-azienda-v1'

const defaultCriteria = [
  { id: uid(), name: 'Esperienza lavorativa', weight: 30 },
  { id: uid(), name: 'Crescita personale', weight: 30 },
  { id: uid(), name: 'Ambiente e colleghi', weight: 20 },
  { id: uid(), name: 'Equilibrio vita-lavoro', weight: 20 }
]

const makeCompany = (criteria, overrides = {}) => ({
  id: uid(),
  name: 'Nuova azienda',
  netIncome: 0, // stipendio netto mensile
  housingCost: 0, // affitto / costo casa mensile
  groceryCost: 0, // spesa mensile
  otherCost: 0, // altri costi mensili
  transportMode: 'casa', // 'casa' | 'auto' | 'mezzi'
  distanceKm: 0, // km solo andata
  workingDays: 22, // giorni di presenza al mese
  costPerKm: 0.25, // costo carburante+usura al km
  transitCost: 0, // costo mensile treno/mezzi
  scores: Object.fromEntries(criteria.map((c) => [c.id, 6])),
  ...overrides
})

const buildDefaultState = () => {
  const criteria = defaultCriteria
  return {
    criteria,
    economicWeight: 50, // quanto pesa l'economia rispetto alla qualità (0-100)
    companies: [
      makeCompany(criteria, {
        name: 'Azienda A (resto a casa)',
        netIncome: 1800,
        housingCost: 0,
        groceryCost: 350,
        otherCost: 100,
        transportMode: 'auto',
        distanceKm: 15,
        workingDays: 22,
        costPerKm: 0.25,
        scores: Object.fromEntries(
          criteria.map((c, i) => [c.id, [7, 6, 8, 7][i] ?? 6])
        )
      }),
      makeCompany(criteria, {
        name: 'Azienda B (trasferimento)',
        netIncome: 2400,
        housingCost: 650,
        groceryCost: 400,
        otherCost: 150,
        transportMode: 'mezzi',
        transitCost: 45,
        scores: Object.fromEntries(
          criteria.map((c, i) => [c.id, [9, 9, 6, 5][i] ?? 6])
        )
      })
    ]
  }
}

/* ------------------------------------------------------------------ */
/*  Calcoli economici                                                 */
/* ------------------------------------------------------------------ */

function transportCost(c) {
  if (c.transportMode === 'auto') {
    // andata + ritorno * giorni * costo al km
    return num(c.distanceKm) * 2 * num(c.workingDays) * num(c.costPerKm)
  }
  if (c.transportMode === 'mezzi') {
    return num(c.transitCost)
  }
  return 0 // resto a casa / remoto
}

function totalCosts(c) {
  return (
    num(c.housingCost) +
    num(c.groceryCost) +
    num(c.otherCost) +
    transportCost(c)
  )
}

function disposable(c) {
  return num(c.netIncome) - totalCosts(c)
}

function qualityScore(c, criteria) {
  const totW = criteria.reduce((s, k) => s + num(k.weight), 0) || 1
  // media pesata su 10, normalizzata sui pesi effettivi (robusta se != 100)
  const weighted = criteria.reduce(
    (s, k) => s + num(c.scores[k.id]) * (num(k.weight) / totW),
    0
  )
  return weighted // 0-10
}

/* ------------------------------------------------------------------ */
/*  Componente principale                                             */
/* ------------------------------------------------------------------ */

export default function App() {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      /* ignora */
    }
    return buildDefaultState()
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
      /* ignora */
    }
  }, [state])

  const { criteria, companies, economicWeight } = state

  const weightSum = criteria.reduce((s, c) => s + num(c.weight), 0)

  /* ---------------- mutazioni stato ---------------- */

  const update = (patch) => setState((s) => ({ ...s, ...patch }))

  const setCriterion = (id, patch) =>
    update({
      criteria: criteria.map((c) => (c.id === id ? { ...c, ...patch } : c))
    })

  const addCriterion = () => {
    const c = { id: uid(), name: 'Nuovo criterio', weight: 0 }
    update({
      criteria: [...criteria, c],
      companies: companies.map((co) => ({
        ...co,
        scores: { ...co.scores, [c.id]: 6 }
      }))
    })
  }

  const removeCriterion = (id) =>
    update({
      criteria: criteria.filter((c) => c.id !== id),
      companies: companies.map((co) => {
        const { [id]: _drop, ...rest } = co.scores
        return { ...co, scores: rest }
      })
    })

  const normalizeWeights = () => {
    const sum = weightSum || 1
    update({
      criteria: criteria.map((c) => ({
        ...c,
        weight: Math.round((num(c.weight) / sum) * 100)
      }))
    })
  }

  const setCompany = (id, patch) =>
    update({
      companies: companies.map((c) => (c.id === id ? { ...c, ...patch } : c))
    })

  const setScore = (companyId, critId, value) =>
    update({
      companies: companies.map((c) =>
        c.id === companyId
          ? { ...c, scores: { ...c.scores, [critId]: value } }
          : c
      )
    })

  const addCompany = () =>
    update({ companies: [...companies, makeCompany(criteria)] })

  const removeCompany = (id) =>
    update({ companies: companies.filter((c) => c.id !== id) })

  const resetAll = () => {
    if (confirm('Vuoi cancellare tutto e ripartire dall\u2019esempio?')) {
      setState(buildDefaultState())
    }
  }

  /* ---------------- risultati ---------------- */

  const results = useMemo(() => {
    const qualW = (100 - economicWeight) / 100
    const econW = economicWeight / 100

    const rows = companies.map((c) => ({
      id: c.id,
      name: c.name,
      disposable: disposable(c),
      costs: totalCosts(c),
      transport: transportCost(c),
      quality: qualityScore(c, criteria)
    }))

    const dispVals = rows.map((r) => r.disposable)
    const min = Math.min(...dispVals)
    const max = Math.max(...dispVals)

    return rows
      .map((r) => {
        // economia: normalizzazione min-max (gli euro non hanno scala assoluta)
        const econNorm =
          max === min ? 100 : ((r.disposable - min) / (max - min)) * 100
        // qualità: scala assoluta su 10 -> 0-100
        const qualNorm = (r.quality / 10) * 100
        const final = econW * econNorm + qualW * qualNorm
        return { ...r, econNorm, qualNorm, final }
      })
      .sort((a, b) => b.final - a.final)
  }, [companies, criteria, economicWeight])

  const best = results[0]

  /* ---------------- render ---------------- */

  return (
    <div className="page">
      <div className="grain" aria-hidden="true" />

      <header className="hero">
        <div className="hero-kicker">Strumento decisionale</div>
        <h1 className="hero-title">
          Quale azienda<span className="accent">.</span>
        </h1>
        <p className="hero-sub">
          Confronta le offerte di lavoro pesando ciò che conta per te e mettendo
          sul piatto i numeri reali: stipendio, casa, spostamenti, spesa.
        </p>
        <div className="hero-actions">
          <button className="btn ghost" onClick={resetAll}>
            Ricomincia dall&rsquo;esempio
          </button>
        </div>
      </header>

      {/* ---------- 1. Bilancia economia / qualità ---------- */}
      <section className="card balance">
        <div className="card-head">
          <span className="step">01</span>
          <div>
            <h2>Quanto contano i soldi?</h2>
            <p className="muted">
              Sposta il cursore per decidere il peso dell&rsquo;aspetto economico
              rispetto a quello qualitativo nel punteggio finale.
            </p>
          </div>
        </div>

        <div className="balance-body">
          <div className="balance-labels">
            <span>
              Qualità <strong>{100 - economicWeight}%</strong>
            </span>
            <span>
              Economia <strong>{economicWeight}%</strong>
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={economicWeight}
            onChange={(e) => update({ economicWeight: num(e.target.value) })}
            className="slider big"
          />
        </div>
      </section>

      {/* ---------- 2. Criteri + pesi ---------- */}
      <section className="card">
        <div className="card-head">
          <span className="step">02</span>
          <div>
            <h2>I tuoi criteri</h2>
            <p className="muted">
              Aggiungi le caratteristiche che ti interessano e assegna a ognuna
              un peso. La somma dovrebbe fare 100%.
            </p>
          </div>
        </div>

        <div className="criteria-list">
          {criteria.map((c) => (
            <div className="criterion" key={c.id}>
              <input
                className="crit-name"
                value={c.name}
                onChange={(e) => setCriterion(c.id, { name: e.target.value })}
              />
              <div className="crit-weight">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={c.weight}
                  onChange={(e) =>
                    setCriterion(c.id, { weight: num(e.target.value) })
                  }
                />
                <span>%</span>
              </div>
              <button
                className="icon-btn"
                title="Rimuovi"
                onClick={() => removeCriterion(c.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="criteria-footer">
          <button className="btn" onClick={addCriterion}>
            + Aggiungi criterio
          </button>
          <div className={'weight-sum ' + (weightSum === 100 ? 'ok' : 'warn')}>
            Totale pesi: <strong>{weightSum}%</strong>
            {weightSum !== 100 && (
              <button className="btn tiny" onClick={normalizeWeights}>
                Porta a 100%
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ---------- 3. Aziende ---------- */}
      <section className="companies-section">
        <div className="section-title">
          <span className="step">03</span>
          <h2>Le aziende a confronto</h2>
        </div>

        <div className="companies-grid">
          {companies.map((c) => {
            const tCost = transportCost(c)
            const tot = totalCosts(c)
            const disp = disposable(c)
            return (
              <article className="company" key={c.id}>
                <div className="company-head">
                  <input
                    className="company-name"
                    value={c.name}
                    onChange={(e) => setCompany(c.id, { name: e.target.value })}
                  />
                  <button
                    className="icon-btn"
                    title="Rimuovi azienda"
                    onClick={() => removeCompany(c.id)}
                  >
                    ×
                  </button>
                </div>

                {/* economia */}
                <h3 className="block-title">Economia (mensile)</h3>

                <Field
                  label="Stipendio netto"
                  value={c.netIncome}
                  onChange={(v) => setCompany(c.id, { netIncome: v })}
                  suffix="€"
                />
                <Field
                  label="Casa / affitto"
                  value={c.housingCost}
                  onChange={(v) => setCompany(c.id, { housingCost: v })}
                  suffix="€"
                />
                <Field
                  label="Spesa"
                  value={c.groceryCost}
                  onChange={(v) => setCompany(c.id, { groceryCost: v })}
                  suffix="€"
                />
                <Field
                  label="Altri costi"
                  value={c.otherCost}
                  onChange={(v) => setCompany(c.id, { otherCost: v })}
                  suffix="€"
                />

                {/* trasporti */}
                <h3 className="block-title">Spostamenti</h3>
                <div className="seg">
                  {[
                    ['casa', 'Resto a casa'],
                    ['auto', 'Auto'],
                    ['mezzi', 'Mezzi']
                  ].map(([val, lab]) => (
                    <button
                      key={val}
                      className={
                        'seg-btn ' + (c.transportMode === val ? 'active' : '')
                      }
                      onClick={() => setCompany(c.id, { transportMode: val })}
                    >
                      {lab}
                    </button>
                  ))}
                </div>

                {c.transportMode === 'auto' && (
                  <>
                    <Field
                      label="Distanza (sola andata)"
                      value={c.distanceKm}
                      onChange={(v) => setCompany(c.id, { distanceKm: v })}
                      suffix="km"
                    />
                    <Field
                      label="Giorni in sede / mese"
                      value={c.workingDays}
                      onChange={(v) => setCompany(c.id, { workingDays: v })}
                      suffix="gg"
                    />
                    <Field
                      label="Costo al km"
                      value={c.costPerKm}
                      onChange={(v) => setCompany(c.id, { costPerKm: v })}
                      suffix="€/km"
                      step="0.01"
                    />
                  </>
                )}

                {c.transportMode === 'mezzi' && (
                  <Field
                    label="Treno / abbonamento"
                    value={c.transitCost}
                    onChange={(v) => setCompany(c.id, { transitCost: v })}
                    suffix="€"
                  />
                )}

                <div className="mini-summary">
                  <div>
                    <span>Trasporti</span>
                    <strong>{euro(tCost)}</strong>
                  </div>
                  <div>
                    <span>Costi totali</span>
                    <strong>{euro(tot)}</strong>
                  </div>
                  <div className={disp >= 0 ? 'pos' : 'neg'}>
                    <span>Resta in tasca</span>
                    <strong>{euro(disp)}</strong>
                  </div>
                </div>

                {/* qualità */}
                <h3 className="block-title">Valutazione (1–10)</h3>
                {criteria.map((k) => (
                  <div className="score-row" key={k.id}>
                    <div className="score-label">
                      <span>{k.name}</span>
                      <strong>{c.scores[k.id] ?? 0}</strong>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={c.scores[k.id] ?? 6}
                      onChange={(e) =>
                        setScore(c.id, k.id, num(e.target.value))
                      }
                      className="slider"
                    />
                  </div>
                ))}
              </article>
            )
          })}

          <button className="add-company" onClick={addCompany}>
            <span>+</span>
            Aggiungi azienda
          </button>
        </div>
      </section>

      {/* ---------- 4. Risultati ---------- */}
      <section className="card results">
        <div className="card-head">
          <span className="step">04</span>
          <div>
            <h2>Il verdetto</h2>
            <p className="muted">
              Punteggio finale su 100, combinando economia e qualità secondo i
              pesi scelti.
            </p>
          </div>
        </div>

        {best && (
          <div className="winner">
            <div className="winner-tag">Scelta consigliata</div>
            <div className="winner-name">{best.name}</div>
            <div className="winner-score">
              {best.final.toFixed(1)}
              <small>/100</small>
            </div>
          </div>
        )}

        <div className="ranking">
          {results.map((r, i) => (
            <div className="rank-row" key={r.id}>
              <div className="rank-pos">{i + 1}</div>
              <div className="rank-main">
                <div className="rank-top">
                  <span className="rank-name">{r.name}</span>
                  <span className="rank-final">{r.final.toFixed(1)}</span>
                </div>
                <div className="rank-bar">
                  <div
                    className="rank-fill"
                    style={{ width: `${Math.max(2, r.final)}%` }}
                  />
                </div>
                <div className="rank-detail">
                  <span>
                    Qualità <b>{r.quality.toFixed(1)}/10</b>
                  </span>
                  <span>
                    In tasca <b>{euro(r.disposable)}</b>
                  </span>
                  <span>
                    Costi <b>{euro(r.costs)}</b>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="foot">
        I dati restano salvati solo nel tuo browser. Nessun numero esce dal tuo
        computer.
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Campo numerico riutilizzabile                                     */
/* ------------------------------------------------------------------ */

function Field({ label, value, onChange, suffix, step }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input">
        <input
          type="number"
          step={step || '1'}
          value={value}
          onChange={(e) => onChange(num(e.target.value))}
          onFocus={(e) => e.target.select()}
        />
        {suffix && <em>{suffix}</em>}
      </span>
    </label>
  )
}
