// =====================
// ESTADO
// =====================
let faturamento = JSON.parse(localStorage.getItem('faturamento')) || {}; // {0..6:[valores]}
let despesas    = JSON.parse(localStorage.getItem('despesas'))    || [];  // [{desc,valor}]

const nomesDias = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

// =====================
// UTIL
// =====================
function diaIndexHoje() { return new Date().getDay(); } // 0..6
function toNumber(v, def=0) { const n = Number(v); return Number.isFinite(n) ? n : def; }

// =====================
// AÇÕES
// =====================
window.registrarFaturamento = function() {
  const v = toNumber(document.getElementById('valorFaturado').value);
  if (!v) return;
  const idx = diaIndexHoje();
  if (!Array.isArray(faturamento[idx])) faturamento[idx] = [];
  faturamento[idx].push(v);
  document.getElementById('valorFaturado').value = '';
  atualizarTudo();
}

window.registrarHoras = function() {
  const horas = toNumber(document.getElementById('horasTrabalhadas').value);
  const ganho = toNumber(document.getElementById('ganhoHora').value);
  if (!horas || !ganho) return;
  const idx = diaIndexHoje();
  if (!Array.isArray(faturamento[idx])) faturamento[idx] = [];
  faturamento[idx].push(horas * ganho);
  document.getElementById('horasTrabalhadas').value = '';
  atualizarTudo();
}

window.adicionarDespesa = function() {
  const desc = document.getElementById('descDespesa').value.trim();
  const val  = toNumber(document.getElementById('valorDespesa').value);
  if (!desc || !val) return;
  despesas.push({ desc, valor: val });
  document.getElementById('descDespesa').value = '';
  document.getElementById('valorDespesa').value = '';
  atualizarTudo();
}

window.removerFaturamento = function(diaIdx, i) {
  faturamento[diaIdx].splice(i,1);
  if (faturamento[diaIdx].length === 0) delete faturamento[diaIdx];
  atualizarTudo();
}

window.removerDespesa = function(i) {
  despesas.splice(i, 1);
  atualizarTudo();
}

window.resetarSemana = function() {
  if (!confirm('Tem certeza que deseja resetar os registros da semana?')) return;
  faturamento = {};
  despesas = [];
  localStorage.removeItem('faturamento');
  localStorage.removeItem('despesas');
  atualizarTudo();
}

// =====================
// TABELAS
// =====================
function atualizarTabelas() {
  const tbodyF = document.querySelector('#tabelaFaturamento tbody');
  tbodyF.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    if (Array.isArray(faturamento[i])) {
      faturamento[i].forEach((valor, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${nomesDias[i]}</td>
          <td>${toNumber(valor).toFixed(2)}</td>
          <td><button onclick="removerFaturamento(${i},${idx})">Excluir</button></td>
        `;
        tbodyF.appendChild(tr);
      });
    }
  }

  const tbodyD = document.querySelector('#tabelaDespesas tbody');
  tbodyD.innerHTML = '';
  despesas.forEach((d, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.desc}</td>
      <td>${toNumber(d.valor).toFixed(2)}</td>
      <td><button onclick="removerDespesa(${i})">Excluir</button></td>
    `;
    tbodyD.appendChild(tr);
  });
}

// =====================
// RESUMO + GRÁFICOS
// =====================
let graficoPizza = null;
let graficoBarras = null;

function atualizarResumoEGraficos() {
  const metaSemanal = toNumber(document.getElementById('metaSemanal').value);
  const ganhoHora   = toNumber(document.getElementById('ganhoHora').value);

  const somaDia = i => Array.isArray(faturamento[i]) ? faturamento[i].reduce((a,b)=>a+toNumber(b),0) : 0;
  const totalFaturado = Array.from({length:7}, (_,i)=> somaDia(i)).reduce((a,b)=>a+b,0);
  const totalCustos   = despesas.map(d=>toNumber(d.valor)).reduce((a,b)=>a+b,0);
  const lucro         = totalFaturado - totalCustos;

  const hojeIdx = diaIndexHoje();
  const diasRestantes = 7 - (hojeIdx === 0 ? 7 : hojeIdx);
  const faltandoSemana = metaSemanal - totalFaturado;
  const metaDiariaAjustada = diasRestantes > 0 ? (faltandoSemana / diasRestantes) : faltandoSemana;
  const horasNecessarias = ganhoHora > 0 ? (metaDiariaAjustada / ganhoHora) : 0;
  const progresso = metaSemanal > 0 ? (totalFaturado / metaSemanal) * 100 : 0;

  // Resumo
  document.getElementById('faturado').textContent = totalFaturado.toFixed(2);
  document.getElementById('custos').textContent = totalCustos.toFixed(2);
  document.getElementById('lucro').textContent = lucro.toFixed(2);
  document.getElementById('metaSemanalResumo').textContent = metaSemanal.toFixed(2);
  document.getElementById('metaDiaria').textContent = metaDiariaAjustada.toFixed(2);
  document.getElementById('horasNecessarias').textContent = horasNecessarias.toFixed(1);
  document.getElementById('progresso').textContent = progresso.toFixed(1);

  // Gráfico pizza (progresso)
  if (graficoPizza) graficoPizza.destroy();
  const faltando = Math.max(metaSemanal - totalFaturado, 0);
  graficoPizza = new Chart(document.getElementById('grafico'), {
    plugins: [ChartDataLabels],
    type: 'doughnut',
    data: {
      labels: ['Faturado', 'Falta para meta'],
      datasets: [{
        data: [totalFaturado, faltando],
        backgroundColor: ['#16a34a', '#e5e7eb']
      }]
    },
    options: {
      responsive: true,
      cutout: '70%',
      animation: { animateRotate: true, animateScale: true },
      plugins: { legend: { position: 'bottom' }, datalabels: { color: '#000', font: { weight: 'bold' }, formatter: (value) => `R$ ${value.toFixed(2)}` } }
    }
  });

  // Gráfico barras (por dia)
  if (graficoBarras) graficoBarras.destroy();
  const ganhos = Array.from({length:7}, (_,i)=> somaDia(i));
  graficoBarras = new Chart(document.getElementById('graficoBarras'), {
    plugins: [ChartDataLabels],
    type: 'bar',
    data: {
      labels: nomesDias,
      datasets: [{
        label: 'Ganhos (R$)',
        data: ganhos,
        backgroundColor: [
          '#60a5fa','#34d399','#facc15','#f87171','#a78bfa','#f472b6','#4ade80'
        ]
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 800 },
      plugins: { legend: { display: false }, datalabels: { color: '#000', font: { weight: 'bold' }, anchor: 'end', align: 'start', formatter: (value) => `R$ ${value.toFixed(2)}` } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

// =====================
// CICLO DE ATUALIZAÇÃO
// =====================
function atualizarTudo() {
  atualizarTabelas();
  atualizarResumoEGraficos();
  localStorage.setItem('faturamento', JSON.stringify(faturamento));
  localStorage.setItem('despesas', JSON.stringify(despesas));
}

// Inicializa
document.addEventListener('DOMContentLoaded', atualizarTudo);


let graficoDespesas = null;

function atualizarResumoEGraficos() {
  const metaSemanal = toNumber(document.getElementById('metaSemanal').value);
  const ganhoHora   = toNumber(document.getElementById('ganhoHora').value);

  const somaDia = i => Array.isArray(faturamento[i]) ? faturamento[i].reduce((a,b)=>a+toNumber(b),0) : 0;
  const totalFaturado = Array.from({length:7}, (_,i)=> somaDia(i)).reduce((a,b)=>a+b,0);
  const totalCustos   = despesas.map(d=>toNumber(d.valor)).reduce((a,b)=>a+b,0);
  const lucro         = totalFaturado - totalCustos;

  const hojeIdx = diaIndexHoje();
  const diasRestantes = 7 - (hojeIdx === 0 ? 7 : hojeIdx);
  const faltandoSemana = metaSemanal - totalFaturado;
  const metaDiariaAjustada = diasRestantes > 0 ? (faltandoSemana / diasRestantes) : faltandoSemana;
  const horasNecessarias = ganhoHora > 0 ? (metaDiariaAjustada / ganhoHora) : 0;
  const progresso = metaSemanal > 0 ? (totalFaturado / metaSemanal) * 100 : 0;

  // Resumo
  document.getElementById('faturado').textContent = totalFaturado.toFixed(2);
  document.getElementById('custos').textContent = totalCustos.toFixed(2);
  document.getElementById('lucro').textContent = lucro.toFixed(2);
  document.getElementById('metaSemanalResumo').textContent = metaSemanal.toFixed(2);
  document.getElementById('metaDiaria').textContent = metaDiariaAjustada.toFixed(2);
  document.getElementById('horasNecessarias').textContent = horasNecessarias.toFixed(1);
  document.getElementById('progresso').textContent = progresso.toFixed(1);

  // Gráfico pizza (progresso)
  if (graficoPizza) graficoPizza.destroy();
  const faltando = Math.max(metaSemanal - totalFaturado, 0);
  graficoPizza = new Chart(document.getElementById('grafico'), {
    type: 'doughnut',
    data: {
      labels: ['Faturado', 'Falta para meta'],
      datasets: [{
        data: [totalFaturado, faltando],
        backgroundColor: ['#16a34a', '#e5e7eb']
      }]
    },
    options: {
      responsive: true,
      cutout: '70%',
      animation: { animateRotate: true, animateScale: true },
      plugins: { legend: { position: 'bottom' }, datalabels: { color: '#000', font: { weight: 'bold' }, formatter: (value) => `R$ ${value.toFixed(2)}` } }
    },
    plugins: [ChartDataLabels]
  });

  // Gráfico barras (por dia)
  if (graficoBarras) graficoBarras.destroy();
  const ganhos = Array.from({length:7}, (_,i)=> somaDia(i));
  graficoBarras = new Chart(document.getElementById('graficoBarras'), {
    type: 'bar',
    data: {
      labels: nomesDias,
      datasets: [{
        label: 'Ganhos (R$)',
        data: ganhos,
        backgroundColor: [
          '#60a5fa','#34d399','#facc15','#f87171','#a78bfa','#f472b6','#4ade80'
        ]
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 800 },
      plugins: { legend: { display: false }, datalabels: { color: '#000', font: { weight: 'bold' }, anchor: 'end', align: 'start', formatter: (value) => `R$ ${value.toFixed(2)}` } },
      scales: { y: { beginAtZero: true } }
    },
    plugins: [ChartDataLabels]
  });

  // Gráfico pizza (despesas por categoria)
  if (graficoDespesas) graficoDespesas.destroy();
  if (despesas.length > 0) {
    const labels = despesas.map(d => d.desc);
    const valores = despesas.map(d => toNumber(d.valor));
    graficoDespesas = new Chart(document.getElementById('graficoDespesas'), {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: valores,
          backgroundColor: ['#f87171','#facc15','#34d399','#60a5fa','#a78bfa','#f472b6','#4ade80']
        }]
      },
      options: {
        responsive: true,
        cutout: '60%',
        plugins: { legend: { position: 'bottom' }, datalabels: { color: '#000', font: { weight: 'bold' }, formatter: (value) => `R$ ${value.toFixed(2)}` } }
      },
      plugins: [ChartDataLabels]
    });
  }
}


let graficoDespesasBarras = null;

function calcularDespesasPorDia() {
  const mapDias = {};
  despesas.forEach(d => {
    if (d.dia !== undefined) {
      if (!mapDias[d.dia]) mapDias[d.dia] = 0;
      mapDias[d.dia] += toNumber(d.valor);
    }
  });
  return Array.from({length:7}, (_,i)=> mapDias[i] || 0);
}

// Modificação na função adicionarDespesa para armazenar dia
window.adicionarDespesa = function() {
  const desc = document.getElementById('descDespesa').value.trim();
  const val  = toNumber(document.getElementById('valorDespesa').value);
  if (!desc || !val) return;
  despesas.push({ desc, valor: val, dia: diaIndexHoje() });
  document.getElementById('descDespesa').value = '';
  document.getElementById('valorDespesa').value = '';
  atualizarTudo();
}

// Inserir no final de atualizarResumoEGraficos
if (graficoDespesasBarras) graficoDespesasBarras.destroy();
const despesasPorDia = calcularDespesasPorDia();
graficoDespesasBarras = new Chart(document.getElementById('graficoDespesasBarras'), {
  type: 'bar',
  data: {
    labels: nomesDias,
    datasets: [{
      label: 'Despesas (R$)',
      data: despesasPorDia,
      backgroundColor: ['#f87171','#fca5a5','#f87171','#fca5a5','#f87171','#fca5a5','#f87171']
    }]
  },
  options: {
    responsive: true,
    animation: { duration: 800 },
    plugins: { legend: { display: false }, datalabels: { color: '#000', font: { weight: 'bold' }, anchor: 'end', align: 'start', formatter: (value) => `R$ ${value.toFixed(2)}` } },
    scales: { y: { beginAtZero: true } }
  },
  plugins: [ChartDataLabels]
});
