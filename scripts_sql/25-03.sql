CREATE TABLE accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    last_access DATETIME NOT NULL,
    type VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    image VARCHAR(500) NOT NULL,
    visible BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Criar índices para melhorar a performance em buscas
CREATE INDEX idx_user ON accounts(user);
CREATE INDEX idx_type ON accounts(type);
CREATE INDEX idx_name ON accounts(name);

insert into versaodb (versao) values ("25.03.01");
