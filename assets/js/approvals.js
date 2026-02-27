/**
 * Modulo de Aprovacoes -- Tabela, Aprovar/Reprovar, Log de Auditoria
 * O coracao do painel. Aqui e onde os checkings sao aprovados ou reprovados.
 *
 * Caraca velho, esse modulo ficou gigante mas necessario.
 * Tabela com paginacao, filtros, busca, modais com SweetAlert2,
 * visualizacao de arquivos do Google Drive e log de auditoria.
 *
 * Isso aqui e absolute cinema -- tudo que o analista precisa em um so lugar.
 * Ainda bem que a AI me ajudou nisso kkk, imagina fazer isso tudo na mao
 */
const Approvals = (() => {
    let checkings = [];
    let auditLog = [];
    let filterStatus = 'all';
    let filterApproval = 'all';
    let searchTerm = '';
    let currentPage = 1;
    const perPage = 15;   // 15 por pagina, senao fica muito grande

    // Carrega todos os checkings do backend
    // Uma chamada e traz tudo -- simples e direto
    async function load() {
        try {
            const data = await API.getAllCheckings();
            checkings = data.checkings || (Array.isArray(data) ? data : []);
            renderTable();
            updateCounts();
            buildAuditLogFromCheckings();
        } catch (e) { console.error('Approvals load:', e); }
    }

    // Monta o log de auditoria a partir dos checkings ja processados
    // Cada aprovacao e reprovacao vira um registro no log
    // Isso me deu um pouco de trabalho pra ordenar por data certinho
    function buildAuditLogFromCheckings() {
        auditLog = [];
        checkings.forEach(c => {
            const st = (c.status || '').toLowerCase();
            if (st === 'approved' || st === 'rejected') {
                const ts = c.approved_at || c.rejected_at || '';
                let formattedTs = '';
                if (ts) {
                    try { formattedTs = new Date(ts).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }); }
                    catch { formattedTs = ts; }
                }
                auditLog.push({
                    action: st === 'approved' ? 'approve' : 'reject',
                    id: c.submission_id || '',
                    cliente: c.cliente || '',
                    user: c.approval_user || 'Sistema',
                    reason: c.rejection_reason || '',
                    timestamp: formattedTs || 'Sem data'
                });
            }
        });
        // Ordena pelos mais recentes primeiro -- quem quer ver coisa velha?
        auditLog.sort((a, b) => {
            const da = new Date(a.timestamp.split('/').reverse().join('-') || 0);
            const db = new Date(b.timestamp.split('/').reverse().join('-') || 0);
            return db - da;
        });
        renderAuditLog();
    }

    // Filtra os checkings pela combinacao de status + busca textual
    // Da pra filtrar por tudo: status, cliente, PI, veiculo, responsavel
    function getFiltered() {
        return checkings.filter(c => {
            const st = (c.status || '').toLowerCase();
            if (filterStatus !== 'all') {
                if (filterStatus === 'approved' && st !== 'approved') return false;
                if (filterStatus === 'rejected' && st !== 'rejected') return false;
                if (filterStatus === 'pending' && st !== 'pending') return false;
            }
            if (filterApproval !== 'all' && st !== filterApproval) return false;
            if (searchTerm) {
                const s = searchTerm.toLowerCase();
                const txt = `${c.n_pi} ${c.cliente} ${c.veiculo} ${c.nome_contato} ${c.approval_user || ''}`.toLowerCase();
                if (!txt.includes(s)) return false;
            }
            return true;
        });
    }

    // Renderiza a tabela de checkings com paginacao
    // Cada linha mostra: ID, cliente, PI, veiculo, meio, tipo, pasta, status, responsavel e acoes
    // Isso aqui e cinema puro -- cada detalhe pensado pra facilitar a vida do analista
    function renderTable() {
        const tbody = document.getElementById('checkingsBody');
        if (!tbody) return;
        const f = getFiltered();
        const pages = Math.ceil(f.length / perPage) || 1;
        if (currentPage > pages) currentPage = pages;
        const start = (currentPage - 1) * perPage;
        const items = f.slice(start, start + perPage);

        // Atualiza contadores e paginacao
        const showEl = document.getElementById('showCount');
        const totalEl = document.getElementById('totalCount');
        const pageEl = document.getElementById('pageInfo');
        if (showEl) showEl.textContent = items.length;
        if (totalEl) totalEl.textContent = f.length;
        if (pageEl) pageEl.textContent = `${currentPage}/${pages}`;

        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        if (prevBtn) prevBtn.disabled = currentPage <= 1;
        if (nextBtn) nextBtn.disabled = currentPage >= pages;

        // Gera o HTML de cada linha da tabela
        // Badge de status colorido, link pro Drive, botao de review
        tbody.innerHTML = items.map(c => {
            const st = (c.status || 'pending').toLowerCase();
            const badge = st === 'approved' ? '<span class="status-badge badge-approved"><span class="material-symbols-outlined">verified</span>Aprovado</span>'
                : st === 'rejected' ? '<span class="status-badge badge-rejected"><span class="material-symbols-outlined">cancel</span>Reprovado</span>'
                    : '<span class="status-badge badge-pending"><span class="material-symbols-outlined">pending</span>Pendente</span>';

            const driveLink = c.webViewLink ? `<a href="${c.webViewLink}" target="_blank" class="drive-link"><span class="material-symbols-outlined" style="font-size:16px">folder_open</span>Abrir</a>` : '';

            const resp = c.approval_user ? `<span class="user-pill"><span class="material-symbols-outlined">person</span>${c.approval_user}</span>` : '';

            // Botao OPEN REVIEW -- manda pra pagina de review detalhado
            const reviewBtn = `<a href="review.html?id=${encodeURIComponent(c.submission_id || '')}" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:var(--text-primary);color:var(--bg-primary);text-decoration:none;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border:1px solid var(--text-primary);transition:all 0.2s"><span class="material-symbols-outlined" style="font-size:16px">terminal</span> OPEN REVIEW</a>`;

            let actions = `<div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;align-items:center">${reviewBtn}</div>`;

            // Mostra motivo da reprovacao se tiver
            const reason = st === 'rejected' && c.rejection_reason ? `<br><span style="font-size:10px;color:var(--accent-red);max-width:120px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${c.rejection_reason}">${c.rejection_reason}</span>` : '';

            // Badge de NOVO ou COMPLEMENTO
            const complementBadge = Number(c.is_complement) === 1 ? '<span class="status-badge" style="background:var(--bg-secondary);color:var(--accent-amber);border:1px solid var(--accent-amber);font-size:9px;padding:2px 6px">COMPL</span>' : '<span class="status-badge" style="background:var(--bg-secondary);color:var(--text-tertiary);border:1px solid var(--border-primary);font-size:9px;padding:2px 6px">NOVO</span>';

            return `<tr>
        <td class="mono">${c.submission_id || ''}</td>
        <td style="font-weight:600">${c.cliente || ''}</td>
        <td class="mono">${c.n_pi || ''}</td>
        <td style="color:var(--text-secondary);font-size:12px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${c.veiculo || ''}">${c.veiculo || ''}</td>
        <td style="font-size:11px;color:var(--text-secondary)">${c.meio || '-'}</td>
        <td style="text-align:center">${complementBadge}</td>
        <td style="text-align:center">${driveLink}</td>
        <td style="text-align:center">${badge}${reason}</td>
        <td style="text-align:center;font-family:var(--font-mono);font-size:11px;color:${Number(c.rejection_count || 0) > 0 ? 'var(--accent-red)' : 'var(--text-tertiary)'}">${c.rejection_count || '0'}</td>
        <td style="text-align:center">${resp}</td>
        <td style="text-align:center" class="no-print">${actions}</td>
      </tr>`;
        }).join('');
    }

    // Atualiza o contador de pendentes na aba
    function updateCounts() {
        const pending = checkings.filter(c => (c.status || '').toLowerCase() === 'pending').length;
        const cEl = document.getElementById('tabPendingCount');
        if (cEl) cEl.textContent = pending;
        const bEl = document.getElementById('pendingBadge');
        if (bEl) {
            if (pending > 0) { bEl.style.display = 'flex'; document.getElementById('pendingBadgeNum').textContent = pending; }
            else bEl.style.display = 'none';
        }
    }

    // ══ Modal de Aprovacao ═════════════════════════════════════════
    // SweetAlert2 customizado com tema dark/light
    // Caixa verde bonita com o nome do cliente e campo de responsavel
    // Agora ta legal, agora vai funcionar
    async function openApprove(sid, clienteEnc) {
        const id = decodeURIComponent(sid);
        const cliente = decodeURIComponent(clienteEnc);
        const user = API.getUser();
        const dk = document.documentElement.getAttribute('data-theme') === 'dark';

        const { isConfirmed, value } = await Swal.fire({
            title: 'Confirmar Aprovacao',
            html: `<div style="text-align:left">
        <div style="display:flex;align-items:center;gap:12px;padding:14px;background:${dk ? 'rgba(34,197,94,0.08)' : '#f0fdf4'};border:1.5px solid ${dk ? 'rgba(34,197,94,0.2)' : '#bbf7d0'};border-radius:12px;margin-bottom:16px">
          <span class="material-symbols-outlined" style="font-size:32px;color:#22c55e;font-variation-settings:'FILL' 1">verified</span>
          <div><p style="font-weight:700;font-size:14px;margin:0">${cliente}</p><p style="font-size:11px;color:${dk ? '#86efac' : '#16a34a'};margin:2px 0 0">ID: ${id}</p></div>
        </div>
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:${dk ? '#94a3b8' : '#374151'};display:block;margin-bottom:6px">Responsavel</label>
        <input id="swalApprover" value="${user?.name || ''}" placeholder="Seu nome..." style="width:100%;padding:10px 12px;border:1.5px solid ${dk ? '#333' : '#d1d5db'};border-radius:8px;font-size:13px;background:${dk ? '#111' : '#fff'};color:${dk ? '#f1f5f9' : '#111'};outline:none;box-sizing:border-box"/>
      </div>`,
            showCancelButton: true,
            confirmButtonText: 'Confirmar Aprovacao',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#22c55e',
            background: dk ? '#0f1629' : '#fff',
            color: dk ? '#f1f5f9' : '#111',
            preConfirm: () => document.getElementById('swalApprover').value.trim() || 'Equipe Grupo OM'
        });

        if (isConfirmed) {
            try {
                await API.approve(id, value);
                addAuditEntry('approve', id, cliente, value);
                const c = checkings.find(x => x.submission_id === id);
                if (c) { c.status = 'approved'; c.approval_user = value; }
                renderTable(); updateCounts();
                Dashboard.refreshStats();
                showToast('Aprovacao registrada com sucesso!', 'success');
            } catch (e) { showToast(e.message, 'error'); }
        }
    }

    // ══ Modal de Reprovacao ════════════════════════════════════════
    // SweetAlert2 com campo de motivo obrigatorio -- nenhuma reprovacao sem justificativa
    // Caixa vermelha intensa, da pra sentir o peso da decisao kkk
    async function openReject(sid, clienteEnc) {
        const id = decodeURIComponent(sid);
        const cliente = decodeURIComponent(clienteEnc);
        const user = API.getUser();
        const dk = document.documentElement.getAttribute('data-theme') === 'dark';

        const { isConfirmed, value } = await Swal.fire({
            title: 'Reprovar Checking',
            html: `<div style="text-align:left">
        <div style="display:flex;align-items:center;gap:12px;padding:14px;background:${dk ? 'rgba(239,68,68,0.08)' : '#fef2f2'};border:1.5px solid ${dk ? 'rgba(239,68,68,0.2)' : '#fecaca'};border-radius:12px;margin-bottom:16px">
          <span class="material-symbols-outlined" style="font-size:32px;color:#ef4444;font-variation-settings:'FILL' 1">cancel</span>
          <div><p style="font-weight:700;font-size:14px;margin:0">${cliente}</p><p style="font-size:11px;color:${dk ? '#fca5a5' : '#ef4444'};margin:2px 0 0">ID: ${id}</p></div>
        </div>
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:${dk ? '#94a3b8' : '#374151'};display:block;margin-bottom:6px">Responsavel</label>
        <input id="swalRejecter" value="${user?.name || ''}" placeholder="Seu nome..." style="width:100%;padding:10px 12px;border:1.5px solid ${dk ? '#333' : '#d1d5db'};border-radius:8px;font-size:13px;background:${dk ? '#111' : '#fff'};color:${dk ? '#f1f5f9' : '#111'};outline:none;margin-bottom:12px;box-sizing:border-box"/>
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:${dk ? '#94a3b8' : '#374151'};display:block;margin-bottom:6px">Motivo <span style="color:#ef4444">*</span></label>
        <textarea id="swalReason" rows="3" placeholder="Descreva os pontos que precisam ser corrigidos..." style="width:100%;padding:10px 12px;border:1.5px solid ${dk ? '#333' : '#d1d5db'};border-radius:8px;font-size:13px;background:${dk ? '#111' : '#fff'};color:${dk ? '#f1f5f9' : '#111'};outline:none;resize:vertical;box-sizing:border-box"></textarea>
      </div>`,
            showCancelButton: true,
            confirmButtonText: 'Enviar Reprovacao',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
            background: dk ? '#0f1629' : '#fff',
            color: dk ? '#f1f5f9' : '#111',
            preConfirm: () => {
                const reason = document.getElementById('swalReason').value.trim();
                if (!reason) { Swal.showValidationMessage('Informe o motivo da reprovacao'); return false; }
                return { reason, approver: document.getElementById('swalRejecter').value.trim() || 'Equipe Grupo OM' };
            }
        });

        if (isConfirmed) {
            try {
                await API.reject(id, value.approver, value.reason);
                addAuditEntry('reject', id, cliente, value.approver, value.reason);
                const c = checkings.find(x => x.submission_id === id);
                if (c) { c.status = 'rejected'; c.approval_user = value.approver; c.rejection_reason = value.reason; }
                renderTable(); updateCounts();
                Dashboard.refreshStats();
                showToast('Reprovacao registrada, fornecedor notificado.', 'success');
            } catch (e) { showToast(e.message, 'error'); }
        }
    }

    // ══ Modal de Visualizacao de Arquivos ══════════════════════════
    // Busca os arquivos do Google Drive e mostra em grid
    // Cada arquivo com thumbnail, icone, tipo e link pra abrir
    // Isso me deu um pouco de trabalho pra organizar por endereco
    async function openFiles(id, pi) {
        const dk = document.documentElement.getAttribute('data-theme') === 'dark';
        Swal.fire({
            title: `Carregando arquivos (PI: ${pi})...`,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
            background: dk ? '#0f1629' : '#fff',
            color: dk ? '#f1f5f9' : '#111'
        });

        try {
            const res = await API.getFiles(id);
            if (!res.success) throw new Error(res.error || 'Erro ao carregar arquivos');

            const filesByEnd = res.files_by_endereco || {};
            const total = res.total || 0;

            if (total === 0) {
                Swal.fire({
                    icon: 'info', title: 'Nenhum arquivo', text: 'Nao ha arquivos anexados ou nao puderam ser carregados.',
                    background: dk ? '#0f1629' : '#fff', color: dk ? '#f1f5f9' : '#111'
                }); return;
            }

            // Monta o grid de arquivos separado por endereco
            let html = '<div style="text-align:left;max-height:60vh;overflow-y:auto;padding-right:8px;display:flex;flex-direction:column;gap:16px;">';

            for (const [endereco, files] of Object.entries(filesByEnd)) {
                const endTitle = endereco === '_sem_endereco' ? 'Arquivos Gerais' : endereco;
                html += `<div>
                    <h4 style="font-size:13px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${dk ? '#94a3b8' : '#475569'};margin-bottom:8px;border-bottom:1px solid ${dk ? '#1e293b' : '#e2e8f0'};padding-bottom:4px">${endTitle}</h4>
                    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));gap:12px;">`;

                for (const f of files) {
                    const isImg = f.isImage;
                    const icon = isImg ? 'image' : (f.isPdf ? 'picture_as_pdf' : (f.isVideo ? 'play_circle' : 'insert_drive_file'));
                    const color = isImg ? '#3b82f6' : (f.isPdf ? '#ef4444' : (f.isVideo ? '#8b5cf6' : '#64748b'));

                    const bg = isImg && f.thumbnailUrl ? `background-image:url('${f.thumbnailUrl}');background-size:cover;background-position:center` : `background:${dk ? '#111827' : '#f8fafc'}`;

                    html += `
                    <a href="${f.viewUrl || f.downloadUrl}" target="_blank" style="text-decoration:none;display:flex;flex-direction:column;border:1px solid ${dk ? '#1e293b' : '#e2e8f0'};border-radius:8px;overflow:hidden;transition:all 0.2s;color:inherit;box-shadow:0 1px 2px rgba(0,0,0,0.05)" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 1px 2px rgba(0,0,0,0.05)'">
                        <div style="height:90px;width:100%;${bg};display:flex;align-items:center;justify-content:center;position:relative">
                            ${!isImg || !f.thumbnailUrl ? `<span class="material-symbols-outlined" style="font-size:32px;color:${color}">${icon}</span>` : ''}
                        </div>
                        <div style="padding:8px 10px;background:${dk ? '#0f1629' : '#fff'};font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${f.detalhe}">
                            ${f.detalhe}
                        </div>
                    </a>`;
                }
                html += `</div></div>`;
            }
            html += '</div>';

            Swal.fire({
                title: `Arquivos — PI: ${pi}`,
                html: html,
                width: 700,
                showCloseButton: true,
                showConfirmButton: false,
                background: dk ? '#0f1629' : '#fff',
                color: dk ? '#f1f5f9' : '#111'
            });

        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Erro', text: e.message, background: dk ? '#0f1629' : '#fff', color: dk ? '#f1f5f9' : '#111' });
        }
    }

    // ══ Log de Auditoria ══════════════════════════════════════════
    // Adiciona uma entrada nova no topo do log -- mais recente primeiro
    function addAuditEntry(action, id, cliente, user, reason) {
        auditLog.unshift({
            action, id, cliente, user, reason,
            timestamp: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        });
        renderAuditLog();
    }

    // Renderiza o log de auditoria com icones e texto formatado
    // Busca textual funciona aqui tambem -- da pra filtrar por qualquer campo
    function renderAuditLog(query = '') {
        const el = document.getElementById('auditLogList');
        if (!el) return;

        let logs = auditLog;
        if (query) {
            const q = query.toLowerCase();
            logs = auditLog.filter(e => {
                const searchStr = `${e.action} ${e.id} ${e.cliente} ${e.user} ${e.reason || ''}`.toLowerCase();
                return searchStr.includes(q);
            });
        }

        if (logs.length === 0) {
            el.innerHTML = '<div class="empty-state" style="padding:30px"><span class="material-symbols-outlined">history</span><h4>Nenhum registro encontrado</h4><p>Nenhuma atividade corresponde a sua busca.</p></div>';
            return;
        }

        // Mostra ate 20 registros -- os mais recentes
        el.innerHTML = logs.slice(0, 20).map(e => {
            const isApprove = e.action === 'approve';
            return `<div class="audit-log-item anim-fade-up">
        <div class="audit-log-icon ${isApprove ? 'approve' : 'reject'}">
          <span class="material-symbols-outlined">${isApprove ? 'check_circle' : 'block'}</span>
        </div>
        <div class="audit-log-content">
          <p class="audit-log-text"><strong>${e.user}</strong> ${isApprove ? 'aprovou' : 'reprovou'} o checking <strong>${e.cliente}</strong> (${e.id})${e.reason ? ` Motivo: ${e.reason}` : ''}</p>
          <p class="audit-log-time">${e.timestamp}</p>
        </div>
      </div>`;
        }).join('');
    }

    // ══ Toast de Notificacao ══════════════════════════════════════
    // SweetAlert2 toast no canto superior direito -- aparece e some
    function showToast(msg, type = 'info') {
        Swal.fire({
            toast: true, position: 'top-end', icon: type === 'error' ? 'error' : 'success',
            title: msg, showConfirmButton: false, timer: 3500, timerProgressBar: true,
            background: document.documentElement.getAttribute('data-theme') === 'dark' ? '#0f1629' : '#fff',
            color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#f1f5f9' : '#111'
        });
    }

    // ══ Filtros e Paginacao ═══════════════════════════════════════
    // Cada funcao reseta a pagina pro inicio e re-renderiza a tabela
    function setFilterStatus(s) { filterStatus = s; currentPage = 1; renderTable(); }
    function setFilterApproval(s) { filterApproval = s; currentPage = 1; renderTable(); }
    function setSearch(s) { searchTerm = s; currentPage = 1; renderTable(); }
    function prevPage() { if (currentPage > 1) { currentPage--; renderTable(); } }
    function nextPage() { const p = Math.ceil(getFiltered().length / perPage); if (currentPage < p) { currentPage++; renderTable(); } }

    // Retorna os checkings pro uso externo (graficos, PDF, etc)
    function getCheckings() { return checkings; }

    return { load, renderTable, updateCounts, openApprove, openReject, openFiles, renderAuditLog, setFilterStatus, setFilterApproval, setSearch, prevPage, nextPage, getCheckings };
})();
