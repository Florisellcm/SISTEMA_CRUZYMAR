let inventarioData = [];
let currentInvEdit = null;

async function loadInventario() {
  try {
    const data = await req('GET', '/inventario');
    inventarioData = data;
    renderInventario();
    updateInvResumen();
  } catch (err) {
    toast(err.message, 'err');
  }
}

function updateInvResumen() {
  el('invTotalProductos').textContent = inventarioData.length;
  const bajos = inventarioData.filter(i => i.stock <= i.stockMinimo).length;
  el('invStockBajo').textContent = bajos;
  const valorTotal = inventarioData.reduce((acc, i) => acc + (i.stock * i.precio), 0);
  el('invValorTotal').textContent = L(valorTotal);
  const cats = new Set(inventarioData.map(i => i.categoria)).size;
  el('invCategorias').textContent = cats;
}

function renderInventario() {
  const cat = el('filtroInvCat')?.value;
  const buscar = el('buscarInv')?.value.toLowerCase();
  
  let lista = inventarioData;
  if (cat) lista = lista.filter(i => i.categoria === cat);
  if (buscar) lista = lista.filter(i => i.nombre.toLowerCase().includes(buscar));

  const tbody = el('inventarioTableBody');
  if (!tbody) return;
  
  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#64748B">No se encontraron productos.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = lista.map(i => {
    let estado = '<span style="color:#16A34A;font-weight:700">OK</span>';
    if (i.stock <= i.stockMinimo) estado = '<span style="color:#DC2626;font-weight:700">Stock Bajo</span>';
    return `
      <tr>
        <td style="font-weight:600;color:#003C78">${i.nombre}</td>
        <td>${i.categoria}</td>
        <td style="font-weight:700">${N(i.stock)}</td>
        <td>${i.unidad}</td>
        <td style="font-weight:600">${L(i.precio)}</td>
        <td>${estado}</td>
        <td>
          <button class="btn-accion azul" onclick="editInventario('${i.id}')"><i class="ri-pencil-line"></i></button>
          <button class="btn-accion rojo" onclick="deleteInventario('${i.id}')"><i class="ri-delete-bin-line"></i></button>
        </td>
      </tr>
    `;
  }).join('');
}

function filtrarInventario() {
  renderInventario();
}

function openNuevoInventario() {
  currentInvEdit = null;
  el('formInventario').reset();
  el('modalInvTitulo').textContent = 'Nuevo Producto';
  el('modalInventario').style.display = 'flex';
}

function closeModalInventario() {
  el('modalInventario').style.display = 'none';
}

function editInventario(id) {
  const i = inventarioData.find(x => x.id === id);
  if (!i) return;
  currentInvEdit = id;
  el('invNombre').value = i.nombre;
  el('invCategoria').value = i.categoria;
  el('invUnidad').value = i.unidad;
  el('invStock').value = i.stock;
  el('invStockMinimo').value = i.stockMinimo;
  el('invPrecio').value = i.precio;
  el('modalInvTitulo').textContent = 'Editar Producto';
  el('modalInventario').style.display = 'flex';
}

async function saveInventario() {
  const nombre = el('invNombre').value;
  if (!nombre) return toast('Nombre requerido', 'err');
  
  const data = {
    nombre,
    categoria: el('invCategoria').value,
    unidad: el('invUnidad').value,
    stock: el('invStock').value,
    stockMinimo: el('invStockMinimo').value,
    precio: el('invPrecio').value
  };

  try {
    if (currentInvEdit) {
      await req('PUT', '/inventario/' + currentInvEdit, data);
      toast('Producto actualizado');
    } else {
      await req('POST', '/inventario', data);
      toast('Producto creado');
    }
    closeModalInventario();
    loadInventario();
  } catch (err) {
    toast(err.message, 'err');
  }
}

async function deleteInventario(id) {
  if (!confirm('¿Eliminar producto?')) return;
  try {
    await req('DELETE', '/inventario/' + id);
    toast('Producto eliminado');
    loadInventario();
  } catch (err) {
    toast(err.message, 'err');
  }
}
