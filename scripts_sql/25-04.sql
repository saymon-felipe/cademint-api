ALTER TABLE kanban_columns ADD COLUMN `order` INT;

SET @current_group := NULL;
SET @row_number := 0;

-- Resetando variáveis
SET @row_number := 0;
SET @last_group := NULL;

-- Criando uma tabela temporária com os novos valores de order
CREATE TEMPORARY TABLE temp_column_order AS
SELECT
  id,
  group_id,
  (@row_number := IF(@last_group = group_id, @row_number + 1, 0)) AS new_order,
  (@last_group := group_id)
FROM kanban_columns
ORDER BY group_id, id;

-- Atualizando a tabela original com base na temporária
UPDATE kanban_columns kc
JOIN temp_column_order tco ON kc.id = tco.id
SET kc.`order` = tco.new_order;

-- Limpando a temporária (opcional, ela some sozinha ao final da sessão)
DROP TEMPORARY TABLE IF EXISTS temp_column_order;

insert into versaodb (versao) values ("25.04.01");