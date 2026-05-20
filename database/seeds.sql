-- ============================================================
-- DATOS DE PRUEBA — Control de Inventario Ganadero
-- ============================================================

USE control_inventario;

-- Usuario demo
INSERT INTO usuarios (nombre, email, password, telefono)
VALUES ('Productor Demo', 'demo@ganaderia.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '3001234567');
-- Password: password (generado con password_hash('password', PASSWORD_BCRYPT))

-- Rebaños demo
INSERT INTO rebanos (nombre, usuario_id) VALUES
('Rebaño Norte', 1),
('Rebaño Sur', 1),
('Crías 2025', 1),
('Vientres', 1);

-- Animales demo
INSERT INTO animales (nombre, sexo, fecha_nacimiento, rebano_id, etapa, estado_reproductivo, usuario_id) VALUES
('Torito',   'Macho',  '2023-01-15', 1, 'Adulto',  NULL,    1),
('Lola',     'Hembra','2022-03-20', 2, 'Adulto',  'Prenada',1),
('Mocha',    'Hembra','2023-06-10', 2, 'Adulto',  'Vacia',  1),
('Clarita',  'Hembra','2024-01-05', 4, 'Novillo', 'Vacia',  1),
('Ternero1', 'Macho',  '2025-08-01', 3, 'Ternero', NULL,    1),
('Ternera2', 'Hembra','2025-09-15', 3, 'Ternero', 'Vacia',  1);

-- Medicamentos demo
INSERT INTO medicamentos (nombre, descripcion, stock, unidad, fecha_vencimiento, usuario_id) VALUES
('Aftopor 5ml', 'Vacuna antiaftosa', 150.00, 'dosis', '2026-12-31', 1),
('Brucella 2ml','Vacuna contra brucelosis', 80.00, 'dosis', '2026-10-15', 1),
('Ivermectina 1%','Antiparasitario', 500.00, 'ml', '2027-03-01', 1);

-- Vacunaciones demo
INSERT INTO vacunaciones (fecha, medicamento_id, rebano_id, observaciones, usuario_id) VALUES
('2026-01-10', 1, 1, 'Vacunación anual rebaño norte', 1),
('2026-02-15', 2, 2, 'Refuerzo brucelosis', 1);

INSERT INTO vacunacion_animales (vacunacion_id, animal_id, dosis_aplicada) VALUES
(1, 1, 5.00),
(1, 2, 5.00),
(2, 3, 2.00),
(2, 4, 2.00);

-- Ciclos de celo demo
INSERT INTO ciclos_celo (animal_id, fecha_inicio, servicio_realizado, observaciones, usuario_id) VALUES
(2, '2026-03-01', 1, 'Servicio natural con toro', 1),
(4, '2026-04-10', 0, 'En observación', 1);
