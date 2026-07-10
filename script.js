// ==========================================================================
// MOTOR DE LA APLICACIÓN - LIBRERÍA ROSA MÍSTICA (VERSIÓN INTEGRAL CORREGIDA)
// ==========================================================================

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRo3lMjsU8NhOZ5CT0Z61Bs-0zDywotnEVjjrysMXDjmyKdChMMMSWM7p9VPcX6SQDQ-7SzXwZmwrJK/pub?output=csv';

let baseDeDatos = [];
let listaEscolar = [];

// Esperar a que cargue el HTML por completo
document.addEventListener('DOMContentLoaded', () => {
  initMenuYBusqueda();
  cargarDatosDesdeGoogle();
  initBackToTop();
  initJumpFabVisibility();
});

// Control de Menú Móvil y Filtros de Búsqueda Controlados
function initMenuYBusqueda() {
  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.getElementById('mainNav');
  const searchToggle = document.getElementById('searchToggle');
  const searchBar = document.getElementById('searchBar');
  const headerSearch = document.getElementById('headerSearch');
  const btnEjecutarBusqueda = document.getElementById('btnEjecutarBusqueda');
  
  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      mainNav.classList.toggle('open');
    });
  }

  if (mainNav) {
    const enlaces = mainNav.querySelectorAll('a');
    enlaces.forEach(link => {
      link.addEventListener('click', () => mainNav.classList.remove('open'));
    });
  }

  // 1. Abrir la barra de búsqueda SIN mover la pantalla
  if (searchToggle && searchBar) {
    searchToggle.addEventListener('click', () => {
      searchBar.classList.toggle('open');
      if (searchBar.classList.contains('open')) {
        headerSearch.focus(); 
      }
    });
  }

  // 2. Función que ejecuta la búsqueda y ahora SÍ hace el scroll
  function ejecutarBusqueda() {
    const busqueda = headerSearch.value.toLowerCase();
    filtrarYMostrarProductos(busqueda, 'Todos');
    
    // Resaltar la píldora "Todos" al hacer una búsqueda manual
    const pildoras = document.querySelectorAll('.filter-pill');
    pildoras.forEach(p => p.classList.remove('active'));
    const todosPill = Array.from(pildoras).find(p => p.getAttribute('data-cat') === 'Todos');
    if(todosPill) todosPill.classList.add('active');

    // Desplazar suavemente al catálogo sólo cuando el usuario lo decide
    document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // 3. Buscar al hacer click en el botón físico de "Buscar"
  if (btnEjecutarBusqueda) {
    btnEjecutarBusqueda.addEventListener('click', ejecutarBusqueda);
  }

  // 4. Buscar al presionar la tecla "Enter" en el teclado del celular/computadora
  if (headerSearch) {
    headerSearch.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // Evita que se recargue la página en algunos navegadores
        ejecutarBusqueda();
      }
    });
  }
}

// Conexión y lectura limpia de Google Sheets
async function cargarDatosDesdeGoogle() {
  try {
    const respuesta = await fetch(SHEET_CSV_URL);
    const textoCSV = await respuesta.text();
    const lineas = textoCSV.split(/\r?\n/);
    baseDeDatos = [];
    
    for (let i = 1; i < lineas.length; i++) {
      if (!lineas[i].trim()) continue;
      
      const columnas = lineas[i].split(',');
      if (!columnas[0] || columnas[0].trim() === '') continue;
      
      let estadoFila = columnas[5] ? columnas[5].trim().toLowerCase() : 'activo';
      
      let producto = {
        nombre: columnas[0].trim(),
        precio: parseFloat(columnas[1]?.trim()) || 0,
        categoria: columnas[2] ? columnas[2].trim() : 'General', 
        sku: columnas[3] ? columnas[3].trim() : '',
        imagen: columnas[4] && columnas[4].trim() !== '' ? columnas[4].trim() : 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400', 
        estado: estadoFila
      };
      
      if (estadoFila === 'activo' || estadoFila === '') {
        baseDeDatos.push(producto);
      }
    }

    generarFiltrosYCategorias();
    actualizarChecklistInterfaz();
    filtrarYMostrarProductos('', 'Todos');
  } catch (error) {
    console.error('Error procesando el inventario remoto:', error);
  }
}

// Renderizar categorías superiores y píldoras
function generarFiltrosYCategorias() {
  const categoryGrid = document.getElementById('categoryGrid');
  const filtersContainer = document.getElementById('filters');
  
  const categoriasUnicas = [...new Set(baseDeDatos.map(p => p.categoria))];
  
  if (categoryGrid) {
    categoryGrid.innerHTML = '';
    categoriasUnicas.forEach(cat => {
      const card = document.createElement('div');
      card.className = 'category-card';
      card.innerHTML = `<h3>${cat}</h3>`;
      card.addEventListener('click', () => {
        document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        const pildoras = document.querySelectorAll('.filter-pill');
        pildoras.forEach(p => p.classList.remove('active'));
        const pildoraActiva = Array.from(pildoras).find(p => p.getAttribute('data-cat') === cat);
        if(pildoraActiva) pildoraActiva.classList.add('active');
        
        filtrarYMostrarProductos('', cat);
      });
      categoryGrid.appendChild(card);
    });
  }

  if (filtersContainer) {
    filtersContainer.innerHTML = '<button class="filter-pill active" data-cat="Todos">Todos</button>';
    
    categoriasUnicas.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'filter-pill';
      btn.textContent = cat;
      btn.setAttribute('data-cat', cat);
      filtersContainer.appendChild(btn);
    });

    const botones = filtersContainer.querySelectorAll('.filter-pill');
    botones.forEach(btn => {
      btn.addEventListener('click', (e) => {
        botones.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const catSeleccionada = e.target.getAttribute('data-cat');
        const inputBusqueda = document.getElementById('headerSearch') ? document.getElementById('headerSearch').value.toLowerCase() : '';
        filtrarYMostrarProductos(inputBusqueda, catSeleccionada);
      });
    });
  }
}

// Despliegue seguro de Productos en Grid (Con formato limpio de precios)
function filtrarYMostrarProductos(busqueda = '', categoria = 'Todos') {
  const catalogGrid = document.getElementById('catalogGrid');
  const catalogEmpty = document.getElementById('catalogEmpty');
  
  if (!catalogGrid) return;
  catalogGrid.innerHTML = '';

  const productosFiltrados = baseDeDatos.filter(p => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda);
    const coincideCategoria = (categoria === 'Todos' || p.categoria === categoria);
    return coincideBusqueda && coincideCategoria;
  });

  if (productosFiltrados.length === 0) {
    if (catalogEmpty) catalogEmpty.hidden = false;
    return;
  }

  if (catalogEmpty) catalogEmpty.hidden = true;

  productosFiltrados.forEach(p => {
    const card = document.createElement('article');
    card.className = 'product-card';
    
    const nombreEscapado = p.nombre.replace(/'/g, "\\'");
    const skuEscapado = p.sku.replace(/'/g, "\\'");
    
    card.innerHTML = `
      <div class="card-image-container">
        <img src="${p.imagen}" alt="${p.nombre}" loading="lazy">
      </div>
      <div class="card-body">
        <span class="card-cat">${p.categoria}</span>
        <h3 class="card-title">${p.nombre}</h3>
        <div class="card-bottom">
          <span class="card-price">C$ ${p.precio.toLocaleString()}</span>
          <!-- Pasamos nombre, precio y SKU a la función -->
          <button class="add-btn" onclick="agregarArticuloALaLista('${nombreEscapado}', ${p.precio}, '${skuEscapado}')">Agregar</button>
        </div>
      </div>
    `;
    catalogGrid.appendChild(card);
  });
}

// Gestión del Carrito / Presupuesto Escolar
function actualizarChecklistInterfaz() {
  const checklistElement = document.getElementById('checklist');
  if (!checklistElement) return;
  
  checklistElement.innerHTML = '';
  
  if (listaEscolar.length === 0) {
    checklistElement.innerHTML = '<p class="empty-list-msg">Tu lista de cotización está vacía. Selecciona artículos arriba.</p>';
  } else {
    listaEscolar.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = `check-item ${item.incluido ? '' : 'off'}`;
      li.innerHTML = `
        <input type="checkbox" ${item.incluido ? 'checked' : ''} onchange="alternarItemLista(${index})">
        <span class="check-name">${item.nombre}</span>
        <span class="check-price">C$ ${item.precio.toLocaleString()}</span>
        <button class="delete-btn" onclick="eliminarArticulo(${index})" title="Eliminar">✕</button>
      `;
      checklistElement.appendChild(li);
    });
  }
  calcularTotalTicket();
}

function agregarArticuloALaLista(nombre, precio, sku) {
  // Ahora valida de forma inteligente: si hay SKU compara por SKU, de lo contrario por nombre
  const existe = listaEscolar.find(item => {
    if (sku && item.sku) {
      return item.sku === sku;
    }
    return item.nombre === nombre;
  });
  
  if (!existe) {
    listaEscolar.push({ nombre, precio, sku, incluido: true });
    actualizarChecklistInterfaz();
  } else {
    alert("Este artículo ya está agregado a tu presupuesto actual.");
  }
}

function alternarItemLista(index) {
  listaEscolar[index].incluido = !listaEscolar[index].incluido;
  actualizarChecklistInterfaz();
}

function eliminarArticulo(index) {
  listaEscolar.splice(index, 1);
  actualizarChecklistInterfaz();
}

function calcularTotalTicket() {
  const ticketCount = document.getElementById('ticketCount');
  const ticketTotal = document.getElementById('ticketTotal');
  
  const activos = listaEscolar.filter(item => item.incluido);
  const total = activos.reduce((sum, item) => sum + item.precio, 0);
  
  if (ticketCount) ticketCount.textContent = activos.length;
  if (ticketTotal) ticketTotal.textContent = `C$ ${total.toLocaleString()}`;
  
  const wsBtn = document.getElementById('sendWhatsappBtn');
  if (wsBtn) {
    wsBtn.onclick = () => {
      if (activos.length === 0) {
        alert("Agrega y marca al menos un artículo antes de generar el reporte de WhatsApp.");
        return;
      }
      
      let mensaje = `*Cotización - Librería Rosa Mística*\n\nHola Doña Aminta, le escribo para consultar la disponibilidad de los siguientes útiles:\n\n`;
      activos.forEach(item => {
        mensaje += `▪️ ${item.nombre} -> *C$ ${item.precio.toLocaleString()}*\n`;
      });
      mensaje += `\n*Monto Total Estimado: C$ ${total.toLocaleString()}*\n\n¿Tiene estos artículos en existencia en la tienda? ¡Muchas gracias!`;
      
      const urlWa = `https://wa.me/50583649723?text=${encodeURIComponent(mensaje)}`;
      window.open(urlWa, '_blank');
    };
  }
}

// Botón "Volver arriba": aparece solo después de bajar un poco
function initBackToTop() {
  const backToTopBtn = document.getElementById('backToTop');
  if (!backToTopBtn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 500) {
      backToTopBtn.classList.add('show');
    } else {
      backToTopBtn.classList.remove('show');
    }
  });

  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
// Ocultar el botón "Contacto" cuando el footer ya es visible
function initJumpFabVisibility() {
  const jumpFab = document.querySelector('.jump-fab');
  const footer = document.getElementById('footerContacto');
  if (!jumpFab || !footer) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      jumpFab.style.opacity = entry.isIntersecting ? '0' : '1';
      jumpFab.style.visibility = entry.isIntersecting ? 'hidden' : 'visible';
      jumpFab.style.pointerEvents = entry.isIntersecting ? 'none' : 'auto';
    });
  }, { threshold: 0.1 });

  observer.observe(footer);
}