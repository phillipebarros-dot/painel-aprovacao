/**
 * PDF Export Module -- Geracao de Relatorio de Auditoria
 * Isso aqui e absolute cinema. Gera um PDF profissional de verdade,
 * nao aquele print meia-boca que ninguem merece. Caraca velho, ficou lindo demais.
 * Ainda bem que a AI me ajudou nisso kkk, se nao ia levar umas 3 semanas.
 */

// Isso aqui roda tudo, mais veloz que o Sonic na fase final
async function generateAuditPDF(reportType = 'atual') {
    // Pega a biblioteca jsPDF que ja carregou via CDN la no HTML
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        alert('Erro: biblioteca jsPDF nao carregou. Recarregue a pagina.');
        return;
    }

    const isReportsPage = document.body.getAttribute('data-page') === 'relatorios';

    // Indicador visual de carregamento
    const dk = document.documentElement.getAttribute('data-theme') === 'dark';
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: `Processando Relatório...`,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
            background: dk ? '#0f1629' : '#fff',
            color: dk ? '#f1f5f9' : '#111'
        });
    }

    let reportData = null;
    // O sistema agora extrai diretamente do DOM ou da aba de Relatorios sem recitar chamadas de API redundantes
    // Se precisar da base de dados, pega do `Reports.getFilteredCheckings()`!

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // Cores do tema Grupo OM -- cada cor foi escolhida na mao, nao e random nao
    // Cores premium, corporativas e super profissionais (Monocromatico / Silver / Slate)
    const colors = {
        primary: [15, 23, 42],        // Muito escuro (quase preto)
        secondary: [71, 85, 105],     // Cinza escuro texto
        tertiary: [148, 163, 184],    // Cinza medio
        accent: [30, 41, 59],         // Slate 800 (detalhes sobrios)
        silver: [203, 213, 225],      // Prata p/ linhas
        lightGray: [248, 250, 252],   // Fundo quase branco
        border: [226, 232, 240]       // Cinza borda
    };

    // ═══════════════════════════════════════════════════════════════
    // FUNCOES AUXILIARES -- Agora ta legal, agora vai funcionar
    // ═══════════════════════════════════════════════════════════════

    // Desenha uma barra premium minimalista sobria em vez de arco-iris
    function drawPremiumBar(yPos, height) {
        doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
        doc.rect(margin, yPos, contentWidth, height, 'F');
        doc.setFillColor(colors.border[0], colors.border[1], colors.border[2]);
        doc.rect(margin, yPos + height, contentWidth, 0.5, 'F');
    }

    // Verifica se precisa pular pagina -- ninguem gosta de texto cortado no meio
    function checkPageBreak(neededHeight) {
        if (y + neededHeight > pageHeight - 20) {
            doc.addPage();
            y = margin;
            drawPremiumBar(y, 2);
            y += 8;
            return true;
        }
        return false;
    }

    // Desenha um card de KPI no PDF -- isso me deu um pouco de trabalho pra alinhar
    function drawKpiCard(x, yPos, width, label, value, color) {
        doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
        doc.rect(x, yPos, width, 22, 'F');
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
        doc.rect(x, yPos, width, 22, 'S');

        // Um sutil marcador de esquerda ultra-profissional Escuro/Silver
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.rect(x, yPos, 1.5, 22, 'F');

        doc.setFontSize(8);
        doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.text(label.toUpperCase(), x + 5, yPos + 7);

        doc.setFontSize(16);
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.text(String(value), x + 5, yPos + 17);
    }

    // Helper para carregar a logo do Grupo OM e manter a proporcao
    const loadLogo = () => new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve({ data: canvas.toDataURL('image/png'), w: img.width, h: img.height });
        };
        img.onerror = () => resolve(null);
        img.src = '../assets/img/logo-grupoom.png'; // Caminho relativo da logo
    });

    const logoObj = await loadLogo();

    // ═══════════════════════════════════════════════════════════════
    // CABECALHO DO PDF -- Ultra Premium e Minimalista
    //
    // Fundo do cabecalho (Muito sobrio, branco e borders cinza)
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 50, 'F');
    // Borda grossa preta em cima
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 6, 'F');

    let textStartX = margin;

    if (logoObj && logoObj.data) {
        // Calcula a largura proporcional para uma altura maxima de 20
        const targetHeight = 18;
        const targetWidth = (targetHeight * logoObj.w) / logoObj.h;
        // Inserir logo no cabecalho branco
        doc.addImage(logoObj.data, 'PNG', margin, 18, targetWidth, targetHeight);
        textStartX = margin + targetWidth + 8; // Espaco extra depois da logo
    } else {
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.text('GRUPO OM', margin, 32);
        textStartX = margin + 50;
    }

    // Divisoria vertical fina cinza entre logo e titulo
    doc.setDrawColor(226, 232, 240);
    doc.line(textStartX - 4, 16, textStartX - 4, 38);

    // Titulo refinado e corporativo
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('RELATÓRIO DE AUDITORIA', textStartX, 25);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('DEPARTAMENTO DE MÍDIA — PAINEL DE APROVAÇÕES', textStartX, 32);

    // Linha fina separando o cabecalho
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, 45, pageWidth - margin, 45);

    // Info metadados sutil
    const user = API.getUser();
    const dataGeracao = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('EMITIDO EM: ' + dataGeracao, margin, 52);
    doc.text('RESPONSÁVEL: ' + (user ? user.name.toUpperCase() : 'SISTEMA'), margin + 65, 52);
    doc.text('DOCUMENTO OFICIAL', pageWidth - margin, 52, { align: 'right' });

    y = 65;

    // ═══════════════════════════════════════════════════════════════
    // SECAO 1: INDICADORES GERAIS (KPIs)
    // Ta pior que o Nero ativando a Devil Trigger -- potencia maxima
    // ═══════════════════════════════════════════════════════════════

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`1. RESUMO EXECUTIVO (${reportType.toUpperCase()})`, margin, y);
    doc.setFont("helvetica", "normal");
    y += 2;
    doc.setLineWidth(0.7);
    doc.setDrawColor(15, 23, 42);
    doc.line(margin, y, margin + 45, y);
    doc.setLineWidth(0.5);
    y += 6;

    // Pega os dados dos KPIs da tela OU do relatorio backend
    let kpiTotal = '0', kpiPending = '0', kpiApproved = '0', kpiRejected = '0', kpiTaxa = '0%', kpiNovos = '0', kpiCompl = '0';

    if (reportData) {
        kpiTotal = reportData.stats.total || '0';
        kpiPending = reportData.stats.pending || '0';
        kpiApproved = reportData.stats.approved || '0';
        kpiRejected = reportData.stats.rejected || '0';
        kpiTaxa = reportData.stats.taxa || '0%';
        kpiNovos = reportData.stats.novos || '0';
        kpiCompl = reportData.stats.complementos || '0';
    } else if (isReportsPage) {
        kpiTotal = document.getElementById('rptTotal')?.textContent || '0';
        kpiPending = document.getElementById('rptPending')?.textContent || '0';
        kpiApproved = document.getElementById('rptApproved')?.textContent || '0';
        kpiRejected = document.getElementById('rptRejected')?.textContent || '0';
        kpiTaxa = document.getElementById('rptTaxa')?.textContent || '0%';
        kpiNovos = document.getElementById('rptNovos')?.textContent || '0';
        kpiCompl = document.getElementById('rptComplementos')?.textContent || '0';
    } else {
        kpiTotal = document.getElementById('kpiTotal')?.textContent || '0';
        kpiPending = document.getElementById('kpiPending')?.textContent || '0';
        kpiApproved = document.getElementById('kpiApproved')?.textContent || '0';
        kpiRejected = document.getElementById('kpiRejected')?.textContent || '0';
        kpiTaxa = document.getElementById('kpiTaxaAprov')?.textContent || '0%';
        kpiNovos = document.getElementById('kpiNovos')?.textContent || '0';
        kpiCompl = document.getElementById('kpiComplementos')?.textContent || '0';
    }

    const cardWidth = (contentWidth - 9) / 4;
    // Omit color arguments as colors are now professional monochrome inside drawKpiCard
    drawKpiCard(margin, y, cardWidth, 'Total Analisado', kpiTotal, []);
    drawKpiCard(margin + cardWidth + 3, y, cardWidth, 'Fila Restante', kpiPending, []);
    drawKpiCard(margin + (cardWidth + 3) * 2, y, cardWidth, 'Volumes Aprovados', kpiApproved, []);
    drawKpiCard(margin + (cardWidth + 3) * 3, y, cardWidth, 'Casos Rejeitados', kpiRejected, []);
    y += 28;

    // Metricas adicionais
    doc.setFontSize(8);
    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    let extrasText = 'Taxa de Aprovacao: ' + kpiTaxa + '   |   Novos: ' + kpiNovos + '   |   Complementos: ' + kpiCompl;

    if (isReportsPage) {
        const taxaReenvio = document.getElementById('rptTaxaReenvio')?.textContent || '0%';
        const topVeiculo = document.getElementById('rptTopVeiculo')?.textContent || '-';
        const topMeio = document.getElementById('rptTopMeio')?.textContent || '-';
        extrasText += '   |   Taxa Reenvio: ' + taxaReenvio + '   |   Top Veiculo: ' + topVeiculo + '   |   Top Meio: ' + topMeio;
    }

    doc.text(extrasText, margin, y);
    y += 10;

    // ═══════════════════════════════════════════════════════════════
    // SECAO 2: TABELA DE CHECKINGS
    // Isso aqui e cinema puro, tabela completa com todos os dados
    // ═══════════════════════════════════════════════════════════════

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('2. REGISTRO DE DADOS', margin, y);
    doc.setFont("helvetica", "normal");
    y += 2;
    doc.setLineWidth(0.7);
    doc.setDrawColor(15, 23, 42);
    doc.line(margin, y, margin + 45, y);
    doc.setLineWidth(0.5);
    y += 6;

    // Pega os dados do modulo Approvals, Reports ou do Relatorio Backend
    let checkings = [];
    if (reportData && reportData.checkings) {
        checkings = reportData.checkings;
    } else if (isReportsPage && typeof Reports !== 'undefined') {
        checkings = Reports.getFilteredCheckings();
    } else {
        checkings = typeof Approvals !== 'undefined' ? Approvals.getCheckings() : [];
    }

    if (checkings.length > 0) {
        // Cabecalho da tabela
        const colWidths = [25, 40, 20, 35, 25, 35];
        const headers = ['PI', 'ANUNCIANTE', 'MEIO', 'VEICULO', 'STATUS', 'RESPONSAVEL'];

        // Desenha cabecalho (High contrast dark gray)
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        let xPos = margin;
        headers.forEach((h, i) => {
            doc.rect(xPos, y, colWidths[i], 7, 'F');
            xPos += colWidths[i];
        });

        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        xPos = margin;
        headers.forEach((h, i) => {
            doc.text(h, xPos + 2, y + 5);
            xPos += colWidths[i];
        });
        doc.setFont("helvetica", "normal");
        y += 7;

        // Linhas da tabela -- cada checking vira uma linha
        const maxRows = Math.min(checkings.length, 100);
        for (let r = 0; r < maxRows; r++) {
            checkPageBreak(7);
            const c = checkings[r];

            // Cor de fundo alternada
            if (r % 2 === 0) {
                doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
                doc.rect(margin, y, contentWidth, 6.5, 'F');
            }

            doc.setFontSize(6);
            doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);

            const st = (c.status || 'pending').toLowerCase();
            const statusLabel = st === 'approved' ? 'APROVADO' : st === 'rejected' ? 'REPROVADO' : 'PENDENTE';
            // Status agora usa preto ou cinza escuro pra ser profissional
            const statusColor = st === 'approved' ? [30, 41, 59] : st === 'rejected' ? [15, 23, 42] : [100, 116, 139];

            const rowData = [
                (c.n_pi || '').substring(0, 12),
                (c.cliente || '').substring(0, 20),
                (c.meio || '-').substring(0, 10),
                (c.veiculo || '').substring(0, 18),
                statusLabel,
                (c.approval_user || '-').substring(0, 16)
            ];

            xPos = margin;
            rowData.forEach((val, i) => {
                if (i === 4) {
                    // Status text with bold weighting
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
                    doc.text(val, xPos + 2, y + 4.5);
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                } else {
                    doc.text(val, xPos + 2, y + 4.5);
                }
                xPos += colWidths[i];
            });

            y += 6.5;
        }

        if (checkings.length > 100) {
            y += 3;
            doc.setFontSize(7);
            doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
            doc.text('... e mais ' + (checkings.length - 100) + ' registros nao exibidos neste relatorio.', margin, y);
            y += 5;
        }
    } else {
        doc.setFontSize(8);
        doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.text('Nenhum checking registrado no sistema.', margin, y);
        y += 8;
    }

    y += 8;

    // ═══════════════════════════════════════════════════════════════
    // SECAO 3: LOG DE AUDITORIA
    // Cada acao fica registrada aqui, tipo diario de bordo
    // ═══════════════════════════════════════════════════════════════

    checkPageBreak(30);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('3. LOG DE AUDITORIA DE SISTEMA', margin, y);
    doc.setFont("helvetica", "normal");
    y += 2;
    doc.setLineWidth(0.7);
    doc.setDrawColor(15, 23, 42);
    doc.line(margin, y, margin + 65, y);
    doc.setLineWidth(0.5);
    y += 6;

    // Monta log a partir dos checkings processados
    const auditEntries = checkings
        .filter(c => {
            const st = (c.status || '').toLowerCase();
            return st === 'approved' || st === 'rejected';
        })
        .map(c => {
            const st = (c.status || '').toLowerCase();
            const ts = c.approved_at || c.rejected_at || '';
            let formattedTs = '';
            if (ts) {
                try { formattedTs = new Date(ts).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }); }
                catch { formattedTs = ts; }
            }
            return {
                acao: st === 'approved' ? 'APROVACAO' : 'REPROVACAO',
                cliente: c.cliente || '',
                pi: c.n_pi || '',
                responsavel: c.approval_user || 'Sistema',
                motivo: c.rejection_reason || '',
                data: formattedTs || 'Sem data'
            };
        })
        .slice(0, 50);

    if (auditEntries.length > 0) {
        // Cabecalho
        const auditHeaders = ['ACAO', 'CLIENTE', 'PI', 'RESPONSAVEL', 'DATA'];
        const auditWidths = [25, 45, 25, 35, 50];

        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        let axPos = margin;
        auditHeaders.forEach((h, i) => {
            doc.rect(axPos, y, auditWidths[i], 7, 'F');
            axPos += auditWidths[i];
        });

        doc.setFontSize(6.5);
        doc.setTextColor(255, 255, 255);
        axPos = margin;
        auditHeaders.forEach((h, i) => {
            doc.text(h, axPos + 2, y + 5);
            axPos += auditWidths[i];
        });
        y += 7;

        auditEntries.forEach((entry, r) => {
            checkPageBreak(7);

            if (r % 2 === 0) {
                doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
                doc.rect(margin, y, contentWidth, 6.5, 'F');
            }

            doc.setFontSize(6);
            const isApprove = entry.acao === 'APROVACAO';
            // Usa as cores padronizadas (Cinza escuro/Chumbo) ao inves de cores vibrantes
            const acaoColor = isApprove ? [30, 41, 59] : [15, 23, 42];

            // String() + || '' garante que nenhum val chega undefined pro doc.text()
            const rowData = [
                String(entry.acao || ''),
                String(entry.cliente || '').substring(0, 22),
                String(entry.pi || '').substring(0, 12),
                String(entry.responsavel || '').substring(0, 16),
                String(entry.data || 'Sem data')
            ];

            axPos = margin;
            rowData.forEach((val, i) => {
                const safeVal = (val != null) ? String(val) : '';
                if (i === 0) {
                    doc.setTextColor(acaoColor[0], acaoColor[1], acaoColor[2]);
                } else {
                    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                }
                if (auditWidths[i] !== undefined) {
                    doc.text(safeVal, axPos + 2, y + 4.5);
                    axPos += auditWidths[i];
                }
            });

            y += 6.5;
        });
    } else {
        doc.setFontSize(8);
        doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.text('Nenhuma acao de aprovacao ou reprovacao registrada.', margin, y);
        y += 8;
    }

    // ═══════════════════════════════════════════════════════════════
    // SECAO 4: RESUMO ESTATISTICO
    // Tipo relatorio do FBI, so que mais legal
    // ═══════════════════════════════════════════════════════════════

    y += 8;
    checkPageBreak(40);

    doc.setFontSize(11);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text('4. RESUMO ESTATISTICO', margin, y);
    y += 2;
    doc.line(margin, y, margin + 50, y);
    y += 8;

    // Calcula estatisticas
    const totalNum = parseInt(kpiTotal.replace(/\./g, '')) || 0;
    const pendingNum = parseInt(kpiPending.replace(/\./g, '')) || 0;
    const approvedNum = parseInt(kpiApproved.replace(/\./g, '')) || 0;
    const rejectedNum = parseInt(kpiRejected.replace(/\./g, '')) || 0;

    const stats = [
        ['Total de checkings no sistema:', String(totalNum)],
        ['Checkings pendentes de analise:', String(pendingNum)],
        ['Checkings aprovados:', String(approvedNum)],
        ['Checkings reprovados:', String(rejectedNum)],
        ['Taxa de aprovacao:', kpiTaxa],
        ['Novos envios:', kpiNovos],
        ['Complementos (reenvios):', kpiCompl]
    ];

    doc.setFontSize(8);
    stats.forEach(([label, value]) => {
        doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.text(label, margin, y);
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.text(value, margin + 70, y);
        y += 6;
    });

    // Veiculos
    y += 4;
    const topVehicle = document.getElementById('kpiTopVehicle')?.textContent || '--';
    const complementRate = document.getElementById('kpiComplementRate')?.textContent || '0%';
    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.text('Veiculo com maior volume:', margin, y);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text(topVehicle, margin + 70, y);
    y += 6;
    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.text('Proporcao de complementos:', margin, y);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text(complementRate, margin + 70, y);

    // ═══════════════════════════════════════════════════════════════
    // SECAO 4: TERMO DE AUTENTICIDADE (Assinatura PDF)
    // ═══════════════════════════════════════════════════════════════

    checkPageBreak(50);

    y += 10;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('DECLARAÇÃO DE AUTENTICIDADE', margin, y);
    doc.setFont("helvetica", "normal");
    y += 6;

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const termo = `Este documento é um relatório oficial gerado pelo Painel de Aprovação do Grupo OM. Os dados referentes à auditoria  visual dos processos de Mídia (aprovações e rejeições) listados acima foram processados e armazenados sistematicamente por usuários credenciados, e são considerados auditáveis e definitivos até a presente data.`;
    const splitTermo = doc.splitTextToSize(termo, contentWidth);
    doc.text(splitTermo, margin, y);

    y += splitTermo.length * 4 + 15;

    // Assinatura automatica gerada
    doc.setDrawColor(15, 23, 42);
    doc.line(margin, y, margin + 60, y);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text((user ? user.name.toUpperCase() : 'SISTEMA'), margin, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Responsável pela Extração', margin, y + 4);

    const dataFull = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    doc.text('Data de Emissão: ' + dataFull, margin, y + 8);
    doc.text('Grupo OM - Departamento de Mídia', margin, y + 12);
    // ═══════════════════════════════════════════════════════════════
    // RODAPE -- Assinatura digital, serio mesmo
    // ═══════════════════════════════════════════════════════════════

    // Rodape em todas as paginas
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);

        // Barra inferior corporativa
        drawPremiumBar(pageHeight - 8, 1.5);

        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('Painel de Aprovação — Uso Restrito', margin, pageHeight - 11);
        doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin, pageHeight - 11, { align: 'right' });

        // Linha de confidencialidade
        doc.setFontSize(5);
        doc.text('Este documento e confidencial e de uso exclusivo interno. Distribuicao nao autorizada e proibida.', margin, pageHeight - 4);
    }

    // ═══════════════════════════════════════════════════════════════
    // SALVAR PDF -- Momento de gloria, baixa o arquivo
    // ═══════════════════════════════════════════════════════════════

    const nomeArquivo = 'relatorio-auditoria-' + new Date().toISOString().slice(0, 10) + '.pdf';
    doc.save(nomeArquivo);

    // Notifica o usuario que deu certo -- feedback e importante
    if (typeof Swal !== 'undefined') {
        const dk = document.documentElement.getAttribute('data-theme') === 'dark';
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Relatorio PDF gerado com sucesso!',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            background: dk ? '#0f1629' : '#fff',
            color: dk ? '#f1f5f9' : '#111'
        });
    }
}
