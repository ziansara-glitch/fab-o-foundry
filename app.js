/* ==========================================================================
   Fab o foundry? — strumenti interattivi
   --------------------------------------------------------------------------
   Nessun framework, nessuna build: tutto viene calcolato nel browser.
   Unica dipendenza: Chart.js 4.4.1 (caricato da cdnjs in index.html).

   Indice
     1. Dati della tabella di confronto (Sezione 3)   <- da aggiornare a mano
     2. Formattazione dei numeri (formato italiano)
     3. Modelli di calcolo (funzioni pure, senza DOM)
     4. Tema e grafici
     5. Cursori
     6. Strumento 1: make or buy
     7. Strumento 2: leva operativa
     8. Tabella di confronto
     9. Avvio

   Tutti i parametri dei due strumenti sono ILLUSTRATIVI: mostrano il
   meccanismo economico, non stimano i costi reali di ST.
   ========================================================================== */
'use strict';

/* ==========================================================================
   1. DATI DELLA TABELLA DI CONFRONTO (Sezione 3)
   --------------------------------------------------------------------------
   Come aggiornare: sostituisci null con il dato reale, scritto come testo
   (es. '13,3 mld $'). Per un link usa { text: '...', url: 'https://...' }.
   Le celle con null mostrano "—". Ogni dato deve avere la sua fonte nella
   riga "Fonte" e l'anno nella riga "Anno di riferimento".
   NON inserire stime: solo dati verificati.
   ========================================================================== */
const COMPARISON_DATA = {
  columns: [
    { id: 'st', label: 'ST' },
    { id: 'nvidia', label: 'NVIDIA' },
    { id: 'tsmc', label: 'TSMC' },
  ],
  rows: [
    {
      id: 'model',
      label: 'Modello di business',
      values: { st: 'IDM', nvidia: 'Fabless', tsmc: 'Foundry' },
    },
    // TODO: ricavi reali (con valuta e unità) di ST, NVIDIA e TSMC.
    { id: 'revenue', label: 'Ricavi', values: { st: null, nvidia: null, tsmc: null } },
    // TODO: ROS (return on sales) reale.
    { id: 'ros', label: 'ROS', values: { st: null, nvidia: null, tsmc: null } },
    // TODO: ROI reale.
    { id: 'roi', label: 'ROI', values: { st: null, nvidia: null, tsmc: null } },
    // TODO: ROE reale.
    { id: 'roe', label: 'ROE', values: { st: null, nvidia: null, tsmc: null } },
    // TODO: investimenti (capex) / ricavi reali.
    {
      id: 'capex',
      label: 'Investimenti/ricavi (capex/ricavi)',
      values: { st: null, nvidia: null, tsmc: null },
    },
    // TODO: anno di riferimento dei dati inseriti sopra.
    { id: 'year', label: 'Anno di riferimento', values: { st: null, nvidia: null, tsmc: null } },
    // TODO: fonte di ciascun dato (bilancio, relazione annuale, ...), anche come link.
    { id: 'source', label: 'Fonte', values: { st: null, nvidia: null, tsmc: null } },
  ],
};

/* ==========================================================================
   2. FORMATTAZIONE DEI NUMERI (formato italiano)
   ========================================================================== */
const MINUS = '−'; // segno meno tipografico

function formatNumber(value, decimals = 0) {
  // Un valore che si arrotonda a zero non deve mostrare il segno ("−0,0").
  if (Number(value.toFixed(decimals)) === 0) value = 0;
  // 'always': in italiano i numeri a 4 cifre non avrebbero il punto ("2000"),
  // mentre qui vogliamo "2.000" come negli altri testi della pagina.
  const text = value.toLocaleString('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: 'always',
  });
  return text.replace('-', MINUS);
}

/** Milioni di dollari: "950 M$" sotto il miliardo, "3,2 mld $" sopra. */
function formatMoney(millions) {
  return Math.abs(millions) >= 1000
    ? `${formatNumber(millions / 1000, 1)} mld $`
    : `${formatNumber(millions)} M$`;
}

function formatPercent(ratio) {
  return `${formatNumber(ratio * 100, 1)}%`;
}

/** Volume in migliaia di wafer: "571k wafer". */
function formatWafers(thousands) {
  return `${formatNumber(Math.round(thousands))}k wafer`;
}

/* ==========================================================================
   3. MODELLI DI CALCOLO
   --------------------------------------------------------------------------
   Unità: Q in migliaia di wafer/anno; CF e costi totali in M$/anno;
   cv, p, t in $/wafer. Da qui il fattore /1000: ($/wafer × migliaia di wafer)
   = migliaia di $ → /1000 = M$.
   ========================================================================== */

/** Strumento 1: costo totale di produrre in casa (make) o comprare (buy). */
function computeMakeOrBuy({ Q, CF, cv, p, t }) {
  const make = CF + (cv * Q) / 1000;
  const buy = ((p + t) * Q) / 1000;
  const unitSaving = p + t - cv; // quanto risparmio per wafer producendo in casa
  return {
    make,
    buy,
    // Se produrre in casa non costa meno per wafer, comprare vince sempre.
    breakEven: unitSaving > 0 ? (CF * 1000) / unitSaving : null,
    verdict: make < buy ? 'make' : 'buy',
  };
}

/** Strumento 2: effetto di un calo dei volumi su utile e margine operativo. */
function computeOperatingLeverage({ p, cv, CF, Q, d }) {
  const Q1 = Q * (1 - d / 100);
  const U0 = ((p - cv) * Q) / 1000 - CF;
  const U1 = ((p - cv) * Q1) / 1000 - CF;
  const R0 = (p * Q) / 1000;
  const R1 = (p * Q1) / 1000;
  return {
    Q1,
    U0,
    U1,
    R0,
    R1,
    marginBefore: U0 / R0,
    marginAfter: U1 / R1,
    profitChange: U0 > 0 ? (U1 - U0) / U0 : null, // null = "In perdita"
    breakEven: p > cv ? (CF * 1000) / (p - cv) : null, // null = "Nessuno"
  };
}

/* ==========================================================================
   4. TEMA E GRAFICI
   ========================================================================== */
const chartsAvailable = typeof Chart !== 'undefined';
let theme = null;

/** Legge i colori dalle variabili CSS: così i grafici seguono il tema. */
function readTheme() {
  const css = getComputedStyle(document.documentElement);
  const get = (name) => css.getPropertyValue(name).trim();
  return {
    make: get('--make'),
    buy: get('--buy'),
    revenue: get('--revenue'),
    cost: get('--cost'),
    danger: get('--danger'),
    ink: get('--ink'),
    muted: get('--muted'),
    line: get('--line'),
    grid: get('--grid'),
    surface: get('--surface'),
    fontBody: get('--font-body'),
    fontMono: get('--font-mono'),
  };
}

/**
 * Plugin: linee verticali tratteggiate (volume scelto, volume prima/dopo).
 * Legge chart.$verticalLines = [{ x, color, label, align }].
 */
const verticalLinesPlugin = {
  id: 'verticalLines',
  afterDatasetsDraw(chart) {
    const lines = chart.$verticalLines || [];
    const { ctx, chartArea, scales } = chart;
    for (const line of lines) {
      const x = scales.x.getPixelForValue(line.x);
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([2, 4]);
      ctx.lineWidth = 1.75;
      ctx.strokeStyle = line.color;
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();

      if (line.label) {
        ctx.setLineDash([]);
        ctx.fillStyle = line.color;
        ctx.font = `500 11px ${theme.fontMono}`;
        ctx.textBaseline = 'top';
        const width = ctx.measureText(line.label).width;
        let align = line.align || 'left';
        // Se l'etichetta uscirebbe dal grafico, la giro dall'altra parte.
        if (align === 'left' && x + 5 + width > chartArea.right) align = 'right';
        if (align === 'right' && x - 5 - width < chartArea.left) align = 'left';
        ctx.textAlign = align;
        ctx.fillText(line.label, x + (align === 'left' ? 5 : -5), chartArea.top + 4);
      }
      ctx.restore();
    }
  },
};

function createChart(canvas, { xMax, xTitle, yTitle, datasets }) {
  const tickFont = { family: theme.fontMono, size: 11 };
  const titleFont = { family: theme.fontBody, size: 12 };
  return new Chart(canvas, {
    type: 'scatter',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      events: [], // grafico di sola lettura: i numeri sono negli indicatori
      layout: { padding: { top: 4, right: 8 } },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: xMax,
          title: { display: true, text: xTitle, font: titleFont },
          ticks: { font: tickFont, maxTicksLimit: 7, callback: (v) => formatNumber(v) },
          border: {},
          grid: {},
        },
        y: {
          beginAtZero: true,
          grace: '5%',
          title: { display: true, text: yTitle, font: titleFont },
          ticks: { font: tickFont, maxTicksLimit: 6, callback: (v) => formatNumber(v) },
          border: {},
          grid: {},
        },
      },
    },
  });
}

/** Ricolora assi e griglia con i colori del tema corrente. */
function applyChartTheme(chart) {
  for (const axis of [chart.options.scales.x, chart.options.scales.y]) {
    axis.ticks.color = theme.muted;
    axis.title.color = theme.muted;
    axis.grid.color = theme.grid;
    axis.border.color = theme.line;
  }
}

/** Dataset per una retta: due punti, nessun marcatore. */
function lineDataset(label, extra) {
  return {
    label,
    data: [],
    showLine: true,
    pointRadius: 0,
    pointHoverRadius: 0,
    borderWidth: 2.5,
    tension: 0,
    ...extra,
  };
}

function showChartFallback(canvas) {
  const message = document.createElement('p');
  message.className = 'chart-fallback';
  message.textContent =
    'Il grafico non è disponibile perché Chart.js non è stato caricato (serve una connessione a internet). Gli indicatori restano attivi.';
  canvas.replaceWith(message);
}

/* ==========================================================================
   5. CURSORI
   ========================================================================== */
const $ = (selector, root = document) => root.querySelector(selector);

/**
 * Crea i cursori dentro `container`. Ogni cursore ha <label> collegata,
 * <output> con il valore visibile e aria-valuetext con l'unità.
 * `onUserInput` parte solo quando l'utente muove un cursore (non con setValues).
 */
function buildControls(container, prefix, specs, onUserInput) {
  const state = {};
  const parts = {};

  const show = (spec) => {
    const text = `${formatNumber(state[spec.key])}${spec.suffix}`;
    parts[spec.key].output.textContent = text;
    parts[spec.key].input.setAttribute('aria-valuetext', text);
  };

  for (const spec of specs) {
    const id = `${prefix}-${spec.key}`;
    const wrapper = document.createElement('div');
    wrapper.className = 'control';
    wrapper.innerHTML = `
      <div class="control-head">
        <label for="${id}"><span class="sym">${spec.symbol}</span> ${spec.name}<span class="unit">${spec.unit}</span></label>
        <output id="${id}-out" for="${id}"></output>
      </div>
      <input type="range" id="${id}" min="${spec.min}" max="${spec.max}" step="${spec.step}" value="${spec.value}">`;
    // I cursori vanno prima dell'eventuale testo di aiuto (.hint) del riquadro.
    container.insertBefore(wrapper, $('.hint', container));

    parts[spec.key] = { input: $('input', wrapper), output: $('output', wrapper) };
    state[spec.key] = spec.value;
    show(spec);

    parts[spec.key].input.addEventListener('input', () => {
      state[spec.key] = Number(parts[spec.key].input.value);
      show(spec);
      onUserInput(spec.key);
    });
  }

  return {
    state,
    setValues(values) {
      for (const spec of specs) {
        if (!(spec.key in values)) continue;
        state[spec.key] = values[spec.key];
        parts[spec.key].input.value = values[spec.key];
        show(spec);
      }
    },
  };
}

/* ==========================================================================
   6. STRUMENTO 1: MAKE OR BUY
   ========================================================================== */
const MOB_XMAX = 1500;

const MOB_SPECS = [
  { key: 'Q', symbol: 'Q', name: 'Volume', unit: 'migliaia di wafer/anno', min: 0, max: 1500, step: 10, value: 400, suffix: 'k' },
  { key: 'CF', symbol: 'CF', name: 'Costi fissi della fab', unit: 'M$/anno', min: 500, max: 5000, step: 100, value: 2000, suffix: ' M$' },
  { key: 'cv', symbol: 'cv', name: 'Costo variabile interno', unit: '$/wafer', min: 1000, max: 6000, step: 100, value: 3000, suffix: ' $' },
  { key: 'p', symbol: 'p', name: 'Prezzo della foundry', unit: '$/wafer', min: 2000, max: 12000, step: 100, value: 6000, suffix: ' $' },
  { key: 't', symbol: 't', name: 'Costi di transazione', unit: '$/wafer', min: 0, max: 3000, step: 100, value: 500, suffix: ' $' },
];

const MOB_BASE = { Q: 400, CF: 2000, cv: 3000, p: 6000, t: 500 };

const MOB_SCENARIOS = [
  {
    id: 'base',
    label: 'Scenario base',
    values: MOB_BASE,
    note: 'Valori di partenza.',
  },
  {
    id: 'small',
    label: 'Piccola azienda fabless',
    values: { ...MOB_BASE, Q: 150 },
    note: 'Q = 150k: pochi wafer su cui spalmare i costi fissi, quindi conviene comprare.',
  },
  {
    id: 'foundry',
    label: 'Foundry con molti clienti',
    values: { ...MOB_BASE, Q: 1200 },
    note: 'Q = 1.200k: i volumi di molti clienti ripartiscono i costi fissi e produrre in casa costa meno.',
  },
  {
    id: 'crisis',
    label: 'Crisi di fornitura',
    values: { ...MOB_BASE, t: 2500 },
    note: 't = 2.500 $/wafer: comprare diventa rischioso, Q* scende e la fab propria conviene.',
  },
];

function initMakeOrBuy() {
  const els = {
    make: $('#t1-make'),
    buy: $('#t1-buy'),
    breakEven: $('#t1-be'),
    verdict: $('#t1-verdict'),
    canvas: $('#t1-chart'),
    scenarios: $('#t1-scenarios'),
    note: $('#t1-scenario-note'),
  };

  let activeScenario = null;
  let chart = null;

  // Cursori: muovendone uno a mano si deseleziona lo scenario.
  const controls = buildControls($('#t1-controls'), 't1', MOB_SPECS, () => {
    setActiveScenario(null);
    render();
  });

  // Pulsanti degli scenari.
  const buttons = MOB_SCENARIOS.map((scenario) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.textContent = scenario.label;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      controls.setValues(scenario.values);
      setActiveScenario(scenario.id);
      render();
    });
    els.scenarios.appendChild(button);
    return { scenario, button };
  });

  function setActiveScenario(id) {
    activeScenario = id;
    for (const { scenario, button } of buttons) {
      button.setAttribute('aria-pressed', String(scenario.id === id));
    }
    const current = MOB_SCENARIOS.find((s) => s.id === id);
    els.note.textContent = current ? current.note : 'Valori personalizzati.';
  }

  if (chartsAvailable) {
    chart = createChart(els.canvas, {
      xMax: MOB_XMAX,
      xTitle: 'Volume (migliaia di wafer/anno)',
      yTitle: 'Costo totale (M$/anno)',
      datasets: [lineDataset('Make (fab propria)', {}), lineDataset('Buy (foundry)', { borderDash: [8, 5] })],
    });
  } else {
    showChartFallback(els.canvas);
  }

  function render() {
    const { Q, CF, cv, p, t } = controls.state;
    const result = computeMakeOrBuy(controls.state);

    els.make.textContent = formatMoney(result.make);
    els.buy.textContent = formatMoney(result.buy);
    els.breakEven.textContent = result.breakEven === null ? 'Buy sempre' : formatWafers(result.breakEven);
    els.verdict.textContent = result.verdict === 'make' ? 'Conviene make' : 'Conviene buy';
    els.verdict.className = `verdict verdict-${result.verdict}`;

    if (!chart) return;
    const [makeLine, buyLine] = chart.data.datasets;
    makeLine.data = [{ x: 0, y: CF }, { x: MOB_XMAX, y: CF + (cv * MOB_XMAX) / 1000 }];
    buyLine.data = [{ x: 0, y: 0 }, { x: MOB_XMAX, y: ((p + t) * MOB_XMAX) / 1000 }];
    makeLine.borderColor = theme.make;
    buyLine.borderColor = theme.buy;
    chart.$verticalLines = [{ x: Q, color: theme.muted, label: `Q = ${formatNumber(Q)}k` }];
    applyChartTheme(chart);
    chart.update('none');

    els.canvas.setAttribute(
      'aria-label',
      `Grafico dei costi totali in funzione del volume. Con Q = ${formatNumber(Q)} migliaia di wafer: ` +
        `make ${formatMoney(result.make)}, buy ${formatMoney(result.buy)}. ` +
        `Pareggio: ${result.breakEven === null ? 'buy sempre' : formatWafers(result.breakEven)}. ` +
        `${result.verdict === 'make' ? 'Conviene make' : 'Conviene buy'}.`
    );
  }

  setActiveScenario('base');
  render();
  return { render };
}

/* ==========================================================================
   7. STRUMENTO 2: LEVA OPERATIVA
   ========================================================================== */
const LEV_XMAX = 1200;

const LEV_SPECS = [
  { key: 'p', symbol: 'p', name: 'Prezzo medio di vendita', unit: '$/wafer', min: 4000, max: 15000, step: 100, value: 9000, suffix: ' $' },
  { key: 'cv', symbol: 'cv', name: 'Costo variabile', unit: '$/wafer', min: 1000, max: 9000, step: 100, value: 4500, suffix: ' $' },
  { key: 'CF', symbol: 'CF', name: 'Costi fissi', unit: 'M$/anno', min: 500, max: 5000, step: 100, value: 2000, suffix: ' M$' },
  { key: 'Q', symbol: 'Q', name: 'Volume attuale', unit: 'migliaia di wafer/anno', min: 100, max: 1200, step: 10, value: 600, suffix: 'k' },
  { key: 'd', symbol: 'd', name: 'Calo dei volumi', unit: '%', min: 0, max: 40, step: 1, value: 11, suffix: ' %' },
];

function initOperatingLeverage() {
  const els = {
    breakEven: $('#t2-be'),
    marginBefore: $('#t2-m0'),
    marginAfter: $('#t2-m1'),
    profitChange: $('#t2-du'),
    canvas: $('#t2-chart'),
  };

  let chart = null;
  const controls = buildControls($('#t2-controls'), 't2', LEV_SPECS, () => render());

  if (chartsAvailable) {
    chart = createChart(els.canvas, {
      xMax: LEV_XMAX,
      xTitle: 'Volume (migliaia di wafer/anno)',
      yTitle: 'Ricavi e costi totali (M$/anno)',
      datasets: [
        lineDataset('Ricavi', {}),
        lineDataset('Costi totali', {}),
        { label: 'Pareggio', data: [], showLine: false, pointRadius: 6, pointHoverRadius: 6, borderWidth: 2.5 },
      ],
    });
  } else {
    showChartFallback(els.canvas);
  }

  function render() {
    const { p, cv, CF, Q, d } = controls.state;
    const r = computeOperatingLeverage(controls.state);

    const breakEvenText = r.breakEven === null ? 'Nessuno' : formatWafers(r.breakEven);
    els.breakEven.textContent = breakEvenText;
    els.marginBefore.textContent = formatPercent(r.marginBefore);
    els.marginAfter.textContent = formatPercent(r.marginAfter);
    els.profitChange.textContent = r.profitChange === null ? 'In perdita' : formatPercent(r.profitChange);

    if (!chart) return;
    const [revenue, cost, breakEvenPoint] = chart.data.datasets;
    revenue.data = [{ x: 0, y: 0 }, { x: LEV_XMAX, y: (p * LEV_XMAX) / 1000 }];
    cost.data = [{ x: 0, y: CF }, { x: LEV_XMAX, y: CF + (cv * LEV_XMAX) / 1000 }];
    // Il punto di pareggio compare solo se esiste ed è dentro il grafico.
    breakEvenPoint.data =
      r.breakEven !== null && r.breakEven <= LEV_XMAX
        ? [{ x: r.breakEven, y: (p * r.breakEven) / 1000 }]
        : [];
    revenue.borderColor = theme.revenue;
    cost.borderColor = theme.cost;
    breakEvenPoint.backgroundColor = theme.surface;
    breakEvenPoint.borderColor = theme.ink;
    chart.$verticalLines = [
      { x: r.Q1, color: theme.danger, label: 'dopo', align: 'right' },
      { x: Q, color: theme.muted, label: 'prima', align: 'left' },
    ];
    applyChartTheme(chart);
    chart.update('none');

    els.canvas.setAttribute(
      'aria-label',
      `Grafico di ricavi e costi totali in funzione del volume. ` +
        `Volume prima del calo: ${formatWafers(Q)}; dopo un calo di ${formatNumber(d)} punti percentuali: ${formatWafers(r.Q1)}.` +
        `Pareggio: ${breakEvenText}.`
    );
  }

  render();
  return { render };
}

/* ==========================================================================
   8. TABELLA DI CONFRONTO (Sezione 3)
   ========================================================================== */
function fillCell(cell, value) {
  if (value === null || value === undefined || value === '') {
    cell.textContent = '—';
    cell.classList.add('is-empty');
  } else if (typeof value === 'object' && value.url) {
    const link = document.createElement('a');
    link.href = value.url;
    link.textContent = value.text || value.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    cell.appendChild(link);
  } else {
    cell.textContent = value;
  }
}

function renderComparison(container, data) {
  const table = document.createElement('table');
  table.className = 'data-table comparison';

  const caption = document.createElement('caption');
  caption.className = 'sr-only';
  caption.textContent = 'Confronto tra ST, NVIDIA e TSMC';
  table.appendChild(caption);

  const headRow = document.createElement('tr');
  const corner = document.createElement('th');
  corner.scope = 'col';
  corner.textContent = 'Indicatore';
  headRow.appendChild(corner);
  for (const column of data.columns) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = column.label;
    headRow.appendChild(th);
  }
  const thead = document.createElement('thead');
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const row of data.rows) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    // Spazio di a-capo possibile dopo la barra ("Investimenti/ricavi").
    th.textContent = row.label.replace(/\//g, '/​');
    tr.appendChild(th);
    for (const column of data.columns) {
      const td = document.createElement('td');
      fillCell(td, row.values[column.id]);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  container.replaceChildren(table);
}

/* ==========================================================================
   9. AVVIO
   ========================================================================== */
let tools = [];

/** Rilegge i colori dalle variabili CSS e ridisegna i grafici. */
function refreshTheme() {
  theme = readTheme();
  tools.forEach((tool) => tool.render());
}

function init() {
  theme = readTheme();

  if (chartsAvailable) {
    Chart.register(verticalLinesPlugin);
    Chart.defaults.font.family = theme.fontBody;
    Chart.defaults.color = theme.muted;
  }

  tools = [initMakeOrBuy(), initOperatingLeverage()];
  renderComparison($('#comparison'), COMPARISON_DATA);

  // Cambio di tema (chiaro/scuro): i grafici si ricolorano subito.
  const scheme = window.matchMedia('(prefers-color-scheme: dark)');
  if (scheme.addEventListener) scheme.addEventListener('change', refreshTheme);
  else if (scheme.addListener) scheme.addListener(refreshTheme); // Safari < 14

  // Ridisegno quando i font web sono pronti, così il canvas usa quelli giusti.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshTheme);
}

init();
