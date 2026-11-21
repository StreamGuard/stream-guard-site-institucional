
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
    codigo_empresa CHAR(8) NOT NULL UNIQUE,
    dt_cadastro DATETIME DEFAULT NOW()
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
    dt_ultimo_acesso DATETIME,
    ativo TINYINT(1) NOT NULL DEFAULT 1,

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

-- tipo UNIQUE: garante um único componente por tipo (CPU, RAM, ...),
-- evitando que o "SELECT ... WHERE tipo = X LIMIT 1" pegue um id diferente do atual
CREATE TABLE componente (
    id_componente INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL UNIQUE
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
        REFERENCES componente(id_componente),

    UNIQUE (fk_equipamento, fk_componente)
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
-- Sample data to test (optional) --------------------------

INSERT INTO permissao (nome) 
VALUES 
('Root'),
('Admin'),
('Gerente'),
('User');

INSERT INTO empresa
(razao_social, cnpj, nome_resp, email, telefone, codigo_empresa)
VALUES
('Tech Stream Ltda', '12345678000199', 'Maria Silva',
 'contato@techstream.com', '5511999999999', 'ABC12345');


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
('Disco', 'Armazenamento'),
('Rede', 'Rede');

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

INSERT INTO metrica (tipo, nome, unidade, fk_componente)
SELECT 'Uso', 'Uso da Rede', '%', id_componente
FROM componente
WHERE tipo = 'Rede';

INSERT INTO config_metrica
(habilitado, intervalo_coleta, limite_maximo,
 limite_minimo, fk_equipamento_componente, fk_metrica)
VALUES
(1, 5, 90.00, 0.00, 1, 1),
(1, 5, 85.00, 0.00, 2, 2),
(1, 10, 90.00, 0.00, 3, 3);

INSERT INTO empresa
(razao_social, cnpj, nome_resp, email, telefone, codigo_empresa, dt_cadastro)
VALUES
('Stream Prime Ltda', '23456789000188', 'Ana Beatriz', 'contato@streamprime.com', '5511988880002', 'DEF23456', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('LiveCast Brasil', '34567890000177', 'Bruno Costa', 'contato@livecast.com.br', '5511988880003', 'GHI34567', DATE_SUB(NOW(), INTERVAL 20 HOUR)),
('PlayStream Media', '45678901000166', 'Carla Mendes', 'contato@playstream.com', '5511988880004', 'JKL45678', DATE_SUB(NOW(), INTERVAL 3 DAY)),
('CineWave Digital', '56789012000155', 'Diego Alves', 'contato@cinewave.com.br', '5511988880005', 'MNO56789', DATE_SUB(NOW(), INTERVAL 6 DAY)),
('TurboCast Ltda', '67890123000144', 'Elisa Ramos', 'contato@turbocast.com', '5511988880006', 'PQR67890', DATE_SUB(NOW(), INTERVAL 12 DAY)),
('NexoPlay Streaming', '78901234000133', 'Felipe Nunes', 'contato@nexoplay.com.br', '5511988880007', 'STU78901', DATE_SUB(NOW(), INTERVAL 25 DAY)),
('AlphaStream Brasil', '89012345000122', 'Gabriela Rocha', 'contato@alphastream.com', '5511988880008', 'VWX89012', DATE_SUB(NOW(), INTERVAL 40 DAY)),
('OndaMedia Ltda', '90123456000111', 'Henrique Dias', 'contato@ondamedia.com.br', '5511988880009', 'YZA90123', DATE_SUB(NOW(), INTERVAL 90 DAY)),
('VisionPlay Tech', '01234567000100', 'Isabela Freitas', 'contato@visionplay.com', '5511988880010', 'BCD01234', DATE_SUB(NOW(), INTERVAL 200 DAY)),
('Broadcast+ Ltda', '11223344000155', 'João Pedro', 'contato@broadcastplus.com.br', '5511988880011', 'EFG11223', DATE_SUB(NOW(), INTERVAL 400 DAY));


INSERT INTO usuario
(nome, cargo, email, senha_hash, fk_empresa, fk_permissao, dt_ultimo_acesso)
VALUES
('Marina Prado', 'Administradora', 'admin.prime@streamprime.com', 'hash_exemplo', 2, 2, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('Rafael Lima', 'Gerente de TI', 'gerente.prime@streamprime.com', 'hash_exemplo', 2, 3, DATE_SUB(NOW(), INTERVAL 3 DAY)),
('Camila Souza', 'Analista', 'user.prime@streamprime.com', 'hash_exemplo', 2, 4, DATE_SUB(NOW(), INTERVAL 15 DAY)),

('Thiago Barros', 'Administrador', 'admin.livecast@livecast.com.br', 'hash_exemplo', 3, 2, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('Larissa Gomes', 'Gerente de TI', 'gerente.livecast@livecast.com.br', 'hash_exemplo', 3, 3, DATE_SUB(NOW(), INTERVAL 3 DAY)),
('Pedro Henrique', 'Analista', 'user.livecast@livecast.com.br', 'hash_exemplo', 3, 4, DATE_SUB(NOW(), INTERVAL 15 DAY)),

('Aline Martins', 'Administradora', 'admin.playstream@playstream.com', 'hash_exemplo', 4, 2, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('Gustavo Rocha', 'Gerente de TI', 'gerente.playstream@playstream.com', 'hash_exemplo', 4, 3, DATE_SUB(NOW(), INTERVAL 3 DAY)),
('Bianca Alves', 'Analista', 'user.playstream@playstream.com', 'hash_exemplo', 4, 4, DATE_SUB(NOW(), INTERVAL 15 DAY)),

('Renato Silva', 'Administrador', 'admin.cinewave@cinewave.com.br', 'hash_exemplo', 5, 2, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('Patrícia Melo', 'Gerente de TI', 'gerente.cinewave@cinewave.com.br', 'hash_exemplo', 5, 3, DATE_SUB(NOW(), INTERVAL 3 DAY)),
('Lucas Ferreira', 'Analista', 'user.cinewave@cinewave.com.br', 'hash_exemplo', 5, 4, DATE_SUB(NOW(), INTERVAL 15 DAY)),

('Fernanda Castro', 'Administradora', 'admin.turbocast@turbocast.com', 'hash_exemplo', 6, 2, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('Marcelo Pires', 'Gerente de TI', 'gerente.turbocast@turbocast.com', 'hash_exemplo', 6, 3, DATE_SUB(NOW(), INTERVAL 3 DAY)),
('Júlia Nogueira', 'Analista', 'user.turbocast@turbocast.com', 'hash_exemplo', 6, 4, DATE_SUB(NOW(), INTERVAL 15 DAY)),

('Ricardo Almeida', 'Administrador', 'admin.nexoplay@nexoplay.com.br', 'hash_exemplo', 7, 2, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('Sofia Cardoso', 'Gerente de TI', 'gerente.nexoplay@nexoplay.com.br', 'hash_exemplo', 7, 3, DATE_SUB(NOW(), INTERVAL 3 DAY)),
('Daniel Moreira', 'Analista', 'user.nexoplay@nexoplay.com.br', 'hash_exemplo', 7, 4, DATE_SUB(NOW(), INTERVAL 15 DAY)),

('Vanessa Ribeiro', 'Administradora', 'admin.alphastream@alphastream.com', 'hash_exemplo', 8, 2, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('Eduardo Santos', 'Gerente de TI', 'gerente.alphastream@alphastream.com', 'hash_exemplo', 8, 3, DATE_SUB(NOW(), INTERVAL 3 DAY)),
('Lorena Vieira', 'Analista', 'user.alphastream@alphastream.com', 'hash_exemplo', 8, 4, DATE_SUB(NOW(), INTERVAL 15 DAY)),

('Beatriz Carvalho', 'Administradora', 'admin.ondamedia@ondamedia.com.br', 'hash_exemplo', 9, 2, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('Fábio Teixeira', 'Gerente de TI', 'gerente.ondamedia@ondamedia.com.br', 'hash_exemplo', 9, 3, DATE_SUB(NOW(), INTERVAL 3 DAY)),
('Amanda Lopes', 'Analista', 'user.ondamedia@ondamedia.com.br', 'hash_exemplo', 9, 4, DATE_SUB(NOW(), INTERVAL 15 DAY)),

('César Azevedo', 'Administrador', 'admin.visionplay@visionplay.com', 'hash_exemplo', 10, 2, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('Natália Farias', 'Gerente de TI', 'gerente.visionplay@visionplay.com', 'hash_exemplo', 10, 3, DATE_SUB(NOW(), INTERVAL 3 DAY)),
('Vitor Hugo', 'Analista', 'user.visionplay@visionplay.com', 'hash_exemplo', 10, 4, DATE_SUB(NOW(), INTERVAL 15 DAY)),

('Débora Freitas', 'Administradora', 'admin.broadcast@broadcastplus.com.br', 'hash_exemplo', 11, 2, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('André Luiz', 'Gerente de TI', 'gerente.broadcast@broadcastplus.com.br', 'hash_exemplo', 11, 3, DATE_SUB(NOW(), INTERVAL 3 DAY)),
('Isabela Pinto', 'Analista', 'user.broadcast@broadcastplus.com.br', 'hash_exemplo', 11, 4, DATE_SUB(NOW(), INTERVAL 15 DAY));

INSERT INTO equipamentos
(hostname, codigo_agente, sistema_operacional, versao_so,
 arquitetura, tipo, ip, status, dt_atualizacao, fk_empresa)
VALUES
('srv-prime-01', 'AGENTE-0002', 'Ubuntu', '22.04', 'x86_64', 'Servidor', '10.0.2.11', 'Ativo', DATE_SUB(NOW(), INTERVAL 1 HOUR), 2),
('srv-prime-02', 'AGENTE-0003', 'Debian', '12', 'x86_64', 'Servidor', '10.0.2.12', 'Ativo', DATE_SUB(NOW(), INTERVAL 5 DAY), 2),
('srv-livecast-01', 'AGENTE-0004', 'Ubuntu', '22.04', 'x86_64', 'Servidor', '10.0.3.11', 'Ativo', DATE_SUB(NOW(), INTERVAL 1 HOUR), 3),
('srv-livecast-02', 'AGENTE-0005', 'Debian', '12', 'x86_64', 'Servidor', '10.0.3.12', 'Ativo', DATE_SUB(NOW(), INTERVAL 5 DAY), 3),
('srv-playstream-01', 'AGENTE-0006', 'Ubuntu', '22.04', 'x86_64', 'Servidor', '10.0.4.11', 'Ativo', DATE_SUB(NOW(), INTERVAL 1 HOUR), 4),
('srv-playstream-02', 'AGENTE-0007', 'Debian', '12', 'x86_64', 'Servidor', '10.0.4.12', 'Ativo', DATE_SUB(NOW(), INTERVAL 5 DAY), 4),
('srv-cinewave-01', 'AGENTE-0008', 'Ubuntu', '22.04', 'x86_64', 'Servidor', '10.0.5.11', 'Ativo', DATE_SUB(NOW(), INTERVAL 1 HOUR), 5),
('srv-cinewave-02', 'AGENTE-0009', 'Debian', '12', 'x86_64', 'Servidor', '10.0.5.12', 'Ativo', DATE_SUB(NOW(), INTERVAL 5 DAY), 5),
('srv-turbocast-01', 'AGENTE-0010', 'Ubuntu', '22.04', 'x86_64', 'Servidor', '10.0.6.11', 'Ativo', DATE_SUB(NOW(), INTERVAL 1 HOUR), 6),
('srv-turbocast-02', 'AGENTE-0011', 'Debian', '12', 'x86_64', 'Servidor', '10.0.6.12', 'Ativo', DATE_SUB(NOW(), INTERVAL 5 DAY), 6),
('srv-nexoplay-01', 'AGENTE-0012', 'Ubuntu', '22.04', 'x86_64', 'Servidor', '10.0.7.11', 'Ativo', DATE_SUB(NOW(), INTERVAL 1 HOUR), 7),
('srv-nexoplay-02', 'AGENTE-0013', 'Debian', '12', 'x86_64', 'Servidor', '10.0.7.12', 'Ativo', DATE_SUB(NOW(), INTERVAL 5 DAY), 7),
('srv-alphastream-01', 'AGENTE-0014', 'Ubuntu', '22.04', 'x86_64', 'Servidor', '10.0.8.11', 'Ativo', DATE_SUB(NOW(), INTERVAL 1 HOUR), 8),
('srv-alphastream-02', 'AGENTE-0015', 'Debian', '12', 'x86_64', 'Servidor', '10.0.8.12', 'Ativo', DATE_SUB(NOW(), INTERVAL 5 DAY), 8),
('srv-ondamedia-01', 'AGENTE-0016', 'Ubuntu', '22.04', 'x86_64', 'Servidor', '10.0.9.11', 'Ativo', DATE_SUB(NOW(), INTERVAL 1 HOUR), 9),
('srv-ondamedia-02', 'AGENTE-0017', 'Debian', '12', 'x86_64', 'Servidor', '10.0.9.12', 'Ativo', DATE_SUB(NOW(), INTERVAL 5 DAY), 9),
('srv-visionplay-01', 'AGENTE-0018', 'Ubuntu', '22.04', 'x86_64', 'Servidor', '10.0.10.11', 'Ativo', DATE_SUB(NOW(), INTERVAL 1 HOUR), 10),
('srv-visionplay-02', 'AGENTE-0019', 'Debian', '12', 'x86_64', 'Servidor', '10.0.10.12', 'Ativo', DATE_SUB(NOW(), INTERVAL 5 DAY), 10),
('srv-broadcast-01', 'AGENTE-0020', 'Ubuntu', '22.04', 'x86_64', 'Servidor', '10.0.11.11', 'Ativo', DATE_SUB(NOW(), INTERVAL 1 HOUR), 11),
('srv-broadcast-02', 'AGENTE-0021', 'Debian', '12', 'x86_64', 'Servidor', '10.0.11.12', 'Ativo', DATE_SUB(NOW(), INTERVAL 5 DAY), 11);

INSERT IGNORE INTO equipamento_componente
(fk_equipamento, fk_componente, data_instalacao, status)
SELECT eq.id_equipamentos, c.id_componente, DATE_SUB(NOW(), INTERVAL 30 DAY), 'Ativo'
FROM equipamentos eq
CROSS JOIN componente c;

INSERT INTO config_metrica
(habilitado, intervalo_coleta, limite_maximo, limite_minimo, fk_equipamento_componente, fk_metrica)
SELECT 1, 5, 90.00, 0.00, faltantes.id_equipamento_componente, faltantes.id_metrica
FROM (
    SELECT ec.id_equipamento_componente, m.id_metrica
    FROM equipamento_componente ec
    INNER JOIN metrica m
        ON m.fk_componente = ec.fk_componente
    LEFT JOIN config_metrica cm
        ON cm.fk_equipamento_componente = ec.id_equipamento_componente
       AND cm.fk_metrica = m.id_metrica
    WHERE cm.id_config_metrica IS NULL
) AS faltantes;

SELECT
    e.razao_social,
    eq.hostname,
    c.nome AS componente,
    c.tipo AS tipo_componente,
    m.nome AS metrica,
    cm.intervalo_coleta,
    cm.limite_maximo,
    cm.habilitado
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
