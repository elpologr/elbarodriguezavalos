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

// COLUMNAS DEL SHEET (estructura real actual):
// A (0): Nombre
// B (1): imagen/video  ← URL de imagen o YouTube
// C (2): Descripcion
// D (3): fecha
// E (4): categoria     ← Para Biografía: 'youtube', 'facebook', 'instagram'. Para Música: álbum/disco
// F (5): enlace        ← (reservado / vacío actualmente)
// G (6): seccion       ← 'musica', 'aventura', 'proyecto', 'biografia'

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

// ── Normaliza texto: minúsculas, sin tildes ──
function _normalizar(str) {
    return (str || '').toLowerCase()
        .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i')
        .replace(/ó/g,'o').replace(/ú/g,'u').replace(/ü/g,'u')
        .trim();
}

// ── Convierte filas CSV en objetos ──
function csvAProductos(filas) {
    if (filas.length < 2) return [];
    var productos = [];
    for (var i = 1; i < filas.length; i++) {
        var f = filas[i];
        var get = function(idx) { return (f[idx] || '').trim(); };
        
        if (!get(0)) continue; // Saltar filas vacías

        // Col B puede contener una URL de YouTube, una imagen, o varias imágenes separadas por coma
        var colB = get(1);
        
        // Separar posibles múltiples URLs en col B
        var urlsColB = colB.split(',').map(function(u){ return u.trim(); }).filter(Boolean);
        
        // Detectar si alguna URL en col B es YouTube
        var videoYT = '';
        var imagenesColB = [];
        urlsColB.forEach(function(u) {
            if (u.includes('youtube.com') || u.includes('youtu.be')) {
                if (!videoYT) videoYT = u; // primer video YouTube encontrado
            } else if (u.startsWith('http') || u.startsWith('/')) {
                imagenesColB.push(u);
            }
        });

        // Col F: puede tener URLs extra de imágenes (en algunas filas) o texto como 'youtube'
        var colF = get(5);
        var galeriaExtra = [];
        if (colF && (colF.startsWith('http') || colF.startsWith('/'))) {
            galeriaExtra = colF.split(',').map(function(u){ return u.trim(); }).filter(function(u){
                return u.startsWith('http') || u.startsWith('/');
            });
        }
        // enlace = col F como texto (para detectar 'youtube'/'facebook'/'instagram' en redes)
        var enlaceTexto = (colF.startsWith('http') || colF.startsWith('/')) ? '' : colF;

        var todasImagenes = imagenesColB.concat(galeriaExtra);
        var imgPrincipal = todasImagenes[0] || '';

        // Categoría normalizada (sin tildes) para comparaciones
        var categoriaBruta = get(4);
        var categoriaNorm = _normalizar(categoriaBruta);

        productos.push({
            id:             i,
            nombre:         get(0),
            descripcion:    get(2),
            fecha:          get(3),
            categoria:      categoriaBruta,      // valor original del Sheet
            categoriaNorm:  categoriaNorm,        // normalizado para filtros
            enlace:         enlaceTexto,          // 'youtube'/'facebook'/'instagram' o vacío
            seccion:        get(6),               // nombre del álbum / subsección
            imagen:         imgPrincipal,
            imagenes:       todasImagenes,
            videoYoutube:   videoYT,
            videoFacebook:  '',
            videoInstagram: ''
        });
    }
    console.log('[Elba] Productos cargados:', productos.length,
        '| musica:', productos.filter(function(p){ return p.categoriaNorm === 'musica'; }).length,
        '| biografia:', productos.filter(function(p){ return p.categoriaNorm === 'biografia'; }).length,
        '| aventura:', productos.filter(function(p){ return p.categoriaNorm === 'aventura'; }).length,
        '| youtube:', productos.filter(function(p){ return p.categoriaNorm === 'youtube'; }).length
    );
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

// ── Helper: extrae ID de YouTube de cualquier URL ──
function _extraerYTId(url) {
    if (!url) return '';
    var m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|watch\?v=|shorts\/))([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
}

// ══════════════════════════════════════════════════════════════════════════════
// RENDERIZADO DEL CATÁLOGO (MIS AVENTURAS)
// ══════════════════════════════════════════════════════════════════════════════
function renderizarCatalogoCompleto() {
    var grid = document.getElementById('gridProductos');
    if (!grid) return;
    grid.innerHTML = '';

    // Filtrar por columna 'categoria' normalizada = 'aventura'
    var items = listaProductos.filter(function(p) {
        return p.categoriaNorm === 'aventura';
    });

    // ORDENAR POR FECHA — más reciente primero
    items.sort(function(a, b) {
        var dateA = new Date(a.fecha);
        var dateB = new Date(b.fecha);
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        return dateB - dateA;
    });

    if (items.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:#8c7565;"><div style="font-size:2rem; margin-bottom:12px;">🌟</div><p style="font-size:1rem; font-weight:600;">Próximamente compartiremos nuevas aventuras.</p></div>';
        return;
    }

    items.forEach(function(p) {
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
// RENDERIZADO SECCIÓN MÚSICA (GRID DE 3 COLUMNAS — iframes embebidos)
// ══════════════════════════════════════════════════════════════════════════════
function renderizarSeccionMusica() {
    var panelMusica = document.getElementById('panelPillMusica');
    if (!panelMusica) return;

    var contenedorMusica = document.getElementById('contenedorMusica');
    if (!contenedorMusica) {
        contenedorMusica = document.createElement('div');
        contenedorMusica.id = 'contenedorMusica';
        panelMusica.appendChild(contenedorMusica);
    }
    contenedorMusica.innerHTML = '';
    contenedorMusica.style.cssText = 'display:grid; grid-template-columns:repeat(3, 1fr); gap:20px; padding:20px;';

    // Filtrar por columna 'categoria' normalizada = 'musica'
    var musicaItems = listaProductos.filter(function(p) {
        return p.categoriaNorm === 'musica';
    });

    // Ordenar: más reciente primero
    musicaItems.sort(function(a, b) {
        var dA = new Date(a.fecha), dB = new Date(b.fecha);
        if (isNaN(dA)) return 1; if (isNaN(dB)) return -1;
        return dB - dA;
    });

    if (musicaItems.length === 0) {
        contenedorMusica.style.display = 'block';
        contenedorMusica.innerHTML = '<p style="text-align:center; width:100%; color:#888; padding:40px 0;">Próximamente agregaremos contenido musical.</p>';
        return;
    }

    musicaItems.forEach(function(p) {
        var card = document.createElement('div');
        card.className = 'card-musica';
        card.style.cssText = 'background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);';

        // Si hay YouTube, embeber iframe; si hay imagen, mostrarla
        if (p.videoYoutube) {
            var ytId = _extraerYTId(p.videoYoutube);
            if (ytId) {
                card.innerHTML = '<div style="position:relative; padding-top:56.25%;"><iframe src="https://www.youtube.com/embed/' + ytId + '?rel=0" style="position:absolute;inset:0;width:100%;height:100%;border:none;" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen loading="lazy"></iframe></div>';
            }
        } else if (p.imagen) {
            card.innerHTML = '<img src="' + p.imagen + '" style="width:100%; aspect-ratio:16/9; object-fit:cover;" onerror="this.parentElement.style.background=\'#d9cfc8\'; this.style.display=\'none\'">';
        }

        // Info: nombre + álbum (columna Categoría = col E = p.enlace que en el sheet es col F... 
        // Pero en música, el album/disco viene en la columna 'seccion' que tiene el texto largo.
        // Revisando el Sheet: "seccion" de música = "A Viajar se ha Dicho" etc.
        var infoDiv = document.createElement('div');
        infoDiv.style.cssText = 'padding:12px 14px;';
        var h3 = document.createElement('h3');
        h3.style.cssText = 'margin:0 0 4px; font-size:15px; color:#362a22; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
        h3.textContent = p.nombre;
        infoDiv.appendChild(h3);

        // Álbum/disco — en col G (seccion) viene el nombre del álbum
        var album = p.seccion || '';
        if (album) {
            var albumP = document.createElement('p');
            albumP.style.cssText = 'margin:0; font-size:12px; color:#8c7565; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
            albumP.innerHTML = '💿 ' + album;
            infoDiv.appendChild(albumP);
        }

        if (p.fecha) {
            var fechaP = document.createElement('p');
            fechaP.style.cssText = 'margin:4px 0 0; font-size:11px; color:#aaa;';
            fechaP.textContent = '📅 ' + p.fecha;
            infoDiv.appendChild(fechaP);
        }

        card.appendChild(infoDiv);
        contenedorMusica.appendChild(card);
    });
}


// ══════════════════════════════════════════════════════════════════════════════
// RENDERIZADO SECCIÓN PROYECTOS (GRID DE 3 — iframes embebidos)
// ══════════════════════════════════════════════════════════════════════════════
function renderizarSeccionProyectos() {
    var panelProyectos = document.getElementById('panelPillProyectos');
    if (!panelProyectos) return;

    var cont = document.getElementById('contenedorProyectos');
    if (!cont) {
        cont = document.createElement('div');
        cont.id = 'contenedorProyectos';
        panelProyectos.appendChild(cont);
    }
    cont.innerHTML = '';
    cont.style.cssText = 'display:grid; grid-template-columns:repeat(3, 1fr); gap:20px; padding:20px;';

    // Filtrar por columna 'categoria' normalizada = 'proyecto'
    var items = listaProductos.filter(function(p) {
        return p.categoriaNorm === 'proyecto';
    });

    items.sort(function(a, b) {
        var dA = new Date(a.fecha), dB = new Date(b.fecha);
        if (isNaN(dA)) return 1; if (isNaN(dB)) return -1;
        return dB - dA;
    });

    if (items.length === 0) {
        cont.style.display = 'block';
        cont.innerHTML = '<p style="text-align:center; color:#888; padding:40px 0;">Próximamente compartiremos nuevos proyectos.</p>';
        return;
    }

    items.forEach(function(p) {
        var card = document.createElement('div');
        card.className = 'card-dinamica';
        card.style.cssText = 'background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);';

        // Si hay YouTube, embeber iframe; si hay imagen, mostrarla
        if (p.videoYoutube) {
            var ytId = _extraerYTId(p.videoYoutube);
            if (ytId) {
                var mediaDiv = document.createElement('div');
                mediaDiv.style.cssText = 'position:relative; padding-top:56.25%;';
                mediaDiv.innerHTML = '<iframe src="https://www.youtube.com/embed/' + ytId + '?rel=0" style="position:absolute;inset:0;width:100%;height:100%;border:none;" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen loading="lazy"></iframe>';
                card.appendChild(mediaDiv);
            }
        } else if (p.imagen) {
            var imgEl = document.createElement('img');
            imgEl.src = p.imagen; imgEl.alt = p.nombre;
            imgEl.style.cssText = 'width:100%; aspect-ratio:16/9; object-fit:cover; display:block;';
            imgEl.onerror = function() { this.style.display='none'; this.parentElement.style.background='#eee'; };
            card.appendChild(imgEl);
        }

        var infoDiv = document.createElement('div');
        infoDiv.style.cssText = 'padding:12px 14px;';
        var h3 = document.createElement('h3');
        h3.style.cssText = 'font-size:15px; margin:5px 0; font-weight:700; color:#362a22;';
        h3.textContent = p.nombre;
        infoDiv.appendChild(h3);
        if (p.fecha) {
            var fechaP = document.createElement('p');
            fechaP.style.cssText = 'font-size:12px; color:#8c7565; margin:2px 0;';
            fechaP.textContent = '📅 ' + p.fecha;
            infoDiv.appendChild(fechaP);
        }
        if (p.descripcion) {
            var descP = document.createElement('p');
            descP.style.cssText = 'font-size:13px; color:#705c4f; margin:4px 0 0; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;';
            descP.textContent = p.descripcion;
            infoDiv.appendChild(descP);
        }
        card.appendChild(infoDiv);
        cont.appendChild(card);
    });
}


// ══════════════════════════════════════════════════════════════════════════════
// CARGA DESDE GOOGLE SHEETS
// ══════════════════════════════════════════════════════════════════════════════
function cargarDesdeGoogleSheets() {
    // URL 1: export directo. URL 2: gviz (fallback si la hoja no está publicada para export)
    var csvUrl = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:csv';
    mostrarEstadoCarga('Cargando contenido...', false);

    fetch(csvUrl)
        .then(function(res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
        })
        .then(function(texto) {
            // Detectar si Google devolvió HTML en lugar de CSV (hoja no publicada)
            if (texto.trim().startsWith('<!DOCTYPE') || texto.trim().startsWith('<html')) {
                throw new Error('La hoja no está publicada. Ve a Archivo → Compartir → Publicar en la web → CSV y vuelve a intentar.');
            }

            var filas = parsearCSV(texto);
            console.log('[Elba] Filas CSV leídas:', filas.length);
            if (filas.length > 1) {
                console.log('[Elba] Encabezados:', filas[0]);
                console.log('[Elba] Primera fila de datos:', filas[1]);
            }

            var productos = csvAProductos(filas);

            if (productos.length === 0) {
                mostrarEstadoCarga('La hoja está vacía o sin datos válidos.', true);
                return;
            }

            listaProductos = productos;

            // Cuadro de diagnóstico visible en pantalla (desaparece en 8s)
            var counts = {
                total:    productos.length,
                musica:   productos.filter(function(p){ return p.categoriaNorm === 'musica'; }).length,
                biografia:productos.filter(function(p){ return p.categoriaNorm === 'biografia'; }).length,
                aventura: productos.filter(function(p){ return p.categoriaNorm === 'aventura'; }).length,
                proyecto: productos.filter(function(p){ return p.categoriaNorm === 'proyecto'; }).length,
                youtube:  productos.filter(function(p){ return p.categoriaNorm === 'youtube'; }).length,
                facebook: productos.filter(function(p){ return p.categoriaNorm === 'facebook'; }).length,
            };
            var diag = document.createElement('div');
            diag.id = 'diagElba';
            diag.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:9999;background:#1a1a2e;color:#fff;padding:14px 18px;border-radius:10px;font-size:13px;line-height:1.8;box-shadow:0 4px 20px rgba(0,0,0,0.4);max-width:300px;';
            diag.innerHTML = '<strong>✅ Hoja conectada</strong><br>' +
                '📦 Total filas: <strong>' + counts.total + '</strong><br>' +
                '🎵 musica: <strong>' + counts.musica + '</strong><br>' +
                '📖 biografia: <strong>' + counts.biografia + '</strong><br>' +
                '🏕 aventura: <strong>' + counts.aventura + '</strong><br>' +
                '🎨 proyecto: <strong>' + counts.proyecto + '</strong><br>' +
                '▶️ youtube (cat directa): <strong>' + counts.youtube + '</strong><br>' +
                '📘 facebook (cat directa): <strong>' + counts.facebook + '</strong><br>' +
                '<small style="opacity:0.6">Desaparece en 8 segundos</small>';
            document.body.appendChild(diag);
            setTimeout(function(){ var d=document.getElementById('diagElba'); if(d) d.remove(); }, 8000);

            var intro = document.getElementById('mis-aventuras-intro');
            if (intro) intro.style.display = 'none';

            renderizarCatalogoCompleto();
            document.dispatchEvent(new CustomEvent('catalogoCargado'));
        })
        .catch(function(err) {
            console.error('[Elba] Error:', err);
            mostrarEstadoCarga('⚠️ ' + err.message, true);
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
    _actualizarBotonesRedModal(videoYT, videoFB, videoIG);

    // Abrir modal
    _actualizarGaleriaModal();
    document.getElementById('modalProducto').classList.add('abierto');
    document.body.style.overflow = 'hidden';
}

function _actualizarBotonesRedModal(yt, fb, ig) {
    var ids = { youtube: 'btnRedYT', facebook: 'btnRedFB', instagram: 'btnRedIG' };
    var links = { youtube: yt, facebook: fb, instagram: ig };
    
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
var _NOMBRES_REDES = { youtube: 'YouTube', facebook: 'Facebook', instagram: 'Instagram' };

function initBotonesRedesBiografia() {
    var btns = {
        youtube:   document.getElementById('btnRedBioYT'), 
        facebook:  document.getElementById('btnRedBioFB'),
        instagram: document.getElementById('btnRedBioIG')
    };
    
    var contenedor = document.getElementById('contenedorVideosRedes');
    if (!contenedor) return;

    Object.keys(btns).forEach(function(red) {
        if (btns[red]) {
            btns[red].addEventListener('click', function() {
                Object.values(btns).forEach(function(b) { if (b) b.classList.remove('activo'); });
                btns[red].classList.add('activo');
                mostrarVideosDeRed(red, contenedor);
            });
        }
    });

    // YouTube seleccionado y desplegado por defecto
    if (btns.youtube) btns.youtube.classList.add('activo');
    mostrarVideosDeRed('youtube', contenedor);
}

function mostrarVideosDeRed(red, contenedor) {
    contenedor.innerHTML = '<p style="text-align:center; padding:20px;">Cargando publicaciones...</p>';
    contenedor.style.display = 'block';

    // Texto dinámico
    var textoInfo = document.getElementById('textoRedActiva');
    if (textoInfo) {
        textoInfo.textContent = 'Estás viendo las publicaciones de ' + (_NOMBRES_REDES[red] || red) + ' de Elba Rodríguez';
    }

    // Filtrar: categoria normalizada = 'biografia' Y enlace = 'youtube'/'facebook'/'instagram'
    // O bien: categoria normalizada = 'youtube'/'facebook'/'instagram' directamente
    var redNorm = _normalizar(red);
    var videos = listaProductos.filter(function(p) {
        // Caso 1: categoria='biografia' y enlace='youtube' (estructura actual del Sheet)
        if (p.categoriaNorm === 'biografia' && _normalizar(p.enlace) === redNorm) return true;
        // Caso 2: categoria='youtube'/'facebook'/'instagram' directamente
        if (p.categoriaNorm === redNorm) return true;
        return false;
    });

    if (videos.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center; padding:30px 20px; color:#888; font-size:0.95rem;">No hay publicaciones de ' + (_NOMBRES_REDES[red] || red) + ' registradas aún.</p>';
        return;
    }

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; padding:16px 0;';
    
    videos.forEach(function(v) {
        var card = document.createElement('div');
        card.style.cssText = 'background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);';

        // Col B contiene la URL de YouTube para las entradas de biografía
        var ytId = _extraerYTId(v.videoYoutube || v.imagen || '');

        if (red === 'youtube' && ytId) {
            // Iframe embebido directo
            var iframeWrap = document.createElement('div');
            iframeWrap.style.cssText = 'position:relative; padding-top:56.25%;';
            iframeWrap.innerHTML = '<iframe src="https://www.youtube.com/embed/' + ytId + '?rel=0" style="position:absolute;inset:0;width:100%;height:100%;border:none;" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen loading="lazy"></iframe>';
            card.appendChild(iframeWrap);
        } else if (v.imagen) {
            var img = document.createElement('img');
            img.src = v.imagen;
            img.alt = v.nombre;
            img.style.cssText = 'width:100%; aspect-ratio:16/9; object-fit:cover; display:block;';
            img.onerror = function() { this.parentElement.style.background='#eee'; this.style.display='none'; };
            card.appendChild(img);
        } else {
            var placeholder = document.createElement('div');
            placeholder.style.cssText = 'width:100%; aspect-ratio:16/9; background:#f0ece8; display:flex; align-items:center; justify-content:center; font-size:2rem;';
            placeholder.textContent = '🎥';
            card.appendChild(placeholder);
        }

        var infoDiv = document.createElement('div');
        infoDiv.style.cssText = 'padding:10px;';
        infoDiv.innerHTML = '<strong style="font-size:0.85rem; color:#362a22; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + v.nombre + '</strong>';
        if (v.fecha) {
            infoDiv.innerHTML += '<span style="font-size:0.75rem; color:#aaa;">📅 ' + v.fecha + '</span>';
        }
        card.appendChild(infoDiv);
        
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
        catalogo.style.display = (cual === 'aventuras') ? 'block' : 'none';
    }

    // Si es Música, renderizamos su sección especial
    if (cual === 'musica') {
        renderizarSeccionMusica();
    }

    // Si es Proyectos, renderizamos su sección
    if (cual === 'proyectos') {
        if (typeof listaProductos !== 'undefined' && listaProductos.length > 0) {
            renderizarSeccionProyectos();
        }
    }

    // Si es Biografía, inicializar YouTube por defecto si ya cargaron los datos
    if (cual === 'biografia') {
        if (typeof listaProductos !== 'undefined' && listaProductos.length > 0) {
            var cont = document.getElementById('contenedorVideosRedes');
            var ytBtn = document.getElementById('btnRedBioYT');
            if (cont && ytBtn && !ytBtn.classList.contains('activo')) {
                ['btnRedBioYT','btnRedBioFB','btnRedBioIG'].forEach(function(id) {
                    var b = document.getElementById(id); if (b) b.classList.remove('activo');
                });
                ytBtn.classList.add('activo');
                mostrarVideosDeRed('youtube', cont);
            }
        }
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