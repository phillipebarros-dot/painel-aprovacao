// rules.js — Regras de checking por meio (fonte: config.js do Sistema de Cheking) -> window.RULES_API
// REGRA FUNDAMENTAL: "foto perto + foto longe POR ENDERECO" e regra Uninter para meios OOH.
// Para clientes genericos, a exigencia e um relatorio fotografico consolidado.
(function () {
  // Cada regra: { code, nome, generico:[campos], uninter:[campos], periodo:bool, nota, sample }
  // campo: { label, req:bool, mult:bool, max, fmt:"...", cond? }
  const RULES = {
    // ─── TV ───
    TV: { code: "TV", nome: "TV", periodo: true,
      generico: [{ label: "Relatorio de Veiculacao Automatizado", req: true, mult: true, max: 20, fmt: "PDF, JPG, PNG, HEIC, XLSX, XLS, CSV" }],
      instrucao: "Enviar relatorio de veiculacao automatizado." },

    // ─── Radio ───
    RD: { code: "RD", nome: "Radio",
      generico: [
        { label: "Relatorio de Veiculacao (PDF ou Planilha)", req: true, mult: true, max: 20, fmt: "PDF, XLSX, XLS, CSV, ZIP, JPG, PNG, HEIC" },
        { label: "Audios da Campanha", req: false, mult: true, max: 20, fmt: "MP3, M4A, WAV, OGG, AAC, WMA" },
        { label: "Videos Comprobatorios", req: false, mult: true, max: 20, fmt: "MP4, MOV, AVI, WEBM" },
      ],
      instrucao: "Relatorio de veiculacao automatizado. Audios e videos quando necessario." },

    // ─── Jornal ───
    JO: { code: "JO", nome: "Jornal",
      generico: [{ label: "Material Impresso (PDF ou foto)", req: true, mult: true, max: 20, fmt: "PDF, JPG, PNG, HEIC" }],
      instrucao: "Pagina escaneada ou PDF com data da publicacao visivel." },

    // ─── Revista ───
    RV: { code: "RV", nome: "Revista",
      generico: [{ label: "PDF da Revista ou Foto (Capa + Pagina)", req: true, mult: true, max: 20, fmt: "PDF, JPG, PNG, HEIC" }],
      instrucao: "PDF da revista digital, ou foto da capa e pagina do anuncio." },

    // ─── Internet / Digital ───
    IN: { code: "IN", nome: "Internet / Digital",
      generico: [{ label: "Relatorio de Veiculacao + Prints das Pecas", req: true, mult: true, max: 20, fmt: "PDF, JPG, PNG, HEIC, ZIP, XLSX, CSV" }],
      instrucao: "Relatorio de veiculacao + prints das pecas." },

    // ─── Outdoor ───
    // Generico: relatorio fotografico consolidado com endereco
    // Uninter: foto perto + longe POR ENDERECO + noturna condicional
    OD: { code: "OD", nome: "Outdoor", uninterOnly: true,
      generico: [{ label: "Relatorio Fotografico com Endereco (diurno/noturno se iluminado)", req: true, mult: true, max: 20, fmt: "JPG, PNG, HEIC, PDF, ZIP" }],
      uninter: [
        { label: "Foto de Perto", req: true, mult: false, max: 1, fmt: "JPG, PNG, HEIC" },
        { label: "Foto de Longe", req: true, mult: false, max: 1, fmt: "JPG, PNG, HEIC" },
        { label: "Foto Noturna (se ponto iluminado)", req: true, mult: false, max: 1, fmt: "JPG, PNG, HEIC", cond: true },
      ],
      instrucao: "Relatorio fotografico com endereco. Pontos iluminados: incluir foto noturna.",
      instrucaoU: "Cobertura 100% dos pontos. Foto de perto + longe. Se iluminado: +1 foto noturna." },

    // ─── DOOH (Digital Out of Home) ───
    // Generico: relatorio + exibicoes + video opcional
    // Uninter: dois subtipos (grandes formatos vs indoor)
    DO: { code: "DO", nome: "DOOH (Out of Home Digital)", periodo: true,
      generico: [
        { label: "Relatorio Fotografico de Todos os Pontos", req: true, mult: true, max: 20, fmt: "JPG, PNG, HEIC, PDF, ZIP" },
        { label: "Relatorio de Exibicoes Automatizado", req: true, mult: true, max: 20, fmt: "PDF, XLSX, CSV" },
        { label: "Video Diurno", req: false, mult: true, max: 20, fmt: "MP4, MOV, AVI, WEBM" },
      ],
      uninter: [
        { label: "Foto de Perto", req: true, mult: false, max: 1, fmt: "JPG, PNG, HEIC" },
        { label: "Foto de Longe", req: true, mult: false, max: 1, fmt: "JPG, PNG, HEIC" },
        { label: "Video Diurno (ate 10s)", req: false, mult: false, max: 1, fmt: "MP4, MOV, AVI, WEBM" },
      ],
      // Subtipos Uninter (para exibicao na UI de regras)
      uninterSubtypes: {
        grandes_formatos: {
          label: "DOOH - Grandes Formatos (Painel LED, Empena Digital)",
          fields: [
            { label: "Foto de Perto", req: true, mult: false, max: 1, fmt: "JPG, PNG, HEIC" },
            { label: "Foto de Longe", req: true, mult: false, max: 1, fmt: "JPG, PNG, HEIC" },
            { label: "Video Diurno (ate 10s)", req: false, mult: false, max: 1, fmt: "MP4, MOV, AVI, WEBM" },
          ]
        },
        indoor: {
          label: "DOOH - Indoor / Mobiliario Digital (Totem, MUB, Elevadores)",
          sample: "5%",
          fields: [
            { label: "Fotos Amostrais (5% das pecas)", req: true, mult: true, max: 20, fmt: "JPG, PNG, HEIC, ZIP" },
            { label: "Relatorio de Exibicoes Automatizado", req: true, mult: true, max: 20, fmt: "PDF, XLSX, CSV" },
            { label: "Video Diurno (ate 10s)", req: true, mult: false, max: 1, fmt: "MP4, MOV, AVI, WEBM" },
          ]
        }
      },
      instrucao: "Relatorio fotografico de todos os pontos + relatorio de exibicoes. Video diurno opcional." },

    // ─── Frontlight / Gigadoor ───
    // Generico: relatorio fotografico consolidado
    // Uninter: foto perto + longe + noturna POR ENDERECO
    FL: { code: "FL", nome: "Frontlight / Gigadoor", uninterOnly: true, hasNight: true,
      generico: [{ label: "Relatorio Fotografico com Endereco (diurno/noturno se iluminado)", req: true, mult: true, max: 20, fmt: "JPG, PNG, HEIC, PDF, ZIP" }],
      uninter: [
        { label: "Foto de Perto", req: true, mult: false, max: 1, fmt: "JPG, PNG, HEIC" },
        { label: "Foto de Longe", req: true, mult: false, max: 1, fmt: "JPG, PNG, HEIC" },
        { label: "Foto Noturna (iluminacao ativa)", req: true, mult: false, max: 1, fmt: "JPG, PNG, HEIC" },
      ],
      instrucao: "Relatorio fotografico com endereco. Iluminados: incluir foto noturna." },

    // ─── Midia Externa / Mobiliario Urbano ───
    ME: { code: "ME", nome: "Midia Externa / Mobiliario Urbano", uninterOnly: true, sample: "5%",
      generico: [
        { label: "Relatorio com Endereco dos Pontos", req: true, mult: true, max: 20, fmt: "PDF, XLSX, CSV" },
        { label: "Fotos Diurnas (amostrais) / Noturnas se iluminado", req: true, mult: true, max: 20, fmt: "JPG, PNG, HEIC, ZIP" },
      ],
      uninter: [{ label: "Foto(s) do Local (amostral 5%)", req: true, mult: true, max: 20, fmt: "JPG, PNG, HEIC, PDF, ZIP" }],
      instrucao: "Relatorio com endereco dos pontos + fotos diurnas amostrais (se iluminado: + noturnas)." },

    // ─── Metro ───
    MT: { code: "MT", nome: "Metro", uninterOnly: true, sample: "5%",
      generico: [
        { label: "Relatorio com Listagem de Estacoes/Linhas/Carros", req: true, mult: true, max: 20, fmt: "PDF, XLSX, CSV" },
        { label: "Fotos ou Videos (amostrais)", req: true, mult: true, max: 20, fmt: "JPG, PNG, HEIC, MP4, MOV, ZIP" },
      ],
      uninter: [{ label: "Foto(s) da Veiculacao (amostral 5%)", req: true, mult: true, max: 20, fmt: "JPG, PNG, HEIC, PDF, ZIP" }],
      instrucao: "Relatorio com listagem de estacoes/linhas/carros + fotos ou videos amostrais." },

    // ─── Busdoor / Taxidoor / Backbus ───
    BD: { code: "BD", nome: "Busdoor / Taxidoor / Backbus", uninterOnly: true,
      generico: [{ label: "Relatorio Fotografico de Todos os Onibus/Carros", req: true, mult: true, max: 20, fmt: "JPG, PNG, HEIC, PDF, ZIP" }],
      uninter: [{ label: "Fotos Traseira/Lateral (100% da frota)", req: true, mult: true, max: 20, fmt: "PDF, JPG, PNG, HEIC, ZIP" }],
      instrucao: "Relatorio fotografico de todos os onibus/carros." },

    // ─── Midia Interna ───
    MN: { code: "MN", nome: "Midia Interna",
      generico: [{ label: "Relatorio Fotografico de Todos os Pontos + Relacao de Locais", req: true, mult: true, max: 20, fmt: "JPG, PNG, HEIC, PDF, ZIP" }],
      instrucao: "Relatorio fotografico de todos os pontos e relacao de locais." },

    // ─── Cinema ───
    CI: { code: "CI", nome: "Cinema",
      generico: [{ label: "Relatorio de Exibicao", req: true, mult: true, max: 20, fmt: "PDF, JPG, PNG, HEIC, XLSX, CSV" }],
      instrucao: "Relatorio de exibicao citando complexo, numero de salas e praca." },

    // ─── Carro de Som ─── (NOVO: faltava no painel)
    CS: { code: "CS", nome: "Carro de Som",
      generico: [
        { label: "Video da Campanha", req: false, mult: false, max: 1, fmt: "MP4, MOV, AVI, WEBM" },
        { label: "Fotos Datadas (PDF ou ZIP)", req: true, mult: false, max: 1, fmt: "PDF, ZIP" },
        { label: "Relatorio (dias e horas veiculadas)", req: true, mult: false, max: 1, fmt: "PDF" },
      ],
      instrucao: "Relatorio com roteiro/locais de circulacao + fotos datadas por diaria. Video opcional." },

    // ─── Ativacao / Projetos Especiais ───
    AT: { code: "AT", nome: "Ativacao / Projetos Especiais",
      generico: [{ label: "Relatorio fotografico ou videos", req: false, mult: true, max: 20, fmt: "PDF, JPG, PNG, HEIC, MP4, MOV, ZIP, PPT" }],
      instrucao: "Relatorio fotografico ou videos + detalhamento das acoes apos a veiculacao." },

    // ─── Producao / Material Ativacao ─── (NOVO: faltava no painel)
    PY: { code: "PY", nome: "Producao / Material Ativacao",
      generico: [
        { label: "Fotos do Material Produzido", req: true, mult: true, max: 20, fmt: "PDF, JPG, PNG, HEIC, ZIP" },
        { label: "Nota Fiscal ou Comprovante de Entrega", req: true, mult: true, max: 20, fmt: "PDF, JPG, PNG, HEIC" },
      ],
      instrucao: "Fotos do material produzido + nota fiscal ou comprovante de entrega." },

    // ─── Midia Alternativa ─── (NOVO: faltava no painel)
    MA: { code: "MA", nome: "Midia Alternativa",
      generico: [
        { label: "Relatorio Fotografico ou Videos", req: true, mult: true, max: 20, fmt: "JPG, PNG, HEIC, MP4, MOV, AVI, WEBM, ZIP" },
        { label: "Descricao da Acao Realizada", req: true, mult: true, max: 20, fmt: "PDF, DOCX, TXT" },
      ],
      instrucao: "Relatorio fotografico ou videos + descricao da acao realizada." },

    // ─── Assessoria de Imprensa ───
    AS: { code: "AS", nome: "Assessoria de Imprensa",
      generico: [
        { label: "Clipping de Midia (materias publicadas)", req: true, mult: true, max: 20, fmt: "PDF, JPG, PNG, HEIC, ZIP" },
        { label: "Relatorio de Resultados (alcance, valor de midia)", req: true, mult: true, max: 20, fmt: "PDF, XLSX, XLS" },
      ],
      instrucao: "Clipping de midia + relatorio de resultados." },

    // ─── Fallback ───
    DEFAULT: { code: "DEFAULT", nome: "Outros Servicos",
      generico: [{ label: "Comprovante de Veiculacao", req: true, mult: true, max: 20, fmt: "PDF, JPG, PNG, HEIC, MP4, MOV, ZIP" }],
      instrucao: "Enviar comprovante de veiculacao." },
  };

  // Mapeia o meio amplo do painel para os codigos de regra relevantes
  const MEIO_TO_CODES = {
    "TV Aberta": ["TV"],
    "Radio": ["RD"],
    "Impresso": ["JO", "RV"],
    "Digital": ["IN"],
    "Midia Exterior": ["OD", "DO", "FL", "ME", "MT", "BD", "MN", "CI"],
  };

  // Aliases completos: nomes alternativos do BigQuery/n8n -> codigo primario
  // Fonte: MEDIA_TYPE_CONFIG.aliases do config.js do Sistema de Cheking
  const MEIO_ALIASES = {
    // TV
    "TELEVISAO": "TV", "TELEVISÃO": "TV",
    "TA": "TV", "PT": "TV", "PV": "TV", "TO": "TV",
    // Radio
    "RADIO": "RD", "RÁDIO": "RD",
    "RA": "RD", "RF": "RD", "PD": "RD", "PA": "RD",
    // Jornal
    "JORNAL": "JO",
    "JN": "JO", "PJ": "JO", "GS": "JO", "GO": "JO", "FT": "JO",
    // Revista
    "REVISTA": "RV",
    "RE": "RV", "PS": "RV",
    // Internet
    "INTERNET": "IN", "DIGITAL": "IN",
    "IA": "IN", "IB": "IN", "ID": "IN", "IS": "IN", "IV": "IN",
    "MS": "IN", "PN": "IN", "PW": "IN",
    // DOOH
    "DOOH": "DO", "OUT OF HOME": "DO", "OOH": "DO",
    "PH": "DO", "DI": "DO",
    // Outdoor
    "OUTDOOR": "OD", "PAINEL": "OD",
    "PO": "OD",
    // Frontlight
    "FRONTLIGHT": "FL", "GIGADOOR": "FL", "FRONT LIGHT": "FL",
    "PF": "FL", "GD": "FL",
    // Busdoor
    "BUSDOOR": "BD", "TAXIDOOR": "BD", "BACKBUS": "BD", "BUS": "BD",
    "BP": "BD",
    // Metro
    "METRO": "MT", "METRÔ": "MT",
    "PM": "MT",
    // Midia Externa
    "MOBILIARIO": "ME", "MOBILIÁRIO": "ME", "MIDIA EXTERNA": "ME",
    "EP": "ME",
    // Midia Interna
    "MIDIA INTERNA": "MN", "MÍDIA INTERNA": "MN",
    "PI": "MN",
    // Cinema
    "CINEMA": "CI",
    "CN": "CI", "CP": "CI",
    // Carro de Som
    "CARRO DE SOM": "CS",
    // Ativacao
    "ATIVACAO": "AT", "ATIVAÇÃO": "AT", "PROJETO ESPECIAL": "AT",
    "EV": "AT",
    // Producao
    "PRODUCAO": "PY", "PRODUÇÃO": "PY",
    // Midia Alternativa
    "MIDIA ALTERNATIVA": "MA", "MÍDIA ALTERNATIVA": "MA",
    // Assessoria
    "ASSESSORIA": "AS",
    // Fallback aliases (codigos que caem no DEFAULT)
    "BR": "DEFAULT", "BV": "DEFAULT", "CA": "DEFAULT", "CR": "DEFAULT",
    "DE": "DEFAULT", "FE": "DEFAULT", "FI": "DEFAULT", "FO": "DEFAULT",
    "FP": "DEFAULT", "IL": "DEFAULT", "IP": "DEFAULT", "LO": "DEFAULT",
    "MD": "DEFAULT", "MI": "DEFAULT", "ML": "DEFAULT", "MO": "DEFAULT",
    "OU": "DEFAULT", "PB": "DEFAULT", "PC": "DEFAULT", "PQ": "DEFAULT",
    "RL": "DEFAULT", "RP": "DEFAULT", "RT": "DEFAULT", "TR": "DEFAULT",
    "VE": "DEFAULT",
  };

  function rulesForChecking(c) {
    const raw = (c.meio || "").trim();
    const isUninter = /uninter/i.test(c.conta || "") || /uninter/i.test(c.cliente || "");

    // 1. Tenta pelo nome amplo (ex: "Midia Exterior")
    if (MEIO_TO_CODES[raw]) {
      return { codes: MEIO_TO_CODES[raw].map(k => RULES[k]).filter(Boolean), isUninter };
    }

    // 2. Tenta como codigo direto (ex: "DO", "OD", "FL")
    const upper = raw.toUpperCase();
    if (RULES[upper]) {
      return { codes: [RULES[upper]], isUninter };
    }

    // 3. Tenta aliases (ex: "DOOH" -> "DO", "Outdoor" -> "OD")
    const alias = MEIO_ALIASES[upper];
    if (alias && RULES[alias]) {
      return { codes: [RULES[alias]], isUninter };
    }

    // 4. Tenta matching parcial nos aliases (ex: "Busdoor SP" -> BD)
    for (const [key, code] of Object.entries(MEIO_ALIASES)) {
      if (upper.includes(key) && RULES[code]) {
        return { codes: [RULES[code]], isUninter };
      }
    }

    // 5. Fallback: DEFAULT
    return { codes: [RULES.DEFAULT].filter(Boolean), isUninter };
  }

  window.RULES_API = { RULES, MEIO_TO_CODES, rulesForChecking };
})();
