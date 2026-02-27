/**
 * PDF Export Module -- Geracao de Relatorio de Auditoria
 * Isso aqui e absolute cinema. Gera um PDF profissional de verdade,
 * nao aquele print meia-boca que ninguem merece. Caraca velho, ficou lindo demais.
 * Ainda bem que a AI me ajudou nisso kkk, se nao ia levar umas 3 semanas.
 */

// Isso aqui roda tudo, mais veloz que o Sonic na fase final
function generateAuditPDF() {
    // Pega a biblioteca jsPDF que ja carregou via CDN la no HTML
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        alert('Erro: biblioteca jsPDF nao carregou. Recarregue a pagina.');
        return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // Cores do tema Grupo OM -- cada cor foi escolhida na mao, nao e random nao
    const colors = {
        primary: [15, 23, 42],
        secondary: [71, 85, 105],
        tertiary: [148, 163, 184],
        green: [34, 197, 94],
        red: [239, 68, 68],
        amber: [245, 158, 11],
        blue: [37, 99, 235],
        white: [255, 255, 255],
        lightGray: [241, 245, 249],
        border: [226, 232, 240]
    };

    // ═══════════════════════════════════════════════════════════════
    // FUNCOES AUXILIARES -- Agora ta legal, agora vai funcionar
    // ═══════════════════════════════════════════════════════════════

    // Desenha a barra arco-iris no estilo Grupo OM
    function drawRainbowBar(yPos, height) {
        const barColors = [
            [2, 6, 23], [51, 65, 85], [148, 163, 184],
            [203, 213, 225], [148, 163, 184], [51, 65, 85], [2, 6, 23]
        ];
        const segWidth = contentWidth / barColors.length;
        barColors.forEach((c, i) => {
            doc.setFillColor(c[0], c[1], c[2]);
            doc.rect(margin + i * segWidth, yPos, segWidth + 0.5, height, 'F');
        });
    }

    // Verifica se precisa pular pagina -- ninguem gosta de texto cortado no meio
    function checkPageBreak(neededHeight) {
        if (y + neededHeight > pageHeight - 20) {
            doc.addPage();
            y = margin;
            drawRainbowBar(y, 1.5);
            y += 6;
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

        // Linha colorida na esquerda do card
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(x, yPos, 1.5, 22, 'F');

        doc.setFontSize(8);
        doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.text(label.toUpperCase(), x + 5, yPos + 7);

        doc.setFontSize(16);
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.text(String(value), x + 5, yPos + 17);
    }

    // ═══════════════════════════════════════════════════════════════
    // CABECALHO DO PDF -- Tipo capa de filme, bonito demais
    //
    // Fundo do cabecalho
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Barra arco-iris
    drawRainbowBar(45, 2);

    // Titulo
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('GRUPO OM', margin, 18);

    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('RELATORIO DE AUDITORIA — PAINEL DE APROVACAO', margin, 26);

    // Data e usuario
    const user = API.getUser();
    const dataGeracao = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Gerado em: ' + dataGeracao, margin, 34);
    doc.text('Operador: ' + (user ? user.name : 'Sistema'), margin, 39);
    doc.text('Confidencial — Uso Interno', pageWidth - margin, 34, { align: 'right' });

    y = 52;

    // ═══════════════════════════════════════════════════════════════
    // SECAO 1: INDICADORES GERAIS (KPIs)
    // Ta pior que o Nero ativando a Devil Trigger -- potencia maxima
    // ═══════════════════════════════════════════════════════════════

    doc.setFontSize(11);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text('1. INDICADORES GERAIS', margin, y);
    y += 2;
    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.line(margin, y, margin + 50, y);
    y += 6;

    // Pega os dados dos KPIs direto da tela -- sem chamada extra ao backend
    const kpiTotal = document.getElementById('kpiTotal')?.textContent || '0';
    const kpiPending = document.getElementById('kpiPending')?.textContent || '0';
    const kpiApproved = document.getElementById('kpiApproved')?.textContent || '0';
    const kpiRejected = document.getElementById('kpiRejected')?.textContent || '0';
    const kpiTaxa = document.getElementById('kpiTaxaAprov')?.textContent || '0%';
    const kpiNovos = document.getElementById('kpiNovos')?.textContent || '0';
    const kpiCompl = document.getElementById('kpiComplementos')?.textContent || '0';

    const cardWidth = (contentWidth - 9) / 4;
    drawKpiCard(margin, y, cardWidth, 'Total Registros', kpiTotal, colors.blue);
    drawKpiCard(margin + cardWidth + 3, y, cardWidth, 'Pendentes', kpiPending, colors.amber);
    drawKpiCard(margin + (cardWidth + 3) * 2, y, cardWidth, 'Aprovados', kpiApproved, colors.green);
    drawKpiCard(margin + (cardWidth + 3) * 3, y, cardWidth, 'Reprovados', kpiRejected, colors.red);
    y += 28;

    // Metricas adicionais
    doc.setFontSize(8);
    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.text('Taxa de Aprovacao: ' + kpiTaxa + '   |   Novos: ' + kpiNovos + '   |   Complementos: ' + kpiCompl, margin, y);
    y += 10;

    // ═══════════════════════════════════════════════════════════════
    // SECAO 2: TABELA DE CHECKINGS
    // Isso aqui e cinema puro, tabela completa com todos os dados
    // ═══════════════════════════════════════════════════════════════

    doc.setFontSize(11);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text('2. REGISTRO DE CHECKINGS', margin, y);
    y += 2;
    doc.line(margin, y, margin + 50, y);
    y += 6;

    // Pega os dados do modulo Approvals
    const checkings = typeof Approvals !== 'undefined' ? Approvals.getCheckings() : [];

    if (checkings.length > 0) {
        // Cabecalho da tabela
        const colWidths = [25, 40, 20, 35, 25, 35];
        const headers = ['PI', 'CLIENTE', 'MEIO', 'VEICULO', 'STATUS', 'RESPONSAVEL'];

        // Desenha cabecalho
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        let xPos = margin;
        headers.forEach((h, i) => {
            doc.rect(xPos, y, colWidths[i], 7, 'F');
            xPos += colWidths[i];
        });

        doc.setFontSize(6.5);
        doc.setTextColor(255, 255, 255);
        xPos = margin;
        headers.forEach((h, i) => {
            doc.text(h, xPos + 2, y + 5);
            xPos += colWidths[i];
        });
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
            const statusColor = st === 'approved' ? colors.green : st === 'rejected' ? colors.red : colors.amber;

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
                    // Status com cor
                    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
                    doc.text(val, xPos + 2, y + 4.5);
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

    doc.setFontSize(11);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text('3. LOG DE AUDITORIA', margin, y);
    y += 2;
    doc.line(margin, y, margin + 50, y);
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
            const acaoColor = isApprove ? colors.green : colors.red;

            const rowData = [
                entry.acao,
                entry.cliente.substring(0, 22),
                entry.pi.substring(0, 12),
                entry.responsavel.substring(0, 16),
                entry.data
            ];

            axPos = margin;
            rowData.forEach((val, i) => {
                if (i === 0) {
                    doc.setTextColor(acaoColor[0], acaoColor[1], acaoColor[2]);
                } else {
                    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                }
                doc.text(val, axPos + 2, y + 4.5);
                axPos += auditWidths[i];
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
    // RODAPE -- Assinatura digital, serio mesmo
    // ═══════════════════════════════════════════════════════════════

    // Rodape em todas as paginas
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);

        // Barra inferior
        drawRainbowBar(pageHeight - 8, 1.5);

        doc.setFontSize(6);
        doc.setTextColor(colors.tertiary[0], colors.tertiary[1], colors.tertiary[2]);
        doc.text(
            'Grupo OM — Painel de Aprovacao — Relatorio gerado automaticamente em ' + dataGeracao,
            margin, pageHeight - 11
        );
        doc.text('Pagina ' + p + ' de ' + totalPages, pageWidth - margin, pageHeight - 11, { align: 'right' });

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
