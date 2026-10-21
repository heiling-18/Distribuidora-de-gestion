-- La plataforma queda solo para purinas y concentrados.
-- Los productos que aún tengan las categorías retiradas pasan a "Otros"
-- (la app ya los muestra así; esto deja la base de datos igual).
update public.productos
set categoria = 'Otros'
where categoria in ('Pollos y Aves', 'Huevos');
