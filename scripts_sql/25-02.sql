CREATE TABLE whatsapp_fila (
    id INT AUTO_INCREMENT PRIMARY KEY,
    destinatario VARCHAR(20) NOT NULL, -- Número do WhatsApp (com DDI e DDD)
    mensagem TEXT NOT NULL, -- Conteúdo da mensagem
    status ENUM('pendente', 'enviando', 'enviado', 'falha') DEFAULT 'pendente',
    tentativas INT DEFAULT 0, -- Quantidade de tentativas de envio
    resposta TEXT NULL, -- Resposta da API do WhatsApp (se aplicável)
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Data de criação
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

insert into versaodb (versao) values ("25.02.01");