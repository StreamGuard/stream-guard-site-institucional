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
    FOREIGN KEY (fk_empresa) REFERENCES empresa(id_empresa),
    FOREIGN KEY (fk_permissao) REFERENCES permissao(id_permissao)
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
    fk_equipamento INT NOT NULL,
    FOREIGN KEY (fk_equipamento) REFERENCES empresa(id_empresa)
);

CREATE TABLE componente (
    id_componente INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100),
    tipo VARCHAR(50) NOT NULL,
    fk_servidor INT NOT NULL,
    FOREIGN KEY (fk_servidor) REFERENCES equipamentos(id_equipamentos)
);

CREATE TABLE metrica (
    id_metrica INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    unidade VARCHAR(20),
    fk_componente INT NOT NULL,
    FOREIGN KEY (fk_componente) REFERENCES componente(id_componente)
);

CREATE TABLE config_metrica (
    id_config_metrica INT AUTO_INCREMENT PRIMARY KEY,
    habilitado TINYINT(1) NOT NULL DEFAULT 1,
    intervalo_coleta INT NOT NULL,
    limite_maximo DECIMAL(10,2),
    limite_minimo DECIMAL(10,2),
    fk_metrica INT NOT NULL,
    FOREIGN KEY (fk_metrica) REFERENCES metrica(id_metrica)
);

INSERT INTO empresa (razao_social, cnpj, nome_resp, email, telefone, codigo_empresa)
VALUES ('Tech Stream Ltda', '12345678000199', 'Maria Silva', 'contato@techstream.com', '5511999999999', 'ABC12345');

INSERT INTO permissao (nome) VALUES ('Administrador'), ('Analista');

INSERT INTO usuario (nome, cargo, email, senha_hash, fk_empresa, fk_permissao)
VALUES ('Joao Souza', 'Analista de TI', 'joao@techstream.com', 'hash_exemplo', 1, 1);

INSERT INTO equipamentos (hostname, codigo_agente, sistema_operacional, versao_so, arquitetura, tipo, ip, status, dt_atualizacao, fk_equipamento)
VALUES ('srv-stream-01', 'AGENTE-0001', 'Ubuntu', '22.04', 'x86_64', 'Servidor', '192.168.0.10', 'Ativo', NOW(), 1);

INSERT INTO componente (nome, tipo, fk_servidor) VALUES ('Processador', 'CPU', 1);

INSERT INTO metrica (tipo, nome, unidade, fk_componente) VALUES ('Uso', 'Uso da CPU', '%', 1);

INSERT INTO config_metrica (habilitado, intervalo_coleta, limite_maximo, limite_minimo, fk_metrica)
VALUES (1, 5, 90.00, 0.00, 1);

SELECT e.razao_social, eq.hostname, c.tipo AS componente, m.nome AS metrica, cm.limite_maximo
FROM empresa e
JOIN equipamentos eq ON eq.fk_equipamento = e.id_empresa
JOIN componente c ON c.fk_servidor = eq.id_equipamentos
JOIN metrica m ON m.fk_componente = c.id_componente
JOIN config_metrica cm ON cm.fk_metrica = m.id_metrica;