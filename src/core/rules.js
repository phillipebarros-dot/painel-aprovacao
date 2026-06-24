// rules.js — Regras de checking por meio (fonte: config.js do formulário) -> window.RULES_API
(function () {
  // Cada regra: { code, nome, generico:[campos], uninter:[campos], periodo:bool, nota }
  // campo: { label, req:bool, mult:bool, max, fmt:"...", cond? }
  const RULES = {
    TV: { code: "TV", nome: "TV", periodo: true,
      generico: [{ label: "Relatório de Veiculação Automatizado", req: true, mult: true, max: 20, fmt: "PDF, JPG, PNG, HEIC, XLSX, XLS, CSV" }],
      instrucao: "Enviar relatório de veiculação automatizado." },
    RD: { code: "RD", nome: "Rádio",
      generico: [{ label: "Relatório de Veiculação", req: true, mult: true, max: 20, fmt: "PDF, XLSX, CSV, ZIP, JPG, PNG, MP4, MOV, MP3, M4A, WAV" }],
      instrucao: "Relatório de veiculação automatizado. Ações ao vivo: gravação ou relatório com horários." },
    JO: { code: "JO", nome: "Jornal",
      generico: [{ label: "Material Impresso (PDF ou foto)", req: true, mult: true, max: 20, fmt: "PDF, JPG, PNG, HEIC" }],
      instrucao: "Página escaneada ou PDF com data da publicação visível." },
    RV: { code: "RV", nome: "Revista",
      generico: [{ label: "PDF da Revista ou Foto (Capa + Página)", req: true, mult: true, max: 20, fmt: "PDF, JPG, PNG, HEIC" }],
      instrucao: "PDF da revista digital, ou foto da capa e página do anúncio." },
    IN: { code: "IN", nome: "Internet / Digital",
      generico: [{ label: "Relatório de Veiculação + Prints das Peças", req: true, mult: true, max: 20, fmt: "PDF, JPG, PNG, HEIC, ZIP, XLSX, CSV" }],
      instrucao: "Relatório de veiculação + prints das peças." },
    OD: { code: "OD", nome: "Outdoor", uninterOnly: true,
      generico: [{ label: "Relatório Fotográfico com Endereço (diurno/noturno se iluminado)", req: true, mult: true, max: 20, fmt: "JPG, PNG, HEIC, PDF, ZIP" }],
      uninter: [
        { label: "Foto de Perto", req: true, mult: false, max: 1, fmt: "JPG, PNG, HEIC" },
        { label: "Foto de Longe", req: true, mult: false, max: 1, fmt: "JPG, PNG, HEIC" },
        { label: "Foto Noturna (se ponto iluminado)", req: true, mult: false, max: 1, fmt: "JPG, PNG, HEIC", cond: true },
      ],
      instrucao: "Relatório fotográfico com endereço. Pontos iluminados: incluir foto noturna.",
      instrucaoU: "Cobertura 100% dos pontos. Foto de perto + longe. Se iluminado: +1 foto noturna." },
    DO: { code: "DO", nome: "DOOH (Out of Home Digital)", periodo: true,
      generico: [
        { label: "Relatório Fotográfico de Todos os Pontos", req: true, mult: true, max: 20, fmt: "JPG, PNG, HEIC, PDF, ZIP" },
        { label: "Relatório de Exibições Automatizado", req: true, mult: true, max: 20, fmt: "PDF, XLSX, CSV" },
        { label: "Vídeo Diurno", req: true, mult: true, max: 20, fmt: "MP4, MOV, AVI, WEBM", bug: true },
      ],
      instrucao: "Relatório fotográfico de todos os pontos + relatório de exibições + vídeo diurno.",
      nota: "BUG reportado pela Marlene: o campo Vídeo Diurno está como obrigatório na versão genérica. Veículo sem vídeo fica impedido de enviar. Recomendado tornar opcional." },
    FL: { code: "FL", nome: "Frontlight / Gigadoor", uninterOnly: true, hasNight: true,
      generico: [{ label: "Relatório Fotográfico com Endereço (diurno/noturno se iluminado)", req: true, mult: true, max: 20, fmt: "JPG, PNG, HEIC, PDF, ZIP" }],
      uninter: [
        { label: "Foto de Perto", req: true, mult: false, max: 1, fmt: "JPG, PNG, HEIC" },
        { label: "Foto de Longe", req: true, mult: false, max: 1, fmt: "JPG, PNG, HEIC" },
        { label: "Foto Noturna (iluminação ativa)", req: true, mult: false, max: 1, fmt: "JPG, PNG, HEIC" },
      ],
      instrucao: "Relatório fotográfico com endereço. Iluminados: incluir foto noturna." },
    ME: { code: "ME", nome: "Mídia Externa / Mobiliário Urbano", uninterOnly: true, sample: "5%",
      generico: [
        { label: "Relatório com Endereço dos Pontos", req: true, mult: true, max: 20, fmt: "PDF, XLSX, CSV" },
        { label: "Fotos Diurnas (amostrais) / Noturnas se iluminado", req: true, mult: true, max: 20, fmt: "JPG, PNG, HEIC, ZIP" },
      ],
      uninter: [{ label: "Foto(s) do Local (amostral 5%)", req: true, mult: true, max: 20, fmt: "JPG, PNG, HEIC, PDF, ZIP" }],
      instrucao: "Relatório com endereço dos pontos + fotos diurnas amostrais (se iluminado: + noturnas)." },
    MT: { code: "MT", nome: "Metrô", uninterOnly: true, sample: "5%",
      generico: [
        { label: "Relatório com Listagem de Estações/Linhas/Carros", req: true, mult: true, max: 20, fmt: "PDF, XLSX, CSV" },
        { label: "Fotos ou Vídeos (amostrais)", req: true, mult: true, max: 20, fmt: "JPG, PNG, HEIC, MP4, MOV, ZIP" },
      ],
      uninter: [{ label: "Foto(s) da Veiculação (amostral 5%)", req: true, mult: true, max: 20, fmt: "JPG, PNG, HEIC, PDF, ZIP" }],
      instrucao: "Relatório com listagem de estações/linhas/carros + fotos ou vídeos amostrais." },
    BD: { code: "BD", nome: "Busdoor / Taxidoor / Backbus", uninterOnly: true,
      generico: [{ label: "Relatório Fotográfico de Todos os Ônibus/Carros", req: true, mult: true, max: 20, fmt: "JPG, PNG, HEIC, PDF, ZIP" }],
      uninter: [{ label: "Fotos Traseira/Lateral (100% da frota)", req: true, mult: true, max: 20, fmt: "PDF, JPG, PNG, HEIC, ZIP" }],
      instrucao: "Relatório fotográfico de todos os ônibus/carros." },
    MN: { code: "MN", nome: "Mídia Interna",
      generico: [{ label: "Relatório Fotográfico de Todos os Pontos + Relação de Locais", req: true, mult: true, max: 20, fmt: "JPG, PNG, HEIC, PDF, ZIP" }],
      instrucao: "Relatório fotográfico de todos os pontos e relação de locais." },
    CI: { code: "CI", nome: "Cinema",
      generico: [{ label: "Relatório de Exibição", req: true, mult: true, max: 20, fmt: "PDF, JPG, PNG, HEIC, XLSX, CSV" }],
      instrucao: "Relatório de exibição citando complexo, número de salas e praça." },
    AT: { code: "AT", nome: "Ativação / Projetos Especiais",
      generico: [{ label: "Relatório fotográfico ou vídeos", req: false, mult: true, max: 20, fmt: "PDF, JPG, PNG, HEIC, MP4, MOV, ZIP, PPT" }],
      instrucao: "Relatório fotográfico ou vídeos + detalhamento das ações após a veiculação." },
    AS: { code: "AS", nome: "Assessoria de Imprensa",
      generico: [
        { label: "Clipping de Mídia (matérias publicadas)", req: true, mult: true, max: 20, fmt: "PDF, JPG, PNG, HEIC, ZIP" },
        { label: "Relatório de Resultados (alcance, valor de mídia)", req: true, mult: true, max: 20, fmt: "PDF, XLSX, XLS" },
      ],
      instrucao: "Clipping de mídia + relatório de resultados." },
    DEFAULT: { code: "DEFAULT", nome: "Outros Serviços",
      generico: [{ label: "Comprovante de Veiculação", req: true, mult: true, max: 20, fmt: "PDF, JPG, PNG, HEIC, MP4, MOV, ZIP" }],
      instrucao: "Enviar comprovante de veiculação." },
  };

  // Mapeia o meio amplo do painel para os códigos de regra relevantes
  const MEIO_TO_CODES = {
    "TV Aberta": ["TV"],
    "Rádio": ["RD"],
    "Impresso": ["JO", "RV"],
    "Digital": ["IN"],
    "Mídia Exterior": ["OD", "DO", "FL", "ME", "MT", "BD", "MN", "CI"],
  };

  // Aliases: nomes alternativos que podem vir do BigQuery/n8n
  const MEIO_ALIASES = {
    "DOOH": "DO", "OUT OF HOME": "DO", "OOH": "DO",
    "OUTDOOR": "OD", "PAINEL": "OD",
    "FRONTLIGHT": "FL", "GIGADOOR": "FL", "FRONT LIGHT": "FL",
    "BUSDOOR": "BD", "TAXIDOOR": "BD", "BACKBUS": "BD", "BUS": "BD",
    "METRO": "MT", "METRÔ": "MT",
    "MOBILIARIO": "ME", "MOBILIÁRIO": "ME", "MIDIA EXTERNA": "ME",
    "MIDIA INTERNA": "MN", "MÍDIA INTERNA": "MN",
    "CINEMA": "CI",
    "ATIVACAO": "AT", "ATIVAÇÃO": "AT", "PROJETO ESPECIAL": "AT",
    "ASSESSORIA": "AS",
    "RADIO": "RD", "RÁDIO": "RD",
    "TELEVISAO": "TV", "TELEVISÃO": "TV",
    "JORNAL": "JO",
    "REVISTA": "RV",
    "INTERNET": "IN", "DIGITAL": "IN",
    "PRODUCAO": "PY", "PRODUÇÃO": "PY",
  };

  function rulesForChecking(c) {
    const raw = (c.meio || "").trim();
    const isUninter = /uninter/i.test(c.conta || "") || /uninter/i.test(c.cliente || "");

    // 1. Tenta pelo nome amplo (ex: "Mídia Exterior")
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
