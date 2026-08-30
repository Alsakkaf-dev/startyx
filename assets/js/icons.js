/* ============================================================================
   ONYX ERP — مجموعة الأيقونات (SVG مضمّن، نمط خطي 24×24)
   الاستخدام:  OnyxIcons.svg("package", {size:20, cls:"ico"})
   ========================================================================== */
(function (root) {
  "use strict";

  /* كل قيمة = محتوى <svg> الداخلي. النمط: stroke=currentColor, fill=none */
  var P = {
    /* ---------- عناصر الواجهة ---------- */
    home:        '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
    search:      '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    sun:         '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5 3.5 3.5M20.5 20.5 19 19M19 5l1.5-1.5M3.5 20.5 5 19"/>',
    moon:        '<path d="M20 14.5A8 8 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>',
    user:        '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5"/>',
    chevronDown: '<path d="m5 9 7 7 7-7"/>',
    chevronLeft: '<path d="m14 6-6 6 6 6"/>',
    star:        '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
    starFill:    '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" fill="currentColor" stroke="none"/>',
    folder:      '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2h8.5A1.5 1.5 0 0 1 21 9.5V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18Z"/>',
    file:        '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',
    dot:         '<circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/>',
    close:       '<path d="M6 6l12 12M18 6 6 18"/>',
    command:     '<path d="M9 7.5A2.5 2.5 0 1 1 6.5 10H9zM15 7.5A2.5 2.5 0 1 0 17.5 10H15zM9 16.5A2.5 2.5 0 1 0 6.5 14H9zM15 16.5A2.5 2.5 0 1 1 17.5 14H15z"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
    grid:        '<rect x="3.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.4"/>',
    list:        '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    clock:       '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    sparkle:     '<path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3z"/><path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    menu:        '<path d="M4 7h16M4 12h16M4 17h16"/>',
    panel:       '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M14.5 4.5v15"/>',
    check:       '<path d="m5 12.5 4.5 4.5L19 7"/>',
    plus:        '<path d="M12 5v14M5 12h14"/>',
    printer:     '<path d="M7 9V3h10v6"/><path d="M7 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7" rx="1"/>',
    settings:    '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18 6l-2 2M8 16l-2 2M18 18l-2-2M8 8 6 6"/>',
    arrowRight:  '<path d="M5 12h14M13 6l6 6-6 6"/>',
    external:    '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    layers:      '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5M3 17l9 5 9-5"/>',
    info:        '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
    hash:        '<path d="M9 4 7 20M17 4l-2 16M5 9h15M4 15h15"/>',
    corner:      '<path d="M9 4v10a2 2 0 0 0 2 2h9"/><path d="m16 12 4 4-4 4"/>',

    /* ---------- أيقونات الأنظمة ---------- */
    sliders:     '<path d="M4 8h10M18 8h2M4 16h4M12 16h8"/><circle cx="16" cy="8" r="2.2"/><circle cx="10" cy="16" r="2.2"/>',
    shield:      '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
    landmark:    '<path d="M3.5 9 12 4l8.5 5M4 9h16M5 20h14M6 9v11M18 9v11M10 9v11M14 9v11M3.5 20h17"/>',
    users:       '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c1-3 3.2-4.5 5.5-4.5S13.5 16 14.5 19"/><path d="M16 5.2A3 3 0 0 1 16 11M17.5 19c-.4-2-1.3-3.4-2.6-4.2 2-.7 4.4.3 5.6 4.2"/>',
    building:    '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10.5 21v-3h3v3"/>',
    package:     '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 21v-9"/><path d="m8 5.2 8 4.6"/>',
    truck:       '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
    cart:        '<circle cx="9" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/><path d="M3 4h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.3h8.6a1.5 1.5 0 0 0 1.5-1.2L21 8H6"/>',
    receipt:     '<path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2 -1.5V3Z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    wrench:      '<path d="M14.5 6a4 4 0 0 0-5.3 4.7l-5.4 5.4a2 2 0 1 0 2.8 2.8l5.4-5.4A4 4 0 0 0 18 8.5l-2.6 2.6-2-2z"/>',
    chart:       '<path d="M4 4v16h16"/><path d="M8 15v-3M12 15V8M16 15v-6M20 15V6"/>',
    book:        '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 1 6.5 18H19v3H6.5A1.5 1.5 0 0 1 5 19.5z"/>',
    'check-double':'<path d="m3 12 4 4 7-9M13 16l1 1 7-9"/>',
    diagram:     '<rect x="9" y="3" width="6" height="4.5" rx="1"/><rect x="3.5" y="16.5" width="6" height="4.5" rx="1"/><rect x="14.5" y="16.5" width="6" height="4.5" rx="1"/><path d="M12 7.5v4M12 11.5H6.5v5M12 11.5h5.5v5"/>',
    'id-badge':  '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3"/><circle cx="12" cy="11" r="2.3"/><path d="M8.5 17c.7-1.8 2-2.5 3.5-2.5s2.8.7 3.5 2.5"/>',
    cog:         '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M18.4 18.4l-2.1-2.1M7.7 7.7 5.6 5.6"/>',
    'badge-check':'<path d="m12 3 2 2 3-.4.4 3 2 2-2 2 .4 3-3 .4-2 2-2-2-3 .4-.4-3-2-2 2-2L7 4.6 10 5z"/><path d="m9.5 12 1.8 1.8L15 10"/>',
  };

  function svg(name, opts) {
    opts = opts || {};
    var body = P[name] || P.dot;
    var size = opts.size || 22;
    var sw = opts.stroke || 1.75;
    var cls = opts.cls ? ' class="' + opts.cls + '"' : "";
    return '<svg' + cls + ' width="' + size + '" height="' + size + '" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="' + sw + '" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  }

  root.OnyxIcons = { svg: svg, has: function (n) { return !!P[n]; } };
})(window);
