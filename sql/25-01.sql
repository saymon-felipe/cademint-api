alter table os_ambient add column task_index int;

insert into versaodb (versao) values ("25.01.01");

rename table usuarios to users;

insert into versaodb (versao) values ("25.01.02");

create table kanban_columns (
	id int not null primary key auto_increment,
    name varchar(30) not null,
    group_id int not null
);

INSERT INTO kanban_columns (name, group_id)
SELECT 
    columns_data.column_name,
    groups.groups_id
FROM 
    os_groups AS groups
CROSS JOIN (
    SELECT 'A Fazer' AS column_name
    UNION ALL
    SELECT 'Fazendo'
    UNION ALL
    SELECT 'Teste'
    UNION ALL
    SELECT 'Concluído'
) AS columns_data;

insert into versaodb (versao) values ("25.01.03");