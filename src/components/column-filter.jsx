// column-filter.jsx -> window.ColumnFilter
// REQ 1.1-1.3 (01/07): filtros estilo Google Sheets nos headers de tabela.
// Multi-select, busca de texto, contagem por valor, persistencia localStorage.
(function () {
  // REQ 1.5 (01/07): persistencia de filtros em localStorage por tela
  function loadFilters(screenKey) {
    try { return JSON.parse(localStorage.getItem("painel_colf_" + screenKey) || "{}"); }
    catch { return {}; }
  }
  function saveFilters(screenKey, filters) {
    localStorage.setItem("painel_colf_" + screenKey, JSON.stringify(filters));
  }

  // REQ 1.1 (01/07): hook de filtros por coluna, retorna estado e dispatch
  function useColumnFilters(screenKey) {
    const [filters, setFiltersState] = React.useState(function () { return loadFilters(screenKey); });
    var setFilters = function (next) {
      var val = typeof next === "function" ? next(filters) : next;
      setFiltersState(val);
      saveFilters(screenKey, val);
    };
    var setColumnFilter = function (colKey, selected) {
      setFilters(function (prev) {
        var copy = Object.assign({}, prev);
        if (!selected || selected.length === 0) { delete copy[colKey]; }
        else { copy[colKey] = selected; }
        return copy;
      });
    };
    var clearAll = function () { setFilters({}); };
    var activeCount = Object.keys(filters).length;
    return { filters: filters, setColumnFilter: setColumnFilter, clearAll: clearAll, activeCount: activeCount };
  }

  // REQ 1.2 (01/07): aplica filtros por coluna a um array de rows
  function applyColumnFilters(rows, filters) {
    var keys = Object.keys(filters);
    if (!keys.length) return rows;
    return rows.filter(function (row) {
      return keys.every(function (k) {
        var selected = filters[k];
        if (!selected || !selected.length) return true;
        var val = String(row[k] || "");
        return selected.indexOf(val) !== -1;
      });
    });
  }

  // REQ 1.1 (01/07): componente dropdown de filtro por coluna
  function ColumnFilter(props) {
    var colKey = props.colKey;
    var label = props.label;
    var rows = props.rows; // todas as rows (sem filtro desta coluna)
    var selected = props.selected || []; // array de valores selecionados
    var onSelect = props.onSelect; // fn(colKey, selectedArray)
    var children = props.children; // conteudo do th (texto do header)

    var ref = React.useRef(null);
    var _s = React.useState(false), open = _s[0], setOpen = _s[1];
    var _q = React.useState(""), search = _q[0], setSearch = _q[1];

    // REQ 1.2 (01/07): valores unicos com contagem
    var options = React.useMemo(function () {
      var m = {};
      rows.forEach(function (r) {
        var v = String(r[colKey] || "");
        m[v] = (m[v] || 0) + 1;
      });
      return Object.keys(m).sort().map(function (k) { return { value: k, count: m[k] }; });
    }, [rows, colKey]);

    var filtered = React.useMemo(function () {
      if (!search) return options;
      var q = search.toLowerCase();
      return options.filter(function (o) { return o.value.toLowerCase().indexOf(q) !== -1; });
    }, [options, search]);

    var isActive = selected.length > 0;
    var allSelected = selected.length === options.length;

    // fechar ao clicar fora
    React.useEffect(function () {
      if (!open) return;
      var h = function (e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener("mousedown", h);
      return function () { document.removeEventListener("mousedown", h); };
    }, [open]);

    // fechar com ESC
    React.useEffect(function () {
      if (!open) return;
      var h = function (e) { if (e.key === "Escape") setOpen(false); };
      document.addEventListener("keydown", h);
      return function () { document.removeEventListener("keydown", h); };
    }, [open]);

    var toggle = function (val) {
      var idx = selected.indexOf(val);
      var next;
      if (idx === -1) { next = selected.concat([val]); }
      else { next = selected.filter(function (s) { return s !== val; }); }
      onSelect(colKey, next);
    };

    var selectAll = function () {
      onSelect(colKey, options.map(function (o) { return o.value; }));
    };

    var clearCol = function () { onSelect(colKey, []); };

    return React.createElement("th", {
      ref: ref,
      className: "col-filter-th" + (isActive ? " col-filter-active" : ""),
      style: props.style || {}
    },
      React.createElement("div", { className: "col-filter-head", onClick: function () { setOpen(!open); } },
        children,
        // REQ 1.1 (01/07): icone de funil
        React.createElement("span", { className: "col-filter-icon" + (isActive ? " on" : ""), title: "Filtrar " + label },
          React.createElement(Icon, { name: "filter", size: 11, strokeWidth: 2 })
        )
      ),
      open && React.createElement("div", { className: "col-filter-drop", onClick: function (e) { e.stopPropagation(); } },
        // REQ 1.2 (01/07): busca de texto
        React.createElement("div", { className: "col-filter-search" },
          React.createElement("input", {
            className: "input",
            placeholder: "Buscar...",
            value: search,
            onChange: function (e) { setSearch(e.target.value); },
            autoFocus: true,
            style: { fontSize: 12, height: 28, padding: "0 8px" }
          })
        ),
        // REQ 1.2 (01/07): acoes em lote
        React.createElement("div", { className: "col-filter-actions" },
          React.createElement("button", { className: "col-filter-btn", onClick: selectAll }, "Selecionar tudo"),
          React.createElement("button", { className: "col-filter-btn", onClick: clearCol }, "Limpar")
        ),
        // REQ 1.2 (01/07): lista de opcoes com checkbox e contagem
        React.createElement("div", { className: "col-filter-list" },
          filtered.length === 0 && React.createElement("div", { className: "col-filter-empty" }, "Nenhum valor"),
          filtered.map(function (o) {
            var checked = selected.indexOf(o.value) !== -1;
            return React.createElement("label", { key: o.value, className: "col-filter-option" + (checked ? " on" : "") },
              React.createElement("span", { className: "checkbox" + (checked ? " on" : ""), style: { width: 14, height: 14, flexShrink: 0 } },
                checked && React.createElement(Icon, { name: "check", size: 9, strokeWidth: 2.4 })
              ),
              React.createElement("span", { className: "col-filter-val" }, o.value || "(vazio)"),
              React.createElement("span", { className: "col-filter-count" }, o.count),
              React.createElement("input", { type: "checkbox", checked: checked, onChange: function () { toggle(o.value); }, style: { display: "none" } })
            );
          })
        )
      )
    );
  }

  // REQ 1.3 (01/07): chips de filtros ativos + contador
  function FilterChipsBar(props) {
    var filters = props.filters;
    var onClear = props.onClear; // fn(colKey) limpa um filtro
    var onClearAll = props.onClearAll;
    var total = props.total;
    var shown = props.shown;
    var labels = props.labels || {}; // { colKey: "Nome visivel" }
    var keys = Object.keys(filters);
    if (!keys.length) return null;
    return React.createElement("div", { className: "filter-chips-bar" },
      keys.map(function (k) {
        var vals = filters[k];
        var lbl = labels[k] || k;
        var txt = vals.length <= 2 ? vals.join(", ") : vals.length + " selecionados";
        return React.createElement("span", { key: k, className: "chip" },
          lbl, ": ", React.createElement("b", null, txt),
          React.createElement("span", { className: "chip-x", onClick: function () { onClear(k); } },
            React.createElement(Icon, { name: "x", size: 11, strokeWidth: 2 })
          )
        );
      }),
      React.createElement("button", { className: "btn-quiet sm btn", onClick: onClearAll }, "Limpar tudo"),
      // REQ 1.3 (01/07): contador de resultados
      React.createElement("span", { className: "result-counter" },
        React.createElement(Icon, { name: "info", size: 12 }),
        " Mostrando ", shown, " de ", total, " PIs"
      )
    );
  }

  window.ColumnFilter = ColumnFilter;
  window.FilterChipsBar = FilterChipsBar;
  window.useColumnFilters = useColumnFilters;
  window.applyColumnFilters = applyColumnFilters;
})();
