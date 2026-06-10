/* ══════════════════════════════════════════════
   CRUZYMAR · proveedores.js
   Módulo frontend de Proveedores
══════════════════════════════════════════════ */

let proveedoresData = [];
let proveedorEditId = null;

// ── CARGAR ────────────────────────────────────
async function loadProveedores() {
  try {
    proveedoresData = await req('GET', '/proveedores');
    renderProveedores(proveedoresData);
  } catch(e) {
    toast('Error cargando proveedores: ' + e.message, 'err');
  }
}

// ── RENDERIZAR TABLA ──────────────────────────
function renderProveedores(lista) {
  const tbody = el('proveedoresTableBody');
  if (!tbody) return;

  if (!lista || lista.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6" style="text-align:center;padding:50px;color:#64748B">
        <div style="font-size:36px;margin-bottom:10px">🚛</div>
        <div style="font-weight:600">Sin proveedores registrados</div>
        <div style="font-size:12px;margin-top:4px">Agrega tu primer proveedor</div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(p => `
    <tr>
      <td><strong>${p.nombre}</strong></td>
      <td><span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#EAF2FB;color:#0A4A8F">${p.tipo}</span></td>
      <td>${p.telefono || '—'}</td>
      <td>${p.email || '—'}</td>
      <td>${p.direccion || '—'}</td>
      <td>
        <div style="display:flex;gap:5px">
          <button class="btn-accion azul" onclick="editProveedor('${p.id}')" title="Editar">✏️</button>
          <button class="btn-accion rojo" onclick="deleteProveedor('${p.id}')" title="Eliminar">🗑️</button>
        </div>
      </td>
    </tr>`).join('');
}

// ── ABRIR MODAL NUEVO ─────────────────────────
function openNuevoProveedor() {
  proveedorEditId = null;
  el('modalProveedorTitulo').textContent = 'Nuevo Proveedor';
  el('formProveedor').reset();
  el('modalProveedor').style.display = 'flex';
}

// ── CERRAR MODAL ──────────────────────────────
function closeModalProveedor() {
  el('modalProveedor').style.display = 'none';
}

// ── EDITAR ────────────────────────────────────
function editProveedor(id) {
  const p = proveedoresData.find(x => x.id === id);
  if (!p) return;
  proveedorEditId = id;
  el('modalProveedorTitulo').textContent = 'Editar Proveedor';
  el('provNombre').value    = p.nombre    || '';
  el('provTipo').value      = p.tipo      || 'Local';
  el('provTelefono').value  = p.telefono  || '';
  el('provEmail').value     = p.email     || '';
  el('provRtn').value       = p.rtn       || '';
  el('provDireccion').value = p.direccion || '';
  el('modalProveedor').style.display = 'flex';
}

// ── GUARDAR ───────────────────────────────────
async function saveProveedor() {
  const body = {
    nombre:    el('provNombre').value.trim(),
    tipo:      el('provTipo').value,
    telefono:  el('provTelefono').value,
    email:     el('provEmail').value,
    rtn:       el('provRtn').value,
    direccion: el('provDireccion').value,
  };
  if (!body.nombre) return toast('El nombre es obligatorio', 'err');
  try {
    if (proveedorEditId) {
      await req('PUT', `/proveedores/${proveedorEditId}`, body);
      toast('Proveedor actualizado ✅');
    } else {
      await req('POST', '/proveedores', body);
      toast('Proveedor creado ✅');
    }
    closeModalProveedor();
    loadProveedores();
  } catch(e) {
    toast(e.message, 'err');
  }
}

// ── ELIMINAR ──────────────────────────────────
async function deleteProveedor(id) {
  if (!confirm('¿Eliminar este proveedor?')) return;
  try {
    await req('DELETE', `/proveedores/${id}`);
    toast('Proveedor eliminado');
    loadProveedores();
  } catch(e) {
    toast(e.message, 'err');
  }
}

// ── FILTRAR ───────────────────────────────────
function filtrarProveedores() {
  const q = el('buscarProveedor')?.value.toLowerCase() || '';
  renderProveedores(proveedoresData.filter(p =>
    p.nombre.toLowerCase().includes(q)
  ));
}