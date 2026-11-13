
DROP DATABASE IF EXISTS StreamGuard;
CREATE DATABASE StreamGuard;
USE StreamGuard;

CREATE TABLE empresa (
    id_empresa INT AUTO_INCREMENT PRIMARY KEY,
    razao_social VARCHAR(100) NOT NULL,
    cnpj CHAR(14) NOT NULL UNIQUE,
    nome_resp VARCHAR(100),
    email VARCHAR(100),
    telefone CHAR(13),
    codigo_empresa CHAR(8) NOT NULL UNIQUE
);

CREATE TABLE permissao (
    id_permissao INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL
);

CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cargo VARCHAR(50),
    email VARCHAR(100) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    fk_empresa INT NOT NULL,
    fk_permissao INT NOT NULL,

    FOREIGN KEY (fk_empresa)
        REFERENCES empresa(id_empresa),

    FOREIGN KEY (fk_permissao)
        REFERENCES permissao(id_permissao)
);

CREATE TABLE equipamentos (
    id_equipamentos INT AUTO_INCREMENT PRIMARY KEY,
    hostname VARCHAR(100) NOT NULL,
    codigo_agente VARCHAR(64) NOT NULL UNIQUE,
    sistema_operacional VARCHAR(100),
    versao_so VARCHAR(100),
    arquitetura VARCHAR(50),
    tipo VARCHAR(45),
    ip VARCHAR(50),
    status VARCHAR(20),
    dt_atualizacao DATETIME,
    fk_empresa INT NOT NULL,

    FOREIGN KEY (fk_empresa)
        REFERENCES empresa(id_empresa)
);

CREATE TABLE componente (
    id_componente INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL
);

CREATE TABLE equipamento_componente (
    id_equipamento_componente INT AUTO_INCREMENT PRIMARY KEY,
    fk_equipamento INT NOT NULL,
    fk_componente INT NOT NULL,
    data_instalacao DATETIME,
    status VARCHAR(20),

    FOREIGN KEY (fk_equipamento)
        REFERENCES equipamentos(id_equipamentos),

    FOREIGN KEY (fk_componente)
        REFERENCES componente(id_componente)
);

CREATE TABLE metrica (
    id_metrica INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    unidade VARCHAR(20),
    fk_componente INT NOT NULL,

    FOREIGN KEY (fk_componente)
        REFERENCES componente(id_componente)
);

CREATE TABLE config_metrica (
    id_config_metrica INT AUTO_INCREMENT PRIMARY KEY,
    habilitado TINYINT(1) NOT NULL DEFAULT 1,
    intervalo_coleta INT NOT NULL,
    limite_maximo DECIMAL(10,2),
    limite_minimo DECIMAL(10,2),
    fk_equipamento_componente INT NOT NULL,
    fk_metrica INT NOT NULL,

    FOREIGN KEY (fk_equipamento_componente)
        REFERENCES equipamento_componente(id_equipamento_componente),

    FOREIGN KEY (fk_metrica)
        REFERENCES metrica(id_metrica),

    UNIQUE (fk_equipamento_componente, fk_metrica)
);

-- DADOS DE TESTE

INSERT INTO empresa
(razao_social, cnpj, nome_resp, email, telefone, codigo_empresa)
VALUES
('Tech Stream Ltda', '12345678000199', 'Maria Silva',
 'contato@techstream.com', '5511999999999', 'ABC12345');

INSERT INTO permissao (nome)
VALUES ('Administrador'), ('Analista');

INSERT INTO usuario
(nome, cargo, email, senha_hash, fk_empresa, fk_permissao)
VALUES
('Joao Souza', 'Analista de TI', 'joao@techstream.com',
 'hash_exemplo', 1, 1);

INSERT INTO equipamentos
(hostname, codigo_agente, sistema_operacional, versao_so,
 arquitetura, tipo, ip, status, dt_atualizacao, fk_empresa)
VALUES
('srv-stream-01', 'AGENTE-0001', 'Ubuntu', '22.04',
 'x86_64', 'Servidor', '192.168.0.10', 'Ativo', NOW(), 1);

INSERT INTO componente (nome, tipo)
VALUES
('Processador', 'CPU'),
('Memória RAM', 'RAM'),
('Disco', 'Armazenamento');

INSERT INTO equipamento_componente
(fk_equipamento, fk_componente, data_instalacao, status)
VALUES
(1, 1, NOW(), 'Ativo'),
(1, 2, NOW(), 'Ativo'),
(1, 3, NOW(), 'Ativo');

INSERT INTO metrica (tipo, nome, unidade, fk_componente)
VALUES
('Uso', 'Uso da CPU', '%', 1),
('Uso', 'Uso da Memória', '%', 2),
('Uso', 'Uso do Disco', '%', 3);

INSERT INTO config_metrica
(habilitado, intervalo_coleta, limite_maximo,
 limite_minimo, fk_equipamento_componente, fk_metrica)
VALUES
(1, 5, 90.00, 0.00, 1, 1),
(1, 5, 85.00, 0.00, 2, 2),
(1, 10, 90.00, 0.00, 3, 3);

-- CONSULTA PARA TESTAR OS RELACIONAMENTOS

SELECT
    e.razao_social,
    eq.hostname,
    c.nome AS componente,
    c.tipo AS tipo_componente,
    m.nome AS metrica,
    cm.intervalo_coleta,
    cm.limite_maximo
FROM empresa e
JOIN equipamentos eq
    ON eq.fk_empresa = e.id_empresa
JOIN equipamento_componente ec
    ON ec.fk_equipamento = eq.id_equipamentos
JOIN componente c
    ON c.id_componente = ec.fk_componente
JOIN metrica m
    ON m.fk_componente = c.id_componente
JOIN config_metrica cm
    ON cm.fk_equipamento_componente = ec.id_equipamento_componente
    AND cm.fk_metrica = m.id_metrica;
