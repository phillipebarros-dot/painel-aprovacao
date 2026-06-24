#!/usr/bin/env python3
"""
Aplica headers de seguranca em TODOS os nos Respond to Webhook do fluxo n8n.
NAO usa scripts. Apenas modifica a configuracao nativa dos nos (responseHeaders).
"""
import json
import copy
import sys

WORKFLOW_PATH = r"n8n\Painel de aprovacao l TESTE - FLUXO COMPLETO.json"

# Headers de seguranca obrigatorios para TODOS os nos respondToWebhook
REQUIRED_SECURITY_HEADERS = [
    {"name": "X-Content-Type-Options", "value": "nosniff"},
    {"name": "X-Frame-Options", "value": "DENY"},
    {"name": "X-XSS-Protection", "value": "0"},
    {"name": "Referrer-Policy", "value": "no-referrer"},
    {"name": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), interest-cohort=()"},
    {"name": "Content-Security-Policy", "value": "default-src 'none'; frame-ancestors 'none'"},
    {"name": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains; preload"},
]

# Headers que devem existir se NAO existirem (nao sobrescreve se ja tem)
DEFAULT_HEADERS_IF_MISSING = [
    {"name": "Cache-Control", "value": "no-store, no-cache, must-revalidate"},
]

def main():
    with open(WORKFLOW_PATH, "r", encoding="utf-8") as f:
        wf = json.load(f)

    modified_count = 0
    headers_added = 0

    for node in wf.get("nodes", []):
        if node.get("type") != "n8n-nodes-base.respondToWebhook":
            continue

        # Garantir estrutura de options.responseHeaders.entries
        if "parameters" not in node:
            node["parameters"] = {}
        params = node["parameters"]

        if "options" not in params:
            params["options"] = {}
        opts = params["options"]

        if "responseHeaders" not in opts:
            opts["responseHeaders"] = {}
        rh = opts["responseHeaders"]

        if "entries" not in rh:
            rh["entries"] = []
        entries = rh["entries"]

        # Coletar headers existentes (por nome, case-insensitive)
        existing_names = {e["name"].lower(): i for i, e in enumerate(entries)}

        node_modified = False

        # Aplicar headers de seguranca obrigatorios (sobrescreve se existir)
        for hdr in REQUIRED_SECURITY_HEADERS:
            lower_name = hdr["name"].lower()
            if lower_name in existing_names:
                idx = existing_names[lower_name]
                if entries[idx]["value"] != hdr["value"]:
                    entries[idx]["value"] = hdr["value"]
                    node_modified = True
                    headers_added += 1
            else:
                entries.append({"name": hdr["name"], "value": hdr["value"]})
                existing_names[lower_name] = len(entries) - 1
                node_modified = True
                headers_added += 1

        # Aplicar headers default (apenas se nao existirem)
        for hdr in DEFAULT_HEADERS_IF_MISSING:
            lower_name = hdr["name"].lower()
            if lower_name not in existing_names:
                entries.append({"name": hdr["name"], "value": hdr["value"]})
                existing_names[lower_name] = len(entries) - 1
                node_modified = True
                headers_added += 1

        if node_modified:
            modified_count += 1
            print(f"  [OK] {node['name']} -> {len(entries)} headers")

    # Salvar
    with open(WORKFLOW_PATH, "w", encoding="utf-8") as f:
        json.dump(wf, f, indent=2, ensure_ascii=False)

    print(f"\n=== RESULTADO ===")
    print(f"  Nos modificados: {modified_count}")
    print(f"  Headers adicionados/atualizados: {headers_added}")
    print(f"  Arquivo salvo: {WORKFLOW_PATH}")

if __name__ == "__main__":
    main()
