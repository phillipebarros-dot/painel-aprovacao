# Painel de Checking — imagem estática servida por nginx (Cloud Run)
# O app é estático (index.html + React/Babel no navegador), então só servimos os arquivos.
FROM nginx:alpine

# Config do nginx ouvindo na porta do Cloud Run (8080)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia o site para o diretório servido
COPY . /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
