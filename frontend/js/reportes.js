async function loadReportes() {
  try {
    const data = await req('GET', '/reportes/resumen');
    
    el('repIngresos').textContent = L(data.ventasTotales);
    el('repGastos').textContent = L(data.gastosTotales);
    
    const balance = data.ventasTotales - data.gastosTotales;
    el('repBalance').textContent = L(balance);
    el('repBalance').style.color = balance >= 0 ? '#16A34A' : '#DC2626';

  } catch (err) {
    toast(err.message, 'err');
  }
}
