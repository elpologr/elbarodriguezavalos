// ============================================================
// ELBA RODRÍGUEZ AVALÓS — app.js
// Versión con nueva estructura de columnas + submenú modal
// Columnas: Nombre | imagen | enlace | Descripcion | fecha | categoria | boton | seccion
// ============================================================

function _ready(fn) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn);
    } else {
        fn();
    }
}

// ══════════════════════════════════════════════════════════════
// CONFIGURACIÓN GOOGLE SHEETS
// ══════════════════════════════════════════════════════════════
var SHEET_ID = '1syFSE4GiAfmvEslC038srzJyqJGMJ9AEpbUdnNgBtyE';
var listaProductos = [];

// COLUMNAS DEL SHEET (nueva estructura):
// A (0): Nombre
// B (1): imagen        ← URL de imgbb (solo imagen, sin video)
// C (2): enlace        ← URL de YouTube, Facebook o Instagram
// D (3): Descripcion
// E (4): fecha
// F (5): categoria     ← 'musica', 'aventura', 'proyecto', 'biografia' / 'youtube'/'facebook'/'instagram'
// G (6): boton         ← texto del botón (ej: "Ver video", "Ver foto")
// H (7): seccion       ← subsección / álbum / agrupación

// ── Parser de CSV robusto ──
function parsearCSV(texto) {
    var lineas = [];
    var filaActual = [];
    var campoActual = '';
    var dentroDeComillas = false;
    for (var i = 0; i < texto.length; i++) {
        var c = texto[i];
        if (c === '"') {
            if (dentroDeComillas && texto[i + 1] === '"') {
                campoActual += '"'; i++;
            } else {
                dentroDeComillas = !dentroDeComillas;
            }
        } else if (c === ',' && !dentroDeComillas) {
            filaActual.push(campoActual.trim());
            campoActual = '';
        } else if ((c === '\n' || c === '\r') && !dentroDeComillas) {
            if (c === '\r' && texto[i + 1] === '\n') i++;
            filaActual.push(campoActual.trim());
            if (filaActual.some(function(f) { return f !== ''; })) lineas.push(filaActual);
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

// ── Convierte filas CSV → objetos con la nueva estructura ──
function csvAProductos(filas) {
    if (filas.length < 2) return [];
    var productos = [];
    for (var i = 1; i < filas.length; i++) {
        var f = filas[i];
        var get = function(idx) { return (f[idx] || '').trim(); };
        if (!get(0)) continue;

        var imagen  = get(1);  // imgbb URL
        var enlace  = get(2);  // YouTube / Facebook / Instagram URL
        var categoriaBruta = get(5);
        var categoriaNorm  = _normalizar(categoriaBruta);

        // Detectar tipo de enlace
        var enlaceNorm = _normalizar(enlace);
        var esYoutube   = enlace && (enlace.includes('youtube.com') || enlace.includes('youtu.be'));
        var esFacebook  = enlace && enlace.includes('facebook.com');
        var esInstagram = enlace && enlace.includes('instagram.com');

        // Para YouTube extraemos la thumbnail si no hay imagen imgbb
        var ytId = esYoutube ? _extraerYTId(enlace) : '';
        var imgFinal = imagen || (ytId ? 'https://img.youtube.com/vi/' + ytId + '/hqdefault.jpg' : '');

        productos.push({
            id:            i,
            nombre:        get(0),
            imagen:        imgFinal,
            enlace:        enlace,
            descripcion:   get(3),
            fecha:         get(4),
            categoria:     categoriaBruta,
            categoriaNorm: categoriaNorm,
            boton:         get(6) || (esYoutube ? 'Ver video' : esInstagram ? 'Ver en Instagram' : esFacebook ? 'Ver en Facebook' : 'Ver'),
            seccion:       get(7),
            ytId:          ytId,
            esYoutube:     esYoutube,
            esFacebook:    esFacebook,
            esInstagram:   esInstagram
        });
    }
    console.log('[Elba] Productos cargados:', productos.length);
    return productos;
}

// ── Mostrar estado de carga ──
function mostrarEstadoCarga(mensaje, esError) {
    var grid = document.getElementById('gridProductos');
    if (!grid) return;
    grid.innerHTML =
        '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:' +
        (esError ? '#c0392b' : '#8c7565') + ';">' +
        '<div style="font-size:2rem;margin-bottom:12px;">' + (esError ? '⚠️' : '⏳') + '</div>' +
        '<p style="font-size:1rem;font-weight:600;">' + mensaje + '</p>' +
        (esError ? '<p style="font-size:0.85rem;color:#999;margin-top:8px;">Revisa la hoja de cálculo.</p>' : '') +
        '</div>';
}

// ── Helper: extrae ID de YouTube ──
function _extraerYTId(url) {
    if (!url) return '';
    var m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|watch\?v=|shorts\/))([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
}


// ══════════════════════════════════════════════════════════════
// SUBMENÚ MODAL UNIFICADO
// Se usa para todas las secciones: aventuras, música, proyectos, biografía
// ══════════════════════════════════════════════════════════════
(function() {
    var overlay, caja, modalImg, modalVideoWrap, modalTitulo, modalFecha,
        modalDesc, modalBtn, modalBtnContainer;

    function _crearModal() {
        overlay = document.createElement('div');
        overlay.id = 'submenuModal';
        overlay.style.cssText = [
            'display:none;position:fixed;inset:0;z-index:9000;',
            'background:rgba(0,0,0,0.85);backdrop-filter:blur(6px);',
            'align-items:flex-end;justify-content:center;',
            'padding:0;box-sizing:border-box;'
        ].join('');

        caja = document.createElement('div');
        caja.style.cssText = [
            'position:relative;width:100%;max-width:600px;',
            'background:#fff;border-radius:20px 20px 0 0;',
            'overflow:hidden;max-height:90vh;overflow-y:auto;',
            'box-shadow:0 -8px 40px rgba(0,0,0,0.3);',
            'animation:slideUpModal 0.3s ease;'
        ].join('');

        // Barra de arrastre visual
        var handle = document.createElement('div');
        handle.style.cssText = 'width:40px;height:4px;background:#ddd;border-radius:2px;margin:12px auto 0;';
        caja.appendChild(handle);

        // Botón cerrar
        var btnX = document.createElement('button');
        btnX.textContent = '✕';
        btnX.style.cssText = 'position:absolute;top:12px;right:16px;background:rgba(0,0,0,0.08);border:none;color:#333;font-size:16px;width:32px;height:32px;border-radius:50%;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;line-height:1;';
        btnX.addEventListener('click', cerrarSubmenuModal);
        caja.appendChild(btnX);

        // Zona de media (imagen o placeholder de video)
        var mediaZona = document.createElement('div');
        mediaZona.style.cssText = 'position:relative;width:100%;aspect-ratio:16/9;background:#111;overflow:hidden;margin-top:8px;';

        // Imagen
        modalImg = document.createElement('img');
        modalImg.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        modalImg.onerror = function() { this.style.display='none'; };
        mediaZona.appendChild(modalImg);

        // Overlay de play (para videos)
        modalVideoWrap = document.createElement('div');
        modalVideoWrap.id = 'submenuVideoWrap';
        modalVideoWrap.style.cssText = 'display:none;position:absolute;inset:0;';
        mediaZona.appendChild(modalVideoWrap);

        // Botón de play centrado
        var playOverlay = document.createElement('div');
        playOverlay.id = 'submenuPlayBtn';
        playOverlay.style.cssText = [
            'display:none;position:absolute;top:50%;left:50%;',
            'transform:translate(-50%,-50%);',
            'width:64px;height:64px;background:rgba(255,0,0,0.9);',
            'border-radius:50%;cursor:pointer;',
            'display:none;align-items:center;justify-content:center;',
            'box-shadow:0 4px 20px rgba(0,0,0,0.5);',
            'transition:transform 0.2s,background 0.2s;'
        ].join('');
        playOverlay.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>';
        playOverlay.addEventListener('mouseenter', function() {
            this.style.transform='translate(-50%,-50%) scale(1.1)';
            this.style.background='rgba(200,0,0,1)';
        });
        playOverlay.addEventListener('mouseleave', function() {
            this.style.transform='translate(-50%,-50%)';
            this.style.background='rgba(255,0,0,0.9)';
        });
        mediaZona.appendChild(playOverlay);

        caja.appendChild(mediaZona);

        // Info inferior
        var infoZona = document.createElement('div');
        infoZona.style.cssText = 'padding:20px 20px 28px;';

        modalTitulo = document.createElement('h2');
        modalTitulo.style.cssText = 'margin:0 0 6px;font-size:18px;font-weight:700;color:#362a22;line-height:1.3;padding-right:30px;';
        infoZona.appendChild(modalTitulo);

        modalFecha = document.createElement('p');
        modalFecha.style.cssText = 'margin:0 0 12px;font-size:13px;color:#8c7565;';
        infoZona.appendChild(modalFecha);

        modalDesc = document.createElement('p');
        modalDesc.style.cssText = 'margin:0 0 20px;font-size:14px;color:#5a4a40;line-height:1.65;';
        infoZona.appendChild(modalDesc);

        // Botón de acción
        modalBtnContainer = document.createElement('div');
        modalBtnContainer.style.cssText = 'display:none;';

        modalBtn = document.createElement('a');
        modalBtn.target = '_blank';
        modalBtn.rel = 'noopener noreferrer';
        modalBtn.style.cssText = [
            'display:inline-flex;align-items:center;gap:8px;',
            'background:#c0392b;color:#fff;padding:11px 22px;',
            'border-radius:24px;font-size:14px;font-weight:700;',
            'text-decoration:none;transition:background 0.2s;'
        ].join('');
        modalBtn.addEventListener('mouseenter', function() { this.style.background='#a93226'; });
        modalBtn.addEventListener('mouseleave', function() { this.style.background='#c0392b'; });
        modalBtnContainer.appendChild(modalBtn);
        infoZona.appendChild(modalBtnContainer);

        caja.appendChild(infoZona);
        overlay.appendChild(caja);

        // Cerrar al click en el fondo
        overlay.addEventListener('click', function(e) { if (e.target === overlay) cerrarSubmenuModal(); });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') cerrarSubmenuModal();
        });

        // Inyectar animación CSS
        var style = document.createElement('style');
        style.textContent = '@keyframes slideUpModal{from{transform:translateY(100%)}to{transform:translateY(0)}}';
        document.head.appendChild(style);

        _ready(function() { document.body.appendChild(overlay); });
    }

    // ── Abrir el submenú con datos de un producto ──
    window.abrirSubmenuModal = function(p) {
        if (!overlay) _crearModal();

        var playBtn = document.getElementById('submenuPlayBtn');
        var videoWrap = document.getElementById('submenuVideoWrap');

        // Reset
        videoWrap.innerHTML = '';
        videoWrap.style.display = 'none';
        modalImg.style.display = 'block';
        if (playBtn) playBtn.style.display = 'none';

        // Imagen
        if (p.imagen) {
            modalImg.src = p.imagen;
            modalImg.style.display = 'block';
        } else {
            modalImg.style.display = 'none';
        }

        // Si tiene enlace de video → mostrar play overlay
        if (p.enlace && (p.esYoutube || p.esFacebook || p.esInstagram)) {
            if (playBtn) {
                playBtn.style.display = 'flex';
                playBtn.onclick = function() {
                    _reproducirEnModal(p, videoWrap, playBtn);
                };
            }
        }

        // Texto
        modalTitulo.textContent = p.nombre || '';
        modalFecha.textContent  = p.fecha ? '📅 ' + p.fecha : '';
        modalFecha.style.display = p.fecha ? '' : 'none';
        modalDesc.textContent   = p.descripcion || '';
        modalDesc.style.display = p.descripcion ? '' : 'none';

        // Botón de acción
        if (p.enlace) {
            var textoBoton = p.boton || 'Ver';
            var icono = p.esYoutube
                ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>'
                : p.esFacebook
                    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>'
                    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>';

            modalBtn.href = p.enlace;
            modalBtn.innerHTML = icono + ' ' + textoBoton;
            modalBtnContainer.style.display = 'block';
        } else {
            modalBtnContainer.style.display = 'none';
        }

        // Mostrar
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };

    // ── Reproduce inline dentro del modal al presionar play ──
    function _reproducirEnModal(p, videoWrap, playBtn) {
        if (p.esYoutube && p.ytId) {
            var iframe = document.createElement('iframe');
            iframe.src = 'https://www.youtube.com/embed/' + p.ytId + '?autoplay=1&rel=0&modestbranding=1';
            iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;';
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            iframe.allowFullscreen = true;
            videoWrap.appendChild(iframe);
            videoWrap.style.cssText = 'display:block;position:absolute;inset:0;background:#000;';
            modalImg.style.display = 'none';
            playBtn.style.display = 'none';
        } else if (p.esFacebook || p.esInstagram) {
            // Para FB/IG abrir en pestaña nueva (no se pueden embeber sin SDK)
            window.open(p.enlace, '_blank', 'noopener,noreferrer');
        }
    }

    window.cerrarSubmenuModal = function() {
        if (!overlay) return;
        var videoWrap = document.getElementById('submenuVideoWrap');
        if (videoWrap) { videoWrap.innerHTML = ''; videoWrap.style.display = 'none'; }
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    };

    // Pre-crear al cargar
    _ready(_crearModal);
})();


// ══════════════════════════════════════════════════════════════
// FUNCIÓN GENÉRICA PARA CREAR CARDS (usada en todas las secciones)
// ══════════════════════════════════════════════════════════════
function _crearCard(p) {
    var card = document.createElement('div');
    card.className = 'card-dinamica';
    card.style.cssText = 'background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;display:flex;flex-direction:column;';

    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-3px)';
        this.style.boxShadow = '0 8px 20px rgba(0,0,0,0.13)';
    });
    card.addEventListener('mouseleave', function() {
        this.style.transform = '';
        this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
    });

    // Zona de media
    var mediaWrap = document.createElement('div');
    mediaWrap.style.cssText = 'position:relative;aspect-ratio:16/9;background:#1a1a1a;overflow:hidden;flex-shrink:0;';

    // Imagen (de imgbb o thumbnail de YT)
    if (p.imagen) {
        var img = document.createElement('img');
        img.src = p.imagen;
        img.alt = p.nombre;
        img.loading = 'lazy';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;transition:transform 0.35s;';
        img.onerror = function() { this.style.display='none'; this.parentElement.style.background='#f0ece8'; };
        card.addEventListener('mouseenter', function() { img.style.transform='scale(1.05)'; });
        card.addEventListener('mouseleave', function() { img.style.transform=''; });
        mediaWrap.appendChild(img);
    }

    // Botón de play si hay enlace de video
    if (p.enlace && (p.esYoutube || p.esFacebook || p.esInstagram)) {
        var playBtn = document.createElement('div');
        var color = p.esYoutube ? 'rgba(255,0,0,0.9)' : p.esFacebook ? 'rgba(24,119,242,0.9)' : 'rgba(193,53,132,0.9)';
        playBtn.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:48px;height:48px;background:' + color + ';border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.4);transition:transform 0.2s,background 0.2s;pointer-events:none;';
        playBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>';
        mediaWrap.appendChild(playBtn);
    }

    card.appendChild(mediaWrap);

    // Info
    var info = document.createElement('div');
    info.style.cssText = 'padding:12px 14px;flex-grow:1;display:flex;flex-direction:column;gap:4px;';

    var h3 = document.createElement('h3');
    h3.style.cssText = 'margin:0;font-size:15px;font-weight:700;color:#362a22;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.3;';
    h3.textContent = p.nombre;
    info.appendChild(h3);

    if (p.seccion) {
        var secP = document.createElement('p');
        secP.style.cssText = 'margin:0;font-size:12px;color:#8c7565;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        secP.textContent = '💿 ' + p.seccion;
        info.appendChild(secP);
    }

    if (p.fecha) {
        var fechaP = document.createElement('p');
        fechaP.style.cssText = 'margin:0;font-size:11px;color:#aaa;';
        fechaP.textContent = '📅 ' + p.fecha;
        info.appendChild(fechaP);
    }

    if (p.boton && p.enlace) {
        var btnTexto = document.createElement('p');
        btnTexto.style.cssText = 'margin:6px 0 0;font-size:12px;color:#c0392b;font-weight:700;';
        btnTexto.textContent = p.boton + ' →';
        info.appendChild(btnTexto);
    }

    card.appendChild(info);

    // Click → submenú modal
    card.addEventListener('click', function() {
        window.abrirSubmenuModal(p);
    });

    return card;
}

function _sortPorFecha(items) {
    return items.sort(function(a, b) {
        var dA = new Date(a.fecha), dB = new Date(b.fecha);
        if (isNaN(dA)) return 1; if (isNaN(dB)) return -1;
        return dB - dA;
    });
}


// ══════════════════════════════════════════════════════════════
// RENDERIZADO — MIS AVENTURAS
// ══════════════════════════════════════════════════════════════
function renderizarCatalogoCompleto() {
    var grid = document.getElementById('gridProductos');
    if (!grid) return;
    grid.innerHTML = '';

    var items = _sortPorFecha(listaProductos.filter(function(p) {
        return p.categoriaNorm === 'aventura';
    }));

    if (items.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#8c7565;"><div style="font-size:2rem;margin-bottom:12px;">🌟</div><p style="font-size:1rem;font-weight:600;">Próximamente compartiremos nuevas aventuras.</p></div>';
        return;
    }

    items.forEach(function(p) {
        grid.appendChild(_crearCard(p));
    });
}


// ══════════════════════════════════════════════════════════════
// RENDERIZADO — MÚSICA
// ══════════════════════════════════════════════════════════════
function renderizarSeccionMusica() {
    var panel = document.getElementById('panelPillMusica');
    if (!panel) return;

    var cont = document.getElementById('contenedorMusica');
    if (!cont) {
        cont = document.createElement('div');
        cont.id = 'contenedorMusica';
        panel.appendChild(cont);
    }
    if (cont.childElementCount > 0) return;

    cont.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:20px;padding:20px;';

    var items = _sortPorFecha(listaProductos.filter(function(p) {
        return p.categoriaNorm === 'musica';
    }));

    if (items.length === 0) {
        cont.style.display = 'block';
        cont.innerHTML = '<p style="text-align:center;color:#888;padding:40px 0;">Próximamente agregaremos contenido musical.</p>';
        return;
    }

    items.forEach(function(p) { cont.appendChild(_crearCard(p)); });
}


// ══════════════════════════════════════════════════════════════
// RENDERIZADO — PROYECTOS
// ══════════════════════════════════════════════════════════════
function renderizarSeccionProyectos() {
    var panel = document.getElementById('panelPillProyectos');
    if (!panel) return;

    var cont = document.getElementById('contenedorProyectos');
    if (!cont) {
        cont = document.createElement('div');
        cont.id = 'contenedorProyectos';
        panel.appendChild(cont);
    }
    if (cont.childElementCount > 0) return;

    cont.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:20px;padding:20px;';

    var items = _sortPorFecha(listaProductos.filter(function(p) {
        return p.categoriaNorm === 'proyecto';
    }));

    if (items.length === 0) {
        cont.style.display = 'block';
        cont.innerHTML = '<p style="text-align:center;color:#888;padding:40px 0;">Próximamente compartiremos nuevos proyectos.</p>';
        return;
    }

    items.forEach(function(p) { cont.appendChild(_crearCard(p)); });
}


// ══════════════════════════════════════════════════════════════
// RENDERIZADO — BIOGRAFÍA (redes sociales)
// ══════════════════════════════════════════════════════════════
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

    if (btns.youtube) btns.youtube.classList.add('activo');
    mostrarVideosDeRed('youtube', contenedor);
}

function mostrarVideosDeRed(red, contenedor) {
    contenedor.innerHTML = '<p style="text-align:center;padding:20px;">Cargando publicaciones...</p>';
    contenedor.style.display = 'block';

    var textoInfo = document.getElementById('textoRedActiva');
    if (textoInfo) {
        textoInfo.textContent = 'Estás viendo las publicaciones de ' + (_NOMBRES_REDES[red] || red) + ' de Elba Rodríguez';
    }

    var redNorm = _normalizar(red);
    var videos = listaProductos.filter(function(p) {
        // Caso 1: categoria='biografia' y el enlace es de esa red
        if (p.categoriaNorm === 'biografia') {
            if (red === 'youtube'   && p.esYoutube)   return true;
            if (red === 'facebook'  && p.esFacebook)  return true;
            if (red === 'instagram' && p.esInstagram) return true;
        }
        // Caso 2: categoria = nombre de la red directamente
        if (p.categoriaNorm === redNorm) return true;
        return false;
    });

    if (videos.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center;padding:30px 20px;color:#888;font-size:0.95rem;">No hay publicaciones de ' + (_NOMBRES_REDES[red] || red) + ' registradas aún.</p>';
        return;
    }

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:16px 0;';
    videos.forEach(function(v) { grid.appendChild(_crearCard(v)); });

    contenedor.innerHTML = '';
    contenedor.appendChild(grid);
}

document.addEventListener('catalogoCargado', initBotonesRedesBiografia);


// ══════════════════════════════════════════════════════════════
// FAVORITOS
// ══════════════════════════════════════════════════════════════
var favoritos = (JSON.parse(localStorage.getItem('elba-favoritos') || '[]')).map(Number);
function _guardarFavoritos() { localStorage.setItem('elba-favoritos', JSON.stringify(favoritos)); }
function toggleLike(productoIdx, btn) {
    var idx = parseInt(productoIdx);
    if (isNaN(idx)) return;
    var pos = favoritos.indexOf(idx);
    var esFav = pos === -1;
    if (esFav) favoritos.push(idx); else favoritos.splice(pos, 1);
    _guardarFavoritos();
    if (btn) { btn.textContent = esFav ? '❤️' : '🤍'; btn.classList.toggle('liked', esFav); }
}


// ══════════════════════════════════════════════════════════════
// MODO OSCURO
// ══════════════════════════════════════════════════════════════
function toggleModoOscuro() {
    document.body.classList.toggle('modo-oscuro');
    localStorage.setItem('elba-modo-oscuro', document.body.classList.contains('modo-oscuro') ? '1' : '0');
}
if (localStorage.getItem('elba-modo-oscuro') !== '0') {
    document.body.classList.add('modo-oscuro');
}


// ══════════════════════════════════════════════════════════════
// PILL NAV
// ══════════════════════════════════════════════════════════════
var _pillBtns   = { biografia:'pillBiografia', musica:'pillMusica', proyectos:'pillProyectos', aventuras:'pillAventuras' };
var _pillPanels = { biografia:'panelPillBiografia', musica:'panelPillMusica', proyectos:'panelPillProyectos', aventuras:'panelPillAventuras' };

function activarPill(cual) {
    Object.values(_pillBtns).forEach(function(id) {
        var el = document.getElementById(id); if (el) el.classList.remove('activo');
    });
    Object.values(_pillPanels).forEach(function(id) {
        var el = document.getElementById(id); if (el) el.classList.remove('activo');
    });

    var btnEl = document.getElementById(_pillBtns[cual]);
    if (btnEl) btnEl.classList.add('activo');
    var panelEl = document.getElementById(_pillPanels[cual]);
    if (panelEl) panelEl.classList.add('activo');

    var catalogo = document.getElementById('zona-catalogo');
    if (catalogo) catalogo.style.display = (cual === 'aventuras') ? 'block' : 'none';

    if (cual === 'musica') renderizarSeccionMusica();
    if (cual === 'proyectos' && listaProductos.length > 0) renderizarSeccionProyectos();
    if (cual === 'biografia' && listaProductos.length > 0) {
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

_ready(function() {
    ['biografia','musica','proyectos','aventuras'].forEach(function(key) {
        var btn = document.getElementById(_pillBtns[key]);
        if (btn) btn.addEventListener('click', function() { activarPill(key); });
    });
    activarPill('biografia');
});


// ══════════════════════════════════════════════════════════════
// CARGA DESDE GOOGLE SHEETS
// ══════════════════════════════════════════════════════════════
function cargarDesdeGoogleSheets() {
    var csvUrl = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:csv';
    mostrarEstadoCarga('Cargando contenido...', false);

    fetch(csvUrl)
        .then(function(res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
        })
        .then(function(texto) {
            if (texto.trim().startsWith('<!DOCTYPE') || texto.trim().startsWith('<html')) {
                throw new Error('La hoja no está publicada. Ve a Archivo → Compartir → Publicar en la web → CSV.');
            }
            var filas = parsearCSV(texto);
            console.log('[Elba] Filas CSV:', filas.length);
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
            console.log('[Elba] ✅ Total:', productos.length,
                '| musica:', productos.filter(function(p){ return p.categoriaNorm==='musica'; }).length,
                '| biografia:', productos.filter(function(p){ return p.categoriaNorm==='biografia'; }).length,
                '| aventura:', productos.filter(function(p){ return p.categoriaNorm==='aventura'; }).length,
                '| proyecto:', productos.filter(function(p){ return p.categoriaNorm==='proyecto'; }).length
            );

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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cargarDesdeGoogleSheets);
} else {
    cargarDesdeGoogleSheets();
}

// ══════════════════════════════════════════════════════════════
// MODAL DE PRODUCTO LEGACY (por compatibilidad con index.html)
// Las funciones antiguas redirigen al nuevo submenú modal
// ══════════════════════════════════════════════════════════════
function abrirModalProducto(card) {
    // Construir objeto producto desde atributos data-* de la card
    var nombre    = card.getAttribute('data-nombre') || '';
    var descripcion = card.getAttribute('data-descripcion') || '';
    var fecha     = card.getAttribute('data-fecha') || '';
    var videoYT   = card.getAttribute('data-video-youtube') || '';
    var imgSrc    = '';
    var imgEl = card.querySelector('img');
    if (imgEl) imgSrc = imgEl.getAttribute('src') || '';

    var ytId = _extraerYTId(videoYT);

    window.abrirSubmenuModal({
        nombre: nombre,
        imagen: imgSrc,
        enlace: videoYT || '',
        descripcion: descripcion,
        fecha: fecha,
        boton: videoYT ? 'Ver en YouTube' : '',
        ytId: ytId,
        esYoutube: !!videoYT,
        esFacebook: false,
        esInstagram: false,
        seccion: ''
    });
}

function cerrarModalProducto() { window.cerrarSubmenuModal(); }

// Stubs de galería (ya no se necesitan con el nuevo modal)
var galeriaImagenes = [];
var galeriaIndice = 0;
function irASlide(i) {}
function actualizarNavegacion() {}
function renderizarGaleria() {}
function abrirZoomGaleria(i) {}
function cerrarZoomGaleria() {}
function zoomNavegar(dir) {}
function actualizarZoom() {}
