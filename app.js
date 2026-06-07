// ============================================================
// ELBA RODRÍGUEZ AVALÓS — app.js (ACTUALIZADO CON MÚSICA)
// JavaScript principal - Versión Portafolio Artístico
// ============================================================

// ── Helper: ejecuta fn cuando el DOM esté listo ──
function _ready(fn) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn);
    } else {
        fn();
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN GOOGLE SHEETS
// ══════════════════════════════════════════════════════════════════════════════
var SHEET_ID = '1syFSE4GiAfmvEslC038srzJyqJGMJ9AEpbUdnNgBtyE'; // Tu ID actual
var listaProductos = [];

// COLUMNAS ESPERADAS (Nueva Estructura):
// A: Nombre
// B: imagen
// C: Descripcion
// D: fecha
// E: categoria (Usada para filtrar: 'Biografia', 'Musica', 'Proyectos', 'Mis Aventuras')
// F: enlace (URLs de imágenes/videos extra separados por comas)
// G: videoyoutube
// H: videofacebook
// I: videoinstagram
// J: videotiktok

// ── Parser de CSV ──
function parsearCSV(texto) {
    var lineas = [];
    var filaActual = [];
    var campoActual = '';
    var dentroDeComillas = false;
    for (var i = 0; i < texto.length; i++) {
        var c = texto[i];
        if (c === '"') {
            if (dentroDeComillas && texto[i + 1] === '"') {
                campoActual += '"';
                i++;
            } else {
                dentroDeComillas = !dentroDeComillas;
            }
        } else if (c === ',' && !dentroDeComillas) {
            filaActual.push(campoActual.trim());
            campoActual = '';
        } else if ((c === '\n' || c === '\r') && !dentroDeComillas) {
            if (c === '\r' && texto[i + 1] === '\n') i++;
            filaActual.push(campoActual.trim());
            if (filaActual.some(function(f) { return f !== ''; })) {
                lineas.push(filaActual);
            }
            filaActual = [];
            campoActual = '';
        } else {
            campoActual += c;
        }
    }
    filaActual.push(campoActual.trim());
    if (filaActual.some(function(f) { return f !== ''; })) lineas.push(filaActual);
    return lineas;
}

// ── Convierte filas CSV en objetos ──
function csvAProductos(filas) {
    if (filas.length < 2) return [];
    var productos = [];
    for (var i = 1; i < filas.length; i++) {
        var f = filas[i];
        var get = function(idx) { return (f[idx] || '').trim(); };
        
        if (!get(0)) continue; // Saltar filas vacías

        // Procesar columna 'enlace' (índice 5) separada por comas
        var enlacesRaw = get(5);
        var galeria = enlacesRaw ? enlacesRaw.split(',').map(function(u){ return u.trim(); }).filter(Boolean) : [];
        
        // Imagen principal (índice 1)
        var imgPrincipal = get(1);
        var todasImagenes = imgPrincipal ? [imgPrincipal].concat(galeria) : galeria;

        productos.push({
            id:             i,
            nombre:         get(0),
            descripcion:    get(2),
            fecha:          get(3), 
            categoria:      get(4),
            imagen:         imgPrincipal || (todasImagenes[0] || ''),
            imagenes:       todasImagenes,
            videoYoutube:   get(6),
            videoFacebook:  get(7),
            videoInstagram: get(8),
            videoTiktok:    get(9)
        });
    }
    return productos;
}

// ── Mostrar estado de carga ──
function mostrarEstadoCarga(mensaje, esError) {
    var grid = document.getElementById('gridProductos');
    if (!grid) return;
    grid.innerHTML = 
        '<div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:' +
        (esError ? '#c0392b' : '#8c7565') + ';">' +
        '<div style="font-size:2rem; margin-bottom:12px;">' + (esError ? '⚠️' : '⏳') + '</div>' +
        '<p style="font-size:1rem; font-weight:600;">' + mensaje + '</p>' +
        (esError ? '<p style="font-size:0.85rem; color:#999; margin-top:8px;">Revisa la hoja de cálculo.</p>' : '') +
        '</div>';
}

// ══════════════════════════════════════════════════════════════════════════════
// RENDERIZADO DEL CATÁLOGO (MIS AVENTURAS)
// ══════════════════════════════════════════════════════════════════════════════
function renderizarCatalogoCompleto() {
    var grid = document.getElementById('gridProductos');
    if (!grid) return;
    grid.innerHTML = '';

    // Filtrar solo los de categoría "Mis Aventuras" o similares si quieres separarlos
    // Por ahora mostramos todos los que no sean música/proyectos/biografia explícita si así lo deseas,
    // o simplemente todos ordenados por fecha.
    
    // ORDENAR POR FECHA (Más antigua a más reciente)
    listaProductos.sort(function(a, b) {
        var dateA = new Date(a.fecha);
        var dateB = new Date(b.fecha);
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        return dateA - dateB;
    });

    listaProductos.forEach(function(p) {
        // Si quieres que SOLO aparezcan en "Mis Aventuras" los que tengan esa categoría exacta:
        // if (p.categoria.toLowerCase() !== 'mis aventuras') return; 

        var card = document.createElement('div');
        card.className = 'card-dinamica';
        
        // Data attributes
        card.setAttribute('data-idx', String(p.id));
        card.setAttribute('data-nombre', p.nombre);
        card.setAttribute('data-imagenes', JSON.stringify(p.imagenes || []));
        card.setAttribute('data-descripcion', p.descripcion || '');
        card.setAttribute('data-categoria', p.categoria || '');
        card.setAttribute('data-fecha', p.fecha || '');
        card.setAttribute('data-video-youtube', p.videoYoutube || '');
        card.setAttribute('data-video-facebook', p.videoFacebook || '');
        card.setAttribute('data-video-instagram', p.videoInstagram || '');
        card.setAttribute('data-video-tiktok', p.videoTiktok || '');
        
        card.style.cursor = 'pointer';

        // Imagen principal
        var imgContenedor = document.createElement('div');
        imgContenedor.className = 'img-contenedor-dinamico';
        var img = document.createElement('img');
        img.src = p.imagen;
        img.alt = p.nombre;
        img.style.cssText = 'width:100%; height:100%; object-fit:cover;';
        img.onerror = function() { this.style.display='none'; this.parentElement.style.background='#eee'; };
        imgContenedor.appendChild(img);
        card.appendChild(imgContenedor);

        // Botón favorito (corazón)
        var btnLike = document.createElement('button');
        btnLike.className = 'btn-like';
        btnLike.setAttribute('aria-label', 'Me gusta ' + p.nombre);
        btnLike.innerHTML = '🤍';
        btnLike.addEventListener('click', function(e) {
            e.stopPropagation();
            var idx = parseInt(card.getAttribute('data-idx'));
            if (!isNaN(idx)) toggleLike(idx, btnLike);
        });
        imgContenedor.appendChild(btnLike);

        // Información
        var infoDiv = document.createElement('div');
        infoDiv.style.cssText = 'margin-top:10px; flex-grow:1; padding: 0 5px;';
        var h3 = document.createElement('h3');
        h3.style.cssText = 'font-size:16px; margin:5px 0; font-weight:700; color:#362a22;';
        h3.textContent = p.nombre;
        infoDiv.appendChild(h3);

        // Fecha (si existe)
        if (p.fecha) {
            var fechaP = document.createElement('p');
            fechaP.style.cssText = 'font-size:12px; color:#8c7565; margin:2px 0;';
            fechaP.textContent = '📅 ' + p.fecha;
            infoDiv.appendChild(fechaP);
        }

        // Descripción corta
        if (p.descripcion) {
            var descCorta = document.createElement('p');
            descCorta.style.cssText = 'font-size:13px; color:#705c4f; margin:4px 0 0 0; line-height:1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;';
            descCorta.textContent = p.descripcion;
            infoDiv.appendChild(descCorta);
        }

        card.appendChild(infoDiv);

        // Click para abrir modal
        card.addEventListener('click', function(e) {
            if (e.target.closest('.btn-like')) return;
            abrirModalProducto(card);
        });

        grid.appendChild(card);
    });
    
    if (typeof syncBotonesLike === 'function') syncBotonesLike();
}

// ══════════════════════════════════════════════════════════════════════════════
// RENDERIZADO SECCIÓN MÚSICA (GRID ESPECIAL)
// ══════════════════════════════════════════════════════════════════════════════
function renderizarSeccionMusica() {
    // Buscamos un contenedor específico para música, o reutilizamos el grid principal
    // Para este ejemplo, asumiremos que hay un div con id "gridMusica" en el panel de música.
    // Si no existe, lo creamos dinámicamente en el panel correspondiente.
    
    var panelMusica = document.getElementById('panelPillMusica');
    if (!panelMusica) return;

    // Limpiar contenido previo de música si existe
    var contenedorMusica = document.getElementById('contenedorMusica');
    if (!contenedorMusica) {
        contenedorMusica = document.createElement('div');
        contenedorMusica.id = 'contenedorMusica';
        contenedorMusica.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:20px; padding:20px;';
        panelMusica.appendChild(contenedorMusica);
    }
    contenedorMusica.innerHTML = '';

    // Filtrar productos de categoría "Musica"
    var musicaItems = listaProductos.filter(function(p) {
        return p.categoria && p.categoria.toLowerCase().includes('musica');
    });

    if (musicaItems.length === 0) {
        contenedorMusica.innerHTML = '<p style="text-align:center; width:100%; color:#888;">Próximamente agregaremos contenido musical.</p>';
        return;
    }

    musicaItems.forEach(function(p) {
        var card = document.createElement('div');
        card.className = 'card-musica';
        card.style.cssText = 'background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08); cursor:pointer; transition:transform 0.2s;';
        card.onmouseover = function() { this.style.transform = 'translateY(-5px)'; };
        card.onmouseout = function() { this.style.transform = 'translateY(0)'; };

        // Imagen
        var imgDiv = document.createElement('div');
        imgDiv.style.cssText = 'height:200px; background:#eee; position:relative;';
        imgDiv.innerHTML = '<img src="'+p.imagen+'" style="width:100%; height:100%; object-fit:cover;">';
        
        // Icono de Play superpuesto
        var playIcon = document.createElement('div');
        playIcon.style.cssText = 'position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:50px; height:50px; background:rgba(255,255,255,0.8); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; color:#8c7565;';
        playIcon.innerHTML = '▶';
        imgDiv.appendChild(playIcon);

        card.appendChild(imgDiv);

        // Info
        var infoDiv = document.createElement('div');
        infoDiv.style.cssText = 'padding:15px;';
        infoDiv.innerHTML = '<h3 style="margin:0 0 5px; font-size:18px; color:#362a22;">'+p.nombre+'</h3>' +
                            '<p style="margin:0; font-size:14px; color:#705c4f; line-height:1.4;">'+(p.descripcion ? p.descripcion.substring(0, 60)+'...' : '')+'</p>';
        
        card.appendChild(infoDiv);

        // Click para abrir modal
        card.addEventListener('click', function() {
            // Creamos un elemento temporal tipo "card-dinamica" para usar la función existente del modal
            var tempCard = document.createElement('div');
            tempCard.setAttribute('data-nombre', p.nombre);
            tempCard.setAttribute('data-descripcion', p.descripcion);
            tempCard.setAttribute('data-imagenes', JSON.stringify(p.imagenes));
            tempCard.setAttribute('data-video-youtube', p.videoYoutube);
            tempCard.setAttribute('data-video-facebook', p.videoFacebook);
            tempCard.setAttribute('data-video-instagram', p.videoInstagram);
            tempCard.setAttribute('data-video-tiktok', p.videoTiktok);
            
            // Truco: añadimos una imagen fake al tempCard para que el modal la encuentre si no hay galería
            var fakeImgContainer = document.createElement('div');
            fakeImgContainer.className = 'img-contenedor-dinamico';
            var fakeImg = document.createElement('img');
            fakeImg.src = p.imagen;
            fakeImgContainer.appendChild(fakeImg);
            tempCard.appendChild(fakeImgContainer);

            abrirModalProducto(tempCard);
        });

        contenedorMusica.appendChild(card);
    });
}


// ══════════════════════════════════════════════════════════════════════════════
// CARGA DESDE GOOGLE SHEETS
// ══════════════════════════════════════════════════════════════════════════════
function cargarDesdeGoogleSheets() {
    var csvUrl = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:csv';
    mostrarEstadoCarga('Cargando historia y eventos...', false);

    fetch(csvUrl)
        .then(function(res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
        })
        .then(function(texto) {
            var filas = parsearCSV(texto);
            var productos = csvAProductos(filas);

            if (productos.length === 0) {
                mostrarEstadoCarga('La hoja está vacía.', true);
                return;
            }

            listaProductos = productos;
            
            // Ocultar intro si existe
            var intro = document.getElementById('mis-aventuras-intro');
            if (intro) intro.style.display = 'none';
            
            renderizarCatalogoCompleto();
            
            // Disparar evento
            document.dispatchEvent(new CustomEvent('catalogoCargado'));
        })
        .catch(function(err) {
            console.error('Error cargando Google Sheets:', err);
            mostrarEstadoCarga('Error de conexión con la hoja de cálculo.', true);
        });
}

// Iniciar carga
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cargarDesdeGoogleSheets);
} else {
    cargarDesdeGoogleSheets();
}

// ══════════════════════════════════════════════════════════════════════════════
// MODAL DE PRODUCTO / EVENTO
// ══════════════════════════════════════════════════════════════════════════════
let galeriaImagenes = [];
let galeriaIndice = 0;

function abrirModalProducto(card) { 
    const nombre = card.getAttribute('data-nombre') || 'Evento';
    const descripcion = card.getAttribute('data-descripcion') || '';
    const imagenesJSON = card.getAttribute('data-imagenes');
    
    // Videos de redes sociales específicos de este evento
    const videoYT  = card.getAttribute('data-video-youtube') || '';
    const videoFB  = card.getAttribute('data-video-facebook') || '';
    const videoIG  = card.getAttribute('data-video-instagram') || '';
    const videoTT  = card.getAttribute('data-video-tiktok') || '';

    try {
        galeriaImagenes = imagenesJSON ? JSON.parse(imagenesJSON) : [];
    } catch(e) { galeriaImagenes = []; }

    // Si no hay galería explícita, usar la imagen principal
    if (galeriaImagenes.length === 0) {
        const imgPrincipal = card.querySelector('.img-contenedor-dinamico img');
        if (imgPrincipal) galeriaImagenes = [imgPrincipal.getAttribute('src')];
    }

    galeriaIndice = 0;
    document.getElementById('modalProdTitulo').textContent = nombre;

    // OCULTAR PRECIOS (Ya no somos tienda)
    const precioBadge  = document.getElementById('modalPrecioSuperior');
    const precioFila   = document.getElementById('mpPrecioOriginalFila');
    const bazarFila    = document.getElementById('mpPrecioBazarFila');
    const filaCompleta = document.getElementById('mpPrecioFilaCompleta');
    if (precioBadge) precioBadge.style.display = 'none';
    if (precioFila) precioFila.style.display = 'none';
    if (bazarFila) bazarFila.style.display = 'none';
    if (filaCompleta) filaCompleta.style.display = 'none';

    // Descripción
    const descTexto = document.getElementById('modalDescripcionTexto');
    const descZona  = document.getElementById('modalDescripcionZona');
    if (descripcion) {
        descTexto.textContent = descripcion;
        descZona.style.display = '';
    } else {
        descZona.style.display = 'none';
    }

    // Galería de imágenes adicionales (de la columna 'enlace')
    const aditivosScroll = document.getElementById('modalAditivosScroll');
    const aditivosZona   = document.getElementById('modalAditivosZona');
    aditivosScroll.innerHTML = '';

    // Filtramos la primera imagen porque esa ya es la principal
    var extras = galeriaImagenes.slice(1); 
    
    if (extras.length > 0) {
        aditivosZona.style.display = '';
        const tituloZona = aditivosZona.querySelector('.modal-aditivos-titulo');
        if (tituloZona) tituloZona.textContent = '📸 Galería';

        extras.forEach(function(url, idx) {
            var thumb = document.createElement('div');
            thumb.style.cssText = 'width:80px; height:80px; border-radius:8px; overflow:hidden; cursor:pointer; flex-shrink:0; background:#111; position:relative;';
            thumb.innerHTML = '<img src="'+url+'" style="width:100%;height:100%;object-fit:cover;">';
            thumb.addEventListener('click', function() {
                abrirZoomGaleria(idx + 1); 
            });
            aditivosScroll.appendChild(thumb);
        });
    } else {
        aditivosZona.style.display = 'none';
    }

    // Botones de Redes Sociales EN EL MODAL
    _actualizarBotonesRedModal(videoYT, videoFB, videoIG, videoTT);

    // Abrir modal
    _actualizarGaleriaModal();
    document.getElementById('modalProducto').classList.add('abierto');
    document.body.style.overflow = 'hidden';
}

function _actualizarBotonesRedModal(yt, fb, ig, tt) {
    var ids = { youtube: 'btnRedYT', facebook: 'btnRedFB', instagram: 'btnRedIG', tiktok: 'btnRedTT' };
    var links = { youtube: yt, facebook: fb, instagram: ig, tiktok: tt };
    
    Object.keys(ids).forEach(function(red) {
        var btn = document.getElementById(ids[red]);
        if (!btn) return;
        var link = links[red];
        
        if (link) {
            btn.style.display = '';
            btn.onclick = function(e) { e.stopPropagation(); _abrirVideoModal(link); };
        } else {
            btn.style.display = 'none';
        }
    });
}

function _abrirVideoModal(url) {
    if (!url) return;
    var ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|watch\?v=|shorts\/))([A-Za-z0-9_-]{11})/);
    if (ytMatch) {
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;cursor:pointer;';
        overlay.innerHTML =
            '<div style="position:relative;width:100%;max-width:820px;aspect-ratio:16/9;cursor:default;" onclick="event.stopPropagation()">' +
            '<iframe src="https://www.youtube.com/embed/' + ytMatch[1] + '?autoplay=1&rel=0" style="position:absolute;inset:0;width:100%;height:100%;border:none;border-radius:12px;" allow="autoplay;encrypted-media;picture-in-picture" allowfullscreen></iframe>' +
            '<button onclick="this.closest(\'div\').parentElement.remove()" style="position:absolute;top:-38px;right:0;background:none;border:none;color:white;font-size:30px;cursor:pointer;line-height:1;padding:0;">✕</button>' +
            '</div>';
        overlay.addEventListener('click', function() { overlay.remove(); });
        document.body.appendChild(overlay);
    } else {
        window.open(url, '_blank');
    }
}
window._abrirVideoModal = _abrirVideoModal;

function _actualizarGaleriaModal() {
    renderizarGaleria();
}

function cerrarModalProducto() {
    const modalEl = document.getElementById('modalProducto');
    modalEl.classList.remove('abierto');
    document.body.style.overflow = 'auto';
}

function renderizarGaleria() {
    const track = document.getElementById('modalGaleriaTrack');
    const dotsContainer = document.getElementById('modalDots');
    if(!track || !dotsContainer) return;
    
    track.innerHTML = '';
    dotsContainer.innerHTML = '';

    galeriaImagenes.forEach((src, i) => {
        const slide = document.createElement('div');
        slide.className = 'modal-galeria-slide';
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'Imagen ' + (i + 1);
        img.style.cursor = 'zoom-in';
        img.onclick = () => abrirZoomGaleria(i);
        slide.appendChild(img);
        track.appendChild(slide);

        const dot = document.createElement('div');
        dot.className = 'modal-dot' + (i === 0 ? ' activo' : '');
        dot.onclick = () => irASlide(i);
        dotsContainer.appendChild(dot);
    });

    dotsContainer.style.display = galeriaImagenes.length <= 1 ? 'none' : 'flex';
    actualizarNavegacion();
}

function irASlide(indice) {
    const track = document.getElementById('modalGaleriaTrack');
    galeriaIndice = Math.max(0, Math.min(indice, galeriaImagenes.length - 1));
    track.scrollTo({ left: galeriaIndice * track.offsetWidth, behavior: 'smooth' });
    actualizarNavegacion();
}

function actualizarNavegacion() {
    const total = galeriaImagenes.length;
    document.getElementById('btnGalPrev').classList.toggle('oculto-nav', galeriaIndice === 0);
    document.getElementById('btnGalNext').classList.toggle('oculto-nav', galeriaIndice >= total - 1);
    document.getElementById('modalContador').textContent = total > 1 ? `${galeriaIndice + 1} / ${total}` : '';
    document.querySelectorAll('.modal-dot').forEach((dot, i) => {
        dot.classList.toggle('activo', i === galeriaIndice);
    });
}

// Zoom Lightbox
let zoomIndice = 0;
function abrirZoomGaleria(indice) {
    zoomIndice = (indice !== undefined) ? indice : galeriaIndice;
    actualizarZoom();
    document.getElementById('zoomOverlay').classList.add('abierto');
    document.body.style.overflow = 'hidden';
}
function cerrarZoomGaleria() {
    document.getElementById('zoomOverlay').classList.remove('abierto');
    document.body.style.overflow = 'auto'; 
}
function zoomNavegar(dir) {
    zoomIndice = Math.max(0, Math.min(zoomIndice + dir, galeriaImagenes.length - 1));
    actualizarZoom();
}
function actualizarZoom() {
    const total = galeriaImagenes.length;
    const img = document.getElementById('zoomImg');
    if(!img) return;
    img.style.opacity = '0.4';
    img.src = galeriaImagenes[zoomIndice] || '';
    img.onload = () => { img.style.opacity = '1'; };
    document.getElementById('zoomContador').textContent = total > 1 ? `${zoomIndice + 1} / ${total}` : '';
    document.getElementById('zoomPrev').classList.toggle('oculto-zoom', zoomIndice === 0);
    document.getElementById('zoomNext').classList.toggle('oculto-zoom', zoomIndice >= total - 1);
}

document.addEventListener('keydown', function(e) {
    const overlay = document.getElementById('zoomOverlay');
    if (!overlay || !overlay.classList.contains('abierto')) return;
    if (e.key === 'Escape') cerrarZoomGaleria();
    if (e.key === 'ArrowLeft') zoomNavegar(-1);
    if (e.key === 'ArrowRight') zoomNavegar(1);
});

document.getElementById('modalProducto').addEventListener('click', function(e) {
    if (e.target === this) cerrarModalProducto();
});

// ══════════════════════════════════════════════════════════════════════════════
// BOTONES DE REDES SOCIALES EN BIOGRAFÍA
// ══════════════════════════════════════════════════════════════════════════════
function initBotonesRedesBiografia() {
    var btns = {
        youtube: document.getElementById('btnRedBioYT'), 
        facebook: document.getElementById('btnRedBioFB'),
        instagram: document.getElementById('btnRedBioIG'),
        tiktok: document.getElementById('btnRedBioTT')
    };
    
    var contenedor = document.getElementById('contenedorVideosRedes'); 

    if (!contenedor) return; 

    Object.keys(btns).forEach(function(red) {
        if (btns[red]) {
            btns[red].addEventListener('click', function() {
                Object.values(btns).forEach(b => b.classList.remove('activo'));
                btns[red].classList.add('activo');
                mostrarVideosDeRed(red, contenedor);
            });
        }
    });
}

function mostrarVideosDeRed(red, contenedor) {
    contenedor.innerHTML = '<p style="text-align:center; padding:20px;">Cargando videos...</p>';
    contenedor.style.display = 'block';

    var videos = listaProductos.filter(function(p) {
        var link = '';
        if (red === 'youtube') link = p.videoYoutube;
        if (red === 'facebook') link = p.videoFacebook;
        if (red === 'instagram') link = p.videoInstagram;
        if (red === 'tiktok') link = p.videoTiktok;
        return link && link.length > 5;
    });

    if (videos.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center; padding:20px; color:#888;">No hay videos de ' + red + ' registrados aún.</p>';
        return;
    }

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:20px; padding:20px 0;';
    
    videos.forEach(function(v) {
        var card = document.createElement('div');
        card.style.cssText = 'background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1); cursor:pointer;';
        
        var link = '';
        if (red === 'youtube') link = v.videoYoutube;
        if (red === 'facebook') link = v.videoFacebook;
        if (red === 'instagram') link = v.videoInstagram;
        if (red === 'tiktok') link = v.videoTiktok;

        var thumbHTML = '';
        if (red === 'youtube') {
            var ytId = link.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|watch\?v=|shorts\/))([A-Za-z0-9_-]{11})/);
            var id = ytId ? ytId[1] : '';
            thumbHTML = '<img src="https://img.youtube.com/vi/'+id+'/hqdefault.jpg" style="width:100%; aspect-ratio:16/9; object-fit:cover;">';
        } else {
            thumbHTML = '<div style="width:100%; aspect-ratio:16/9; background:#eee; display:flex; align-items:center; justify-content:center; font-size:2rem;">🎥</div>';
        }

        card.innerHTML = thumbHTML + '<div style="padding:10px;"><strong style="font-size:0.9rem;">'+v.nombre+'</strong></div>';
        
        card.addEventListener('click', function() {
            _abrirVideoModal(link);
        });
        
        grid.appendChild(card);
    });

    contenedor.innerHTML = '';
    contenedor.appendChild(grid);
}

document.addEventListener('catalogoCargado', initBotonesRedesBiografia);


// ══════════════════════════════════════════════════════════════════════════════
// FAVORITOS
// ══════════════════════════════════════════════════════════════════════════════
var favoritos = (JSON.parse(localStorage.getItem('elba-favoritos') || '[]')).map(Number);
function _guardarFavoritos() { localStorage.setItem('elba-favoritos', JSON.stringify(favoritos)); }
function toggleLike(productoIdx, btn) {
    var idx = parseInt(productoIdx);
    if (isNaN(idx)) return;
    var pos = favoritos.indexOf(idx);
    var esFav;
    if (pos === -1) { favoritos.push(idx); esFav = true; }
    else { favoritos.splice(pos, 1); esFav = false; }
    _guardarFavoritos();
    if (btn) { btn.textContent = esFav ? '❤️' : '🤍'; btn.classList.toggle('liked', esFav); }
}
function syncBotonesLike() {
    var tarjetas = document.querySelectorAll('[data-idx]');
    tarjetas.forEach(function(card) {
        var idx = parseInt(card.getAttribute('data-idx'));
        if (isNaN(idx)) return;
        var esFav = favoritos.indexOf(idx) !== -1;
        var like = card.querySelector('.btn-like');
        if (like) { like.textContent = esFav ? '❤️' : '🤍'; like.classList.toggle('liked', esFav); }
    });
}
_ready(syncBotonesLike);

// ══════════════════════════════════════════════════════════════════════════════
// MODO OSCURO Y PILL NAV (ACTUALIZADO PARA MÚSICA)
// ══════════════════════════════════════════════════════════════════════════════
function toggleModoOscuro() {
    document.body.classList.toggle('modo-oscuro');
    localStorage.setItem('elba-modo-oscuro', document.body.classList.contains('modo-oscuro') ? '1' : '0');
}
if (localStorage.getItem('elba-modo-oscuro') !== '0') {
    document.body.classList.add('modo-oscuro');
}

// Navegación por Píldoras
var _pillBtns   = { biografia:'pillBiografia', musica:'pillMusica', proyectos:'pillProyectos', aventuras:'pillAventuras' };
var _pillPanels = { biografia:'panelPillBiografia', musica:'panelPillMusica', proyectos:'panelPillProyectos', aventuras:'panelPillAventuras' };

function activarPill(cual) {
    // Desactivar todos
    Object.values(_pillBtns).forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.classList.remove('activo');
    });
    Object.values(_pillPanels).forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.classList.remove('activo');
    });

    // Activar seleccionado
    var btnEl = document.getElementById(_pillBtns[cual]);
    if (btnEl) btnEl.classList.add('activo');
    
    var panelId = _pillPanels[cual];
    if (panelId) {
        var panelEl = document.getElementById(panelId);
        if (panelEl) panelEl.classList.add('activo');
    }

    // Mostrar/Ocultar Catálogo Principal (Mis Aventuras)
    var catalogo = document.getElementById('zona-catalogo');
    if (catalogo) {
        // Solo mostramos el catálogo principal en 'aventuras'
        catalogo.style.display = (cual === 'aventuras') ? 'block' : 'none';
    }

    // Si es Música, renderizamos su sección especial
    if (cual === 'musica') {
        renderizarSeccionMusica();
    }
}

// Inicializar Pill Nav
_ready(function() {
    ['biografia', 'musica', 'proyectos', 'aventuras'].forEach(function(key) {
        var btn = document.getElementById(_pillBtns[key]);
        if (btn) {
            btn.addEventListener('click', function() { activarPill(key); });
        }
    });
    
    // Default: Biografía
    activarPill('biografia');
});