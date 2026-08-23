/* =========================================================================
   Sobreviviendo al LineUp —   visualización de datos
   n = 172 · encuesta "Experiencia en Festivales Musicales en México"
   ========================================================================= */


const AMARILLO = '#FBDD49';  

// Categóricos: todos ≥3.87:1 sobre #6D1DC6 (mínimo 3.0 para elementos gráficos)
const CATEGORIAS_GASTO = [
  { clave: 'bebidas',    etiqueta: 'Bebidas dentro',     color: '#D0FFA4' }, // 7.01
  { clave: 'comida',     etiqueta: 'Comida dentro',      color: '#FBDD49' }, // 5.88
  { clave: 'transp_loc', etiqueta: 'Transporte local',   color: '#FF9E3D' }, // 3.87
  { clave: 'transp_for', etiqueta: 'Transporte foráneo', color: '#5FF0E0' }, // 5.69
  { clave: 'hospedaje',  etiqueta: 'Hospedaje',          color: '#FF9DC0' }, // 4.10
  { clave: 'otro',       etiqueta: 'Otro',               color: '#DCC8FF' }, // 5.21
];


let tablaDatos;
let asistentes = [];
let seleccionado = null;
let enfocado = null;
let vistaActual = 'nube';
let animacionActiva = true;
let movimientoReducido = false;
let categoriaAislada = null;
let etiquetasEje = [];

const MARGEN = { arriba: 30, abajo: 68, izq: 24, der: 24 };



function limpiar(s) {
  return String(s || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normGasto(txt) {
  const t = limpiar(txt).toLowerCase();
  if (t.includes('bebida')) return 'bebidas';
  if (t.includes('comida')) return 'comida';
  if (t.includes('transporte a la ciudad')) return 'transp_for';
  if (t.includes('transporte')) return 'transp_loc';
  if (t.includes('hospedaje') || t.includes('hotel')) return 'hospedaje';
  return 'otro';
}

const BINS_PRESUPUESTO = [
  { clave: 'p1', etiqueta: 'Hasta $200' },
  { clave: 'p2', etiqueta: '$200 a 500' },
  { clave: 'p3', etiqueta: 'Más de $500' },
  { clave: 'p4', etiqueta: '$1,000 a 2,000' },
  { clave: 'p5', etiqueta: 'Más de $2,000' },
];

function normPresupuesto(txt) {
  const t = limpiar(txt).toLowerCase();
  if (t.includes('2,000') && (t.includes('más de') || t.includes('mas de'))) return 'p5';
  if (t.includes('1,000')) return 'p4';
  if (t.includes('máximo') || t.includes('maximo')) return 'p1';
  if (t.includes('200') && t.includes('500')) return 'p2';
  if (t.includes('500')) return 'p3';
  return 'p2';
}

const BINS_FRECUENCIA = [
  { clave: 'f1', etiqueta: '1 a 2',     peso: 1.5 },
  { clave: 'f2', etiqueta: '3 a 5',     peso: 4 },
  { clave: 'f3', etiqueta: 'Más de 5',  peso: 7 },
  { clave: 'f4', etiqueta: 'Más de 10', peso: 12 },
];

function normFrecuencia(txt) {
  const t = limpiar(txt).toLowerCase();
  if (t.includes('10')) return 'f4';          // se evalúa ANTES que "más de 5"
  if (t.includes('1 a 2')) return 'f1';
  if (t.includes('3 a 5')) return 'f2';
  if (t.includes('más de 5') || t.includes('mas de 5')) return 'f3';
  return 'f1';
}

const BINS_CRITICA = [
  { clave: 'c1', etiqueta: 'Precios' },
  { clave: 'c2', etiqueta: 'Baños' },
  { clave: 'c3', etiqueta: 'Señal' },
  { clave: 'c4', etiqueta: 'Seguridad' },
  { clave: 'c5', etiqueta: 'Filas' },
  { clave: 'c6', etiqueta: 'Accesibilidad' },
  { clave: 'c7', etiqueta: 'Limpieza' },
  { clave: 'c8', etiqueta: 'Otros' },
];

function normCritica(txt) {
  const t = limpiar(txt).toLowerCase();
  if (t.includes('precio')) return 'c1';
  if (t.includes('baño')) return 'c2';
  if (t.includes('señal') || t.includes('internet')) return 'c3';
  if (t.includes('seguridad')) return 'c4';
  if (t.includes('fila')) return 'c5';
  if (t.includes('accesibilidad')) return 'c6';
  if (t.includes('limpieza') || t.includes('sustentab')) return 'c7';
  return 'c8';
}

const BINS_GUSTO = [
  { clave: 'g1', etiqueta: 'Artistas' },
  { clave: 'g2', etiqueta: 'Convivencia' },
  { clave: 'g3', etiqueta: 'Producción' },
  { clave: 'g4', etiqueta: 'Sonido' },
  { clave: 'g5', etiqueta: 'Organización' },
  { clave: 'g6', etiqueta: 'Visuales' },
  { clave: 'g7', etiqueta: 'Otros' },
];

// "Solo fui por un artista" y la respuesta que enlista varias opciones caen en
// Artistas, que es lo primero que ambas nombran.
function normGusto(txt) {
  const t = limpiar(txt).toLowerCase();
  if (t.includes('artista')) return 'g1';
  if (t.includes('convivencia') || t.includes('ambiente')) return 'g2';
  if (t.includes('producción') || t.includes('produccion') || t.includes('escenograf')) return 'g3';
  if (t.includes('sonido')) return 'g4';
  if (t.includes('organiz') || t.includes('logíst') || t.includes('logist')) return 'g5';
  if (t.includes('visuales')) return 'g6';
  return 'g7';
}

// "vaivén", "vaiven 2025" y "Vaivén" son el mismo festival
function normFestival(txt) {
  let t = limpiar(txt).toLowerCase()
    .replace(/\b20\d{2}\b/g, '').replace(/[.,!¡?¿]/g, '')
    .replace(/\s+/g, ' ').trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (t.includes('vaiven')) return 'Vaivén';
  if (t.includes('hipnosis')) return 'Hipnosis';
  if (t.includes('vive latino')) return 'Vive Latino';
  if (t.includes('corona capital')) return 'Corona Capital';
  if (t.includes('ceremonia')) return 'Axe Ceremonia';
  if (t.includes('mutek')) return 'MUTEK';
  if (t.includes('pitchfork')) return 'Pitchfork';
  return limpiar(txt) || 'No indica';
}


function preload() {
  tablaDatos = loadTable('datos_festivales.csv', 'csv', 'header');
}

function setup() {
  movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (movimientoReducido) animacionActiva = false;

  const cont = document.getElementById('canvas-container');
  // clientWidth, no offsetWidth: con box-sizing:border-box el segundo
  // incluye los 1.5px de borde de cada lado y el lienzo nacía 3px más ancho.
  const c = createCanvas(cont.clientWidth, alturaCanvas());
  c.parent('canvas-container');
  c.elt.setAttribute('aria-hidden', 'true');  // la tabla es la versión accesible

  for (let i = 0; i < tablaDatos.getRowCount(); i++) {
    const f = tablaDatos.getRow(i);
    asistentes.push(new Asistente(i, {
      edad:         limpiar(f.getString(1))  || 'No indica',
      genero:       limpiar(f.getString(2))  || 'No especifica',
      generoMus:    limpiar(f.getString(4))  || 'Varios',
      frecuencia:   limpiar(f.getString(5)),
      compania:     limpiar(f.getString(8))  || 'No especificado',
      motivacion:   limpiar(f.getString(9))  || 'Experiencia general',
      gasto:        limpiar(f.getString(10)),
      presupuesto:  limpiar(f.getString(11)),
      energia:      limpiar(f.getString(13)),
      recuperacion: limpiar(f.getString(14)),
      festival:     limpiar(f.getString(17)),
      // Se sigue leyendo de la encuesta, pero ya no se muestra en ninguna vista
      seguridad:    limpiar(f.getString(18)),
      gustos:       limpiar(f.getString(19)) || 'No indica',
      critica:      limpiar(f.getString(20)) || 'No indica',
    }));
  }

  textFont('Space Grotesk, sans-serif');
  construirLeyenda();
  construirTabla();
  aplicarVista('nube', true);
  conectarUI();
}

function alturaCanvas() {
  return window.innerWidth < 760 ? 540 : 620;
}

function windowResized() {
  const cont = document.getElementById('canvas-container');
  resizeCanvas(cont.clientWidth, alturaCanvas());
  aplicarVista(vistaActual, true);
}


class Asistente {
  constructor(id, d) {
    this.id = id;
    this.d = d;

    this.kGasto     = normGasto(d.gasto);
    this.kPresup    = normPresupuesto(d.presupuesto);
    this.kFrec      = normFrecuencia(d.frecuencia);
    this.kCritica   = normCritica(d.critica);
    this.kGusto     = normGusto(d.gustos);
    this.festival   = normFestival(d.festival);

    const cat = CATEGORIAS_GASTO.find(c => c.clave === this.kGasto);
    this.hex = cat.color;
    this.col = color(cat.color);
    this.etiquetaGasto = cat.etiqueta;

    this.peso = BINS_FRECUENCIA.find(b => b.clave === this.kFrec).peso;
    this.escalaVista = 1;
    this.diam = 10;

    this.x = random(width); this.y = random(height);
    this.tx = this.x;       this.ty = this.y;
    this.anclaX = this.x;   this.anclaY = this.y;
    this.semilla = random(10000);

    this.radioOrbita = random(16, 52);
    this.velOrbita   = random(0.0030, 0.0085);
    this.fase        = random(TWO_PI);
    this.razon       = random(0.55, 1.6);
  }

  recalcularTamano() {
    this.diam = 10 * Math.sqrt(this.peso / 1.5) * this.escalaVista;
  }

  get radioClic() { return Math.max(this.diam / 2 + 5, 12); }

  get atenuado() {
    return categoriaAislada !== null && this.kGasto !== categoriaAislada;
  }

  actualizar() {
    const enNube = vistaActual === 'nube';

    if (enNube && animacionActiva && !movimientoReducido) {
      const t = frameCount * this.velOrbita + this.fase;
      this.tx = this.anclaX + Math.cos(t) * this.radioOrbita;
      this.ty = this.anclaY + Math.sin(t * this.razon) * this.radioOrbita * 0.72;
    }

    const f = movimientoReducido ? 1 : (enNube ? 0.13 : 0.09);
    this.x = lerp(this.x, this.tx, f);
    this.y = lerp(this.y, this.ty, f);

    if (animacionActiva && !movimientoReducido) {
      const t = frameCount * 0.004;
      const amp = enNube ? 0.85 : 0.3;
      this.x += map(noise(this.semilla, t), 0, 1, -amp, amp);
      this.y += map(noise(t, this.semilla), 0, 1, -amp, amp);
    }
  }

  dibujar() {
    const sel = seleccionado === this;
    const foc = enfocado === this;

    if (sel || foc) {
      noFill(); stroke(255); strokeWeight(2);
      if (foc && !sel) drawingContext.setLineDash([3, 3]);
      ellipse(this.x, this.y, this.diam + 12, this.diam + 12);
      drawingContext.setLineDash([]);
    } else if (this.bajoElMouse()) {
      noFill(); stroke(255, 170); strokeWeight(1.5);
      ellipse(this.x, this.y, this.diam + 9, this.diam + 9);
    }

    noStroke();
    this.col.setAlpha(this.atenuado ? 50 : 255);
    fill(this.col);
    ellipse(this.x, this.y, this.diam, this.diam);
    this.col.setAlpha(255);
  }

  bajoElMouse() {
    return dist(mouseX, mouseY, this.x, this.y) < this.radioClic;
  }

  resumen() {
    return `Perfil ${this.id + 1}: ${this.d.edad} años, ${this.d.genero}. ` +
           `Va a ${this.d.frecuencia || 'no indica'} al año. ` +
           `Su mayor gasto extra es ${this.etiquetaGasto}. ` +
           `Presupuesto diario en consumo: ${this.d.presupuesto || 'no indica'}. ` +
           `Lo que más le gustó: ${this.d.gustos}. ` +
           `Lo que menos le gustó: ${this.d.critica}.`;
  }
}



function areaUtil() {
  return { x0: MARGEN.izq, x1: width - MARGEN.der,
           y0: MARGEN.arriba, y1: height - MARGEN.abajo };
}

function restaurarAltura() {
  if (Math.abs(height - alturaCanvas()) > 2) resizeCanvas(width, alturaCanvas());
}

function fijarEscala(e) {
  asistentes.forEach(p => { p.escalaVista = e; p.recalcularTamano(); });
}


function metricas(grupo, anchoDisp) {
  if (!grupo.length) return { celda: 0, porFila: 1, filas: 0, alto: 0 };
  const celda = Math.max(...grupo.map(p => p.diam)) + 4;
  const porFila = Math.max(1, Math.floor((anchoDisp - 8) / celda));
  const filas = Math.ceil(grupo.length / porFila);
  return { celda, porFila, filas, alto: filas * celda };
}

function empaquetar(grupo, cx, baseY, anchoDisp, haciaArriba = true) {
  if (!grupo.length) return 0;
  const orden = [...grupo].sort((a, b) => b.diam - a.diam);
  const { celda, porFila, filas, alto } = metricas(orden, anchoDisp);

  orden.forEach((p, j) => {
    const fila = Math.floor(j / porFila);
    const col = j % porFila;
    const enFila = Math.min(porFila, orden.length - fila * porFila);
    p.tx = cx + (col - (enFila - 1) / 2) * celda;
    p.ty = haciaArriba
      ? baseY - celda / 2 - fila * celda
      : baseY + (fila - (filas - 1) / 2) * celda;
  });
  return alto;
}


function escalaQueCabe(bins, clave, escala, anchoDisp, altoDisp) {
  let e = escala;
  for (let i = 0; i < 8; i++) {
    fijarEscala(e);
    const alto = Math.max(...bins.map(b =>
      metricas(asistentes.filter(p => clave(p) === b.clave), anchoDisp).alto));
    if (alto <= altoDisp) break;
    e *= 0.82;
  }
  fijarEscala(e);
  return e;
}


function layoutColumnas(bins, clave, escala = 1) {
  if (width < 640) return layoutFilas(bins, clave, escala);
  restaurarAltura();
  const a = areaUtil();
  const anchoCol = (a.x1 - a.x0) / bins.length;
  escalaQueCabe(bins, clave, escala, anchoCol, a.y1 - a.y0);
  etiquetasEje = [];

  bins.forEach((bin, i) => {
    const grupo = asistentes.filter(p => clave(p) === bin.clave);
    const cx = a.x0 + anchoCol * (i + 0.5);
    empaquetar(grupo, cx, a.y1, anchoCol, true);
    etiquetasEje.push({ texto: bin.etiqueta, x: cx, y: a.y1 + 10,
                        ancho: anchoCol - 6, conteo: grupo.length });
  });
}


function layoutFilas(bins, clave, escala = 1) {
  const zonaEtiqueta = 100;
  const x0 = MARGEN.izq + zonaEtiqueta;
  const anchoDisp = width - MARGEN.der - x0;

  fijarEscala(Math.max(escala * 0.6, 0.6));
  const grupos = bins.map(b => asistentes.filter(p => clave(p) === b.clave));
  const altos = grupos.map(g => Math.round(Math.max(38, metricas(g, anchoDisp).alto + 18)));
  const total = MARGEN.arriba + altos.reduce((a, b) => a + b, 0) + 24;
  if (Math.abs(total - height) > 2) resizeCanvas(width, Math.round(total));

  etiquetasEje = [];
  let y = MARGEN.arriba;
  bins.forEach((bin, i) => {
    const cy = y + altos[i] / 2;
    empaquetar(grupos[i], x0 + anchoDisp / 2, cy, anchoDisp, false);
    etiquetasEje.push({ texto: bin.etiqueta, filaY: cy, conteo: grupos[i].length });
    y += altos[i];
  });
}

function layoutNube() {
  restaurarAltura();
  fijarEscala(1);
  const a = areaUtil();
  etiquetasEje = [];
  asistentes.forEach(p => {
    const m = p.radioOrbita + 12;
    p.anclaX = random(a.x0 + m, a.x1 - m);
    p.anclaY = random(a.y0 + m, a.y1 - m);
    p.tx = p.anclaX;
    p.ty = p.anclaY;
  });
}

const VISTAS = {
  nube: {
    titulo: 'Nube libre',
    aplicar: () => layoutNube(),
    resumen: () => 'Las 172 personas encuestadas, sin agrupar. El color indica su mayor gasto extra y el área del punto, cuántos festivales va al año.',
  },
  gasto: {
    titulo: 'Presupuesto diario en comida y bebida',
    aplicar: () => layoutColumnas(BINS_PRESUPUESTO, p => p.kPresup),
    resumen: () => resumenConteos(BINS_PRESUPUESTO, p => p.kPresup,
      'Presupuesto diario declarado para comida y bebida dentro del festival'),
  },
  frecuencia: {
    titulo: 'Festivales al año',
    aplicar: () => layoutColumnas(BINS_FRECUENCIA, p => p.kFrec),
    resumen: () => resumenConteos(BINS_FRECUENCIA, p => p.kFrec,
      'Cantidad de festivales a los que asiste cada persona al año'),
  },
  critica: {
    titulo: 'Lo que menos gustó de la última experiencia',
    aplicar: () => layoutColumnas(BINS_CRITICA, p => p.kCritica, 0.85),
    resumen: () => resumenConteos(BINS_CRITICA, p => p.kCritica,
      'Lo que cada persona señaló como lo peor de su último festival'),
  },
  masgusto: {
    titulo: 'Lo que más gustó de la última experiencia',
    aplicar: () => layoutColumnas(BINS_GUSTO, p => p.kGusto, 0.85),
    resumen: () => resumenConteos(BINS_GUSTO, p => p.kGusto,
      'Lo que cada persona señaló como lo mejor de su último festival'),
  },
};

function resumenConteos(bins, clave, encabezado) {
  const partes = bins.map(b => {
    const n = asistentes.filter(p => clave(p) === b.clave).length;
    return `${b.etiqueta}, ${n} personas (${(n / asistentes.length * 100).toFixed(1)}%)`;
  });
  return `${encabezado}. ${partes.join('; ')}.`;
}

function aplicarVista(clave, instantaneo = false) {
  vistaActual = clave;
  VISTAS[clave].aplicar();
  if (instantaneo) asistentes.forEach(p => { p.x = p.tx; p.y = p.ty; });

  document.querySelectorAll('.btn-vista').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.vista === clave));
  });
  document.getElementById('vista-titulo').textContent = VISTAS[clave].titulo;
  document.getElementById('vista-resumen').textContent = VISTAS[clave].resumen();
}

/* ---------- 7. DIBUJO ---------- */

function draw() {
  clear();
  dibujarEjes();
  for (const p of asistentes) { p.actualizar(); p.dibujar(); }
  cursor(asistentes.some(p => p.bajoElMouse()) ? HAND : ARROW);
}

function dibujarEjes() {
  if (!etiquetasEje.length) return;
  for (const e of etiquetasEje) {
    noStroke();
    if (e.filaY !== undefined) {                    // etiquetas de fila
      textAlign(LEFT, CENTER); textSize(11.55); textStyle(BOLD);
      fill(AMARILLO);
      text(e.texto, MARGEN.izq + 2, e.filaY - 7, 98, 16);
      textStyle(NORMAL); fill(255, 195);
      text(`${e.conteo}`, MARGEN.izq + 2, e.filaY + 8);
      continue;
    }
    textAlign(CENTER, TOP); textStyle(BOLD);
    textSize(e.ancho < 90 ? 12.08 : 13.65);
    fill(AMARILLO);
    text(e.texto, e.x - e.ancho / 2, e.y, e.ancho, 34);
    textStyle(NORMAL); textSize(12.08); fill(255, 205);
    text(`${e.conteo}`, e.x - e.ancho / 2, e.y + 32, e.ancho, 20);
  }
}

/* ---------- 8. INTERACCIÓN ---------- */

function mousePressed() {
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;
  // Se recorre al revés para que gane la partícula dibujada encima
  for (let i = asistentes.length - 1; i >= 0; i--) {
    if (asistentes[i].bajoElMouse()) {
      elegir(asistentes[i] === seleccionado ? null : asistentes[i]);
      return;
    }
  }
  elegir(null);
}

function elegir(p) {
  seleccionado = p;
  enfocado = p;
  pintarPanel(p);
  document.querySelectorAll('#tabla-datos tbody tr').forEach(tr => {
    tr.classList.toggle('fila-activa', p !== null && +tr.dataset.id === p.id);
  });
}

function pintarPanel(p) {
  const panel = document.getElementById('panel-detalle');
  if (!p) {
    panel.innerHTML = `<p class="panel-vacio">Ningún perfil seleccionado.
      Haz clic en un punto, o entra al gráfico con el tabulador y muévete con
      las flechas del teclado.</p>`;
    return;
  }
  const fila = (et, v) => `<div class="dato"><dt>${et}</dt><dd>${v || 'No indica'}</dd></div>`;

  panel.innerHTML = `
    <p class="panel-eyebrow">Persona ${p.id + 1} de ${asistentes.length}</p>
    <p class="panel-gasto-titulo">Su mayor gasto extra</p>
    <p class="panel-gasto" style="--c:${p.hex}"><span class="punto"></span>${p.etiquetaGasto}</p>
    <dl class="panel-datos">
      ${fila('Festivales al año', p.d.frecuencia)}
      ${fila('Presupuesto diario en consumo', p.d.presupuesto)}
      ${fila('Lo que más le gustó', p.d.gustos)}
      ${fila('Lo que menos le gustó', p.d.critica)}
      ${fila('Último festival', p.festival)}
      ${fila('Asiste', p.d.compania)}
      ${fila('Decide ir por', p.d.motivacion)}
      ${fila('Perfil', `${p.d.edad} · ${p.d.genero}`)}
      ${fila('Sonido que le gusta', p.d.generoMus)}
      ${fila('Su Recuperación', p.d.recuperacion)}
      ${fila('Manejo de energía', p.d.energia)}
    </dl>`;
  document.getElementById('anuncio').textContent = p.resumen();
}

/* El recorrido por teclado sigue la disposición visual de la vista activa */
function ordenTeclado() {
  return [...asistentes].sort((a, b) => (a.tx - b.tx) || (a.ty - b.ty));
}

function conectarUI() {
  document.querySelectorAll('.btn-vista').forEach(btn => {
    btn.addEventListener('click', () => aplicarVista(btn.dataset.vista));
  });

  // WCAG 2.2.2 pide poder detener el movimiento automático. El control sigue
  // existiendo, pero vive sobre el lienzo y fuera de la barra de vistas.
  const btnPausa = document.getElementById('btn-pausa');
  const pintarPausa = () => {
    const et = animacionActiva ? 'Pausar movimiento' : 'Reanudar movimiento';
    btnPausa.setAttribute('aria-label', et);
    btnPausa.setAttribute('title', et);
    btnPausa.setAttribute('aria-pressed', String(!animacionActiva));
    btnPausa.textContent = animacionActiva ? '❙❙' : '▶';
  };
  btnPausa.addEventListener('click', () => { animacionActiva = !animacionActiva; pintarPausa(); });
  pintarPausa();

  const cont = document.getElementById('canvas-container');
  cont.addEventListener('keydown', e => {
    const orden = ordenTeclado();
    const i = enfocado ? orden.indexOf(enfocado) : -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      enfocado = orden[(i + 1) % orden.length]; pintarPanel(enfocado); e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      enfocado = orden[(i - 1 + orden.length) % orden.length]; pintarPanel(enfocado); e.preventDefault();
    } else if (e.key === 'Enter' || e.key === ' ') {
      elegir(enfocado); e.preventDefault();
    } else if (e.key === 'Escape') {
      elegir(null); enfocado = null;
    }
  });
  cont.addEventListener('blur', () => { if (!seleccionado) enfocado = null; });

  // Modal: cierre con Escape y foco atrapado mientras está abierto
  const modal = document.getElementById('init-modal');
  const btnCerrar = document.getElementById('cerrar-modal');
  btnCerrar.addEventListener('click', cerrarModal);
  modal.addEventListener('keydown', e => {
    if (e.key === 'Escape') cerrarModal();
    if (e.key === 'Tab') { e.preventDefault(); btnCerrar.focus(); }
  });
  btnCerrar.focus();
}

function construirLeyenda() {
  const cont = document.getElementById('leyenda-gasto');
  const items = [];
  CATEGORIAS_GASTO.forEach(cat => {
    const n = asistentes.filter(p => p.kGasto === cat.clave).length;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'leyenda-item';
    b.dataset.clave = cat.clave;
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<span class="caja" style="background:${cat.color}"></span>
      <span>${cat.etiqueta} <b>${n}</b></span>`;
    b.addEventListener('click', () => {
      const nueva = categoriaAislada === cat.clave ? null : cat.clave;
      categoriaAislada = nueva;
      items.forEach(x => x.setAttribute('aria-pressed', String(x.dataset.clave === nueva)));
    });
    b.addEventListener('mouseenter', () => { categoriaAislada = cat.clave; });
    b.addEventListener('mouseleave', () => {
      const fijo = items.find(x => x.getAttribute('aria-pressed') === 'true');
      categoriaAislada = fijo ? fijo.dataset.clave : null;
    });
    items.push(b);
    cont.appendChild(b);
  });
}

/* La tabla es la versión accesible del gráfico, no un anexo */
function construirTabla() {
  const tbody = document.querySelector('#tabla-datos tbody');
  const frag = document.createDocumentFragment();
  asistentes.forEach(p => {
    const tr = document.createElement('tr');
    tr.dataset.id = p.id;
    tr.innerHTML = `
      <th scope="row"><button type="button" class="btn-fila"
        aria-label="Ver el perfil ${p.id + 1}">${p.id + 1}</button></th>
      <td>${p.d.edad}</td><td>${p.d.genero}</td>
      <td>${p.d.frecuencia || '—'}</td><td>${p.etiquetaGasto}</td>
      <td>${p.d.presupuesto || '—'}</td><td>${p.d.gustos}</td>
      <td>${p.d.critica}</td><td>${p.d.recuperacion || '—'}</td>`;
    tr.querySelector('.btn-fila').addEventListener('click', () => {
      elegir(p);
      document.getElementById('panel-detalle')
        .scrollIntoView({ block: 'nearest', behavior: movimientoReducido ? 'auto' : 'smooth' });
    });
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

function cerrarModal() {
  document.getElementById('init-modal').hidden = true;
  document.getElementById('canvas-container').focus();
}
