let clientesData = [];
let clienteEditId = null;

// ── CARGAR CLIENTES ──
async function loadClientes() {
  try {
    clientesData = await req('GET', '/clientes');
    renderClientes(clientesData);
  } catch (e) {
    toast('Error cargando clientes', 'err');
  }
}

// ── RENDER ──
function renderClientes(lista) {
  const tbody = el('clientesTableBody');
  if (!tbody) return;

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px">Sin clientes</td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(c => `
    <tr>
      <td>${c.nombre}</td>
      <td>${c.tipo}</td>
      <td>${c.telefono || '-'}</td>
      <td>${c.email || '-'}</td>
      <td>${c.direccion || '-'}</td>
      <td>
        <button onclick="editCliente('${c.id}')">✏️</button>
        <button onclick="deleteCliente('${c.id}')">🗑️</button>
      </td>
    </tr>
  `).join('');
}

// ── NUEVO ──
function openNuevoCliente() {
  clienteEditId = null;
  el('modalClienteTitulo').textContent = 'Nuevo Cliente';
  el('modalCliente').style.display = 'flex';

  el('cliNombre').value = '';
  el('cliTelefono').value = '';
  el('cliEmail').value = '';
  el('cliDireccion').value = '';
  el('cliTipo').value = 'Particular';
}

function closeModalCliente() {
  el('modalCliente').style.display = 'none';
}

// ── GUARDAR ──
async function saveCliente() {
  const body = {
    nombre: el('cliNombre').value,
    telefono: el('cliTelefono').value,
    email: el('cliEmail').value,
    direccion: el('cliDireccion').value,
    tipo: el('cliTipo').value
  };

  try {
    if (clienteEditId) {
      await req('PUT', `/clientes/${clienteEditId}`, body);
      toast('Cliente actualizado');
    } else {
      await req('POST', '/clientes', body);
      toast('Cliente creado');
    }

    closeModalCliente();
    loadClientes();

  } catch (e) {
    toast(e.message, 'err');
  }
}

// ── EDITAR ──
function editCliente(id) {
  const c = clientesData.find(x => x.id === id);
  if (!c) return;

  clienteEditId = id;

  el('cliNombre').value = c.nombre;
  el('cliTelefono').value = c.telefono;
  el('cliEmail').value = c.email;
  el('cliDireccion').value = c.direccion;
  el('cliTipo').value = c.tipo;

  el('modalClienteTitulo').textContent = 'Editar Cliente';
  el('modalCliente').style.display = 'flex';
}

// ── ELIMINAR ──
async function deleteCliente(id) {
  if (!confirm('¿Eliminar cliente?')) return;

  await req('DELETE', `/clientes/${id}`);
  toast('Cliente eliminado');
  loadClientes();
}

// ── FILTRO ──
function filtrarClientes() {
  const q = el('buscarCliente').value.toLowerCase();

  renderClientes(
    clientesData.filter(c =>
      c.nombre.toLowerCase().includes(q)
    )
  );
}