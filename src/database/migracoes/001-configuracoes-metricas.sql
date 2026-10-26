-- Execute no schema selecionado, com a aplicação parada e backup disponível.
-- ALTER TABLE confirma DDL implicitamente no MySQL; uma interrupção permite executar novamente.
DROP PROCEDURE IF EXISTS streamguard_configurar_metricas;
DELIMITER //
CREATE PROCEDURE streamguard_configurar_metricas()
BEGIN
    IF EXISTS (SELECT 1 FROM componente GROUP BY fk_servidor, tipo, COALESCE(nome, '') HAVING COUNT(*) > 1)
       OR EXISTS (SELECT 1 FROM metrica GROUP BY fk_componente, tipo HAVING COUNT(*) > 1)
       OR EXISTS (SELECT 1 FROM config_metrica GROUP BY fk_metrica HAVING COUNT(*) > 1) THEN
        SELECT fk_servidor, tipo, COALESCE(nome, '') AS nome, COUNT(*) AS quantidade
            FROM componente GROUP BY fk_servidor, tipo, COALESCE(nome, '') HAVING COUNT(*) > 1;
        SELECT fk_componente, tipo, COUNT(*) AS quantidade FROM metrica
            GROUP BY fk_componente, tipo HAVING COUNT(*) > 1;
        SELECT fk_metrica, COUNT(*) AS quantidade FROM config_metrica GROUP BY fk_metrica HAVING COUNT(*) > 1;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Duplicacoes detectadas. Nenhum registro foi escolhido ou excluido; revise antes de continuar.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE()
                   AND table_name = 'componente' AND index_name = 'uq_componente_identidade') THEN
        ALTER TABLE componente ADD UNIQUE KEY uq_componente_identidade (fk_servidor, tipo, (COALESCE(nome, '')));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE()
                   AND table_name = 'metrica' AND index_name = 'uq_metrica_componente_tipo') THEN
        ALTER TABLE metrica ADD UNIQUE KEY uq_metrica_componente_tipo (fk_componente, tipo);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE()
                   AND table_name = 'config_metrica' AND index_name = 'uq_config_metrica') THEN
        ALTER TABLE config_metrica ADD UNIQUE KEY uq_config_metrica (fk_metrica);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE()
               AND table_name = 'config_metrica' AND column_name = 'limite_maximo' AND numeric_precision < 20) THEN
        ALTER TABLE config_metrica MODIFY limite_maximo DECIMAL(20,2) NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE()
               AND table_name = 'config_metrica' AND column_name = 'limite_minimo' AND numeric_precision < 20) THEN
        ALTER TABLE config_metrica MODIFY limite_minimo DECIMAL(20,2) NULL;
    END IF;

    INSERT INTO config_metrica (fk_metrica, habilitado, intervalo_coleta, limite_minimo, limite_maximo)
    SELECT m.id_metrica, 1, p.intervalo, NULL, p.maximo FROM metrica m
    JOIN (
        SELECT 'USO_CPU' AS tipo, 5 AS intervalo, 90 AS maximo, '%' AS unidade
        UNION ALL SELECT 'USO_RAM' AS tipo, 10 AS intervalo, 90 AS maximo, '%' AS unidade
        UNION ALL SELECT 'RAM_DISPONIVEL' AS tipo, 10 AS intervalo, NULL AS maximo, 'bytes' AS unidade
        UNION ALL SELECT 'TAXA_ENVIO_REDE' AS tipo, 5 AS intervalo, NULL AS maximo, 'bytes/s' AS unidade
        UNION ALL SELECT 'TAXA_RECEBIMENTO_REDE' AS tipo, 10 AS intervalo, NULL AS maximo, 'bytes/s' AS unidade
        UNION ALL SELECT 'TAXA_LEITURA_DISCO' AS tipo, 15 AS intervalo, NULL AS maximo, 'bytes/s' AS unidade
        UNION ALL SELECT 'TAXA_ESCRITA_DISCO' AS tipo, 15 AS intervalo, NULL AS maximo, 'bytes/s' AS unidade
        UNION ALL SELECT 'USO_DISCO' AS tipo, 60 AS intervalo, 95 AS maximo, '%' AS unidade
        UNION ALL SELECT 'CARGA_CPU_1M' AS tipo, 30 AS intervalo, NULL AS maximo, 'load' AS unidade
        UNION ALL SELECT 'CARGA_CPU_5M' AS tipo, 60 AS intervalo, NULL AS maximo, 'load' AS unidade
        UNION ALL SELECT 'CARGA_CPU_15M' AS tipo, 60 AS intervalo, NULL AS maximo, 'load' AS unidade
    ) p ON p.tipo = m.tipo AND p.unidade = m.unidade
    WHERE NOT EXISTS (SELECT 1 FROM config_metrica cm WHERE cm.fk_metrica = m.id_metrica);

    SELECT m.id_metrica, m.tipo, m.unidade AS metrica_sem_configuracao
    FROM metrica m LEFT JOIN config_metrica cm ON cm.fk_metrica = m.id_metrica
    WHERE cm.id_config_metrica IS NULL;
END//
DELIMITER ;
CALL streamguard_configurar_metricas();
DROP PROCEDURE streamguard_configurar_metricas;
